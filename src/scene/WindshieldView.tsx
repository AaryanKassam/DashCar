import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Mesh, ShaderMaterial } from 'three'
import { createRoadMaterial } from './RoadMaterial'
import { ROAD_LENGTH } from './roadGeometry'
import { world } from '../simulation/worldState'
import { useVehicleStore } from '../state/vehicleStore'
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
            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useFrame(() => {
    const s = useVehicleStore.getState()
    const p = palette(s.timeOfDay)
    const u = material.uniforms

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
