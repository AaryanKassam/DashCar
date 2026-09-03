import { useMemo, useRef } from 'react'
import { useSignalAnimation } from './useSignalAnimation'
import type { VehicleStore } from '../state/vehicleStore'

/**
 * A swept-arc instrument.
 *
 * Sweep runs 140deg -> 400deg: it starts at the lower left, passes over the
 * top, and ends at the lower right. That is the layout drivers have read for a
 * century, and copying it means nobody has to learn this gauge.
 *
 * The needle and the value arc are updated by writing SVG attributes directly
 * from a rAF loop — see `useSignalAnimation`. React renders the ticks and
 * labels exactly once.
 */

const START = 140
const END = 400
const SWEEP = END - START

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export interface ArcGaugeProps {
  size: number
  min: number
  max: number
  read: (s: VehicleStore) => number
  label: string
  unit?: string
  accent: string
  /** Values at or above this are drawn in the warning colour (e.g. redline). */
  warnFrom?: number
  majorStep: number
  minorPerMajor?: number
  tickLabel?: (v: number) => string
  showNeedle?: boolean
  /** Numeric readout inside the dial. */
  readout?: (v: number) => string
  responsiveness?: number
}

export function ArcGauge({
  size,
  min,
  max,
  read,
  label,
  unit,
  accent,
  warnFrom,
  majorStep,
  minorPerMajor = 2,
  tickLabel = (v) => String(v),
  showNeedle = true,
  readout,
  responsiveness = 7,
}: ArcGaugeProps) {
  const needleRef = useRef<SVGGElement>(null)
  const valueArcRef = useRef<SVGPathElement>(null)
  const readoutRef = useRef<SVGTextElement>(null)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.415
  const trackWidth = Math.max(4, size * 0.036)

  const norm = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)))
  const angleOf = (v: number) => START + norm(v) * SWEEP

  const ticks = useMemo(() => {
    const out: { v: number; major: boolean }[] = []
    const step = majorStep / (minorPerMajor + 1)
    for (let v = min; v <= max + 1e-6; v += step) {
      const isMajor = Math.abs(v / majorStep - Math.round(v / majorStep)) < 1e-6
      out.push({ v: Math.round(v * 1000) / 1000, major: isMajor })
    }
    return out
  }, [min, max, majorStep, minorPerMajor])

  // Full-sweep length, used so the value arc can be revealed with a dash offset
  // instead of rebuilding the path string 60 times a second.
  const sweepLength = useMemo(() => (Math.PI * 2 * r * SWEEP) / 360, [r])

  useSignalAnimation(
    read,
    (v) => {
      const t = norm(v)
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${START + t * SWEEP} ${cx} ${cy})`)
      }
      if (valueArcRef.current) {
        valueArcRef.current.style.strokeDashoffset = String(sweepLength * (1 - t))
        // Written every frame, not only when a warning threshold exists. React
        // reuses this DOM node when the cluster swaps one gauge for another
        // (the tach and the EV power meter occupy the same slot), and it has no
        // idea an inline style was set imperatively — so a stale accent colour
        // from the previous car survives the swap unless it is refreshed here.
        valueArcRef.current.style.stroke = warnFrom !== undefined && v >= warnFrom ? 'var(--warn)' : accent
      }
      if (readoutRef.current && readout) readoutRef.current.textContent = readout(v)
    },
    responsiveness,
  )

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="gauge">
      {/* Track */}
      <path d={arcPath(cx, cy, r, START, END)} stroke="var(--gauge-track)" strokeWidth={trackWidth} fill="none" strokeLinecap="round" />

      {/* Redline / warning zone, drawn under the value arc. */}
      {warnFrom !== undefined && (
        <path
          d={arcPath(cx, cy, r, angleOf(warnFrom), END)}
          stroke="var(--warn)"
          strokeWidth={trackWidth}
          fill="none"
          opacity={0.34}
          strokeLinecap="butt"
        />
      )}

      {/* Value arc */}
      <path
        ref={valueArcRef}
        d={arcPath(cx, cy, r, START, END)}
        stroke={accent}
        strokeWidth={trackWidth}
        fill="none"
        strokeLinecap="round"
        style={{ strokeDasharray: `${sweepLength} ${sweepLength * 2}`, strokeDashoffset: sweepLength }}
      />

      {/* Ticks and numerals */}
      {ticks.map(({ v, major }, i) => {
        const a = angleOf(v)
        const inner = major ? r - trackWidth * 1.5 : r - trackWidth * 1.05
        const [x1, y1] = polar(cx, cy, r - trackWidth * 0.62, a)
        const [x2, y2] = polar(cx, cy, inner, a)
        const past = warnFrom !== undefined && v >= warnFrom
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={past ? 'var(--warn)' : 'var(--gauge-tick)'}
            strokeWidth={major ? size * 0.013 : size * 0.007}
            strokeLinecap="round"
          />
        )
      })}
      {ticks
        .filter((t) => t.major)
        .map(({ v }, i) => {
          const [x, y] = polar(cx, cy, r - trackWidth * 2.6, angleOf(v))
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="gauge-tick-label" fontSize={size * 0.075}>
              {tickLabel(v)}
            </text>
          )
        })}

      {/* Needle: drawn pointing along +x, then rotated into place. */}
      {showNeedle && (
        <g ref={needleRef} transform={`rotate(${START} ${cx} ${cy})`}>
          <path
            d={`M ${cx - size * 0.055} ${cy} L ${cx} ${cy - size * 0.016} L ${cx + r - trackWidth * 0.8} ${cy - size * 0.006}
                L ${cx + r - trackWidth * 0.8} ${cy + size * 0.006} L ${cx} ${cy + size * 0.016} Z`}
            fill={accent}
          />
          <circle cx={cx} cy={cy} r={size * 0.045} fill="var(--gauge-hub)" stroke={accent} strokeWidth={size * 0.008} />
        </g>
      )}

      {readout && (
        <text ref={readoutRef} x={cx} y={cy + size * (showNeedle ? 0.26 : 0.02)} textAnchor="middle" className="gauge-readout" fontSize={size * (showNeedle ? 0.12 : 0.26)}>
          0
        </text>
      )}

      <text x={cx} y={cy + size * (showNeedle ? 0.36 : 0.2)} textAnchor="middle" className="gauge-label" fontSize={size * 0.068}>
        {unit ? `${label} · ${unit}` : label}
      </text>
    </svg>
  )
}

/** Linear bar variant, used by the digital cluster style and for fuel/temp. */
export function BarGauge({
  read,
  label,
  accent,
  min = 0,
  max = 1,
  warnBelow,
  warnAbove,
  segments = 14,
  readout,
}: {
  read: (s: VehicleStore) => number
  label: string
  accent: string
  min?: number
  max?: number
  warnBelow?: number
  warnAbove?: number
  segments?: number
  readout?: (v: number) => string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)

  useSignalAnimation(
    read,
    (v) => {
      const t = Math.max(0, Math.min(1, (v - min) / (max - min)))
      const lit = Math.round(t * segments)
      const warn = (warnBelow !== undefined && v < warnBelow) || (warnAbove !== undefined && v > warnAbove)
      const el = wrapRef.current
      if (el) {
        // Segmented bars are easier to read at a glance than a continuous fill:
        // the driver counts blocks instead of estimating a length.
        const kids = el.children
        for (let i = 0; i < kids.length; i++) {
          const on = i < lit
          const node = kids[i] as HTMLElement
          node.style.background = on ? (warn ? 'var(--warn)' : accent) : 'var(--gauge-track)'
          node.style.opacity = on ? '1' : '0.55'
        }
      }
      if (readoutRef.current && readout) readoutRef.current.textContent = readout(v)
    },
    5,
  )

  return (
    <div className="bar-gauge">
      <div className="bar-gauge__head">
        <span className="bar-gauge__label">{label}</span>
        {readout && <span ref={readoutRef} className="bar-gauge__value" />}
      </div>
      <div className="bar-gauge__track" ref={wrapRef}>
        {Array.from({ length: segments }).map((_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  )
}
