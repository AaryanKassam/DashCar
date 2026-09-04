import type { CockpitGeometry, ExteriorConfig } from '../carTypes'
import type { PowertrainProfile } from '../../simulation/physics'

/**
 * The Explorer cabin package, shared by every trim.
 *
 * All dimensions are metres in a right-handed frame: **y = 0 is the road**,
 * **−z is forward**, **+x is to the driver's right**. The longitudinal origin is
 * the driver's H-point, so the numbers below read the way a package drawing
 * does — the cowl is 1.34 m ahead of you, the header 0.60 m ahead and 0.38 m up.
 *
 * Reference figures for the 2025 Explorer: 5.06 m long, 2.00 m wide, 1.78 m
 * tall, 3.03 m wheelbase. Everything else is derived to be consistent with
 * those and with the framing in `reference/configurator-interior.png`.
 */

/** Vehicle envelope, in cabin coordinates. */
const FRONT_BUMPER_Z = -3.3
const REAR_BUMPER_Z = 1.76
const FRONT_AXLE_Z = -2.35
const REAR_AXLE_Z = 0.68

export const EXPLORER_COCKPIT: CockpitGeometry = {
  // Between the seats, at headrest height, biased 14 cm toward the driver so the
  // wheel sits left of centre and the touchscreen right of it, as in the
  // reference. See the note on CockpitGeometry.eyePoint.
  eyePoint: [-0.14, 1.28, 0.05],

  dashTopY: 1.22,
  cowlZ: -1.05,
  fasciaZ: -0.64,
  cabinHalfWidth: 0.75,
  roofY: 1.66,
  headerZ: -0.62,
  floorY: 0.62,

  steeringWheelRadius: 0.19,
  // 24° from vertical, typical for a tall SUV column.
  columnRake: 0.42,
  wheelPosition: [-0.4, 1.1, -0.52],

  // 12.3" letterbox cluster, recessed in its binnacle behind the wheel.
  clusterPosition: [-0.4, 1.24, -0.8],
  clusterSize: [0.32, 0.12],
  clusterAim: [-0.14, 0.14],

  // 13.2" landscape touchscreen, standing proud of the fascia and canted at the
  // driver. A few degrees of yaw measurably shortens a glance.
  screenPosition: [0.1, 1.29, -0.62],
  screenSize: [0.3, 0.18],
  screenAim: [-0.1, -0.13],

  mirrorPosition: [0.99, 1.19, -0.86],
  rearMirrorPosition: [0, 1.585, -0.6],

  seatOffsetX: 0.42,
  seatCushionY: 0.72,
  seatBackZ: 0.18,
}

export const EXPLORER_EXTERIOR: Omit<ExteriorConfig, 'paint' | 'cladding' | 'wheel'> = {
  turntableTarget: [0, 0.85, (FRONT_BUMPER_Z + REAR_BUMPER_Z) / 2],
  turntableRadius: 8.6,
  dimensions: [5.06, 2.0, 1.78],
  frontAxleZ: FRONT_AXLE_Z,
  rearAxleZ: REAR_AXLE_Z,
}

export const EXPLORER_BODY = {
  frontBumperZ: FRONT_BUMPER_Z,
  rearBumperZ: REAR_BUMPER_Z,
  frontAxleZ: FRONT_AXLE_Z,
  rearAxleZ: REAR_AXLE_Z,
  halfWidth: 0.95,
  /** Underside of the body, above the road. */
  floorZ: 0.42,
  beltlineY: 1.24,
  roofY: 1.74,
  wheelRadius: 0.37,
}

/** 2.3 L EcoBoost I4, 300 hp / 310 lb-ft, 10-speed automatic. */
export const ECOBOOST_23: PowertrainProfile = {
  mass: 2020,
  dragArea: 1.02,
  rollingResistance: 0.015,
  peakPowerW: 224000,
  maxTractionN: 8200,
  maxBrakeForceN: 16800,
  idleRpm: 700,
  redlineRpm: 6200,
  gearRatios: [4.7, 2.99, 2.15, 1.8, 1.52, 1.28, 1.0, 0.85, 0.69, 0.64],
  finalDrive: 3.58,
  wheelRadius: 0.37,
  steeringLockDeg: 540,
}

/** 3.0 L EcoBoost V6, 400 hp / 415 lb-ft — the ST powertrain. */
export const ECOBOOST_30: PowertrainProfile = {
  ...ECOBOOST_23,
  mass: 2140,
  peakPowerW: 298000,
  maxTractionN: 10400,
  maxBrakeForceN: 18600,
  redlineRpm: 6500,
  finalDrive: 3.58,
}
