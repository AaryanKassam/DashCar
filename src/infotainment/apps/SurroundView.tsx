import { useEffect, useRef, useState } from 'react'
import { useVehicleStore } from '../../state/vehicleStore'
import type { Hazard } from '../../state/vehicleTypes'
import { SURROUND_MAX_KPH, threatLevel } from '../../simulation/pedestrianSpawner'
import { audio } from '../../simulation/audio'
import { useCar } from '../../cars/garageStore'

/**
 * Surround view — the ADAS display.
 *
 * Modelled on how production 360 systems actually behave: it takes over the
 * centre screen rather than opening alongside the current app, because when the
 * system has something to say about the space around the car, that is the only
 * thing the screen should be saying.
 *
 * Two representations of the same track list, because they answer different
 * questions:
 *  - the plan view answers "where is it?"
 *  - the sector bars answer "how close, and do I need to stop?" — readable in
 *    peripheral vision without resolving individual objects.
 */

/**
 * The viewBox matches the pixel area the plan actually gets — 700 tall minus
 * the status bar, dock and banner. Guessing at it makes the SVG letterbox
 * itself, which quietly shrinks the whole display and pushes tracks off the
 * edge of a screen whose entire job is showing you what is off the edge.
 */
const W = 1100
const H = 486
const CX = 430
const CY = H / 2
/** Pixels per metre in the plan view: the full 14 m envelope has to fit. */
const PPM = 17.5
const POOL = 1
const RINGS = [2, 4, 6, 8, 10]

/** Eight sectors, starting directly ahead and going clockwise. */
const SECTORS = 8

