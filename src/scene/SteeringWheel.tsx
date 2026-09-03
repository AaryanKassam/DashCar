import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MeshStandardMaterial } from 'three'
import { RoundedBox } from '@react-three/drei'
import { useCar } from '../cars/garageStore'
import { world } from '../simulation/worldState'
import { useVehicleStore } from '../state/vehicleStore'

/**
 * Steering wheel and column.
 *
 * The rim angle comes straight from `world.wheelAngle`, which the sim loop
 * smooths toward the steering signal — so the wheel has the same slight lag a
 * real one does rather than snapping between key presses.
 *
 * The horn boss doubles as the telltale for the drive mode, which is a real
 * pattern on sport cars and a cheap way to show mode state in the driver's
 * primary line of sight.
 */
export function SteeringWheel() {
  const car = useCar()
  const rimRef = useRef<Group>(null)
  const g = car.cockpit
  const R = g.steeringWheelRadius

  useFrame(() => {
    if (rimRef.current) rimRef.current.rotation.z = -world.wheelAngle
  })

  const accent = car.theme.accent
  const spokeCount = 3

  return (
    <group position={g.wheelPosition} rotation={[-g.columnRake, 0, 0]}>
      {/* Column shroud, angled up to the dash. */}
      <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.062, 0.28, 16]} />
        <meshStandardMaterial color="#101216" roughness={0.85} />
      </mesh>

      <group ref={rimRef}>
        {/* Rim: a torus with a flattened bottom is the modern sport-wheel shape,
            but a plain torus reads cleaner at this scale. */}
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[R, 0.019, 14, 48]} />
          <meshStandardMaterial color="#0f1013" roughness={0.88} metalness={0.02} />
        </mesh>

        {/* Leather grip sections at 10-and-2, slightly proud of the rim. */}
        {[Math.PI * 0.72, Math.PI * 0.28].map((a, i) => (
          <mesh key={i} rotation={[0, 0, a]}>
            <torusGeometry args={[R, 0.023, 12, 16, Math.PI * 0.38]} />
            <meshStandardMaterial color={car.theme.upholstery} roughness={0.9} />
          </mesh>
        ))}

        {/* Spokes at 3, 9 and 6 o'clock, leaving the top clear so the cluster
            stays visible through the wheel — a real packaging constraint. */}
        {Array.from({ length: spokeCount }).map((_, i) => {
          const angle = Math.PI + (i * (Math.PI * 2)) / spokeCount
          return (
            <group key={i} rotation={[0, 0, angle]}>
              <mesh position={[R * 0.5, 0, 0]}>
                <boxGeometry args={[R * 0.98, 0.026, 0.014]} />
                <meshStandardMaterial color="#191c22" roughness={0.55} metalness={0.35} />
              </mesh>
            </group>
          )
        })}

        {/* Thumb controls on the left and right spokes. */}
        {[-1, 1].map((side) => (
          <RoundedBox key={side} args={[0.05, 0.032, 0.012]} radius={0.005} smoothness={3} position={[side * R * 0.52, 0, 0.012]}>
            <meshStandardMaterial color="#23262d" roughness={0.55} />
          </RoundedBox>
        ))}

        {/* Centre boss + badge. */}
        <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R * 0.31, R * 0.33, 0.03, 24]} />
          <meshStandardMaterial color="#101217" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.024]}>
          <ringGeometry args={[R * 0.13, R * 0.2, 24]} />
          <DriveModeBadge accent={accent} />
        </mesh>
      </group>
    </group>
  )
}

/** Boss ring glows in the accent colour, brighter in Sport. */
function DriveModeBadge({ accent }: { accent: string }) {
  const ref = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    const mode = useVehicleStore.getState().driveMode
    if (ref.current) ref.current.emissiveIntensity = mode === 'sport' ? 3.2 : mode === 'eco' ? 0.7 : 1.6
  })
  return <meshStandardMaterial ref={ref} color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
}
