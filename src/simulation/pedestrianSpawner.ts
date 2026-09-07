import type { Hazard } from '../state/vehicleTypes'

/**
 * Stand-in for a sensor-fusion track list.
 *
 * A real surround-view system receives classified objects with position and
 * velocity in the vehicle frame; the HMI's job is to present them and rank them
 * by threat. This module fabricates that list so the HMI can be built and demoed
 * against a realistic shape of data.
 *
 * Coordinates: +x right of the car, +z ahead of the car, metres.
 *
 * ## One pedestrian, crossing in front
 *
 * An earlier version spawned up to seven tracks from every bearing and aimed
 * each at a point near the origin, which meant they walked *through* the car.
 * On the plan view that read as pedestrians strolling over the bonnet, which is
 * both wrong and distracting: a crossing pedestrian is the scenario this display
 * exists for, and it should look like one.
 *
 * So the model is now literal. One pedestrian at a time, entering from a kerb,
 * walking laterally across the car's path at a fixed distance ahead, and leaving
 * on the far side. It never enters the vehicle footprint, and the display never
 * has to draw something on top of the car.
 */

/** Detection envelope of the simulated sensor set. */
const RANGE = 14
/** How far out the pedestrian enters and leaves. */
const KERB_X = 8.5

/**
 * The crossing never gets closer than this.
 *
 * Without a floor the car's own speed carries the crossing point straight past
 * the bumper, and within a second the pedestrian is *beside* the car rather than
 * in front of it — which is both wrong for the scenario and wrong for the
 * display, since the plan view then has to draw them over the vehicle. Holding
 * the crossing ahead models the thing that would actually happen: a driver sees
 * someone stepping out and slows for them.
 */
const MIN_CROSSING_Z = 2.6

export const SURROUND_MAX_KPH = 25

interface Walker extends Hazard {
  /** Where the crossing happens, metres ahead of the bumper. */
  crossingZ: number
}

let walker: Walker | null = null
let nextId = 1
let gap = 0

/**
 * Start a crossing.
 *
 * Distance ahead is drawn from a range that spans the whole threat ladder, so
 * the display is exercised rather than sitting on one colour: a long crossing
 * reads as information, a close one as a genuine alert.
 */
function spawn(): Walker {
  const fromLeft = Math.random() < 0.5
  const crossingZ = 2.2 + Math.random() * 6.5
  const speed = 1.15 + Math.random() * 0.7

  return {
    id: nextId++,
    kind: 'pedestrian',
    x: fromLeft ? -KERB_X : KERB_X,
    z: crossingZ,
    vx: fromLeft ? speed : -speed,
    // Walks straight across; the car's own motion supplies the closing speed.
    vz: 0,
    crossingZ,
  }
}

export interface HazardStepResult {
  hazards: Hazard[]
  nearest: number | null
}

const EMPTY: HazardStepResult = { hazards: [], nearest: null }

/**
 * Advance the crossing one frame.
 *
 * The pedestrian holds their line in the world, so the car's own speed closes
 * the gap. That relative motion is what makes the display read as real, and it
 * is also what makes the low-speed gate meaningful.
 */
export function stepHazards(active: boolean, ownSpeedMs: number, dt: number): HazardStepResult {
  if (!active) {
    walker = null
    gap = 0
    return EMPTY
  }

  if (!walker) {
    gap -= dt
    if (gap > 0) return EMPTY
    walker = spawn()
  }

  const x = walker.x + walker.vx * dt
  // Own motion closes on the crossing, easing off as the floor approaches. A
  // hard clamp would snap the track to a stop; tapering the closing rate over
  // the last few metres looks like what it represents, which is a driver lifting
  // off for someone in the road.
  const ease = Math.min(1, Math.max(0, (walker.z - MIN_CROSSING_Z) / 3))
  const z = Math.max(MIN_CROSSING_Z, walker.z - ownSpeedMs * ease * dt)

  // Reached the far kerb: the crossing is complete, so pause before the next.
  if (Math.abs(x) > KERB_X + 1.5 || z > RANGE) {
    walker = null
    gap = 1.6 + Math.random() * 2.2
    return EMPTY
  }

  walker = { ...walker, x, z }
  return { hazards: [walker], nearest: Math.hypot(x, z) }
}

/** Threat ranking used by the overlay, the cluster and the warning chime. */
export function threatLevel(distance: number | null): 'none' | 'info' | 'caution' | 'critical' {
  if (distance === null) return 'none'
  if (distance < 3.2) return 'critical'
  if (distance < 6) return 'caution'
  return 'info'
}

export function resetHazards() {
  walker = null
  gap = 0
}
