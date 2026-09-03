import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, Mesh, MeshStandardMaterial } from 'three'
import { useVehicleStore } from '../state/vehicleStore'
import { threatLevel } from '../simulation/pedestrianSpawner'
import type { Hazard } from '../state/vehicleTypes'

/**
 * The tracked objects, drawn in the world.
 *
 * A pooled set of actors is reused frame to frame rather than mounting and
 * unmounting React components as tracks appear and disappear — object churn at
 * 50 Hz is exactly the kind of thing that makes an HMI stutter, and stutter in
 * a safety display is not a cosmetic problem.
 *
 * Each actor carries all three silhouettes and shows one. A pedestrian has to
 * be identifiable *as a pedestrian* at a glance through a windscreen; a
 * coloured box tells the driver an object exists but not what it will do next,
 * and what it will do next is the entire question.
 *
 * The ground ring, not the figure, is what the eye actually locks onto: it stays
 * visible when the body is behind an A-pillar, and its colour encodes threat
 * without needing to be read.
 */

const POOL = 8

const THREAT_COLORS = {
  none: '#8899aa',
  info: '#6fd3ff',
  caution: '#ffb02e',
  critical: '#ff4438',
} as const

interface ActorRefs {
  group: Group | null
  ring: Mesh | null
  bodies: Partial<Record<Hazard['kind'], Group | null>>
  tinted: Mesh[]
}

export function HazardActors() {
  const actors = useRef<ActorRefs[]>(
    Array.from({ length: POOL }, () => ({ group: null, ring: null, bodies: {}, tinted: [] })),
  )
  const tmp = useMemo(() => new Color(), [])

  useFrame(() => {
    const tracks = useVehicleStore.getState().trackedHazards

    for (let i = 0; i < POOL; i++) {
      const actor = actors.current[i]
      const g = actor.group
      if (!g) continue

      const t = tracks[i]
      if (!t) {
        g.visible = false
        continue
      }
      g.visible = true

      // Track frame is +x right, +z forward; Three's forward is -z.
      g.position.set(t.x, 0, -t.z)
      g.rotation.y = Math.atan2(t.vx, -t.vz)

      for (const kind of ['pedestrian', 'cyclist', 'vehicle'] as const) {
        const body = actor.bodies[kind]
        if (body) body.visible = kind === t.kind
      }

      const distance = Math.hypot(t.x, t.z)
      const level = threatLevel(distance)
      tmp.set(THREAT_COLORS[level])

      if (actor.ring) {
        const mat = actor.ring.material as MeshStandardMaterial
        mat.color.copy(tmp)
        mat.emissive.copy(tmp)
        // Critical tracks pulse. Motion is noticed faster than colour, and by
        // the time a driver has resolved a hue the object has moved.
        const beat = level === 'critical' ? Math.sin(performance.now() * 0.012) : 0
        mat.emissiveIntensity = level === 'critical' ? 1.6 + beat * 0.9 : 1.1
        actor.ring.scale.setScalar(1 + beat * 0.08)
      }

      // The figures stay a neutral grey and take only a wash of the threat
      // colour: recolouring a person red makes them harder to recognise as a
      // person, which is the opposite of what the display is for.
      for (const mesh of actor.tinted) {
        const mat = mesh.material as MeshStandardMaterial
        mat.emissive.copy(tmp)
        mat.emissiveIntensity = level === 'critical' ? 0.16 : level === 'caution' ? 0.09 : 0.05
      }
    }
  })

  const register = (i: number) => ({
    group: (el: Group | null) => void (actors.current[i].group = el),
    ring: (el: Mesh | null) => void (actors.current[i].ring = el),
    body: (kind: Hazard['kind']) => (el: Group | null) => void (actors.current[i].bodies[kind] = el),
    tint: (el: Mesh | null) => {
      if (el && !actors.current[i].tinted.includes(el)) actors.current[i].tinted.push(el)
    },
  })

  return (
    <group>
      {Array.from({ length: POOL }).map((_, i) => {
        const ref = register(i)
        return (
          <group key={i} ref={ref.group} visible={false}>
            <mesh ref={ref.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <ringGeometry args={[0.66, 0.92, 32]} />
              <meshStandardMaterial
                color="#ffb02e"
                emissive="#ffb02e"
                emissiveIntensity={1.2}
                toneMapped={false}
                transparent
                opacity={0.92}
              />
            </mesh>

            {/* Pedestrian: torso, head, legs. */}
            <group ref={ref.body('pedestrian')}>
              <mesh ref={ref.tint} position={[0, 1.12, 0]}>
                <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
                <BodyMaterial />
              </mesh>
              <mesh ref={ref.tint} position={[0, 1.58, 0]}>
                <sphereGeometry args={[0.115, 12, 10]} />
                <BodyMaterial />
              </mesh>
              {[-0.09, 0.09].map((x) => (
                <mesh key={x} ref={ref.tint} position={[x, 0.42, 0]}>
                  <capsuleGeometry args={[0.075, 0.5, 4, 8]} />
                  <BodyMaterial />
                </mesh>
              ))}
            </group>

            {/* Cyclist: rider over two wheels. */}
            <group ref={ref.body('cyclist')} visible={false}>
              <mesh ref={ref.tint} position={[0, 1.24, 0]} rotation={[0.35, 0, 0]}>
                <capsuleGeometry args={[0.16, 0.4, 4, 10]} />
                <BodyMaterial />
              </mesh>
              <mesh ref={ref.tint} position={[0, 1.62, -0.12]}>
                <sphereGeometry args={[0.115, 12, 10]} />
                <BodyMaterial />
              </mesh>
              {[-0.52, 0.52].map((z) => (
                <mesh key={z} ref={ref.tint} position={[0, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.33, 0.035, 8, 20]} />
                  <BodyMaterial />
                </mesh>
              ))}
            </group>

            {/* Vehicle: body plus a greenhouse, so orientation is legible. */}
            <group ref={ref.body('vehicle')} visible={false}>
              <mesh ref={ref.tint} position={[0, 0.62, 0]}>
                <boxGeometry args={[1.78, 0.72, 4.3]} />
                <BodyMaterial />
              </mesh>
              <mesh ref={ref.tint} position={[0, 1.16, 0.2]}>
                <boxGeometry args={[1.6, 0.5, 2.2]} />
                <BodyMaterial />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}

/** Each actor needs its own material instance so tints do not bleed across the pool. */
function BodyMaterial() {
  return <meshStandardMaterial color="#4d5665" roughness={0.82} metalness={0.04} emissive="#000000" emissiveIntensity={0} />
}