export function SurroundView() {
  const car = useCar()
  const blips = useRef<(SVGGElement | null)[]>([])
  const bars = useRef<(SVGRectElement | null)[]>([])
  const rows = useRef<(SVGTextElement | null)[]>([])
  const bannerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const nearestRef = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let raf = 0
    let lastLevel = 'none'
    let lastAlert = 0
    let lastCount = -1

    const frame = () => {
      const { trackedHazards: tracks, nearestHazardDistance, speed } = useVehicleStore.getState()

      // Availability is written straight to the DOM: it changes with a signal
      // that updates 50 times a second, and re-rendering the whole view for it
      // would be the one thing guaranteed to make a safety display stutter.
      const available = speed < SURROUND_MAX_KPH
      if (rootRef.current) rootRef.current.dataset.available = String(available)

      // --- blips ---------------------------------------------------------
      for (let i = 0; i < POOL; i++) {
        const g = blips.current[i]
        if (!g) continue
        const t = tracks[i]
        if (!t) {
          g.style.opacity = '0'
          continue
        }
        // Plan view: +x right, +z forward -> screen up.
        const x = CX + t.x * PPM
        const y = CY - t.z * PPM
        const heading = (Math.atan2(t.vx, t.vz) * 180) / Math.PI
        const level = threatLevel(Math.hypot(t.x, t.z))
        g.style.opacity = '1'
        g.setAttribute('transform', `translate(${x} ${y})`)
        g.dataset.level = level
        g.dataset.kind = t.kind
        const arrow = g.querySelector('.blip__dir') as SVGGElement | null
        arrow?.setAttribute('transform', `rotate(${heading})`)
      }

      if (tracks.length !== lastCount) {
        lastCount = tracks.length
        setCount(tracks.length)
      }

      // --- sector bars ----------------------------------------------------
      const sectorMin = new Array(SECTORS).fill(Infinity)
      for (const t of tracks) {
        // Sector 0 is straight ahead; angle measured clockwise from +z.
        const angle = Math.atan2(t.x, t.z)
        const idx = (Math.round((angle / (Math.PI * 2)) * SECTORS) + SECTORS) % SECTORS
        sectorMin[idx] = Math.min(sectorMin[idx], Math.hypot(t.x, t.z))
      }
      for (let i = 0; i < SECTORS; i++) {
        const bar = bars.current[i]
        if (!bar) continue
        const d = sectorMin[i]
        const level = threatLevel(Number.isFinite(d) ? d : null)
        bar.dataset.level = level
        // Fuller bar = closer object.
        const fill = Number.isFinite(d) ? Math.max(0.08, 1 - Math.min(d, 10) / 10) : 0
        bar.setAttribute('width', String(fill * 150))
      }

      // --- track list -------------------------------------------------------
      // Sorted by threat, because a list sorted by track id makes the driver do
      // the ranking themselves — which is the job the system is supposed to do.
      const ranked = [...tracks]
        .map((t) => ({ t, d: Math.hypot(t.x, t.z) }))
        .sort((a, b) => a.d - b.d)
      for (let i = 0; i < rows.current.length; i++) {
        const row = rows.current[i]
        if (!row) continue
        const entry = ranked[i]
        if (!entry) {
          row.textContent = ''
          continue
        }
        row.textContent = `${KIND_LABELS[entry.t.kind]}   ${entry.d.toFixed(1)} m   ${bearingLabel(entry.t)}`
        row.dataset.level = threatLevel(entry.d)
      }

      // --- banner + chime --------------------------------------------------
      const level = threatLevel(nearestHazardDistance)
      if (bannerRef.current) bannerRef.current.dataset.level = level
      if (nearestRef.current) {
        nearestRef.current.textContent = nearestHazardDistance === null ? '–' : `${nearestHazardDistance.toFixed(1)} m`
      }
      const now = performance.now()
      if (level === 'critical' && (lastLevel !== 'critical' || now - lastAlert > 420)) {
        audio.alert()
        lastAlert = now
      }
      lastLevel = level

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="adas" ref={rootRef} data-available="true" style={{ '--accent': car.theme.accent } as React.CSSProperties}>
      <div className="adas__banner" ref={bannerRef} data-level="none">
        <strong>Surround view</strong>
        <span>
          {count} object{count === 1 ? '' : 's'} tracked · nearest <span ref={nearestRef}>–</span>
        </span>
      </div>

      <div className="adas__unavailable">
        <strong>Surround view paused</strong>
        <span>Short-range sensors resume below {SURROUND_MAX_KPH} km/h</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="adas__plan">
        <rect width={W} height={H} fill="var(--map-bg)" />

        {/* Distance rings. Labelled, because "how many metres" is the question
            a driver is actually asking when they look at this. */}
        {RINGS.map((r) => (
          <g key={r}>
            <circle cx={CX} cy={CY} r={r * PPM} className="adas__ring" />
            <text x={CX + 4} y={CY - r * PPM - 5} className="adas__ring-label">{r} m</text>
          </g>
        ))}

        {/* Detection wedges front and rear, where the sensors actually look. */}
        <path d={wedge(CX, CY, 10.5 * PPM, -58, 58)} className="adas__wedge" />
        <path d={wedge(CX, CY, 7.5 * PPM, 122, 238)} className="adas__wedge" />

        <CarPlan cx={CX} cy={CY} />

        {Array.from({ length: POOL }).map((_, i) => (
          <g key={i} ref={(el) => void (blips.current[i] = el)} className="blip" style={{ opacity: 0 }}>
            <circle r={15} className="blip__halo" />
            <circle r={8} className="blip__dot" />
            <g className="blip__dir">
              <path d="M 0 -20 l 5.5 8 h -11 z" className="blip__arrow" />
            </g>
          </g>
        ))}

        {/* Sector proximity bars, arranged as a legend down the right side. */}
        <g transform={`translate(${W - 258} 46)`}>
          <text x={0} y={-14} className="adas__panel-title">PROXIMITY</text>
          {Array.from({ length: SECTORS }).map((_, i) => (
            <g key={i} transform={`translate(0 ${i * 31})`}>
              <text x={0} y={12} className="adas__sector-label">{SECTOR_NAMES[i]}</text>
              <rect x={78} y={2} width={150} height={13} rx={3} className="adas__sector-track" />
              <rect ref={(el) => void (bars.current[i] = el)} x={78} y={2} width={0} height={13} rx={3} className="adas__sector-bar" data-level="none" />
            </g>
          ))}
        </g>

        {/* The same tracks as a ranked list — closest first. */}
        <g transform={`translate(${W - 258} 336)`}>
          <text x={0} y={0} className="adas__panel-title">TRACKED OBJECTS</text>
          {Array.from({ length: 5 }).map((_, i) => (
            <text
              key={i}
              ref={(el) => void (rows.current[i] = el)}
              x={0}
              y={26 + i * 26}
              className="adas__row"
              data-level="none"
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

const SECTOR_NAMES = ['FRONT', 'F-RIGHT', 'RIGHT', 'R-RIGHT', 'REAR', 'R-LEFT', 'LEFT', 'F-LEFT']

const KIND_LABELS: Record<Hazard['kind'], string> = {
  pedestrian: 'Pedestrian',
  cyclist: 'Cyclist',
  vehicle: 'Vehicle',
}

/** Compass-style bearing relative to the nose of the car. */
function bearingLabel(t: Hazard): string {
  const angle = (Math.atan2(t.x, t.z) * 180) / Math.PI
  const idx = (Math.round(angle / 45) + 8) % 8
  return SECTOR_NAMES[idx]
}

/** Top-down car silhouette, nose up. */
function CarPlan({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx} ${cy})`} className="adas__car">
      {/* Roughly 1.9 m x 4.6 m at the plan's scale. */}
      <rect x={-15} y={-36} width={30} height={72} rx={9} className="adas__car-body" />
      <path d="M -11 -22 h 22 l -3 -9 h -16 z" className="adas__car-glass" />
      <path d="M -11 16 h 22 l -2 9 h -18 z" className="adas__car-glass" />
      <rect x={-13} y={-34} width={5} height={4} rx={1.5} className="adas__car-lamp" />
      <rect x={8} y={-34} width={5} height={4} rx={1.5} className="adas__car-lamp" />
    </g>
  )
}

/** Filled wedge from `from` to `to` degrees, measured clockwise from straight ahead. */
function wedge(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const [x1, y1] = p(from)
  const [x2, y2] = p(to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}
