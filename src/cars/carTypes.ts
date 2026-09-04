import type { PowertrainProfile } from '../simulation/physics'

/**
 * A vehicle is *data*, never code.
 *
 * The five Explorer trims and a completely different vehicle are the same kind
 * of entry here — a trim shares its `cockpit` package with its siblings and
 * overrides the theme, while a different vehicle would bring its own package.
 * Nothing downstream needs to know which it is looking at, which is what makes
 * the configurator's trim selector and a multi-car garage the same mechanism.
 */

export interface CarTheme {
  /** Interface accent: cluster needles, active telltales, screen highlights. */
  accent: string
  accentDim: string
  clusterBg: string

  /** Upper dash, door uppers, pillars — the dark padded surfaces. */
  dashUpper: string
  /** Lower fascia, door lowers, console flanks. */
  dashLower: string
  /** Brightwork: trim strips, handles, vent blades, shifter ring. */
  trim: string
  /** Seat facing. */
  upholstery: string
  /** Contrast stitching and piping. */
  stitching: string
  /** Ambient lighting colour after dark. */
  ambient: string
  carpet: string
  headliner: string
}

export interface CockpitGeometry {
  /**
   * The camera's nodal point: between the front seats at headrest height.
   *
   * Biased slightly toward the driver rather than sitting on the console
   * centreline. Dead centre puts the cluster half outside a browser-shaped
   * viewport; the reference framing has the wheel left of centre and the touch
   * screen right of it, which only happens from a driver-biased seat.
   */
  eyePoint: [number, number, number]

  /** Dash top surface height. */
  dashTopY: number
  /** Front edge of the dash, where the windshield meets it. */
  cowlZ: number
  /** The vertical face of the dash that the driver looks at. */
  fasciaZ: number
  /** Inner face of the door cards. */
  cabinHalfWidth: number
  /** Underside of the headliner. */
  roofY: number
  /** Where the windshield meets the header rail. */
  headerZ: number
  /** Floor height, for the console and footwells. */
  floorY: number

  steeringWheelRadius: number
  /** Column rake from vertical, radians. */
  columnRake: number
  wheelPosition: [number, number, number]

  clusterPosition: [number, number, number]
  clusterSize: [number, number]
  /** Pitch and yaw that aim the panel at the eye point. */
  clusterAim: [number, number]

  screenPosition: [number, number, number]
  screenSize: [number, number]
  screenAim: [number, number]

  /** Door mirror centres, seen through the side glass from the eye point. */
  mirrorPosition: [number, number, number]
  /** Rear-view mirror. */
  rearMirrorPosition: [number, number, number]

  /** Front seat centres. */
  seatOffsetX: number
  seatCushionY: number
  seatBackZ: number
}

export interface ExteriorConfig {
  /** Body paint. */
  paint: string
  /** Lower cladding and bumper trim. */
  cladding: string
  /** Wheel finish. */
  wheel: string
  /** Point the turntable orbits — the vehicle's centre. */
  turntableTarget: [number, number, number]
  turntableRadius: number
  /** Overall dimensions, metres: length, width, height. */
  dimensions: [number, number, number]
  /** Front and rear axle positions in cabin coordinates. */
  frontAxleZ: number
  rearAxleZ: number
}

export interface ClusterConfig {
  /** Which cluster theme the trim ships. */
  skin: 'standard' | 'sport' | 'rugged' | 'luxury'
  maxSpeedKph: number
  maxRpm: number
  redlineRpm: number
}

export interface CarDefinition {
  id: string
  /** Full marketing name, as the trim pill shows it. */
  name: string
  /** Short name for the dropdown list. */
  shortName: string
  badge: string
  tagline: string
  bodyStyle: string
  energyType: 'fuel' | 'battery'
  singleSpeed: boolean
  powertrain: PowertrainProfile
  theme: CarTheme
  cockpit: CockpitGeometry
  cluster: ClusterConfig
  exterior: ExteriorConfig
}
