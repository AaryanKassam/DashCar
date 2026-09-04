import { useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { SEVERITY_RANK, WARNING_DEFINITIONS } from '../state/vehicleTypes'
import type { TelltaleSeverity } from '../state/vehicleTypes'
import { useCar } from '../cars/garageStore'
import { Telltale } from './telltaleIcons'
import type { IconName } from './telltaleIcons'
import { VehicleGraphic } from './VehicleGraphic'
import { useSignalAnimation } from './useSignalAnimation'
import { screenBrightness } from '../scene/lighting'
import './cluster.css'

/**
 * The Explorer's digital cluster.
 *
 * Laid out as the reference reads it: a thin media strip along the top, a large
 * speed numeral left of centre, a vehicle graphic in the middle, a dial on the
 * right, and one message line underneath.
 *
 * Design rules this follows, and why:
 *  - Speed is the largest element on the panel. It is the only value a driver is
 *    legally required to know, so it gets the shortest glance.
 *  - Telltales sit in a fixed strip and never move to fill gaps. A driver
 *    notices "something new appeared in that slot" far faster than they read any
 *    individual symbol.
 *  - Colour carries severity (ISO 2575: red stop, amber service, green active,
 *    blue high beam), so severity survives peripheral vision.
 *  - Exactly one message line, showing the worst active fault. Stacking warnings
 *    would be honest and useless: a driver reads one line.
 *  - The needle and the numerals are written straight to the DOM from a rAF
 *    loop. React renders this panel's structure once; re-rendering it sixty
 *    times a second to move a needle is how a cluster starts to stutter.
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

  return (
    <div
      className="cluster"
      data-skin={cfg.skin}
      style={
        {
          '--accent': accent,
          '--accent-dim': car.theme.accentDim,
          '--cluster-bg': car.theme.clusterBg,
          filter: `brightness(${screenBrightness(timeOfDay, headlights)})`,
        } as React.CSSProperties
      }
    >
      <header className="cluster__strip">
        <MediaStrip />
        <TelltaleStrip />
        <Clock />
      </header>

      <div className="cluster__body">
        <section className="cluster__speed">
          <SpeedReadout />
          <GearSelector gear={gear} />
        </section>

        <section className="cluster__centre">
          <VehicleGraphic />
          <span className="cluster__mode" data-mode={driveMode}>
            {driveMode.toUpperCase()}
          </span>
        </section>

        <section className="cluster__dial">
          <PowerDial max={cfg.maxRpm} redline={cfg.redlineRpm} accent={accent} />
          <Readouts />
        </section>
      </div>

      <MessageLine warnings={warnings} />
    </div>
  )
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

/**
 * The right-hand dial.
 *
 * A three-quarter sweep rather than a full circle, drawn as an arc that fills
 * with engine speed. Tick labels are omitted deliberately: nobody reads a
 * tachometer numerically while driving, they read how far round it has gone.
 */
function PowerDial({ max, redline, accent }: { max: number; redline: number; accent: string }) {
  const arc = useRef<SVGPathElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  const size = 150
  const cx = size / 2
  const r = size * 0.4
  const START = 135
  const SWEEP = 270
  const length = (Math.PI * 2 * r * SWEEP) / 360

  useSignalAnimation(
    (s) => s.rpm,
    (v) => {
      const t = Math.max(0, Math.min(1, v / max))
      if (arc.current) {
        arc.current.style.strokeDashoffset = String(length * (1 - t))
        arc.current.style.stroke = v >= redline ? 'var(--warn)' : accent
      }
      if (label.current) label.current.textContent = (v / 1000).toFixed(1)
    },
    12,
  )

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cx + r * Math.sin(rad)] as const
  }
  const [x1, y1] = polar(START)
  const [x2, y2] = polar(START + SWEEP)
  const path = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`

  return (
    <div className="dial">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <path d={path} className="dial__track" fill="none" strokeLinecap="round" />
        <path
          d={path}
          className="dial__redline"
          fill="none"
          strokeLinecap="butt"
          style={{ strokeDasharray: `${length * (1 - redline / max)} ${length}`, strokeDashoffset: -length * (redline / max) }}
        />
        <path
          ref={arc}
          d={path}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          className="dial__value"
          style={{ strokeDasharray: `${length} ${length * 2}`, strokeDashoffset: length }}
        />
      </svg>
      <div className="dial__centre">
        <span ref={label} className="dial__value-text">0.0</span>
        <span className="dial__unit">×1000 rpm</span>
      </div>
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

function Readouts() {
  const odo = useRef<HTMLSpanElement>(null)
  const range = useRef<HTMLSpanElement>(null)
  const fuel = useRef<HTMLElement>(null)

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
      if (range.current) range.current.textContent = `${Math.round(v * 640)} km`
      if (fuel.current) {
        fuel.current.style.width = `${Math.max(2, v * 100)}%`
        fuel.current.style.background = v < 0.12 ? 'var(--warn)' : 'var(--accent)'
      }
    },
    1.5,
  )

  return (
    <div className="readouts">
      <div className="readouts__fuel">
        <span>FUEL</span>
        <div className="readouts__bar">
          <i ref={fuel} />
        </div>
      </div>
      <div className="readouts__row">
        <span>RANGE</span>
        <span ref={range}>–</span>
      </div>
      <div className="readouts__row">
        <span>ODO</span>
        <span ref={odo}>–</span>
      </div>
    </div>
  )
}

/** Now playing, mirrored from the head unit onto the cluster. */
function MediaStrip() {
  return (
    <div className="cluster__media">
      <span className="cluster__media-track">Search and Destroy</span>
      <span className="cluster__media-artist">The Stooges</span>
    </div>
  )
}

function Clock() {
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const hh = String(Math.floor(timeOfDay) % 24).padStart(2, '0')
  const mm = String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')
  return <time className="cluster__clock">{hh}:{mm}</time>
}

/**
 * Fixed-slot telltale strip. Every symbol always occupies the same position
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
      <span className="telltales__turn" data-on={(left && blink) || undefined}>
        <Telltale name="turnLeft" size={22} />
      </span>
      <div className="telltales__row">
        {slots.map((s) => (
          <span key={s.name} className="telltale" data-on={s.on || undefined} data-severity={s.severity}>
            <Telltale name={s.name} size={22} />
          </span>
        ))}
      </div>
      <span className="telltales__turn" data-on={(right && blink) || undefined}>
        <Telltale name="turnRight" size={22} />
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
  // Worst first: one line, highest severity wins, ties broken by list order.
  const sorted = [...warnings].sort(
    (a, b) =>
      SEVERITY_RANK[WARNING_DEFINITIONS[a as keyof typeof WARNING_DEFINITIONS].severity] -
      SEVERITY_RANK[WARNING_DEFINITIONS[b as keyof typeof WARNING_DEFINITIONS].severity],
  )
  const worst = WARNING_DEFINITIONS[sorted[0] as keyof typeof WARNING_DEFINITIONS]
  return (
    <div className="message" data-severity={worst.severity}>
      <Telltale name={worst.id as IconName} size={17} />
      <span>{worst.message}</span>
      {warnings.length > 1 && <em>+{warnings.length - 1} more</em>}
    </div>
  )
}
