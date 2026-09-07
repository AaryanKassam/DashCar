import { useEffect, useRef, useState } from 'react'
import { world } from '../../simulation/worldState'
import { useCar } from '../../cars/garageStore'
import { useLiveDataStore } from '../../state/liveDataStore'
import { MAP_CENTRE, OSM_ATTRIBUTION, lonLatToTile, tileUrl } from '../liveData'

/**
 * Navigation.
 *
 * Two things make this feel like a real nav system rather than a picture:
 *  1. The car marker advances along the route from `world.distance`, so the map
 *     is driven by the same speed signal as everything else.
 *  2. Detail is revealed by *zooming*, not by opening a new screen. A driver
 *     keeps their spatial context when the map they were already reading grows
 *     into the junction, which they lose entirely if the view is replaced.
 */

const VIEW_W = 1100
const VIEW_H = 470

/** The active route, in map units. */
const ROUTE_D =
  'M 90 420 L 232 420 Q 268 420 268 384 L 268 268 Q 268 232 304 232 L 470 232 ' +
  'Q 506 232 506 196 L 506 138 Q 506 102 542 102 L 742 102 Q 778 102 778 138 ' +
  'L 778 250 Q 778 286 814 286 L 1010 286'

/** Real-world length the drawn route represents. */
const ROUTE_METRES = 2400

interface Maneuver {
  /** Fraction along the route. */
  at: number
  turn: 'left' | 'right' | 'straight' | 'arrive'
  road: string
  detail: string
}

const MANEUVERS: Maneuver[] = [
  { at: 0.12, turn: 'right', road: 'Woodward Ave', detail: 'Keep right, two lanes ahead' },
  { at: 0.32, turn: 'right', road: 'Michigan Ave', detail: 'Traffic signal, then merge' },
  { at: 0.5, turn: 'right', road: 'Grand Blvd', detail: 'Right lane, bus lane ends' },
  { at: 0.74, turn: 'right', road: 'Jefferson St', detail: 'Sharp right after the bridge' },
  { at: 1.0, turn: 'arrive', road: 'Destination', detail: 'Parking on the right' },
]

interface Poi {
  id: string
  x: number
  y: number
  name: string
  category: string
  meta: string
  kind: 'fuel' | 'charge' | 'coffee' | 'parking'
}

const POIS: Poi[] = [
  { id: 'p1', x: 320, y: 300, name: 'Shell Woodward', category: 'Fuel', meta: '4 min · $3.42/gal', kind: 'fuel' },
  { id: 'p2', x: 604, y: 160, name: 'Blue Point Cafe', category: 'Coffee', meta: '2 min · Open until 20:00', kind: 'coffee' },
  { id: 'p3', x: 840, y: 200, name: 'Riverside Garage', category: 'Parking', meta: '6 min · 42 spaces', kind: 'parking' },
  { id: 'p4', x: 470, y: 340, name: 'FastCharge Hub', category: 'Charging', meta: '5 min · 8 of 12 free', kind: 'charge' },
]

type Focus = { cx: number; cy: number; scale: number; poi?: Poi; maneuver?: Maneuver } | null

