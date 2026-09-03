import { Color } from 'three'

/**
 * Time-of-day palette.
 *
 * One function maps the `timeOfDay` signal to every colour and intensity in the
 * scene, so day/night is a single continuous variable rather than a boolean
 * "night mode" scattered across components. The infotainment and cluster themes
 * read `nightFactor` from here too, which is how auto night mode stays
 * consistent between the 3D cabin and the 2D screens.
 */

export interface ScenePalette {
  skyTop: Color
  skyHorizon: Color
  sunColor: Color
  sunIntensity: number
  ambientIntensity: number
  ambientColor: Color
  fogColor: Color
  roadTint: Color
  groundColor: Color
  /** 0 = full daylight, 1 = full dark. */
  nightFactor: number
  /** Direction the key light comes from. */
  sunPosition: [number, number, number]
}

const lerpColor = (a: string, b: string, t: number) => new Color(a).lerp(new Color(b), t)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** 0 at midnight, 1 at midday, with dawn/dusk ramps around 6h and 19h. */
export function daylight(hour: number): number {
  const dawn = smoothstep(5.0, 7.5, hour)
  const dusk = 1 - smoothstep(18.0, 20.5, hour)
  return clamp01(Math.min(dawn, dusk))
}

/** How "golden" the light is — peaks at sunrise and sunset. */
export function goldenness(hour: number): number {
  const morning = 1 - Math.min(1, Math.abs(hour - 7) / 2.2)
  const evening = 1 - Math.min(1, Math.abs(hour - 19) / 2.4)
  return clamp01(Math.max(morning, evening))
}

export function palette(hour: number): ScenePalette {
  const day = daylight(hour)
  const gold = goldenness(hour)
  const night = 1 - day

  const skyTop = lerpColor('#050710', '#2f74d0', day)
  const skyHorizon = lerpColor('#0a0d1a', '#bcd7f2', day).lerp(new Color('#ff9d52'), gold * 0.75)

  const sunColor = lerpColor('#4a5a86', '#fff6e6', day).lerp(new Color('#ff8a3d'), gold * 0.8)
  // Exactly the sky's horizon colour: any difference shows up as a seam
  // where the road plane ends and the sky dome begins.
  const fogColor = skyHorizon.clone()

  // The sun tracks a simple arc so shadows and specular highlights shift with
  // the hour instead of sitting in one place all day.
  const angle = ((hour - 6) / 12) * Math.PI
  const sunPosition: [number, number, number] = [
    Math.cos(angle) * 60,
    Math.max(Math.sin(angle) * 55, -12),
    -35 - Math.sin(angle) * 20,
  ]

  return {
    skyTop,
    skyHorizon,
    sunColor,
    sunIntensity: 0.3 + day * 2.4,
    // Enough bounce that the cabin is not a cave, but not so much that a dark
    // dashboard stops reading as dark. Interior plastics are genuinely near
    // black; over-lighting them is the fastest way to lose the material.
    ambientIntensity: 0.16 + day * 0.3,
    ambientColor: lerpColor('#1b2440', '#b6c2d4', day),
    fogColor,
    roadTint: lerpColor('#12141a', '#5c5f66', day),
    groundColor: lerpColor('#0d1410', '#4a6b3a', day).lerp(new Color('#7a6a3a'), gold * 0.4),
    nightFactor: night,
    sunPosition,
  }
}

/**
 * Cluster/infotainment brightness. Real cars dim the screens with the headlight
 * switch, not with a light sensor alone — dipping the display when the driver
 * turns the lights on is the behaviour people actually expect.
 */
export function screenBrightness(hour: number, headlightsOn: boolean): number {
  const night = 1 - daylight(hour)
  const dim = headlightsOn ? 0.72 : 1
  return (1 - night * 0.35) * dim
}
