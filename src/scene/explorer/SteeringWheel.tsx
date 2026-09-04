import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Group } from 'three'
import { useCar } from '../../cars/garageStore'
import { world } from '../../simulation/worldState'
import { useCabinMaterials } from './materials'
import { hubOval, spokeButtons } from './textures'
import { StitchArc } from './Stitching'

/**
 * The Explorer's three-spoke wheel.
 *
 * Horizontal spokes at nine and three carrying button pads, a lower spoke with a
 * satin insert, a blue oval on the hub, and contrast stitching along the upper
 * rim. The top of the wheel is left clear of spokes so the cluster stays visible
 * through it — a real packaging constraint, and the reason the cluster in the
 * reference is legible at all.
 *
 * The rim angle comes from `world.wheelAngle`, which the simulation loop eases
 * toward the steering signal. The lag is deliberate: a wheel that snaps between
 * key presses reads as a UI widget, not as something bolted to a column.
 */
export function SteeringWheel() {
  const car = useCar()
  const g = car.cockpit
  const t = car.theme
  const m = useCabinMaterials(t)
  const rim = useRef<Group>(null)

  const R = g.steeringWheelRadius

  useFrame(() => {
    if (rim.current) rim.current.rotation.z = -world.wheelAngle
  })

  return (
    <group position={g.wheelPosition} rotation={[-g.columnRake, 0, 0]}>
      <group ref={rim}>
        {/* Rim. Very slightly ovalised, standing in for the flattened lower arc
            without the cost of a custom extrusion. */}
        <group scale={[1, 0.97, 1]}>
          <mesh>
            <torusGeometry args={[R, 0.023, 16, 56]} />
            <meshStandardMaterial color="#16171b" roughness={0.72} metalness={0.04} />
          </mesh>

          {/* Grip sections at ten and two, slightly proud of the rim. */}
          {[Math.PI * 0.74, Math.PI * 0.26].map((a, i) => (
            <mesh key={i} rotation={[0, 0, a]}>
              <torusGeometry args={[R, 0.027, 12, 18, Math.PI * 0.34]} />
              <meshStandardMaterial color="#101115" roughness={0.86} metalness={0.02} />
            </mesh>
          ))}

          {/* Contrast thread along the top of the rim — the detail that dates
              this cabin to the current Explorer more than any other. */}
          <StitchArc radius={R} from={0.42} to={Math.PI - 0.42} color={t.stitching} count={34} offset={0.02} />
        </group>

        {/* ---------- spokes ---------- */}
        {/* Nine and three o'clock, horizontal. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * R * 0.52, 0, -0.004]}>
              <boxGeometry args={[R * 0.86, 0.05, 0.018]} />
              <meshStandardMaterial color="#1b1c21" roughness={0.6} metalness={0.2} />
            </mesh>
            {/* Button pad, angled a few degrees toward the driver's thumb. */}
            <group position={[side * R * 0.55, 0, 0.012]} rotation={[0, 0, 0]}>
              <RoundedBox args={[R * 0.56, 0.055, 0.011]} radius={0.006} smoothness={3}>
                <meshStandardMaterial color="#25272d" roughness={0.55} metalness={0.12} />
              </RoundedBox>
              <mesh position={[0, 0, 0.0075]}>
                <planeGeometry args={[R * 0.52, 0.046]} />
                <meshStandardMaterial
                  map={spokeButtons(side < 0 ? 'left' : 'right', '#25272d')}
                  roughness={0.55}
                  metalness={0.05}
                />
              </mesh>
            </group>
          </group>
        ))}

        {/* Lower spoke, wider, carrying the satin insert. */}
        <mesh position={[0, -R * 0.55, -0.004]}>
          <boxGeometry args={[0.07, R * 0.9, 0.018]} />
          <meshStandardMaterial color="#1b1c21" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, -R * 0.62, 0.012]}>
          <torusGeometry args={[R * 0.3, 0.011, 10, 20, Math.PI]} />
          <meshStandardMaterial {...m.trim} />
        </mesh>

        {/* ---------- hub ---------- */}
        <RoundedBox args={[R * 0.78, R * 0.5, 0.034]} radius={0.016} smoothness={4} position={[0, 0, 0.004]}>
          <meshStandardMaterial color="#141519" roughness={0.68} metalness={0.08} />
        </RoundedBox>
        <mesh position={[0, 0.004, 0.024]}>
          <planeGeometry args={[R * 0.42, R * 0.21]} />
          <meshStandardMaterial map={hubOval()} transparent roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
