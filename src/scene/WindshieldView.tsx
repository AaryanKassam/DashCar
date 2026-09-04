import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Mesh, ShaderMaterial } from 'three'
import { createRoadMaterial } from './RoadMaterial'
import { ROAD_LENGTH } from './roadGeometry'
import { world } from '../simulation/worldState'
import { useVehicleStore } from '../state/vehicleStore'
import { useViewStore } from '../state/viewStore'
import { palette } from './lighting'
import { Roadside } from './Roadside'

/**
 * Everything seen through the glass.
 *
 * The critical simplification of this project: there is no world to drive
 * through. The car never moves. A single plane in front of the camera advances
 * one uniform (`uDistance`) at a rate proportional to `speed`, and roadside
 * props recycle against the same number. Speed is the only input; the sense of
 * travel is entirely emergent from it.
 */
export function WindshieldView() {
  const roadRef = useRef<Mesh>(null)
  const skyRef = useRef<ShaderMaterial>(null)
  const material = useMemo(() => createRoadMaterial(), [])

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new Color('#2f74d0') },
          uHorizon: { value: new Color('#bcd7f2') },
          uNight: { value: 0 },
          uStudio: { value: 1 },
          uStudioColor: { value: new Color('#e6e7e9') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform float uNight;
          uniform float uStudio;
          uniform vec3 uStudioColor;
          varying vec3 vPos;

          float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }

          void main() {
            vec3 dir = normalize(vPos);
            float h = clamp(dir.y * 1.6 + 0.08, 0.0, 1.0);
            vec3 color = mix(uHorizon, uTop, pow(h, 0.65));

            // A sparse star field, only visible once the sky goes dark.
            if (uNight > 0.35) {
              vec3 cell = floor(dir * 140.0);
              float star = step(0.9975, hash(cell));
              float twinkle = 0.6 + 0.4 * hash(cell + 3.0);
              color += vec3(star * twinkle) * (uNight - 0.35) * 1.5 * smoothstep(0.0, 0.25, dir.y);
            }
            // Studio: a near-flat wall that darkens very slightly toward the
            // top. A perfectly uniform grey reads as a missing background; a
            // gentle falloff reads as a lit cyclorama.
            if (uStudio > 0.0) {
              vec3 wall = uStudioColor * (1.0 - clamp(dir.y, 0.0, 1.0) * 0.09);
              color = mix(color, wall, uStudio);
            }

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useFrame((_, dt) => {
    const s = useVehicleStore.getState()
    const p = palette(s.timeOfDay)
    const u = material.uniforms

    // The world only exists once the car does. Parked with the ignition off is
    // the configurator state, and the studio is what a configurator shows.
    const wantStudio = useViewStore.getState().mode === 'exterior' || (!s.engineRunning && s.speed < 0.5)
    world.studio += ((wantStudio ? 1 : 0) - world.studio) * Math.min(1, dt * 2.6)
    u.uStudio.value = world.studio

    u.uDistance.value = world.distance
    u.uCurvature.value = world.curvature
    u.uLateral.value = world.lateralOffset
    u.uNight.value = p.nightFactor
    u.uHeadlights.value = s.highBeams ? 2 : s.headlights ? 1 : 0
    ;(u.uRoadColor.value as Color).copy(p.roadTint)
    ;(u.uGroundColor.value as Color).copy(p.groundColor)
    ;(u.uFogColor.value as Color).copy(p.fogColor)

    if (skyRef.current) {
      ;(skyRef.current.uniforms.uTop.value as Color).copy(p.skyTop)
      ;(skyRef.current.uniforms.uHorizon.value as Color).copy(p.skyHorizon)
      skyRef.current.uniforms.uNight.value = p.nightFactor
      skyRef.current.uniforms.uStudio.value = world.studio
    }
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[600, 32, 16]} />
        <primitive object={skyMaterial} ref={skyRef} attach="material" />
      </mesh>

      <mesh
        ref={roadRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -ROAD_LENGTH / 2]}
        frustumCulled={false}
      >
        {/* Long in the travel direction so the bend and hills stay smooth;
            coarse across, where nothing is displaced. */}
        <planeGeometry args={[190, ROAD_LENGTH, 20, 220]} />
        <primitive object={material} attach="material" />
      </mesh>

      <Roadside />
    </group>
  )
}
