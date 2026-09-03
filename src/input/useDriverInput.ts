import { useEffect, useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { audio } from '../simulation/audio'
import { BINDINGS } from './bindings'
import { pedalIntent } from './pedalIntent'

/**
 * Keyboard → analog driver inputs.
 *
 * A key is binary but a pedal is not, so held keys *ramp* the pedal toward its
 * limit and release ramps it back. Without this the car feels like a switch,
 * and the acceleration curve in the physics model is wasted.
 */

const THROTTLE_RISE = 2.6
const THROTTLE_FALL = 5.5
const BRAKE_RISE = 4.5
const BRAKE_FALL = 7
const STEER_RISE = 2.4
const STEER_RETURN = 3.6

const DRIVE_MODES = ['eco', 'comfort', 'sport'] as const
const TIME_PRESETS = [14, 19.2, 22]

export function useDriverInput(onToggleHelp: () => void) {
  const held = useRef<Set<string>>(new Set())
  const analog = useRef({ throttle: 0, brake: 0, steering: 0 })

  useEffect(() => {
    const isHeldBinding = (key: string) =>
      Object.values(BINDINGS).some((b) => b.held && b.keys.includes(key))

    const onKeyDown = (e: KeyboardEvent) => {
      // Never steal keys from the infotainment screen's own inputs.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const key = e.key.toLowerCase()
      if (isHeldBinding(key)) {
        e.preventDefault()
        held.current.add(key)
        publishKeyboardIntent(held.current)
        return
      }
      if (e.repeat) return

      const s = useVehicleStore.getState()
      switch (true) {
        case BINDINGS.ignition.keys.includes(key):
          s.toggleEngine()
          if (!s.engineRunning) audio.chime()
          break
        case BINDINGS.shiftUp.keys.includes(key):
          s.shiftUp()
          break
        case BINDINGS.shiftDown.keys.includes(key):
          s.shiftDown()
          break
        case BINDINGS.parkingBrake.keys.includes(key):
          s.toggleParkingBrake()
          break
        case BINDINGS.driveMode.keys.includes(key): {
          const i = DRIVE_MODES.indexOf(s.driveMode)
          s.setDriveMode(DRIVE_MODES[(i + 1) % DRIVE_MODES.length])
          break
        }
        case BINDINGS.headlights.keys.includes(key):
          s.toggleHeadlights()
          break
        case BINDINGS.highBeams.keys.includes(key):
          s.toggleHighBeams()
          break
        case BINDINGS.indicatorLeft.keys.includes(key):
          s.setIndicator(s.leftIndicator ? null : 'left')
          break
        case BINDINGS.indicatorRight.keys.includes(key):
          s.setIndicator(s.rightIndicator ? null : 'right')
          break
        case BINDINGS.hazards.keys.includes(key):
          s.toggleHazards()
          break
        case BINDINGS.timeOfDay.keys.includes(key): {
          const i = TIME_PRESETS.findIndex((t) => Math.abs(t - s.timeOfDay) < 0.6)
          s.setTimeOfDay(TIME_PRESETS[(i + 1) % TIME_PRESETS.length])
          break
        }
        case BINDINGS.surroundView.keys.includes(key):
          s.toggleSurroundView()
          break
        case BINDINGS.help.keys.includes(key):
          onToggleHelp()
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      held.current.delete(e.key.toLowerCase())
      publishKeyboardIntent(held.current)
    }
    // Keys held when the window loses focus never send a keyup, so releasing
    // everything on blur is what stops the car driving away in a background tab.
    const onBlur = () => {
      held.current.clear()
      pedalIntent.clear('keyboard')
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    let raf = 0
    let last = performance.now()
    const ramp = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const a = analog.current
      const s = useVehicleStore.getState()

      // Single arbitration point: whatever any device is asking for.
      const wantThrottle = pedalIntent.active('throttle')
      const wantBrake = pedalIntent.active('brake')
      const left = pedalIntent.active('steerLeft')
      const right = pedalIntent.active('steerRight')

      a.throttle = approach(a.throttle, wantThrottle && !wantBrake ? 1 : 0, dt * (wantThrottle ? THROTTLE_RISE : THROTTLE_FALL))
      a.brake = approach(a.brake, wantBrake ? 1 : 0, dt * (wantBrake ? BRAKE_RISE : BRAKE_FALL))

      const steerTarget = left === right ? 0 : left ? -1 : 1
      a.steering = approach(a.steering, steerTarget, dt * (steerTarget === 0 ? STEER_RETURN : STEER_RISE))

      // Only write when the value actually moved — keeps the store quiet at rest.
      if (Math.abs(a.throttle - s.throttle) > 0.001) s.setThrottle(a.throttle)
      if (Math.abs(a.brake - s.brake) > 0.001) s.setBrake(a.brake)
      if (Math.abs(a.steering - s.steering) > 0.001) s.setSteering(a.steering)

      raf = requestAnimationFrame(ramp)
    }
    raf = requestAnimationFrame(ramp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      cancelAnimationFrame(raf)
    }
  }, [onToggleHelp])
}

function publishKeyboardIntent(down: Set<string>) {
  pedalIntent.set('keyboard', 'throttle', BINDINGS.throttle.keys.some((k) => down.has(k)))
  pedalIntent.set('keyboard', 'brake', BINDINGS.brake.keys.some((k) => down.has(k)))
  pedalIntent.set('keyboard', 'steerLeft', BINDINGS.steerLeft.keys.some((k) => down.has(k)))
  pedalIntent.set('keyboard', 'steerRight', BINDINGS.steerRight.keys.some((k) => down.has(k)))
}

function approach(current: number, target: number, step: number): number {
  if (current < target) return Math.min(target, current + step)
  if (current > target) return Math.max(target, current - step)
  return current
}
