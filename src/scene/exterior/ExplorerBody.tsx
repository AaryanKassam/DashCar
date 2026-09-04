import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { DoubleSide, Group } from 'three'
import { useCar } from '../../cars/garageStore'
import { EXPLORER_BODY } from '../../cars/explorer/cockpit'

/**
 * The exterior body, for the turntable.
 *
 * Deliberately proportional rather than photographic. This is the one part of
 * the build that never animates, never lights up and never responds to input —
 * it exists so the Exterior toggle has something to show — so it is built to
 * read correctly in silhouette and stop there. Every hour not spent on panel
 * gaps here went into the cabin, which is the part that has to hold up under a
 * camera you can point anywhere.
 *
 * What it does get right: the boxy three-row proportion, the upright nose and
 * big rectangular grille, the near-vertical tailgate, the black wheel-arch
 * cladding, and a beltline that kicks up behind the rear door. Those are the
 * cues that make an Explorer identifiable at a glance.
 *
 * It shows itself only once the camera is actually outside the shell, so the
 * flight out through the windscreen is not spent staring at the inside of a
 * roof panel.
 */
export function ExplorerBody() {
  const car = useCar()
  const b = EXPLORER_BODY
  const group = useRef<Group>(null)
  const { camera } = useThree()

  const paint = { color: car.exterior.paint, roughness: 0.28, metalness: 0.55 }
  const clad = { color: car.exterior.cladding, roughness: 0.85, metalness: 0.05 }
  const glass = { color: '#141c24', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.82 }

  const centreZ = (b.frontBumperZ + b.rearBumperZ) / 2
  const length = b.rearBumperZ - b.frontBumperZ
  const { cowlZ, headerZ, tailGlassZ } = b

  useFrame(() => {
    if (!group.current) return
    const dx = camera.position.x
    const dz = camera.position.z - centreZ
    group.current.visible = Math.hypot(dx, dz) > 2.4
  })

  return (
    <group ref={group} visible={false}>
      {/* ---------- lower body ---------- */}
      <RoundedBox
        args={[b.halfWidth * 2, b.beltlineY - b.floorZ, length * 0.995]}
        radius={0.09}
        smoothness={4}
        position={[0, (b.beltlineY + b.floorZ) / 2, centreZ]}
      >
        <meshStandardMaterial {...paint} />
      </RoundedBox>

      {/* Rocker cladding and bumpers, in the matte lower finish. */}
      <RoundedBox
        args={[b.halfWidth * 2.02, 0.2, length * 0.99]}
        radius={0.06}
        smoothness={3}
        position={[0, b.floorZ + 0.06, centreZ]}
      >
        <meshStandardMaterial {...clad} />
      </RoundedBox>

      {/* ---------- hood ---------- */}
      <RoundedBox
        args={[b.halfWidth * 1.94, 0.1, Math.abs(cowlZ - b.frontBumperZ)]}
        radius={0.05}
        smoothness={3}
        position={[0, b.beltlineY - 0.03, (cowlZ + b.frontBumperZ) / 2]}
        rotation={[0.035, 0, 0]}
      >
        <meshStandardMaterial {...paint} />
      </RoundedBox>

      {/* ---------- greenhouse ---------- */}
      {/* Roof box, then wedges bridging to the windscreen and tailgate. */}
      <RoundedBox
        args={[b.halfWidth * 1.86, b.roofY - b.beltlineY, tailGlassZ - headerZ]}
        radius={0.07}
        smoothness={4}
        position={[0, (b.roofY + b.beltlineY) / 2, (tailGlassZ + headerZ) / 2]}
      >
        <meshStandardMaterial {...paint} />
      </RoundedBox>

      <Wedge
        from={[cowlZ, b.beltlineY]}
        to={[headerZ, b.roofY - 0.02]}
        width={b.halfWidth * 1.84}
        material={glass}
      />
      {/* Tailgate glass: near vertical, which is most of why a three-row SUV
          reads as a three-row SUV rather than a wagon. */}
      <Wedge
        from={[b.rearBumperZ - 0.1, b.beltlineY]}
        to={[tailGlassZ, b.roofY - 0.02]}
        width={b.halfWidth * 1.8}
        material={glass}
      />

      {/* Side glass: one band per side, blacked out to read as tinted DLO. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * b.halfWidth * 0.94, 1.46, 0.72]} rotation={[0, side * Math.PI * 0.5, 0]}>
          <planeGeometry args={[2.6, 0.34]} />
          <meshStandardMaterial {...glass} side={DoubleSide} />
        </mesh>
      ))}

      {/* Roof rails. */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.05, 0.04, 2.4]}
          radius={0.018}
          smoothness={3}
          position={[side * b.halfWidth * 0.76, b.roofY + 0.02, 0.75]}
        >
          <meshStandardMaterial {...clad} />
        </RoundedBox>
      ))}

      {/* ---------- front ---------- */}
      {/* The big rectangular grille is the single most recognisable thing about
          the current Explorer's face. */}
      <RoundedBox
        args={[b.halfWidth * 1.5, 0.34, 0.06]}
        radius={0.025}
        smoothness={3}
        position={[0, 0.98, b.frontBumperZ + 0.04]}
      >
        <meshStandardMaterial color="#121316" roughness={0.6} metalness={0.25} />
      </RoundedBox>
      {[-0.11, -0.02, 0.07].map((dy) => (
        <mesh key={dy} position={[0, 0.98 + dy, b.frontBumperZ + 0.02]}>
          <boxGeometry args={[b.halfWidth * 1.44, 0.03, 0.03]} />
          <meshStandardMaterial color="#2c2f34" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* Oval badge, centred on the grille. */}
      <mesh position={[0, 0.98, b.frontBumperZ - 0.01]}>
        <planeGeometry args={[0.18, 0.075]} />
        <meshStandardMaterial color="#0b3d91" roughness={0.25} metalness={0.6} />
      </mesh>

      {/* Slim headlights, wrapping the front corners. */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.34, 0.085, 0.2]}
          radius={0.028}
          smoothness={3}
          position={[side * b.halfWidth * 0.72, 1.06, b.frontBumperZ + 0.06]}
        >
          <meshStandardMaterial color="#dfe6ee" roughness={0.12} metalness={0.35} />
        </RoundedBox>
      ))}

      {/* Lower valance. */}
      <RoundedBox
        args={[b.halfWidth * 1.9, 0.26, 0.12]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.62, b.frontBumperZ + 0.03]}
      >
        <meshStandardMaterial {...clad} />
      </RoundedBox>

      {/* ---------- rear ---------- */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.16, 0.24, 0.08]}
          radius={0.025}
          smoothness={3}
          position={[side * b.halfWidth * 0.84, 1.1, b.rearBumperZ - 0.03]}
        >
          <meshStandardMaterial color="#8d1f22" emissive="#8d1f22" emissiveIntensity={0.25} roughness={0.3} />
        </RoundedBox>
      ))}
      <RoundedBox
        args={[b.halfWidth * 1.9, 0.24, 0.12]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.62, b.rearBumperZ - 0.03]}
      >
        <meshStandardMaterial {...clad} />
      </RoundedBox>

      {/* ---------- wheels ---------- */}
      {[b.frontAxleZ, b.rearAxleZ].map((z) =>
        [-1, 1].map((side) => <Wheel key={`${z}:${side}`} x={side * (b.halfWidth - 0.09)} z={z} radius={b.wheelRadius} face={car.exterior.wheel} clad={car.exterior.cladding} />),
      )}

      {/* Wheel-arch cladding: the black surrounds that define this body. */}
      {[b.frontAxleZ, b.rearAxleZ].map((z) =>
        [-1, 1].map((side) => (
          <mesh key={`arch:${z}:${side}`} position={[side * (b.halfWidth + 0.005), b.wheelRadius + 0.06, z]} rotation={[0, side * Math.PI * 0.5, 0]}>
            <torusGeometry args={[b.wheelRadius + 0.09, 0.055, 8, 20, Math.PI]} />
            <meshStandardMaterial {...clad} />
          </mesh>
        )),
      )}

      {/* Door shut lines, cut in as thin dark insets. */}
      {[-1, 1].map((side) =>
        [-0.36, 0.94].map((z) => (
          <mesh key={`shut:${side}:${z}`} position={[side * (b.halfWidth + 0.004), (b.beltlineY + b.floorZ) / 2 + 0.06, z]}>
            <boxGeometry args={[0.006, b.beltlineY - b.floorZ - 0.18, 0.012]} />
            <meshStandardMaterial color="#1b1d20" roughness={0.9} />
          </mesh>
        )),
      )}

      {/* Door mirrors. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (b.halfWidth + 0.07), 1.3, -0.86]}>
          <RoundedBox args={[0.14, 0.09, 0.19]} radius={0.03} smoothness={3}>
            <meshStandardMaterial {...paint} />
          </RoundedBox>
        </group>
      ))}
    </group>
  )
}

/**
 * A raked panel bridging two points in the side profile — used for the
 * windscreen and the tailgate glass, which are the two surfaces that most
 * determine whether a boxy SUV reads as the right boxy SUV.
 */
function Wedge({
  from,
  to,
  width,
  material,
}: {
  from: [number, number]
  to: [number, number]
  width: number
  material: Record<string, unknown>
}) {
  const dz = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dy, dz)
  const rake = Math.atan2(dz, dy)

  return (
    <mesh position={[0, (from[1] + to[1]) / 2, (from[0] + to[0]) / 2]} rotation={[rake, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial {...material} side={DoubleSide} />
    </mesh>
  )
}

function Wheel({
  x,
  z,
  radius,
  face,
  clad,
}: {
  x: number
  z: number
  radius: number
  face: string
  clad: string
}) {
  return (
    <group position={[x, radius, z]} rotation={[0, 0, Math.PI / 2]}>
      {/* Tyre. */}
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.25, 28]} />
        <meshStandardMaterial color="#141516" roughness={0.95} />
      </mesh>
      {/* Face, inset so the tyre sidewall reads. */}
      <mesh position={[0, x > 0 ? 0.005 : -0.005, 0]}>
        <cylinderGeometry args={[radius * 0.68, radius * 0.68, 0.26, 24]} />
        <meshStandardMaterial color={face} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Five spoke gaps, cut as dark wedges into the face. */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]} position={[0, x > 0 ? 0.136 : -0.136, 0]}>
          <boxGeometry args={[radius * 0.2, 0.006, radius * 0.78]} />
          <meshStandardMaterial color={clad} roughness={0.85} />
        </mesh>
      ))}
      {/* Hub cap. */}
      <mesh position={[0, x > 0 ? 0.142 : -0.142, 0]}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.2, 0.008, 20]} />
        <meshStandardMaterial color={face} roughness={0.35} metalness={0.7} />
      </mesh>
    </group>
  )
}
