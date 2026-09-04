import { useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial } from 'three'
import { useVehicleStore } from '../../state/vehicleStore'
import { palette } from '../lighting'
import { useCar } from '../../cars/garageStore'
import { useCabinMaterials } from './materials'
import { speakerGrille, windowSwitches } from './textures'
import { StitchRun } from './Stitching'

/**
 * Ambient lighting, driven by the time of day rather than left permanently on.
 *
 * A glowing strip in full daylight is the single fastest way to make an interior
 * look like a render. It should be invisible at noon and unmistakable at night.
 */
function AmbientStrip({ x, y, color }: { x: number; y: number; color: string }) {
  const ref = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    if (!ref.current) return
    const night = palette(useVehicleStore.getState().timeOfDay).nightFactor
    ref.current.emissiveIntensity = night * 2.6
  })
  return (
    <mesh position={[x, y, -0.24]}>
      <boxGeometry args={[0.004, 0.006, 1.0]} />
      <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={0} toneMapped={false} />
    </mesh>
  )
}

/**
 * One front door card, mirrored for the passenger side.
 *
 * Carries the same two-tone split as the dash — dark padded upper, greige lower,
 * satin strip along the boundary — because in the real cabin the door and the
 * instrument panel are designed to read as one continuous surface wrapping the
 * occupants. Breaking that continuity is one of the fastest ways to make an
 * interior look assembled from parts.
 */
export function DoorCard({ side }: { side: -1 | 1 }) {
  const car = useCar()
  const g = car.cockpit
  const t = car.theme
  const m = useCabinMaterials(t)

  const X = side * g.cabinHalfWidth
  /** Everything is measured from the inner face, pushing outward. */
  const out = side * 0.055
  const beltY = 1.24
  const splitY = 1.03

  return (
    <group>
      {/* Upper: padded, dark, running from the beltline down to the split. */}
      <RoundedBox
        args={[0.11, beltY - splitY, 1.28]}
        radius={0.035}
        smoothness={3}
        position={[X + out, (beltY + splitY) / 2, -0.2]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Satin strip along the split, sweeping down toward the front of the door. */}
      <mesh position={[X + out * 0.6, splitY - 0.01, -0.24]} rotation={[0, 0, side * -0.06]}>
        <boxGeometry args={[0.018, 0.022, 1.06]} />
        <meshStandardMaterial {...m.trim} />
      </mesh>
      <StitchRun
        from={[X + out * 0.5, splitY + 0.028, -0.72]}
        to={[X + out * 0.5, splitY + 0.028, 0.28]}
        color={t.stitching}
        count={40}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Lower: a greige band matching the dash shelf, then dark below it. */}
      <RoundedBox
        args={[0.1, 0.19, 1.24]}
        radius={0.035}
        smoothness={3}
        position={[X + out * 0.9, splitY - 0.1, -0.18]}
      >
        <meshStandardMaterial {...m.dashLower} />
      </RoundedBox>
      <RoundedBox
        args={[0.095, splitY - 0.2 - g.floorY, 1.2]}
        radius={0.035}
        smoothness={3}
        position={[X + out * 0.85, (splitY - 0.2 + g.floorY) / 2, -0.16]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Armrest: the ledge that carries the switches and the pull cup. */}
      <RoundedBox
        args={[0.15, 0.075, 0.54]}
        radius={0.03}
        smoothness={3}
        position={[X + 0.005 * side, splitY + 0.03, -0.12]}
      >
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Window and lock switches, laid into the armrest facing up. */}
      <mesh position={[X - side * 0.008, splitY + 0.069, -0.16]} rotation={[-Math.PI / 2, 0, side * Math.PI / 2]}>
        <planeGeometry args={[0.26, 0.11]} />
        <meshStandardMaterial map={windowSwitches('#1a1b1f')} roughness={0.62} metalness={0.08} />
      </mesh>

      {/* Satin grab handle, ahead of the armrest. */}
      <RoundedBox
        args={[0.05, 0.036, 0.3]}
        radius={0.016}
        smoothness={3}
        position={[X - side * 0.03, splitY + 0.1, -0.5]}
      >
        <meshStandardMaterial {...m.trim} />
      </RoundedBox>

      {/* Interior release, in brightwork like the real car. */}
      <RoundedBox
        args={[0.03, 0.028, 0.11]}
        radius={0.01}
        smoothness={3}
        position={[X - side * 0.02, splitY + 0.14, -0.66]}
      >
        <meshStandardMaterial {...m.trim} />
      </RoundedBox>

      {/* Speaker, perforations baked into the map rather than modelled. */}
      <mesh position={[X - side * 0.008, 0.82, -0.5]} rotation={[0, side * -Math.PI / 2, 0]}>
        <circleGeometry args={[0.055, 28]} />
        <meshStandardMaterial map={speakerGrille('#242529')} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Ambient light strip along the split line. This is the element that
          carries the trim's personality after dark — red on ST, amber on
          Active — so it is geometry with its own emissive, not a painted line. */}
      <AmbientStrip x={X - side * 0.012} y={splitY + 0.008} color={t.ambient} />
    </group>
  )
}
