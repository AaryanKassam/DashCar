import { useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { SEVERITY_RANK, WARNING_DEFINITIONS } from '../state/vehicleTypes'
import type { TelltaleSeverity } from '../state/vehicleTypes'
import { useCar } from '../cars/garageStore'
import { ArcGauge, BarGauge } from './ArcGauge'
import { Telltale } from './telltaleIcons'
import type { IconName } from './telltaleIcons'
import { useSignalAnimation } from './useSignalAnimation'
import { screenBrightness } from '../scene/lighting'
import './cluster.css'

/**
 * The instrument cluster.
 *
 * Design rules this layout follows, and why:
 *  - Speed is the largest element on the panel. It is the only value a driver
 *    is legally required to know, so it gets the shortest glance.
 *  - Telltales sit in a fixed strip. A driver notices "something new appeared
 *    in that row" far faster than they read any individual symbol, so symbols
 *    never move to fill gaps — each one owns its slot.
 *  - Colour carries severity (ISO 2575: red = stop, amber = service, green =
 *    active, blue = high beam), so severity survives peripheral vision.
 *  - Exactly one message line, showing the worst active fault. Stacking
 *    warnings would be honest and useless: a driver reads one line.
 */
export function DashboardCluster() {
  const car = useCar()
  const cfg = car.cluster
  const accent = car.theme.accent

  const gear = useVehicleStore((s) => s.gear)
  const driveMode = useVehicleStore((s) => s.driveMode)
  const warnings = useVehicleStore((s) => s.warnings)
  const headlights = useVehicleStore((s) => s.headlights)
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)

  const isBattery = car.energyType === 'battery'
  const analogSpeed = cfg.skin === 'rugged'

  return (
    <div
      className="cluster"
      style={
        {
          '--accent': accent,
          '--accent-dim': car.theme.accentDim,
          '--cluster-bg': car.theme.clusterBg,
          filter: `brightness(${screenBrightness(timeOfDay, headlights)})`,
        } as React.CSSProperties
      }
    >
      <TelltaleStrip />

      {/* Keyed on the car so a swap remounts the gauges rather than reconciling
          a tachometer into a power meter. */}
      <div className="cluster__body" key={car.id}>
        <div className="cluster__side">
          {isBattery ? (
            <ArcGauge
              size={232}
              min={-60}
              max={260}
              majorStep={80}
              minorPerMajor={3}
              read={(s) => (s.engineRunning ? powerKw(s.throttle, s.brake, s.speed, car.powertrain.peakPowerW) : 0)}
              label="POWER"
              unit="kW"
              accent={accent}
              tickLabel={(v) => String(v)}
              readout={(v) => String(Math.round(v))}
            />
          ) : (
            <ArcGauge
              size={232}
              min={0}
              max={cfg.maxRpm}
              majorStep={1000}
              minorPerMajor={1}
              warnFrom={cfg.redlineRpm}
              read={(s) => s.rpm}
              label="RPM"
              unit="×1000"
              accent={accent}
              tickLabel={(v) => String(v / 1000)}
              responsiveness={12}
            />
          )}
        </div>

        <div className="cluster__centre">
          {analogSpeed ? (
            <ArcGauge
              size={236}
              min={0}
              max={cfg.maxSpeedKph}
              majorStep={40}
              minorPerMajor={3}
              read={(s) => s.speed}
              label="km/h"
              accent={accent}
              readout={(v) => String(Math.round(v))}
              responsiveness={9}
            />
          ) : (
            <SpeedReadout />
          )}
          <GearSelector gear={gear} />
          <div className="cluster__mode" data-mode={driveMode}>
            {driveMode === 'eco' && <Telltale name="eco" size={16} />}
            {driveMode === 'sport' && <Telltale name="sport" size={16} />}
            <span>{driveMode.toUpperCase()}</span>
          </div>
        </div>

        <div className="cluster__side">
          <BarGauge
            read={(s) => s.fuel}
            label={isBattery ? 'BATTERY' : 'FUEL'}
            accent={accent}
            warnBelow={0.12}
            readout={(v) => `${Math.round(v * 100)}%`}
          />
          <BarGauge
            read={(s) => s.coolantTemp}
            label={isBattery ? 'PACK TEMP' : 'COOLANT'}
            accent={accent}
            min={20}
            max={130}
            warnAbove={112}
            segments={12}
            readout={(v) => `${Math.round(v)}°`}
          />
          <RangeReadout isBattery={isBattery} />
        </div>
      </div>

      <MessageLine warnings={warnings} />
    </div>
  )
}

/** Instantaneous power draw for the EV cluster; negative under regen. */
function powerKw(throttle: number, brake: number, speedKph: number, peakW: number): number {
  const draw = (throttle * peakW) / 1000
  const regen = brake * (speedKph / 3.6) * 3
  return draw - regen
}

