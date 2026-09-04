import { ShaderMaterial, Color } from 'three'
import { ROAD_GLSL, ROAD_HALF_WIDTH, ROAD_LENGTH, LANE_WIDTH } from './roadGeometry'

/**
 * The road is one plane with a procedural material — no texture assets.
 *
 * Why a shader instead of a scrolling texture: lane markings stay perfectly
 * crisp at any distance (no mipmap mush), the surface is unlit so the night
 * headlight cone is exactly controllable, and "driving forward" reduces to
 * advancing a single float uniform. Speed -> `uDistance` is the whole illusion.
 */
export function createRoadMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uDistance: { value: 0 },
      uCurvature: { value: 0 },
      uLateral: { value: 0 },
      uRoadColor: { value: new Color('#3a3d42') },
      uGroundColor: { value: new Color('#4a6b3a') },
      uFogColor: { value: new Color('#bcd7f2') },
      uNight: { value: 0 },
      /** 0 = off, 1 = low beam, 2 = high beam. */
      uHeadlights: { value: 0 },
      uMarkingColor: { value: new Color('#e8e6df') },
      /** 0 = road, 1 = seamless studio floor. */
      uStudio: { value: 1 },
      uStudioColor: { value: new Color('#e2e3e5') },
    },
    vertexShader: /* glsl */ `
      ${ROAD_GLSL}
      uniform float uDistance;
      uniform float uCurvature;
      uniform float uLateral;
      varying float vDepth;
      varying float vAcross;

      void main() {
        vec3 pos = position;
        // Plane is built in XY then rotated -90deg about X, so local +y is
        // "ahead" and local +z is "up" in world space.
        float depth = pos.y + ${(ROAD_LENGTH / 2).toFixed(1)};
        vDepth = depth;
        vAcross = pos.x;

        pos.x += roadBend(depth, uCurvature) - uLateral;
        pos.z += roadElevation(depth, uDistance);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uDistance;
      uniform vec3 uRoadColor;
      uniform vec3 uGroundColor;
      uniform vec3 uFogColor;
      uniform vec3 uMarkingColor;
      uniform float uNight;
      uniform float uHeadlights;
      uniform float uStudio;
      uniform vec3 uStudioColor;
      varying float vDepth;
      varying float vAcross;

      // Cheap value noise for asphalt grain.
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      // Anti-aliased band around |x| < halfWidth, widening with distance so far
      // markings dissolve instead of shimmering.
      float band(float x, float halfWidth, float soft) {
        return 1.0 - smoothstep(halfWidth - soft, halfWidth + soft, abs(x));
      }

      void main() {
        float across = vAcross;
        float travel = vDepth + uDistance;
        // Markings thin out with distance; soften them to kill aliasing.
        float soft = 0.02 + vDepth * 0.0045;

        float halfRoad = ${ROAD_HALF_WIDTH.toFixed(2)};
        float onRoad = band(across, halfRoad, soft * 2.0);

        // --- surface ------------------------------------------------------
        float grain = noise(vec2(across * 3.5, travel * 0.9)) * 0.09
                    + noise(vec2(across * 24.0, travel * 8.0)) * 0.045;
        vec3 asphalt = uRoadColor * (0.93 + grain);
        // Polished wheel tracks either side of the lane centre.
        float tracks = band(abs(across) - 0.85, 0.34, 0.25) * 0.06;
        asphalt -= tracks;

        vec3 shoulder = mix(uRoadColor * 0.72, uGroundColor * 0.7, 0.55);
        float onShoulder = band(across, halfRoad + 1.6, soft * 2.0) - onRoad;
        vec3 verge = uGroundColor * (0.82 + noise(vec2(across * 1.2, travel * 0.35)) * 0.35);

        vec3 color = verge;
        color = mix(color, shoulder, clamp(onShoulder, 0.0, 1.0));
        color = mix(color, asphalt, onRoad);

        // --- markings -----------------------------------------------------
        float lane = ${LANE_WIDTH.toFixed(2)};
        // Dashed lane dividers: 3 m painted in a 12 m cycle, per highway spec.
        float dash = step(fract(travel / 12.0), 0.25);
        float markings = 0.0;
        markings += band(abs(across) - lane * 0.5, 0.075, soft) * dash;
        markings += band(abs(across) - lane * 1.5, 0.075, soft) * dash;
        markings += band(abs(across) - lane * 2.5, 0.075, soft) * dash;
        // Solid white edge lines, wider as real edge lines are.
        markings += band(abs(across) - halfRoad + 0.35, 0.1, soft);
        markings = clamp(markings, 0.0, 1.0) * onRoad;
        color = mix(color, uMarkingColor, markings * 0.92);

        // --- lighting -----------------------------------------------------
        // Unlit surface: darkness and headlights are applied analytically so
        // the beam pattern is exactly as designed at any speed.
        color *= mix(1.0, 0.11, uNight);

        if (uHeadlights > 0.0) {
          float high = step(1.5, uHeadlights);
          // Low beams throw short and wide; high beams throw long and narrow.
          float reach = mix(42.0, 105.0, high);
          float spread = mix(4.6, 3.2, high);

          // Gaussian across the beam rather than a linear ramp: a real
          // reflector puts most of its light in a hotspot with a soft edge,
          // and a hard-edged cone is the tell that a beam is faked.
          float halfWidth = spread + vDepth * 0.135;
          float lateral = exp(-pow(across / halfWidth, 2.0));
          // Fades out toward the end of the beam's useful range.
          float range = 1.0 - smoothstep(reach * 0.3, reach, vDepth);
          // The lamps sit ahead of and below the eye, so nothing is lit right
          // at the bumper.
          float near = smoothstep(0.6, 5.5, vDepth);
          float beam = lateral * range * near * mix(0.44, 0.66, high);

          color += vec3(1.0, 0.96, 0.86) * beam * uNight;
          // Retroreflective paint: markings return far more light than asphalt,
          // which is why lane lines are the first thing you see at night.
          color += uMarkingColor * markings * beam * uNight * 1.1;
        }

        // --- aerial perspective -------------------------------------------
        float fog = smoothstep(${(ROAD_LENGTH * 0.18).toFixed(1)}, ${(ROAD_LENGTH * 0.92).toFixed(1)}, vDepth);
        color = mix(color, uFogColor * mix(1.0, 0.35, uNight), fog);

        // Dissolve into the studio. The markings and the verge go first, then
        // the surface itself lifts to the cyclorama grey, so the road does not
        // vanish — it becomes the floor the car is photographed on.
        if (uStudio > 0.0) {
          vec3 floorGrey = uStudioColor * (1.0 - smoothstep(0.0, ${(ROAD_LENGTH * 0.7).toFixed(1)}, vDepth) * 0.06);
          color = mix(color, floorGrey, uStudio);
        }

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}
