/**
 * Shared road geometry constants and the bend function.
 *
 * The shader bends the road in the vertex stage; roadside props are positioned
 * on the CPU. Both must use *the same* curve, or the trees drift off the
 * tarmac when you steer. Keeping the formula here — and only here — is what
 * guarantees that.
 */

/** How far ahead the road plane reaches, metres. */
export const ROAD_LENGTH = 340
/** Half-width of paved surface, metres (3 lanes each way at 3.7 m). */
export const ROAD_HALF_WIDTH = 11.5
export const LANE_WIDTH = 3.7

/**
 * Lateral offset of the road centreline at `depth` metres ahead.
 * Quadratic in depth: near the car the road is straight, far away it sweeps —
 * the same trick classic pseudo-3D racers used, and it reads correctly because
 * perspective compresses the far end anyway.
 */
export function roadBend(depth: number, curvature: number): number {
  const t = depth / ROAD_LENGTH
  return curvature * 62 * t * t
}

/** Absolute terrain height as a function of position along the route. */
function hills(s: number): number {
  return Math.sin(s * 0.0042) * 2.1 + Math.sin(s * 0.0131) * 0.55
}

/**
 * Elevation of the road `depth` metres ahead, *relative to the car*.
 *
 * Subtracting the terrain height at the car's own position is the whole trick.
 * Without it the profile displaces the road under the car as well as ahead of
 * it, and since the camera is pinned to y = eye height, the road periodically
 * slides out from under the wheels and the scenery floats. Anchoring the datum
 * to the car means the horizon rises and falls while the tarmac stays put.
 */
export function roadElevation(depth: number, distance: number): number {
  return hills(depth + distance) - hills(distance)
}

/** GLSL versions of the two functions above, injected into the road shader. */
export const ROAD_GLSL = /* glsl */ `
  float roadBend(float depth, float curvature) {
    float t = depth / ${ROAD_LENGTH.toFixed(1)};
    return curvature * 62.0 * t * t;
  }
  float hills(float s) {
    return sin(s * 0.0042) * 2.1 + sin(s * 0.0131) * 0.55;
  }
  float roadElevation(float depth, float distance) {
    return hills(depth + distance) - hills(distance);
  }
`
