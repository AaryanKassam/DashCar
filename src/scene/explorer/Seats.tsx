import { RoundedBox } from '@react-three/drei'
import { useCar } from '../../cars/garageStore'
import { useCabinMaterials } from './materials'

/**
 * The two front seats.
 *
 * From the default camera pose only their front cushions and inboard bolsters
 * are in frame, in the bottom corners — but they are what tells the viewer they
 * are sitting *between* the seats rather than floating at the dashboard, so the
 * construction matters even though most of it is off screen.
 *
 * Striped centre panels with smooth bolsters and contrast piping, from the ST
 * gallery shot.
 */
export function Seats() {
  const car = useCar()
  const g = car.cockpit

  return (
    <group>
      {[-1, 1].map((side) => (
        <Seat key={side} side={side as -1 | 1} x={side * g.seatOffsetX} cushionY={g.seatCushionY} backZ={g.seatBackZ} />
      ))}
    </group>
  )
}

function Seat({ side, x, cushionY, backZ }: { side: -1 | 1; x: number; cushionY: number; backZ: number }) {
  const car = useCar()
  const t = car.theme
  const m = useCabinMaterials(t)


  const piping = { color: t.stitching, roughness: 0.85, metalness: 0 }

  return (
    <group position={[x, 0, 0]}>
      {/* Cushion: bolsters either side of a striped centre panel. */}
      {[-1, 1].map((b) => (
        <RoundedBox key={b} args={[0.1, 0.11, 0.52]} radius={0.045} smoothness={3} position={[b * 0.15, cushionY, backZ - 0.28]}>
          <meshStandardMaterial {...m.fabric} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.24, 0.09, 0.5]} radius={0.03} smoothness={3} position={[0, cushionY - 0.008, backZ - 0.28]}>
        <meshStandardMaterial {...m.fabricPerforated} />
      </RoundedBox>
      {/* Piping along the cushion's leading edge. */}
      <mesh position={[0, cushionY - 0.03, backZ - 0.54]}>
        <boxGeometry args={[0.38, 0.008, 0.008]} />
        <meshStandardMaterial {...piping} />
      </mesh>

      {/* Backrest, raked back a little. */}
      <group position={[0, cushionY + 0.32, backZ + 0.06]} rotation={[0.16, 0, 0]}>
        {[-1, 1].map((b) => (
          <RoundedBox key={b} args={[0.09, 0.58, 0.13]} radius={0.04} smoothness={3} position={[b * 0.16, 0, 0]}>
            <meshStandardMaterial {...m.fabric} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.25, 0.56, 0.1]} radius={0.03} smoothness={3} position={[0, 0, -0.012]}>
          <meshStandardMaterial {...m.fabricPerforated} />
        </RoundedBox>
        {/* Headrest. */}
        <RoundedBox args={[0.24, 0.13, 0.11]} radius={0.045} smoothness={3} position={[0, 0.4, 0.02]}>
          <meshStandardMaterial {...m.fabric} />
        </RoundedBox>
      </group>

      {/* Seat base and rails, so the cushion is not floating over the carpet. */}
      <RoundedBox args={[0.34, 0.09, 0.46]} radius={0.02} smoothness={3} position={[0, cushionY - 0.1, backZ - 0.26]}>
        <meshStandardMaterial color="#191a1d" roughness={0.9} />
      </RoundedBox>

      {/* Inboard buckle stalk — only the inner one is ever in frame. */}
      <mesh position={[side * -0.19, cushionY + 0.02, backZ - 0.12]} rotation={[0, 0, side * 0.2]}>
        <boxGeometry args={[0.03, 0.1, 0.05]} />
        <meshStandardMaterial color="#141518" roughness={0.7} />
      </mesh>
    </group>
  )
}
