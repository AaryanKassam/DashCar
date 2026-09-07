import { useEffect, useRef } from 'react'
import { CRUISE_MIN_KPH, useVehicleStore } from '../state/vehicleStore'
import { useGarageStore } from '../cars/garageStore'
import { getCar } from '../cars/carRegistry'
import {
  DRIVE_MODE_TUNING,
  engineRpm,
  fuelFlow,
  kphToMs,
  msToKph,
  selectGear,
  stepLongitudinal,
} from './physics'
import { world } from './worldState'
import { audio } from './audio'
import { SURROUND_MAX_KPH, stepHazards } from './pedestrianSpawner'

/** Physics integrates at a fixed step; results publish at the "bus" rate. */
const PHYSICS_DT = 1 / 120
/** 20 ms — the cycle time a real wheel-speed signal would use on CAN. */
const BUS_PERIOD = 0.02
/** Turn signal flash rate: ~1.5 Hz, the legal range in most markets. */
const BLINK_PERIOD = 0.66

/**
 * The one loop that advances the vehicle.
 *
 * Nothing else in the app calls `applyTick`. Every derived visual — needle
 * angle, road scroll speed, headlight cone, hazard blips — is downstream of
 * the signals this loop publishes.
 */
export function useDrivingLoop() {
  /**
   * The integrator's own continuous speed, in m/s.
   *
   * This must not be read back from the store. The published signal is
   * quantised (a cluster does not show 0.31 km/h), and feeding a quantised
   * value back into the integrator means small accelerations are rounded away
   * every cycle and the car never leaves a standstill — which is exactly what
   * happened before this ref existed. A real ECU has the same split: full
   * precision internally, a rounded signal on the bus.
   */
  const speedRef = useRef(0)
  const gearIndexRef = useRef(0)
  const blinkRef = useRef(0)
  const busAccRef = useRef(0)
  const physAccRef = useRef(0)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let running = true

    const frame = (now: number) => {
      if (!running) return
      // Clamp so a backgrounded tab doesn't teleport the car on return.
      const frameDt = Math.min((now - last) / 1000, 0.1)
      last = now

      const s = useVehicleStore.getState()
      const car = getCar(useGarageStore.getState().carId)
      const profile = car.powertrain
      const tuning = DRIVE_MODE_TUNING[s.driveMode] ?? DRIVE_MODE_TUNING.comfort

      const reverse = s.gear === 'R'
      const driveEngaged = (s.gear === 'D' || s.gear === 'R') && s.engineRunning

      /*
       * Cruise control.
       *
       * A proportional hold on the set speed, clamped to sane throttle. It
       * cannot brake — this is conventional cruise, not adaptive — so on a
       * descent it simply lifts off, which is exactly what the real system
       * does and is worth not hiding.
       */
      let throttle = s.throttle
      if (s.cruiseActive && driveEngaged && !reverse) {
        const error = s.cruiseSetKph - s.speed
        throttle = Math.max(0, Math.min(0.85, 0.06 * error))
      }

      // --- fixed-step integration -------------------------------------------
      // If something outside the loop moved the speed signal — a reset, a car
      // swap — take the store as authoritative and resync.
      if (Math.abs(msToKph(speedRef.current) - s.speed) > 3) speedRef.current = kphToMs(s.speed)

      physAccRef.current += frameDt
      let speedMs = speedRef.current
      let accel = 0
      let steps = 0
      while (physAccRef.current >= PHYSICS_DT && steps < 16) {
        const r = stepLongitudinal(profile, tuning, {
          speedMs,
          reverse,
          throttle,
          brake: s.brake,
          driveEngaged,
          engineRunning: s.engineRunning,
          parkingBrake: s.parkingBrake,
        }, PHYSICS_DT)
        speedMs = r.speedMs
        accel = r.accel
        physAccRef.current -= PHYSICS_DT
        steps++
      }
      if (steps === 16) physAccRef.current = 0
      speedRef.current = speedMs

      // --- transmission ------------------------------------------------------
      if (car.singleSpeed) {
        gearIndexRef.current = 0
      } else if (driveEngaged && !reverse) {
        gearIndexRef.current = selectGear(profile, tuning, speedMs, gearIndexRef.current, throttle)
      } else if (!driveEngaged || speedMs < 0.5) {
        gearIndexRef.current = 0
      }

      let rpm = 0
      if (s.engineRunning) {
        const geared = engineRpm(profile, speedMs, reverse ? 0 : gearIndexRef.current)
        // Idle floor, plus a little throttle blip in neutral/park.
        const idle = profile.idleRpm + (driveEngaged ? 0 : throttle * 3200)
        rpm = Math.min(Math.max(geared, idle), profile.redlineRpm)
      }

      // --- steering & road geometry -----------------------------------------
      // The wheel lags the input slightly; real steering has inertia.
      world.wheelAngle += (s.steering * (profile.steeringLockDeg * Math.PI / 180) / 2 - world.wheelAngle) * Math.min(1, frameDt * 8)
      // Steering only bends the road when the car is actually moving.
      world.curvature += (s.steering * Math.min(speedMs / 12, 1) - world.curvature) * Math.min(1, frameDt * 3)
      world.lateralOffset += world.curvature * speedMs * frameDt * 0.55
      world.lateralOffset *= 1 - Math.min(1, frameDt * 0.4) // drift back to lane centre

      world.distance += (reverse ? -speedMs : speedMs) * frameDt
      world.speedMs = speedMs
      world.accel = accel

      // --- indicators --------------------------------------------------------
      const indicatorRequested = s.leftIndicator || s.rightIndicator
      if (indicatorRequested) {
        blinkRef.current += frameDt
        if (blinkRef.current >= BLINK_PERIOD) blinkRef.current -= BLINK_PERIOD
      } else {
        blinkRef.current = 0
      }
      world.blinkPhase = blinkRef.current / BLINK_PERIOD
      const indicatorOn = indicatorRequested && world.blinkPhase < 0.5
      if (indicatorOn !== s.indicatorOn && indicatorRequested) audio.tick()

      // --- hazards (surround view) ------------------------------------------
      // Gated on speed, not just on the driver's request: the sensor set only
      // produces a useful track list below walking-to-parking speeds.
      const surroundSensing = s.surroundViewActive && msToKph(speedMs) < SURROUND_MAX_KPH
      const hazardResult = stepHazards(surroundSensing, speedMs, frameDt)

      // --- publish at bus rate ----------------------------------------------
      busAccRef.current += frameDt
      if (busAccRef.current >= BUS_PERIOD || indicatorOn !== s.indicatorOn) {
        busAccRef.current = 0

        const kph = msToKph(speedMs)
        const distanceKm = Math.abs(speedMs) * frameDt / 1000

        // Same signal, two meanings: litres-remaining fraction for a combustion
        // car, state-of-charge for a battery car. The gauge decides how to draw it.
        let fuel = s.fuel
        if (car.energyType === 'battery') {
          const drawKw = (s.throttle * profile.peakPowerW) / 1000
          const regenKw = s.brake * speedMs * 3
          fuel = Math.min(1, Math.max(0, fuel - ((drawKw - regenKw) * frameDt) / 82 / 3600))
        } else if (s.engineRunning) {
          fuel = Math.max(0, fuel - fuelFlow(throttle, rpm, profile.idleRpm || 800) * frameDt * 0.02)
        }

        // Coolant warms toward an operating temperature that rises with load.
        const targetTemp = s.engineRunning ? 88 + s.throttle * 12 : 20
        const coolantTemp = s.coolantTemp + (targetTemp - s.coolantTemp) * Math.min(1, frameDt * 0.06)

        useVehicleStore.getState().applyTick({
          speed: kph < 0.4 ? 0 : kph,
          rpm,
          fuel,
          coolantTemp,
          odometer: s.odometer + distanceKm,
          indicatorOn,
          trackedHazards: hazardResult.hazards,
          nearestHazardDistance: hazardResult.nearest,
        })

        if (s.cruiseActive && msToKph(speedMs) < CRUISE_MIN_KPH - 5) {
          useVehicleStore.getState().applyTick({ cruiseActive: false })
        }

        runMonitors()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [])
}

/**
 * Body-controller style monitors: conditions that raise or clear telltales on
 * their own, independent of the debug panel. Kept separate from physics so the
 * rules read like a spec table.
 */
function runMonitors() {
  const s = useVehicleStore.getState()
  const anyDoorOpen = Object.values(s.doors).some(Boolean)

  s.setWarning('doorAjar', anyDoorOpen)
  s.setWarning('seatbelt', !s.seatbeltFastened)
  s.setWarning('lowFuel', s.fuel < 0.12)
  s.setWarning('coolant', s.coolantTemp > 112)
}
