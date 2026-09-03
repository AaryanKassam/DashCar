import type { PowertrainProfile } from '../simulation/physics'

/**
 * A car is *data*, never code. Adding one to the garage means adding an entry
 * to `carRegistry.ts` — no change to the store, the sim loop, the cluster or
 * any infotainment app. That constraint is the whole point of this file.
 */

export interface CarTheme {
  /** Primary accent: needles, active telltales, screen highlights. */
  accent: string
  accentDim: string
  /** Cluster background and dashboard materials. */
  clusterBg: string
  dashBase: string
  dashTrim: string
  upholstery: string
  stitching: string
  /** Emissive tint for ambient cabin lighting at night. */
  ambient: string
}

export interface CockpitGeometry {
  /**
   * Driver eye point, metres, measured from the road surface. The camera lives
   * here. Biased slightly toward the driver's seat from centre so the cluster
   * is not half off-screen — a real between-the-seats camera sees a third of
   * the instrument panel and nothing else.
   */
  eyePoint: [number, number, number]
  /** Height of the dash top surface above the road. */
  dashTopY: number
  /** Front edge of the dash, where the windshield meets it. */
  cowlZ: number
  /** Rear face of the dash — the vertical surface the driver faces. */
  fasciaZ: number
  /** Half-width of the cabin. */
  cabinHalfWidth: number
  /** Underside of the roof. */
  roofY: number
  /** Where the top of the windshield meets the header rail. */
  headerZ: number

  steeringWheelRadius: number
  /** Column rake from vertical, radians. */
  columnRake: number
  wheelPosition: [number, number, number]

  clusterPosition: [number, number, number]
  /** Cluster panel size in metres; must match the 960x400 design aspect. */
  clusterSize: [number, number]
  /** Pitch and yaw that aim the panel at the eye point. */
  clusterAim: [number, number]

  screenPosition: [number, number, number]
  screenSize: [number, number]
  screenAim: [number, number]
}

export interface ClusterConfig {
  /** analog = swept needles, digital = bar/numeric, hybrid = both. */
  style: 'analog' | 'hybrid' | 'digital'
  maxSpeedKph: number
  /** Tach ceiling; ignored for battery cars, which show a power meter. */
  maxRpm: number
  redlineRpm: number
}

export interface CarDefinition {
  id: string
  name: string
  badge: string
  tagline: string
  bodyStyle: string
  energyType: 'fuel' | 'battery'
  /** Single-speed EVs skip the gearbox model entirely. */
  singleSpeed: boolean
  powertrain: PowertrainProfile
  theme: CarTheme
  cockpit: CockpitGeometry
  cluster: ClusterConfig
}
