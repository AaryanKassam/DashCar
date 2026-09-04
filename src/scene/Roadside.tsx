import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import { ROAD_HALF_WIDTH, roadBend, roadElevation } from './roadGeometry'
import { world } from '../simulation/worldState'
import { useVehicleStore } from '../state/vehicleStore'
import { palette } from './lighting'

/**
 * Roadside scenery: the motion-parallax cue that sells the speed.
 *
 * The road shader alone gives you sliding stripes, which the eye reads as a
 * texture animation. Objects with real perspective sweeping past the A-pillar
 * are what make it read as *travel*. They recycle modulo the total run length,
 * so a fixed 96 instances cover infinite road.
 *
 * They must use the exact same bend/elevation functions as the road shader,
 * otherwise trees float off the verge as soon as you steer.
 */

const TREE_COUNT = 26
const TREE_SPACING = 26
const POLE_COUNT = 14
const POLE_SPACING = 48

/** Deterministic per-instance jitter, so a given tree is always the same tree. */
function hash(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453
  return x - Math.floor(x)
}

/** Positive modulo — JS `%` keeps the sign of the dividend. */
const wrap = (v: number, m: number) => ((v % m) + m) % m

export function Roadside() {
  const foliage = useRef<InstancedMesh>(null)
  const trunks = useRef<InstancedMesh>(null)
  const poles = useRef<InstancedMesh>(null)
  const lamps = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const lampColor = useMemo(() => new Color(), [])

  useFrame(() => {
    const s = useVehicleStore.getState()
    const p = palette(s.timeOfDay)
    const { distance, curvature, lateralOffset } = world

    // Trees have no business in a photographic studio.
    const visible = world.studio < 0.92
    for (const ref of [foliage, trunks, poles, lamps]) {
      if (ref.current) ref.current.visible = visible
    }
    if (!visible) return

    const place = (depth: number, lateral: number) => {
      dummy.position.set(roadBend(depth, curvature) - lateralOffset + lateral, roadElevation(depth, distance), -depth)
    }

    // --- trees, both verges ------------------------------------------------
    const totalTree = TREE_COUNT * TREE_SPACING
    for (let i = 0; i < TREE_COUNT * 2; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const idx = Math.floor(i / 2)
      const r = hash(i)
      const depth = wrap(idx * TREE_SPACING + r * TREE_SPACING * 0.8 - distance, totalTree)
      const lateral = side * (ROAD_HALF_WIDTH + 6 + r * 14)
      const scale = 0.75 + hash(i + 91) * 0.8

      place(depth, lateral)
      dummy.scale.setScalar(scale)
      dummy.rotation.y = r * Math.PI * 2

      // Trunk spans ground to 3.2 m, canopy overlaps it from 2.0 to 8.4 m.
      const ground = dummy.position.y
      dummy.position.y = ground + 5.2 * scale
      dummy.updateMatrix()
      foliage.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.y = ground + 1.6 * scale
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(i, dummy.matrix)
    }

    // --- light poles, right verge only, as on a real carriageway -----------
    const totalPole = POLE_COUNT * POLE_SPACING
    for (let i = 0; i < POLE_COUNT; i++) {
      const depth = wrap(i * POLE_SPACING - distance, totalPole)
      place(depth, ROAD_HALF_WIDTH + 1.4)
      dummy.scale.setScalar(1)
      dummy.rotation.y = 0
      dummy.position.y += 4.2
      dummy.updateMatrix()
      poles.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.y += 4.0
      dummy.position.x -= 1.1
      dummy.updateMatrix()
      lamps.current?.setMatrixAt(i, dummy.matrix)
    }

    for (const ref of [foliage, trunks, poles, lamps]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }

    // Street lamps only glow once it is actually dark.
    if (lamps.current) {
      const mat = lamps.current.material as { emissiveIntensity?: number; color?: Color }
      if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = p.nightFactor * 1.5
      mat.color?.copy(lampColor.set('#ffdca8'))
    }
  })

  return (
    <group>
      <instancedMesh ref={foliage} args={[undefined, undefined, TREE_COUNT * 2]} frustumCulled={false} castShadow={false}>
        <coneGeometry args={[1.9, 6.4, 7]} />
        <meshStandardMaterial color="#2f4a2a" roughness={0.95} flatShading />
      </instancedMesh>

      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_COUNT * 2]} frustumCulled={false}>
        <cylinderGeometry args={[0.18, 0.28, 3.2, 6]} />
        <meshStandardMaterial color="#3d2f24" roughness={1} />
      </instancedMesh>

      <instancedMesh ref={poles} args={[undefined, undefined, POLE_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.09, 0.13, 8.4, 6]} />
        <meshStandardMaterial color="#5a5f66" roughness={0.7} metalness={0.3} />
      </instancedMesh>

      <instancedMesh ref={lamps} args={[undefined, undefined, POLE_COUNT]} frustumCulled={false}>
        <boxGeometry args={[2.2, 0.16, 0.5]} />
        <meshStandardMaterial color="#ffdca8" emissive="#ffdca8" emissiveIntensity={0} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
