/**
 * Per-frame values that deliberately live *outside* React.
 *
 * Road scroll distance and steering angle change every single frame. Pushing
 * them through the store would re-render the React tree 60x/second for values
 * only the renderer consumes. They are derived from vehicle signals — never an
 * independent source of truth — and are read imperatively inside `useFrame`.
 */
export const world = {
  /** Metres travelled. Drives the road texture scroll and roadside recycling. */
  distance: 0,
  /** Current speed in m/s, updated at the physics rate (finer than the bus rate). */
  speedMs: 0,
  /** Net longitudinal acceleration, m/s^2 — used for camera pitch cues. */
  accel: 0,
  /** Accumulated lateral road offset from steering, metres. */
  lateralOffset: 0,
  /** Road curvature the driver is steering into, 1/m-ish (visual units). */
  curvature: 0,
  /** Steering wheel angle in radians, smoothed. */
  wheelAngle: 0,
  /** 0..1 blink phase for indicators, shared by cluster + audio. */
  blinkPhase: 0,
  /** Seconds the driver has continuously dwelt on the touchscreen while moving. */
  screenDwell: 0,
  /**
   * 0 = out on the road, 1 = the configurator's seamless grey studio.
   *
   * One number drives the sky, the road surface and the key light together, so
   * the world dissolves into a cyclorama instead of being swapped for one. It
   * lives here rather than in a store because it changes every frame during the
   * blend and only the renderer consumes it.
   */
  studio: 1,
}

export function resetWorld() {
  world.distance = 0
  world.speedMs = 0
  world.accel = 0
  world.lateralOffset = 0
  world.curvature = 0
  world.wheelAngle = 0
  world.blinkPhase = 0
  world.screenDwell = 0
  world.studio = 1
}