export function MapApp() {
  const car = useCar()
  const routeRef = useRef<SVGPathElement>(null)
  const markerRef = useRef<SVGGElement>(null)
  const travelledRef = useRef<SVGPathElement>(null)
  const distanceRef = useRef<HTMLSpanElement>(null)
  const etaRef = useRef<HTMLSpanElement>(null)
  const [focus, setFocus] = useState<Focus>(null)
  const liveTiles = useLiveDataStore((s) => s.mapTiles)
  const [nextIdx, setNextIdx] = useState(0)

  useEffect(() => {
    const path = routeRef.current
    if (!path) return
    const total = path.getTotalLength()
    let raf = 0
    let lastIdx = -1

    const frame = () => {
      // Loop the route so the demo never runs out of road.
      const progress = ((world.distance / ROUTE_METRES) % 1 + 1) % 1
      const pt = path.getPointAtLength(progress * total)
      // Heading from a short lookahead, so the marker points where it is going.
      const ahead = path.getPointAtLength(Math.min(total, progress * total + 6))
      const heading = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI

      markerRef.current?.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${heading})`)
      travelledRef.current?.style.setProperty('stroke-dashoffset', String(total * (1 - progress)))

      const idx = MANEUVERS.findIndex((m) => m.at > progress)
      const safeIdx = idx === -1 ? MANEUVERS.length - 1 : idx
      if (safeIdx !== lastIdx) {
        lastIdx = safeIdx
        setNextIdx(safeIdx)
      }

      const metresToTurn = Math.max(0, (MANEUVERS[safeIdx].at - progress) * ROUTE_METRES)
      if (distanceRef.current) {
        distanceRef.current.textContent =
          metresToTurn >= 1000 ? `${(metresToTurn / 1000).toFixed(1)} km` : `${Math.round(metresToTurn / 10) * 10} m`
      }
      if (etaRef.current) {
        const remaining = (1 - progress) * ROUTE_METRES
        const speedMs = Math.max(world.speedMs, 6)
        const mins = Math.ceil(remaining / speedMs / 60)
        etaRef.current.textContent = `${mins} min · ${(remaining / 1000).toFixed(1)} km`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const zoomTo = (cx: number, cy: number, scale: number, extra: Partial<NonNullable<Focus>>) =>
    setFocus({ cx, cy, scale, ...extra })

  const focusManeuver = () => {
    const path = routeRef.current
    if (!path) return
    const m = MANEUVERS[nextIdx]
    const pt = path.getPointAtLength(m.at * path.getTotalLength())
    zoomTo(pt.x, pt.y, 3.4, { maneuver: m })
  }

  const transform = focus
    ? `translate(${VIEW_W / 2 - focus.scale * focus.cx}px, ${VIEW_H / 2 - focus.scale * focus.cy}px) scale(${focus.scale})`
    : 'translate(0px, 0px) scale(1)'

  const next = MANEUVERS[nextIdx]

  return (
    <div className="map">
      <button className="map__banner" onClick={focusManeuver} aria-label="Zoom to next manoeuvre">
        <TurnArrow turn={next.turn} />
        <span className="map__banner-dist" ref={distanceRef}>–</span>
        <span className="map__banner-road">
          <strong>{next.road}</strong>
          <small>{next.detail}</small>
        </span>
        <span className="map__eta" ref={etaRef}>–</span>
      </button>

      <div className="map__canvas">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" onClick={() => setFocus(null)}>
          <defs>
            <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={VIEW_W} height={VIEW_H} fill="var(--map-bg)" />

          {/* One transformed group carries the entire map, so the zoom is a
              single continuous camera move rather than a screen change. */}
          <g
            style={{
              transform,
              transformOrigin: '0 0',
              transition: 'transform 760ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {liveTiles ? <TileLayer /> : <MapBase />}

            <path ref={routeRef} d={ROUTE_D} fill="none" stroke="var(--map-route-dim)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
            <RouteProgress d={ROUTE_D} accent={car.theme.accent} ref={travelledRef} />

            {POIS.map((p) => (
              <g
                key={p.id}
                className="poi"
                data-active={focus?.poi?.id === p.id || undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  zoomTo(p.x, p.y, 3.4, { poi: p })
                }}
              >
                <circle cx={p.x} cy={p.y} r={15} className="poi__hit" />
                <circle cx={p.x} cy={p.y} r={11} className="poi__dot" />
                <PoiGlyph kind={p.kind} x={p.x} y={p.y} />
              </g>
            ))}

            <g ref={markerRef} className="map__car">
              <circle r={16} className="map__car-halo" />
              <path d="M -9 -8 L 13 0 L -9 8 L -4 0 Z" fill="var(--accent)" stroke="#0b0d10" strokeWidth={1.5} />
            </g>
          </g>
        </svg>

        {/* Detail card — the payoff of the zoom. */}
        <div className="map__card" data-open={(focus?.poi || focus?.maneuver) ? true : undefined}>
          {focus?.poi && (
            <>
              <span className="map__card-cat">{focus.poi.category}</span>
              <strong>{focus.poi.name}</strong>
              <small>{focus.poi.meta}</small>
              <div className="map__card-actions">
                <button className="btn btn--primary">Add stop</button>
                <button className="btn" onClick={() => setFocus(null)}>Back to route</button>
              </div>
            </>
          )}
          {focus?.maneuver && !focus.poi && (
            <>
              <span className="map__card-cat">Next manoeuvre</span>
              <strong>{focus.maneuver.road}</strong>
              <small>{focus.maneuver.detail}</small>
              <div className="map__card-actions">
                <button className="btn" onClick={() => setFocus(null)}>Back to route</button>
              </div>
            </>
          )}
        </div>

        {liveTiles && <span className="map__attribution">{OSM_ATTRIBUTION}</span>}

        {focus && (
          <button className="map__zoomout" onClick={() => setFocus(null)} aria-label="Zoom out to route overview">
            ⤢ Overview
          </button>
        )}
      </div>
    </div>
  )
}

/** The travelled portion, revealed with a dash offset the loop animates. */
const RouteProgress = ({ d, accent, ref }: { d: string; accent: string; ref: React.Ref<SVGPathElement> }) => (
  <path
    ref={ref}
    d={d}
    fill="none"
    stroke={accent}
    strokeWidth={8}
    strokeLinecap="round"
    strokeLinejoin="round"
    filter="url(#routeGlow)"
    style={{ strokeDasharray: 4000, strokeDashoffset: 4000 }}
  />
)

/** Static background: blocks, parks, water and unnamed streets. */
function MapBase() {
  return (
    <g className="map__base">
      <path d="M 0 300 Q 200 250 380 300 T 780 330 T 1100 300 L 1100 470 L 0 470 Z" fill="var(--map-water)" opacity={0.35} />
      <rect x={560} y={310} width={230} height={130} rx={10} fill="var(--map-park)" opacity={0.55} />
      <rect x={120} y={60} width={180} height={110} rx={8} fill="var(--map-block)" />
      <rect x={340} y={40} width={140} height={120} rx={8} fill="var(--map-block)" />
      <rect x={860} y={60} width={190} height={130} rx={8} fill="var(--map-block)" />
      <rect x={150} y={220} width={90} height={90} rx={8} fill="var(--map-block)" />
      <rect x={900} y={350} width={160} height={90} rx={8} fill="var(--map-block)" />

      {[
        'M 0 180 H 1100', 'M 0 340 H 1100', 'M 160 0 V 470', 'M 620 0 V 470', 'M 950 0 V 470',
        'M 0 90 H 520', 'M 700 0 V 180', 'M 300 200 H 900',
      ].map((d, i) => (
        <path key={i} d={d} stroke="var(--map-street)" strokeWidth={i < 5 ? 7 : 4} fill="none" strokeLinecap="round" />
      ))}
    </g>
  )
}

function TurnArrow({ turn }: { turn: Maneuver['turn'] }) {
  const paths: Record<Maneuver['turn'], string> = {
    right: 'M 7 26 V 16 A 6 6 0 0 1 13 10 H 22 M 18 5 l 6 5 -6 5',
    left: 'M 25 26 V 16 A 6 6 0 0 0 19 10 H 10 M 14 5 l -6 5 6 5',
    straight: 'M 16 27 V 8 M 10 13 l 6 -6 6 6',
    arrive: 'M 16 4 a 8 8 0 0 1 8 8 c 0 6 -8 16 -8 16 s -8 -10 -8 -16 a 8 8 0 0 1 8 -8 z M 16 12 h .01',
  }
  return (
    <svg viewBox="0 0 32 32" width={40} height={40} className="map__turn" aria-hidden="true">
      <path d={paths[turn]} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PoiGlyph({ kind, x, y }: { kind: Poi['kind']; x: number; y: number }) {
  // Letterforms rather than emoji: emoji in SVG <text> depends on a font the
  // platform may not have, and a missing glyph on a map pin is a broken pin.
  const glyph: Record<Poi['kind'], string> = { fuel: 'F', charge: 'E', coffee: 'C', parking: 'P' }
  return (
    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="#0b0d10">
      {glyph[kind]}
    </text>
  )
}

/**
 * Real OpenStreetMap raster tiles, drawn under the route.
 *
 * A fixed 4x3 block around the demo route rather than a pannable slippy map:
 * the interaction this screen is demonstrating is *zoom to a junction*, not
 * free browsing, and the OSM tile servers are donated infrastructure that
 * should not be asked for more than the view needs.
 *
 * Attribution is drawn on the map because the usage policy requires it, not
 * because it is decorative.
 */
function TileLayer() {
  const zoom = 14
  const size = 256
  const origin = lonLatToTile(MAP_CENTRE.lon, MAP_CENTRE.lat, zoom)
  const cols = 5
  const rows = 3
  const x0 = Math.floor(origin.x) - 2
  const y0 = Math.floor(origin.y) - 1
  // Scale the tile block to cover the viewBox.
  const scale = VIEW_W / (cols * size)

  return (
    <g className="map__tiles" transform={`scale(${scale})`} opacity={0.85}>
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <image
            key={`${r}:${c}`}
            href={tileUrl(zoom, x0 + c, y0 + r)}
            x={c * size}
            y={r * size}
            width={size}
            height={size}
            preserveAspectRatio="none"
          />
        )),
      )}
    </g>
  )
}
