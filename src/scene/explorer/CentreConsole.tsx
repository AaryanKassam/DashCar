import { RoundedBox } from '@react-three/drei'
import { useVehicleStore } from '../../state/vehicleStore'
import { useCar } from '../../cars/garageStore'
import { useCabinMaterials } from './materials'
import { shifterRing } from './textures'

/**
 * The centre console: shifter, cupholders, charge pad and start button.
 *
 * The rotary shifter turns to the selected gear, so P-R-N-D-S is not decoration
 * — it is the same signal the cluster reads. That matters more than it sounds:
 * a console that ignores the transmission is the detail that tells a viewer the
 * cabin is a backdrop rather than a vehicle.
 */
export function CentreConsole() {
  const car = useCar()
  const g = car.cockpit
  const t = car.theme
  const m = useCabinMaterials(t)
  const gear = useVehicleStore((s) => s.gear)
  const engineRunning = useVehicleStore((s) => s.engineRunning)
  const toggleEngine = useVehicleStore((s) => s.toggleEngine)

  const topY = 0.86
  const GEARS = ['P', 'R', 'N', 'D'] as const
  // Matches the label spacing baked into the shifter ring texture.
  const gearAngle = (GEARS.indexOf(gear as (typeof GEARS)[number]) - 2) * 0.52

  return (
    <group>
      {/* Console body, running back between the seats. */}
      <RoundedBox args={[0.4, topY - g.floorY, 1.15]} radius={0.045} smoothness={4} position={[-0.02, (topY + g.floorY) / 2, -0.1]}>
        <meshStandardMaterial {...m.dashLower} />
      </RoundedBox>

      {/* Dark top deck. It has to be wider than the body it sits on, or a strip
          of greige shows along each side and the console reads as one pale
          wedge from the driver's eye point. */}
      <RoundedBox args={[0.42, 0.04, 1.18]} radius={0.016} smoothness={3} position={[-0.02, topY + 0.012, -0.1]}>
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>

      {/* Bridge forward to the fascia, with the charge pad let into it. */}
      <RoundedBox args={[0.42, 0.05, 0.44]} radius={0.02} smoothness={3} position={[-0.02, topY + 0.012, -0.54]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial {...m.dashUpper} />
      </RoundedBox>
      <mesh position={[-0.02, topY + 0.042, -0.54]} rotation={[-Math.PI / 2 + 0.2, 0, 0]}>
        <planeGeometry args={[0.16, 0.2]} />
        <meshStandardMaterial color="#141518" roughness={0.5} metalness={0.15} />
      </mesh>

      {/* ---------- rotary shifter ---------- */}
      <group position={[-0.07, topY + 0.03, -0.3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.056, 0.028, 32]} />
          <meshStandardMaterial {...m.trim} />
        </mesh>
        {/* Markings ring, turned to the selected gear. */}
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, -gearAngle]}>
          <circleGeometry args={[0.05, 32]} />
          <meshStandardMaterial
            map={shifterRing('#b9bec6', t.accent, '#17181c')}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* ---------- cupholders ---------- */}
      {[
        [0.09, -0.12],
        [0.09, 0.02],
      ].map(([x, z]) => (
        <mesh key={z} position={[x, topY - 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.04, 0.07, 24, 1, true]} />
          <meshStandardMaterial color="#111214" roughness={0.85} side={2} />
        </mesh>
      ))}

      {/* ---------- engine start/stop ---------- */}
      {/* Right of the column, where it is on the real car. Clicking it is the
          same action the I key performs — one intent, one store action. */}
      <group position={[-0.2, 1.0, g.fasciaZ + 0.03]}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            toggleEngine()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <cylinderGeometry args={[0.022, 0.022, 0.014, 24]} />
          <meshStandardMaterial
            color={engineRunning ? '#1f6b3a' : '#2a2c31'}
            emissive={engineRunning ? '#2fbf6a' : '#c8352b'}
            emissiveIntensity={engineRunning ? 0.7 : 0.45}
            roughness={0.5}
          />
        </mesh>
      </group>

      {/* ---------- floor ---------- */}
      <mesh position={[0, g.floorY - 0.005, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 2.4]} />
        <meshStandardMaterial {...m.carpet} />
      </mesh>
    </group>
  )
}