function SpeedReadout() {
  const digits = useRef<HTMLSpanElement>(null)
  useSignalAnimation(
    (s) => s.speed,
    (v) => {
      if (digits.current) digits.current.textContent = String(Math.round(v))
    },
    9,
  )
  return (
    <div className="speed">
      <span ref={digits} className="speed__value">0</span>
      <span className="speed__unit">km/h</span>
    </div>
  )
}

function GearSelector({ gear }: { gear: string }) {
  return (
    <div className="gears" role="group" aria-label="Transmission position">
      {['P', 'R', 'N', 'D'].map((g) => (
        <span key={g} className="gears__item" data-active={g === gear || undefined}>
          {g}
        </span>
      ))}
    </div>
  )
}

function RangeReadout({ isBattery }: { isBattery: boolean }) {
  const odo = useRef<HTMLSpanElement>(null)
  const range = useRef<HTMLSpanElement>(null)
  useSignalAnimation(
    (s) => s.odometer,
    (v) => {
      if (odo.current) odo.current.textContent = `${Math.floor(v).toLocaleString()} km`
    },
    3,
  )
  useSignalAnimation(
    (s) => s.fuel,
    (v) => {
      // Nominal consumption; enough for the number to move believably.
      if (range.current) range.current.textContent = `${Math.round(v * (isBattery ? 480 : 640))} km`
    },
    1.5,
  )
  return (
    <div className="readouts">
      <div>
        <label>RANGE</label>
        <span ref={range}>—</span>
      </div>
      <div>
        <label>ODO</label>
        <span ref={odo}>—</span>
      </div>
    </div>
  )
}

/**
 * Fixed-slot telltale strip. Every symbol always occupies the same x position
 * whether lit or not, so the driver's eye learns the layout.
 */
function TelltaleStrip() {
  const left = useVehicleStore((s) => s.leftIndicator)
  const right = useVehicleStore((s) => s.rightIndicator)
  const blink = useVehicleStore((s) => s.indicatorOn)
  const headlights = useVehicleStore((s) => s.headlights)
  const highBeams = useVehicleStore((s) => s.highBeams)
  const parkingBrake = useVehicleStore((s) => s.parkingBrake)
  const warnings = useVehicleStore((s) => s.warnings)

  const slots: { name: IconName; on: boolean; severity: TelltaleSeverity }[] = [
    { name: 'engine', on: warnings.includes('engine'), severity: 'amber' },
    { name: 'oilPressure', on: warnings.includes('oilPressure'), severity: 'red' },
    { name: 'battery', on: warnings.includes('battery'), severity: 'red' },
    { name: 'brake', on: warnings.includes('brake'), severity: 'red' },
    { name: 'abs', on: warnings.includes('abs'), severity: 'amber' },
    { name: 'coolant', on: warnings.includes('coolant'), severity: 'red' },
    { name: 'tirePressure', on: warnings.includes('tirePressure'), severity: 'amber' },
    { name: 'lowFuel', on: warnings.includes('lowFuel'), severity: 'amber' },
    { name: 'seatbelt', on: warnings.includes('seatbelt'), severity: 'red' },
    { name: 'doorAjar', on: warnings.includes('doorAjar'), severity: 'red' },
    { name: 'parkingBrake', on: parkingBrake, severity: 'red' },
    { name: 'lowBeam', on: headlights && !highBeams, severity: 'green' },
    { name: 'highBeam', on: highBeams, severity: 'blue' },
  ]

  return (
    <div className="telltales">
      <span className="telltales__turn" data-on={(left && blink) || undefined} data-side="left">
        <Telltale name="turnLeft" size={24} />
      </span>
      <div className="telltales__row">
        {slots.map((s) => (
          <span key={s.name} className="telltale" data-on={s.on || undefined} data-severity={s.severity}>
            <Telltale name={s.name} />
          </span>
        ))}
      </div>
      <span className="telltales__turn" data-on={(right && blink) || undefined} data-side="right">
        <Telltale name="turnRight" size={24} />
      </span>
    </div>
  )
}

function MessageLine({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return (
      <div className="message" data-severity="none">
        <span>Systems normal</span>
      </div>
    )
  }
  // Worst-first: one line, highest severity wins, ties broken by list order.
  const sorted = [...warnings].sort(
    (a, b) =>
      SEVERITY_RANK[WARNING_DEFINITIONS[a as keyof typeof WARNING_DEFINITIONS].severity] -
      SEVERITY_RANK[WARNING_DEFINITIONS[b as keyof typeof WARNING_DEFINITIONS].severity],
  )
  const worst = WARNING_DEFINITIONS[sorted[0] as keyof typeof WARNING_DEFINITIONS]
  return (
    <div className="message" data-severity={worst.severity}>
      <Telltale name={worst.id as IconName} size={18} />
      <span>{worst.message}</span>
      {warnings.length > 1 && <em>+{warnings.length - 1} more</em>}
    </div>
  )
}
