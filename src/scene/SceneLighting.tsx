import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { AmbientLight, BackSide, Color, DirectionalLight, PointLight, SpotLight } from 'three'
import { useVehicleStore } from '../state/vehicleStore'
import { useCar } from '../cars/garageStore'
import { palette } from './lighting'

/**
 * Lighting rig.
 *
 * Everything reads from the `timeOfDay` signal via `palette()`, so there is no
 * separate "night mode" branch anywhere — the cabin, the ambient strips, the
 * screens and the road all darken off the same number. Adding dawn or a tunnel
 * later means moving that one value.
 */
export function SceneLighting() {
  const car = useCar()
  const ambient = useRef<AmbientLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const cabin = useRef<PointLight>(null)
  const fill = useRef<PointLight>(null)
  const accentA = useRef<PointLight>(null)
  const accentB = useRef<PointLight>(null)
  const headlightL = useRef<SpotLight>(null)
  const headlightR = useRef<SpotLight>(null)

  useFrame(() => {
    const s = useVehicleStore.getState()
    const p = palette(s.timeOfDay)

    if (ambient.current) {
      ambient.current.intensity = p.ambientIntensity
      ;(ambient.current.color as Color).copy(p.ambientColor)
    }
    if (sun.current) {
      sun.current.intensity = p.sunIntensity
      ;(sun.current.color as Color).copy(p.sunColor)
      sun.current.position.set(...p.sunPosition)
    }
    if (cabin.current) {
      // Dome light. Point lights fall off with the square of distance, so the
      // numbers here are much larger than they look — at ~1.2 m from the dash
      // roughly half of this reaches the surface.
      cabin.current.intensity = 0.7 + p.nightFactor * 1.9
    }
    if (fill.current) {
      // Fill from behind the eye point, standing in for light bounced off the
      // seats, headliner and the driver. Without it the fascia — which faces
      // away from every real light source — renders as a silhouette.
      fill.current.intensity = 0.8 + (1 - p.nightFactor) * 2.1
      ;(fill.current.color as Color).copy(p.ambientColor)
    }
    // Ambient strips are the main cabin light source after dark.
    const strip = p.nightFactor * 1.6
    if (accentA.current) accentA.current.intensity = strip
    if (accentB.current) accentB.current.intensity = strip

    // Headlights spill a little light back into the cabin off the road.
    const beam = (s.highBeams ? 1.4 : s.headlights ? 0.7 : 0) * p.nightFactor
    if (headlightL.current) headlightL.current.intensity = beam * 90
    if (headlightR.current) headlightR.current.intensity = beam * 90
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0.5} />
      <directionalLight ref={sun} position={[30, 40, -40]} intensity={2} />
      {/* Cool fill from the sky through the glass, warm bounce from the cabin. */}
      <hemisphereLight args={['#a9c8e8', '#2b241c', 0.3]} />
      <pointLight ref={cabin} position={[0, 1.72, -0.35]} distance={4} decay={2} color="#ffe6c4" intensity={2} />
      <pointLight ref={fill} position={[0, 1.35, 0.55]} distance={5} decay={2} color="#e6ecf5" intensity={3} />
      <pointLight ref={accentA} position={[-0.85, 0.62, -0.1]} distance={1.6} decay={2} color={car.theme.ambient} intensity={0} />
      <pointLight ref={accentB} position={[0.85, 0.62, -0.1]} distance={1.6} decay={2} color={car.theme.ambient} intensity={0} />

      {/* The road surface is lit analytically in its own shader; these two exist
          to light hazard actors and roadside props ahead of the car. */}
      <spotLight ref={headlightL} position={[-0.75, 0.62, -1.9]} target-position={[-2, 0, -40]} angle={0.55} penumbra={0.7} distance={110} decay={1.3} color="#fff4e0" intensity={0} />
      <spotLight ref={headlightR} position={[0.75, 0.62, -1.9]} target-position={[2, 0, -40]} angle={0.55} penumbra={0.7} distance={110} decay={1.3} color="#fff4e0" intensity={0} />
      <CabinEnvironment />
    </>
  )
}

/**
 * A generated environment map.
 *
 * Metallic trim renders black without something to reflect, and shipping an HDR
 * would mean a network fetch this project does not otherwise need. So the
 * environment is three coloured shapes — sky, ground, sun — baked to a cube map
 * once per lighting bucket. Cheap, offline, and enough for the brightwork on a
 * dashboard to catch a highlight.
 */
function CabinEnvironment() {
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const bucket = timeOfDay < 6.5 || timeOfDay > 20 ? 'night' : timeOfDay < 8.5 || timeOfDay > 17.5 ? 'dusk' : 'day'
  const p = useMemo(() => palette(bucket === 'night' ? 23 : bucket === 'dusk' ? 19 : 13), [bucket])

  return (
    // A low environment intensity: enough for brightwork to catch a
    // highlight, not so much that image-based light turns black plastic grey.
    <Environment key={bucket} resolution={128} frames={1} environmentIntensity={0.35}>
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial side={BackSide} color={p.skyHorizon} />
      </mesh>
      <mesh position={[0, 30, 0]} scale={40}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={p.skyTop} />
      </mesh>
      <mesh position={p.sunPosition} scale={8}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={p.sunColor} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, 0]} scale={90}>
        <planeGeometry />
        <meshBasicMaterial color={p.groundColor} />
      </mesh>
    </Environment>
  )
}
