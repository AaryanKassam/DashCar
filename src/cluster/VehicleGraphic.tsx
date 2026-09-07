import { useEffect, useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { threatLevel } from '../simulation/pedestrianSpawner'

/**
 * The top-down vehicle in the middle of the cluster.
 *
 * Not decoration. It is the cluster's spatial channel: doors light when they are
 * ajar, and when surround view is sensing, the nearest tracked object appears as
 * a blip on the correct side. A driver who has glanced at this once knows *which*
 * door is open without reading the message line, which is the entire argument
 * for putting a picture of the car in the car.
 *
 * Updated imperatively for the same reason as the needles: the tracked-object
 * list changes at the bus rate.
 */
export function VehicleGraphic() {
  const doors = useVehicleStore((s) => s.doors)
  const blips = useRef<(SVGGElement | null)[]>([])
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let raf = 0
    const frame = () => {
      const { trackedHazards, nearestHazardDistance, surroundViewActive } = useVehicleStore.getState()
      const level = threatLevel(surroundViewActive ? nearestHazardDistance : null)

      if (ring.current) {
        ring.current.dataset.level = level
        ring.current.style.opacity = surroundViewActive ? '1' : '0'
      }

      for (let i = 0; i < blips.current.length; i++) {
        const g = blips.current[i]
        if (!g) continue
        const t = trackedHazards[i]
        if (!t || !surroundViewActive) {
          g.style.opacity = '0'
          continue
        }
        // A proximity ring, not a scale plan. The car silhouette is drawn at
        // roughly 20 px per metre and the envelope reaches 14 m, so a linear
        // map would put anything closer than 6 m *inside* the car. Bearing sets
        // the angle, distance sets how close the blip sits to the body, and the
        // blip is always outside it.
        const distance = Math.hypot(t.x, t.z)
        const bearing = Math.atan2(t.x, t.z)
        const radius = 54 + Math.min(1, distance / 14) * 22
        g.style.opacity = '1'
        g.setAttribute(
          'transform',
          `translate(${60 + Math.sin(bearing) * radius} ${74 - Math.cos(bearing) * radius})`,
        )
        g.dataset.level = threatLevel(distance)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg className="vehicle" viewBox="0 0 120 148" width={120} height={148} aria-hidden="true">
      <circle ref={ring} cx={60} cy={74} r={52} className="vehicle__ring" style={{ opacity: 0 }} />

      {/* Body */}
      <rect x={38} y={22} width={44} height={104} rx={12} className="vehicle__body" />
      <path d="M45 44 h30 l-4 -13 h-22 z" className="vehicle__glass" />
      <path d="M45 106 h30 l-3 13 h-24 z" className="vehicle__glass" />

      {/* Doors, one per corner, lit when ajar. */}
      <rect x={31} y={50} width={9} height={24} rx={3} className="vehicle__door" data-open={doors.frontLeft || undefined} />
      <rect x={80} y={50} width={9} height={24} rx={3} className="vehicle__door" data-open={doors.frontRight || undefined} />
      <rect x={31} y={78} width={9} height={24} rx={3} className="vehicle__door" data-open={doors.rearLeft || undefined} />
      <rect x={80} y={78} width={9} height={24} rx={3} className="vehicle__door" data-open={doors.rearRight || undefined} />
      <rect x={48} y={126} width={24} height={8} rx={3} className="vehicle__door" data-open={doors.trunk || undefined} />

      {/* Tracked objects. */}
      {Array.from({ length: 1 }).map((_, i) => (
        <g key={i} ref={(el) => void (blips.current[i] = el)} className="vehicle__blip" style={{ opacity: 0 }}>
          <circle r={4.5} />
        </g>
      ))}
    </svg>
  )
}
