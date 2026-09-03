import type { Hazard } from '../state/vehicleTypes'

/**
 * Stand-in for a sensor-fusion track list.
 *
 * A real surround-view system receives a list of classified objects with
 * position and velocity in the vehicle frame; the HMI's job is only to present
 * them and rank them by threat. This module fabricates that list so the HMI
 * layer can be built and demoed against a realistic shape of data.
 *
 * Coordinates: +x right of the car, +z ahead of the car, metres.
 */

const KINDS: Hazard['kind'][] = ['pedestrian', 'pedestrian', 'pedestrian', 'cyclist', 'vehicle']

/** Detection envelope of the simulated sensor set. */
const RANGE = 14
const MAX_TRACKS = 7

/**
 * Surround view is a low-speed system, in this simulation and in every car that
 * ships one. Short-range sensors have nothing useful to say at road speed —
 * an object is through the envelope faster than the driver can react — so
 * production systems disable the view above roughly this speed rather than
 * showing a display that flickers objects in and out.
 */
export const SURROUND_MAX_KPH = 25


let tracks: Hazard[] = []
let nextId = 1
let spawnTimer = 0

function spawn(): Hazard {
  const kind = KINDS[Math.floor(Math.random() * KINDS.length)]

  // Enter on a ring at the edge of the envelope, at any bearing.
  const bearing = Math.random() * Math.PI * 2
  const radius = RANGE * (0.62 + Math.random() * 0.3)
  const x = Math.sin(bearing) * radius
  const z = Math.cos(bearing) * radius

  const speed = kind === 'pedestrian' ? 1.2 + Math.random() * 0.6 : kind === 'cyclist' ? 4.5 + Math.random() * 2 : 8 + Math.random() * 4

  // Aim at a point *near* the car rather than at it. Tracks that converge on
  // the exact origin all pile up in the middle; tracks aimed a couple of metres
  // off produce the near-misses that make the threat ranking do any work.
  // Offset from the car, never through it: a track that walks into the cabin
  // is distracting in a way that teaches the viewer nothing.
  const side = Math.random() < 0.5 ? -1 : 1
  const aimX = side * (1.6 + Math.random() * 3)
  const aimZ = (Math.random() - 0.5) * 6
  const dx = aimX - x
  const dz = aimZ - z
  const len = Math.hypot(dx, dz) || 1

  return { id: nextId++, kind, x, z, vx: (dx / len) * speed, vz: (dz / len) * speed }
}

export interface HazardStepResult {
  hazards: Hazard[]
  nearest: number | null
}

/**
 * Advance the track list one frame.
 *
 * Tracks move in the *world*, so the car's own speed slides them rearward —
 * that relative motion is what makes the surround view read as real.
 */
export function stepHazards(active: boolean, ownSpeedMs: number, dt: number): HazardStepResult {
  if (!active) {
    if (tracks.length) {
      tracks = []
      spawnTimer = 0
    }
    return { hazards: tracks, nearest: null }
  }

  // Seed the display on activation. A surround view that opens empty and fills
  // in over ten seconds reads as broken, and the first thing a driver does with
  // this screen is check whether it is showing them anything at all.
  if (tracks.length === 0 && spawnTimer <= 0) {
    tracks = [spawn(), spawn(), spawn()]
    spawnTimer = 0.5
  }

  spawnTimer -= dt
  if (spawnTimer <= 0 && tracks.length < MAX_TRACKS) {
    tracks = [...tracks, spawn()]
    spawnTimer = 0.35 + Math.random() * 0.8
  }

  let nearest: number | null = null
  const next: Hazard[] = []

  for (const t of tracks) {
    const x = t.x + t.vx * dt
    const z = t.z + t.vz * dt - ownSpeedMs * dt
    // Drop tracks that leave the detection envelope.
    if (Math.abs(x) > RANGE || z < -RANGE || z > RANGE * 1.2) continue

    const moved: Hazard = { ...t, x, z }
    next.push(moved)

    const d = Math.hypot(x, z)
    if (nearest === null || d < nearest) nearest = d
  }

  tracks = next
  return { hazards: tracks, nearest }
}

/** Threat ranking used by both the overlay and the warning chime. */
export function threatLevel(distance: number | null): 'none' | 'info' | 'caution' | 'critical' {
  if (distance === null) return 'none'
  if (distance < 2.2) return 'critical'
  if (distance < 4.5) return 'caution'
  return 'info'
}

export function resetHazards() {
  tracks = []
  spawnTimer = 0
}
