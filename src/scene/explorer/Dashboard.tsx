import { RoundedBox } from '@react-three/drei'
import { useCar } from '../../cars/garageStore'
import { useCabinMaterials } from './materials'
import { badge } from './textures'
import { StitchRun } from './Stitching'

/**
 * The instrument panel.
 *
 * Built as the reference reads it, top to bottom: a dark padded upper pad with a
 * stitched front edge, a satin trim line running the full width of the cabin
 * carrying the EXPLORER emboss, then a light greige lower fascia holding the
 * vents and the physical control strip.
 *
 * The two-tone split is the single most identifiable thing about this cabin. Get
 * the boundary height wrong and it stops looking like an Explorer immediately,
 * regardless of how good everything else is.
 */
export function Dashboard() {
  const car = useCar()
  const g = car.cockpit
  const t = car.theme
  const m = useCabinMaterials(t)

  const W = g.cabinHalfWidth
  const dashDepth = Math.abs(g.cowlZ - g.fasciaZ)
  const dashMidZ = (g.cowlZ + g.fasciaZ) / 2
  /** Where dark upper meets light lower. */
  const trimY = 1.12
  const fasciaFace = g.fasciaZ + 0.02

  return (
    <group>
      {/* ---------- upper pad ---------- */}
      {/* Rakes gently down toward the windscreen, the way a cowl does. */}
      <RoundedBox
        args={[W * 2.14, 0.11, dashDepth]}
        radius={0.05}
        smoothness={4}
        position={[0, g.dashTopY - 0.055, dashMidZ]}
        rotation={[-0.055, 0, 0]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* The pad's face, dropping from the top surface to the trim line. */}
      <RoundedBox
        args={[W * 2.14, g.dashTopY - trimY + 0.04, 0.14]}
        radius={0.028}
        smoothness={4}
        position={[0, (g.dashTopY + trimY) / 2 - 0.01, g.fasciaZ - 0.05]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Stitching along the pad's leading edge. */}
      <StitchRun
        from={[-W * 0.98, g.dashTopY - 0.004, g.fasciaZ + 0.012]}
        to={[W * 0.98, g.dashTopY - 0.004, g.fasciaZ + 0.012]}
        color={t.stitching}
        count={54}
      />

      {/* ---------- satin trim line ---------- */}
      <RoundedBox
        args={[W * 2.1, 0.015, 0.024]}
        radius={0.008}
        smoothness={3}
        position={[0, trimY, fasciaFace]}
      >
        <meshStandardMaterial {...m.trim} />
      </RoundedBox>

      {/* EXPLORER, embossed on the passenger side of the trim strip. */}
      <mesh position={[0.44, trimY, fasciaFace + 0.017]}>
        <planeGeometry args={[0.26, 0.03]} />
        <meshStandardMaterial
          map={badge('EXPLORER', '#d6d8da', t.trim)}
          roughness={0.36}
          metalness={0.7}
        />
      </mesh>

      {/* ---------- lower fascia ---------- */}
      {/* A band, not a wall. In the reference the greige is a shelf carrying the
          vents and switches, with darkness above and below it; letting it run
          from the trim line to the floor turns the whole lower half of the frame
          into one pale slab and the cabin stops reading as a cabin. */}
      <RoundedBox
        args={[W * 2.14, trimY - 0.93, 0.16]}
        radius={0.035}
        smoothness={4}
        position={[0, (trimY + 0.93) / 2 - 0.005, g.fasciaZ - 0.04]}
      >
        <meshStandardMaterial {...m.dashLower} />
      </RoundedBox>

      {/* Everything below the shelf: dark, receding into the footwells. */}
      <RoundedBox
        args={[W * 2.12, 0.24, 0.2]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.83, g.fasciaZ - 0.07]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Centre-stack surround, proud of the fascia and piped in contrast thread. */}
      <RoundedBox
        args={[0.5, 0.17, 0.04]}
        radius={0.025}
        smoothness={4}
        position={[0.1, 1.03, fasciaFace + 0.006]}
      >
        <meshStandardMaterial {...m.dashLower} />
      </RoundedBox>
      <StitchRun
        from={[-0.12, 1.122, fasciaFace + 0.026]}
        to={[0.3, 1.122, fasciaFace + 0.026]}
        color={t.stitching}
        count={30}
      />

      {/* Knee bolster. */}
      <RoundedBox
        args={[W * 2.0, 0.18, 0.2]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.68, g.fasciaZ - 0.12]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* ---------- vents ---------- */}
      {/* Centre pair, directly under the touchscreen. */}
      <VentPod position={[-0.03, 1.075, fasciaFace + 0.028]} width={0.15} trim={t.trim} />
      <VentPod position={[0.21, 1.075, fasciaFace + 0.028]} width={0.15} trim={t.trim} />
      {/* Outboard pair, at the ends of the trim line. */}
      <VentPod position={[-W * 0.86, 1.09, fasciaFace + 0.024]} width={0.15} trim={t.trim} />
      <VentPod position={[W * 0.86, 1.09, fasciaFace + 0.024]} width={0.15} trim={t.trim} />

      {/* ---------- physical control strip ---------- */}
      {/* Hazards, transport and defrost stay physical in the real car, and it is
          worth keeping them physical here: they are the controls you reach for
          without looking, and a flat glass surface cannot be found by touch. */}
      <group position={[0.11, 0.985, fasciaFace + 0.03]}>
        <RoundedBox args={[0.4, 0.05, 0.022]} radius={0.012} smoothness={3}>
          <meshStandardMaterial {...m.gloss} />
        </RoundedBox>
        {[-0.13, -0.065, 0, 0.065, 0.13].map((x, i) => (
          <mesh key={x} position={[x, 0, 0.014]}>
            <boxGeometry args={[0.028, 0.02, 0.004]} />
            <meshStandardMaterial
              color={i === 2 ? '#c8352b' : '#7d838c'}
              emissive={i === 2 ? '#c8352b' : '#000000'}
              emissiveIntensity={i === 2 ? 0.35 : 0}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>

      {/* Volume knob at the left end of the strip, where a hand lands. */}
      <mesh position={[-0.15, 0.985, fasciaFace + 0.036]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.026, 24]} />
        <meshStandardMaterial {...m.trim} />
      </mesh>

      {/* ---------- steering column shroud ---------- */}
      <mesh position={[g.wheelPosition[0], g.wheelPosition[1] - 0.03, g.wheelPosition[2] - 0.16]} rotation={[Math.PI / 2 - g.columnRake, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.3, 20]} />
        <meshStandardMaterial {...m.dashUpper} />
      </mesh>

      {/* ---------- instrument binnacle ---------- */}
      {/* A hood over the cluster. Its job in the real car is keeping sun off the
          display; here it stops the panel reading as stuck onto the dash. */}
      <group position={[g.clusterPosition[0], g.clusterPosition[1], g.clusterPosition[2]]}>
        <RoundedBox
          args={[g.clusterSize[0] + 0.05, 0.018, 0.13]}
          radius={0.011}
          smoothness={3}
          position={[0, g.clusterSize[1] / 2 + 0.024, 0.06]}
          rotation={[0.28, 0, 0]}
        >
          <meshStandardMaterial {...m.dashUpper} />
        </RoundedBox>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (g.clusterSize[0] / 2 + 0.026), 0.008, 0.05]}>
            <boxGeometry args={[0.018, g.clusterSize[1] + 0.05, 0.11]} />
            <meshStandardMaterial {...m.dashUpper} />
          </mesh>
        ))}
      </group>

      {/* ---------- passenger glovebox ---------- */}
      <mesh position={[0.5, 0.945, fasciaFace + 0.004]}>
        <boxGeometry args={[0.42, 0.005, 0.006]} />
        <meshStandardMaterial color="#00000022" roughness={1} transparent opacity={0.35} />
      </mesh>
      <RoundedBox args={[0.09, 0.02, 0.014]} radius={0.006} smoothness={3} position={[0.5, 0.96, fasciaFace + 0.012]}>
        <meshStandardMaterial {...m.trim} />
      </RoundedBox>
    </group>
  )
}

/** A vent: dark housing, satin blades, offset forward so they catch a highlight. */
function VentPod({
  position,
  width,
  trim,
}: {
  position: [number, number, number]
  width: number
  trim: string
}) {
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.05, 0.03]} radius={0.01} smoothness={3}>
        <meshStandardMaterial color="#0c0d10" roughness={0.78} metalness={0.08} />
      </RoundedBox>
      {[-0.013, 0.002, 0.017].map((y) => (
        <mesh key={y} position={[0, y, 0.017]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[width - 0.016, 0.004, 0.012]} />
          <meshStandardMaterial color={trim} roughness={0.5} metalness={0.45} />
        </mesh>
      ))}
    </group>
  )
}
