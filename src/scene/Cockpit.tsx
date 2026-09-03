import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { DoubleSide } from 'three'
import { useCar } from '../cars/garageStore'

/**
 * The cabin, built procedurally from the active car's `cockpit` config.
 *
 * No model files. Every surface is derived from six numbers that describe the
 * package — eye point, dash top, cowl, fascia, roof and header — so a car with
 * a taller cabin gets a correctly proportioned interior without new geometry.
 *
 * The layout is deliberately consistent about depth, because getting that wrong
 * is invisible in a wireframe and obvious in a render: the dash occupies
 * `cowlZ` to `fasciaZ`, and everything the driver touches lives *behind*
 * `fasciaZ`. The first version of this file buried the steering wheel inside
 * the dashboard for exactly that reason.
 *
 * Material note: real dashboards are deliberately matte (roughness ~0.95) so
 * they do not reflect into the windshield. Reproducing that is most of why
 * this reads as a car interior rather than as shiny plastic boxes.
 */
export function Cockpit() {
  const car = useCar()
  const g = car.cockpit
  const t = car.theme

  const W = g.cabinHalfWidth
  const dashDepth = g.cowlZ - g.fasciaZ // negative: cowl is further forward
  const dashMidZ = (g.cowlZ + g.fasciaZ) / 2

  const matte = useMemo(() => ({ color: t.dashBase, roughness: 0.95, metalness: 0.02 }), [t.dashBase])
  const trim = useMemo(() => ({ color: t.dashTrim, roughness: 0.3, metalness: 0.75 }), [t.dashTrim])
  const soft = useMemo(() => ({ color: t.upholstery, roughness: 0.88, metalness: 0.02 }), [t.upholstery])

  // A-pillar: from the dash corner at the cowl, up and *back* to the header
  // rail. Raking it forward instead is the classic sign the maths went the
  // wrong way round, so the direction is derived rather than dialled in.
  const pillarBaseY = g.dashTopY - 0.02
  const pillarDy = g.roofY - pillarBaseY
  const pillarDz = g.headerZ - g.cowlZ // positive: the top sits further aft
  const pillarLen = Math.hypot(pillarDy, pillarDz)
  const pillarRake = Math.atan2(pillarDz, pillarDy)

  // Windshield: one raked plane spanning cowl to header.
  const glassMidY = (g.dashTopY + g.roofY) / 2
  const glassMidZ = (g.cowlZ + g.headerZ) / 2
  const glassHeight = Math.hypot(g.roofY - g.dashTopY, g.headerZ - g.cowlZ)
  const glassRake = Math.atan2(pillarDz, pillarDy)

  return (
    <group>
      {/* ---------- dashboard ---------- */}
      {/* Top surface, raked down toward the windshield. */}
      <RoundedBox
        args={[W * 2.16, 0.09, Math.abs(dashDepth)]}
        radius={0.04}
        smoothness={4}
        position={[0, g.dashTopY - 0.045, dashMidZ]}
        rotation={[-0.05, 0, 0]}
      >
        <meshStandardMaterial {...matte} />
      </RoundedBox>

      {/* Vertical fascia the driver faces. */}
      <RoundedBox args={[W * 2.16, 0.42, 0.16]} radius={0.045} smoothness={4} position={[0, g.dashTopY - 0.26, g.fasciaZ - 0.07]}>
        <meshStandardMaterial {...matte} />
      </RoundedBox>

      {/* Brightwork strip across the fascia — the waistline that makes a
          dashboard look designed rather than moulded. */}
      <RoundedBox args={[W * 2.0, 0.026, 0.026]} radius={0.01} smoothness={3} position={[0, g.dashTopY - 0.115, g.fasciaZ + 0.006]}>
        <meshStandardMaterial {...trim} />
      </RoundedBox>

      {/* Lower dash / knee bolster, set back under the fascia. */}
      <RoundedBox args={[W * 2.08, 0.34, 0.26]} radius={0.05} smoothness={3} position={[0, g.dashTopY - 0.6, g.fasciaZ - 0.12]}>
        <meshStandardMaterial color={t.dashBase} roughness={0.99} metalness={0} />
      </RoundedBox>

      {/* Dash-top inlay across the passenger side, in the trim finish. A single
          material change is what stops a moulded surface reading as one
          undifferentiated slab from the driver's seat. */}
      <RoundedBox
        args={[W * 0.9, 0.012, Math.abs(dashDepth) * 0.42]}
        radius={0.005}
        smoothness={3}
        position={[W * 0.52, g.dashTopY + 0.004, g.fasciaZ - Math.abs(dashDepth) * 0.3]}
        rotation={[-0.05, 0, 0]}
      >
        <meshStandardMaterial color={t.dashTrim} roughness={0.5} metalness={0.45} />
      </RoundedBox>

      {/* ---------- instrument binnacle ---------- */}
      {/* A hood over the cluster, angled down toward the driver. Its real job in
          a car is keeping sun off the display; its job here is making the panel
          look built into the dash instead of stuck on it. */}
      <group position={[g.clusterPosition[0], g.clusterPosition[1], g.clusterPosition[2]]}>
        <RoundedBox
          args={[g.clusterSize[0] + 0.055, 0.022, 0.15]}
          radius={0.01}
          smoothness={3}
          position={[0, g.clusterSize[1] / 2 + 0.03, 0.07]}
          rotation={[0.3, 0, 0]}
        >
          <meshStandardMaterial {...matte} />
        </RoundedBox>
        {/* Side cheeks closing the binnacle off. */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (g.clusterSize[0] / 2 + 0.022), 0.01, 0.04]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.02, g.clusterSize[1] + 0.06, 0.12]} />
            <meshStandardMaterial {...matte} />
          </mesh>
        ))}
      </group>

      {/* ---------- centre screen housing ---------- */}
      <group position={g.screenPosition}>
        <RoundedBox args={[g.screenSize[0] + 0.05, g.screenSize[1] + 0.045, 0.03]} radius={0.012} smoothness={3} position={[0, 0, -0.026]}>
          <meshStandardMaterial {...matte} />
        </RoundedBox>
        {/* Stand tying the panel back to the dash surface. */}
        <mesh position={[0, -g.screenSize[1] / 2 - 0.03, -0.05]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.02]} />
          <meshStandardMaterial {...matte} />
        </mesh>
      </group>

      {/* ---------- air vents ---------- */}
      <Vent position={[-W * 0.84, g.dashTopY - 0.19, g.fasciaZ + 0.005]} trim={t.dashTrim} />
      <Vent position={[W * 0.84, g.dashTopY - 0.19, g.fasciaZ + 0.005]} trim={t.dashTrim} />
      <Vent position={[-0.19, g.dashTopY - 0.31, g.fasciaZ + 0.005]} trim={t.dashTrim} width={0.13} />
      <Vent position={[0.19, g.dashTopY - 0.31, g.fasciaZ + 0.005]} trim={t.dashTrim} width={0.13} />

      {/* ---------- centre console ---------- */}
      <RoundedBox args={[0.32, 0.42, 0.72]} radius={0.05} smoothness={3} position={[0, g.dashTopY - 0.62, g.fasciaZ + 0.42]}>
        <meshStandardMaterial {...matte} />
      </RoundedBox>
      <RoundedBox args={[0.19, 0.04, 0.2]} radius={0.018} smoothness={3} position={[0, g.dashTopY - 0.4, g.fasciaZ + 0.22]}>
        <meshStandardMaterial {...trim} />
      </RoundedBox>

      {/* ---------- door cards ---------- */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W + 0.06), g.dashTopY - 0.34, g.fasciaZ + 0.35]} rotation={[0, side * 0.05, 0]}>
          <RoundedBox args={[0.14, 0.66, 1.1]} radius={0.05} smoothness={3}>
            <meshStandardMaterial {...matte} />
          </RoundedBox>
          <RoundedBox args={[0.17, 0.085, 0.46]} radius={0.032} smoothness={3} position={[-side * 0.02, 0.14, -0.04]}>
            <meshStandardMaterial {...soft} />
          </RoundedBox>
          {/* Ambient light strip — the detail that makes night mode look premium. */}
          <mesh position={[-side * 0.07, 0.25, -0.04]}>
            <boxGeometry args={[0.006, 0.009, 0.74]} />
            <meshStandardMaterial color={t.ambient} emissive={t.ambient} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* ---------- greenhouse ---------- */}
      {/* A-pillars: thick, raked, and exactly where they block your view — the
          honest thing to render, since pillar occlusion is a real constraint
          that surround-view systems exist to compensate for. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (W + 0.02), pillarBaseY + pillarDy / 2, g.cowlZ + pillarDz / 2]}
          rotation={[pillarRake, 0, side * 0.08]}
        >
          <boxGeometry args={[0.1, pillarLen, 0.13]} />
          <meshStandardMaterial {...matte} />
        </mesh>
      ))}

      {/* Header rail across the top of the glass. */}
      <RoundedBox args={[W * 2.2, 0.1, 0.26]} radius={0.04} smoothness={3} position={[0, g.roofY + 0.02, g.headerZ + 0.06]} rotation={[0.28, 0, 0]}>
        <meshStandardMaterial {...matte} />
      </RoundedBox>

      {/* Sun visors, folded up against the headliner. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * W * 0.5, g.roofY + 0.04, g.headerZ + 0.2]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[W * 0.8, 0.018, 0.2]} />
          <meshStandardMaterial color={t.upholstery} roughness={1} />
        </mesh>
      ))}

      {/* Headliner. */}
      <RoundedBox args={[W * 2.2, 0.07, 1.5]} radius={0.03} smoothness={3} position={[0, g.roofY + 0.09, g.headerZ + 0.7]} rotation={[-0.03, 0, 0]}>
        <meshStandardMaterial color={t.upholstery} roughness={1} />
      </RoundedBox>

      {/* Rear-view mirror, hung off the header rail. */}
      <group position={[0, g.roofY - 0.035, g.headerZ + 0.05]} rotation={[0.12, 0, 0]}>
        <RoundedBox args={[0.22, 0.058, 0.026]} radius={0.012} smoothness={3}>
          <meshStandardMaterial color="#16181c" roughness={0.6} />
        </RoundedBox>
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.2, 0.04]} />
          <meshStandardMaterial color="#3a4550" roughness={0.08} metalness={0.95} />
        </mesh>
      </group>

      {/* Windshield glass: a faint tint, mostly there to catch a highlight so
          the opening does not read as a hole cut in the geometry. */}
      <mesh position={[0, glassMidY, glassMidZ]} rotation={[glassRake, 0, 0]}>
        <planeGeometry args={[W * 2.0, glassHeight]} />
        <meshPhysicalMaterial
          color="#a8c4d8"
          transparent
          opacity={0.06}
          roughness={0.04}
          metalness={0}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function Vent({ position, trim, width = 0.18 }: { position: [number, number, number]; trim: string; width?: number }) {
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.062, 0.035]} radius={0.012} smoothness={3}>
        <meshStandardMaterial color="#0b0c0f" roughness={0.8} />
      </RoundedBox>
      {/* Horizontal blades, proud of the housing so they catch a highlight. */}
      {[-0.016, 0, 0.016].map((y) => (
        <mesh key={y} position={[0, y, 0.019]}>
          <boxGeometry args={[width - 0.018, 0.005, 0.011]} />
          <meshStandardMaterial color={trim} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
    </group>
  )
}
