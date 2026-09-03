/**
 * Longitudinal vehicle model.
 *
 * Pure functions only: no store access, no React. The driving loop owns the
 * timing, this file owns the maths. That split is what makes the behaviour
 * tunable per car (see `cars/carRegistry.ts`) and unit-testable.
 *
 * SI units throughout (m, s, N, kg). The store publishes km/h because that is
 * what the cluster displays; conversion happens at the boundary.
 */

export interface PowertrainProfile {
  /** kg, incl. driver. */
  mass: number
  /** Cd * frontal area, m^2. */
  dragArea: number
  /** Coefficient of rolling resistance. */
  rollingResistance: number
  /** Peak crank power, watts. */
  peakPowerW: number
  /** Traction-limited maximum drive force, N. Caps launch acceleration. */
  maxTractionN: number
  /** Total braking force at full pedal, N. */
  maxBrakeForceN: number
  idleRpm: number
  redlineRpm: number
  gearRatios: number[]
  finalDrive: number
  /** Rolling radius, m. */
  wheelRadius: number
  /** Lock-to-lock steering wheel travel, degrees (visual only). */
  steeringLockDeg: number
}

export interface DriveModeTuning {
  /** Throttle pedal shaping exponent. >1 = lazier initial response (Eco). */
  throttleGamma: number
  /** Fraction of peak power made available. */
  powerFraction: number
  /** Upshift point as a fraction of redline. */
  upshiftFraction: number
  downshiftFraction: number
}

export const DRIVE_MODE_TUNING: Record<string, DriveModeTuning> = {
  eco: { throttleGamma: 1.9, powerFraction: 0.72, upshiftFraction: 0.42, downshiftFraction: 0.2 },
  comfort: { throttleGamma: 1.35, powerFraction: 0.88, upshiftFraction: 0.58, downshiftFraction: 0.28 },
  sport: { throttleGamma: 1.0, powerFraction: 1.0, upshiftFraction: 0.86, downshiftFraction: 0.45 },
}

const AIR_DENSITY = 1.225
const GRAVITY = 9.81

export const KPH_PER_MS = 3.6
export const msToKph = (ms: number) => ms * KPH_PER_MS
export const kphToMs = (kph: number) => kph / KPH_PER_MS

export interface LongitudinalInput {
  /** m/s, always >= 0; direction is carried by `reverse`. */
  speedMs: number
  reverse: boolean
  throttle: number
  brake: number
  /** true when the transmission can deliver torque (D or R, engine on). */
  driveEngaged: boolean
  engineRunning: boolean
  parkingBrake: boolean
}

export interface LongitudinalResult {
  speedMs: number
  /** Net longitudinal acceleration, m/s^2. Used for brake-light and pitch cues. */
  accel: number
}

/**
 * Available drive force at a given road speed.
 *
 * Constant power above a threshold speed gives the familiar hyperbolic
 * force curve (strong off the line, tapering at speed) without needing a
 * full torque map — a good accuracy/complexity trade for an HMI demo.
 */
export function driveForce(profile: PowertrainProfile, tuning: DriveModeTuning, throttle: number, speedMs: number): number {
  const shaped = Math.pow(Math.max(0, Math.min(1, throttle)), tuning.throttleGamma)
  const power = profile.peakPowerW * tuning.powerFraction * shaped
  // Below ~3 m/s the P/v term explodes, so clamp to the traction limit.
  const force = power / Math.max(speedMs, 3)
  return Math.min(force, profile.maxTractionN * shaped)
}

export function resistiveForce(profile: PowertrainProfile, speedMs: number): number {
  const drag = 0.5 * AIR_DENSITY * profile.dragArea * speedMs * speedMs
  const rolling = profile.rollingResistance * profile.mass * GRAVITY
  return drag + (speedMs > 0.05 ? rolling : 0)
}

export function stepLongitudinal(
  profile: PowertrainProfile,
  tuning: DriveModeTuning,
  input: LongitudinalInput,
  dt: number,
): LongitudinalResult {
  const { speedMs } = input
  let force = 0

  if (input.driveEngaged && input.engineRunning && !input.parkingBrake) {
    force += driveForce(profile, tuning, input.throttle, speedMs)
  }

  force -= resistiveForce(profile, speedMs)

  // Engine braking whenever the driver lifts off in gear.
  if (input.driveEngaged && input.throttle < 0.02 && speedMs > 0.1) {
    force -= profile.mass * 0.35
  }

  const brakeCommand = input.parkingBrake ? Math.max(input.brake, 1) : input.brake
  if (brakeCommand > 0 && speedMs > 0) {
    force -= brakeCommand * profile.maxBrakeForceN
  }

  const accel = force / profile.mass
  let next = speedMs + accel * dt

  // Brakes bring the car to rest, they never reverse it.
  if (next < 0) next = 0
  if (!input.driveEngaged && next < 0.05) next = 0

  return { speedMs: next, accel }
}

/** Engine speed implied by road speed in a given gear. */
export function engineRpm(profile: PowertrainProfile, speedMs: number, gearIndex: number): number {
  const ratio = profile.gearRatios[gearIndex] ?? profile.gearRatios[0]
  const wheelRps = speedMs / (2 * Math.PI * profile.wheelRadius)
  return wheelRps * ratio * profile.finalDrive * 60
}

/**
 * Automatic gearbox: pick the gear whose engine speed sits in the band the
 * current drive mode wants. Returns the (possibly unchanged) gear index.
 */
export function selectGear(
  profile: PowertrainProfile,
  tuning: DriveModeTuning,
  speedMs: number,
  gearIndex: number,
  throttle: number,
): number {
  const top = profile.gearRatios.length - 1
  const upshiftAt = profile.redlineRpm * tuning.upshiftFraction * (0.75 + 0.25 * throttle)
  const downshiftAt = profile.redlineRpm * tuning.downshiftFraction

  if (gearIndex < top && engineRpm(profile, speedMs, gearIndex) > upshiftAt) return gearIndex + 1
  if (gearIndex > 0 && engineRpm(profile, speedMs, gearIndex - 1) < profile.redlineRpm * 0.95) {
    if (engineRpm(profile, speedMs, gearIndex) < downshiftAt) return gearIndex - 1
  }
  return gearIndex
}

/** Fuel burn, litres per second — enough to make the gauge move believably. */
export function fuelFlow(throttle: number, rpm: number, idleRpm: number): number {
  const load = 0.00018 + throttle * 0.0016
  return load * (0.35 + rpm / Math.max(idleRpm, 1) / 8)
}
