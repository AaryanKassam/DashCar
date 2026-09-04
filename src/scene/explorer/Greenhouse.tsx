import { RoundedBox } from '@react-three/drei'
import { DoubleSide } from 'three'
import { useCar } from '../../cars/garageStore'
import { useCabinMaterials } from './materials'
import { mirrorWarning } from './textures'

/**
 * Everything above the beltline: pillars, header, headliner, glass and mirrors.
 *
 * The A-pillars are derived from the windshield rake rather than placed by hand,
 * so the glass and the pillar always agree. They are also deliberately thick.
 * Pillar occlusion is a real constraint a driver lives with — it is the reason
 * blind-spot and surround-view systems exist — and thinning them to improve the
 * render would quietly remove the problem the ADAS work is answering.
 */
export function Greenhouse() {
  const car = useCar()
  const g = car.cockpit
  const m = useCabinMaterials(car.theme)

  const W = g.cabinHalfWidth
  const glassX = W + 0.04

  // Windshield: base at the cowl, top at the header. Everything follows.
  const dy = g.roofY - 0.04 - g.dashTopY
  const dz = g.headerZ - g.cowlZ
  const rake = Math.atan2(dz, dy)
  const glassHeight = Math.hypot(dy, dz)
  const glassMidY = g.dashTopY + dy / 2
  const glassMidZ = g.cowlZ + dz / 2

  return (
    <group>
      {/* ---------- A-pillars ---------- */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W + 0.095), glassMidY, glassMidZ]} rotation={[rake, 0, side * 0.06]}>
          <boxGeometry args={[0.062, glassHeight, 0.075]} />
          <meshStandardMaterial {...m.dashUpper} />
        </mesh>
      ))}

      {/* ---------- header rail ---------- */}
      <RoundedBox
        args={[W * 2.16, 0.1, 0.24]}
        radius={0.038}
        smoothness={3}
        position={[0, g.roofY - 0.02, g.headerZ + 0.06]}
        rotation={[0.24, 0, 0]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* ---------- headliner ---------- */}
      <RoundedBox
        args={[W * 2.14, 0.06, 1.9]}
        radius={0.03}
        smoothness={3}
        position={[0, g.roofY + 0.03, g.headerZ + 0.9]}
        rotation={[-0.02, 0, 0]}
      >
        <meshStandardMaterial {...m.headliner} />
      </RoundedBox>

      {/* Sun visors, folded up. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * W * 0.46, g.roofY - 0.02, g.headerZ + 0.16]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[W * 0.74, 0.016, 0.19]} />
          <meshStandardMaterial {...m.headliner} />
        </mesh>
      ))}

      {/* ---------- glass ---------- */}
      {/* Barely there. Its job is to catch a highlight so the opening does not
          read as a hole cut in the geometry, not to be seen. */}
      <mesh position={[0, glassMidY, glassMidZ]} rotation={[rake, 0, 0]}>
        <planeGeometry args={[W * 2.0, glassHeight]} />
        <GlassMaterial />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * glassX, 1.39, -0.32]} rotation={[0, side * Math.PI * 0.5, 0]}>
          <planeGeometry args={[1.4, 0.3]} />
          <GlassMaterial />
        </mesh>
      ))}

      {/* ---------- rear-view mirror ---------- */}
      <group position={g.rearMirrorPosition} rotation={[0.1, 0, 0]}>
        <mesh position={[0, 0.045, 0.01]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.07, 10]} />
          <meshStandardMaterial color="#16171a" roughness={0.7} />
        </mesh>
        <RoundedBox args={[0.27, 0.072, 0.024]} radius={0.011} smoothness={3}>
          <meshStandardMaterial color="#111214" roughness={0.55} metalness={0.1} />
        </RoundedBox>
        <mesh position={[0, 0, 0.014]}>
          <planeGeometry args={[0.25, 0.056]} />
          {/* A dark, very smooth surface: it reflects the generated environment,
              which at studio brightness gives it the pale sheen a mirror has. */}
          <meshStandardMaterial color="#2c3238" roughness={0.06} metalness={0.95} />
        </mesh>
      </group>

      {/* ---------- door mirrors ---------- */}
      {[-1, 1].map((side) => (
        <DoorMirror key={side} side={side as -1 | 1} position={g.mirrorPosition} />
      ))}
    </group>
  )
}

function GlassMaterial() {
  return (
    <meshPhysicalMaterial
      color="#aac3d6"
      transparent
      opacity={0.07}
      roughness={0.04}
      metalness={0}
      side={DoubleSide}
      depthWrite={false}
    />
  )
}

/**
 * A door mirror, seen through the side glass.
 *
 * The passenger mirror carries the convex-mirror warning; the driver's does not,
 * because in reality only the convex one needs it. Small asymmetries like this
 * are cheap and do a lot of work — a cabin where both sides are identical reads
 * as a model, and a cabin where they differ correctly reads as a car.
 */
function DoorMirror({ side, position }: { side: -1 | 1; position: [number, number, number] }) {
  const car = useCar()
  const m = useCabinMaterials(car.theme)

  return (
    <group position={[side * position[0], position[1], position[2]]} rotation={[0, side * -0.34, 0]}>
      {/* Stalk back to the door. */}
      <mesh position={[side * 0.07, -0.02, 0.08]} rotation={[0, 0, side * 0.5]}>
        <boxGeometry args={[0.11, 0.03, 0.05]} />
        <meshStandardMaterial color="#1c1d20" roughness={0.7} />
      </mesh>
      {/* Housing, in body colour like the real car. */}
      <RoundedBox args={[0.25, 0.135, 0.08]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color={car.exterior.paint} roughness={0.35} metalness={0.35} />
      </RoundedBox>
      <mesh position={[side * -0.004, 0, 0.033]}>
        <planeGeometry args={[0.215, 0.108]} />
        {side > 0 ? (
          <meshStandardMaterial map={mirrorWarning()} roughness={0.12} metalness={0.6} />
        ) : (
          <meshStandardMaterial color="#b9bec4" roughness={0.1} metalness={0.7} />
        )}
      </mesh>
      {/* Turn-signal repeater along the top edge. */}
      <mesh position={[0, 0.062, 0.02]}>
        <boxGeometry args={[0.15, 0.009, 0.034]} />
        <meshStandardMaterial {...m.gloss} />
      </mesh>
    </group>
  )
}
