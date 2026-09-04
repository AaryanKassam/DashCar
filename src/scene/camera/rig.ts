import type { CarDefinition } from '../../cars/carTypes'

/**
 * Camera rig: named poses and the damping that moves between them.
 *
 * Pure module — no React, no three.js objects. `CameraRig.tsx` binds input to it
 * and reads the result once per frame. Keeping the maths here means the feel can
 * be reasoned about (and eventually tested) without a renderer.
 *
 * ## The model
 *
 * One shape covers both rigs. A pose is an **anchor**, a **radius**, a yaw, a
 * pitch and a field of view:
 *
 * - `radius === 0` → *nodal*. The camera sits at the anchor and rotates in
 *   place. This is the interior configurator view: dragging changes where you
 *   are looking, never where you are. Parallax inside the cabin stays fixed,
 *   which is the whole character of the reference.
 * - `radius > 0` → *orbit*. The camera sits on a sphere around the anchor and
 *   looks at it. This is the exterior turntable.
 *
 * Because both are the same five numbers, moving between them is one
 * interpolation rather than two rigs and a hand-off — the camera flies out
 * through the windscreen and settles into the turntable on its own.
 *
 * ## Zoom is FOV, not dolly
 *
 * Narrowing the field of view tightens the framing while leaving every parallax
 * relationship in the cabin untouched. Dollying forward would slide the dash
 * past the door cards and immediately read as a game camera rather than a
 * configurator.
 */

export type PoseId = 'interiorDefault' | 'driving' | 'infotainmentFocus' | 'clusterFocus' | 'exteriorTurntable'

export interface CameraPose {
  id: PoseId
  /** The point the camera rotates about. Nodal poses sit at it, orbit poses look at it. */
  anchor: [number, number, number]
  /** Metres from the anchor. Zero means nodal. */
  radius: number
  /** Rest orientation and framing. */
  yaw: number
  pitch: number
  fov: number
  /** Limits, relative to the world (not to the rest pose). */
  yawRange: [number, number]
  pitchRange: [number, number]
  fovRange: [number, number]
  /** Which gestures this pose accepts. */
  allow: { yaw: boolean; pitch: boolean; zoom: boolean }
  /** Whether acceleration pitch and cornering roll apply. Off for static views. */
  motionCues: boolean
  /** Milliseconds to reach this pose from wherever the camera is. */
  transitionMs: number
}

const DEG = Math.PI / 180

/** Interior pan limits, from the configurator spec. */
export const YAW_LIMIT = 75 * DEG
export const PITCH_LIMIT = 20 * DEG
export const FOV_WIDE = 75
export const FOV_TIGHT = 35

/**
 * How far the driver may look away from the road, as a function of speed.
 *
 * Not a gimmick: swinging your view to the door card at motorway speed is
 * exactly the eyes-off-road behaviour every production HMI is designed to
 * discourage, and modelling the constraint is more honest than allowing it.
 * The limit closes continuously rather than snapping at a threshold, so the
 * view *settles* forward as the car gathers speed instead of being yanked.
 */
export function yawLimitForSpeed(speedKph: number): number {
  const t = clamp01(speedKph / 60)
  return lerp(YAW_LIMIT, 22 * DEG, smoothstep(t))
}

/** Places a pose on the normal of a panel, so the panel is framed square-on. */
export function focusPose(
  id: PoseId,
  panelPosition: [number, number, number],
  panelAim: [number, number],
  distance: number,
  fov: number,
): CameraPose {
  const [pitchAim, yawAim] = panelAim

  // The panel faces +z in its own frame and is rotated Rx(pitch)·Ry(yaw), so its
  // world normal is this. Deriving it rather than eyeballing it matters: an
  // earlier version had the sign wrong and put the camera outside the car,
  // facing the studio wall.
  const nx = Math.sin(yawAim)
  const ny = -Math.cos(yawAim) * Math.sin(pitchAim)
  const nz = Math.cos(yawAim) * Math.cos(pitchAim)

  // Stand off along the normal...
  const anchor: [number, number, number] = [
    panelPosition[0] + nx * distance,
    panelPosition[1] + ny * distance,
    panelPosition[2] + nz * distance,
  ]

  // ...and look back down it. A YXZ camera's forward is
  // (−sin yaw·cos pitch, sin pitch, −cos yaw·cos pitch); setting that equal to
  // −n gives these two angles.
  const yaw = Math.atan2(nx, nz)
  const pitch = Math.asin(clamp(-ny, -1, 1))

  return {
    id,
    anchor,
    radius: 0,
    yaw,
    pitch,
    fov,
    // A little play, so the focused view still feels like a camera you are
    // holding rather than a modal dialog.
    yawRange: [yaw - 10 * DEG, yaw + 10 * DEG],
    pitchRange: [pitch - 8 * DEG, pitch + 8 * DEG],
    fovRange: [fov * 0.7, fov * 1.25],
    allow: { yaw: true, pitch: true, zoom: true },
    motionCues: false,
    transitionMs: 820,
  }
}

/** Every pose for a given car, derived from its cabin package. */
export function buildPoses(car: CarDefinition): Record<PoseId, CameraPose> {
  const g = car.cockpit
  const eye = g.eyePoint

  const interiorDefault: CameraPose = {
    id: 'interiorDefault',
    anchor: eye,
    radius: 0,
    yaw: 0,
    // Down far enough to bring the console and shifter into the bottom of the
    // frame. The reference frames the instrument panel, not the headliner.
    pitch: -6.5 * DEG,
    fov: FOV_WIDE,
    yawRange: [-YAW_LIMIT, YAW_LIMIT],
    pitchRange: [-PITCH_LIMIT, PITCH_LIMIT],
    fovRange: [FOV_TIGHT, FOV_WIDE],
    allow: { yaw: true, pitch: true, zoom: true },
    motionCues: true,
    transitionMs: 900,
  }

  const driving: CameraPose = {
    ...interiorDefault,
    id: 'driving',
    pitch: -8 * DEG,
    fov: 70,
    // Yaw is narrowed further at speed by `yawLimitForSpeed`.
    yawRange: [-YAW_LIMIT, YAW_LIMIT],
    pitchRange: [-14 * DEG, 14 * DEG],
    fovRange: [52, 74],
    transitionMs: 700,
  }

  const infotainmentFocus = focusPose('infotainmentFocus', g.screenPosition, g.screenAim, 0.46, 31)
  const clusterFocus = focusPose('clusterFocus', g.clusterPosition, g.clusterAim, 0.4, 30)

  const exteriorTurntable: CameraPose = {
    id: 'exteriorTurntable',
    anchor: car.exterior.turntableTarget,
    radius: car.exterior.turntableRadius,
    // Default three-quarter front. Yaw 0 sits behind the car (forward is −z),
    // so the front-left corner is a little past a half turn.
    yaw: -144 * DEG,
    // Slightly above the beltline, looking gently down.
    pitch: 9 * DEG,
    fov: 32,
    yawRange: [-Infinity, Infinity],
    pitchRange: [9 * DEG, 9 * DEG],
    fovRange: [32, 32],
    // Azimuth only, exactly as the reference turntable behaves.
    allow: { yaw: true, pitch: false, zoom: false },
    motionCues: false,
    transitionMs: 1100,
  }

  return { interiorDefault, driving, infotainmentFocus, clusterFocus, exteriorTurntable }
}

// ---------------------------------------------------------------------------

interface Frame {
  anchor: [number, number, number]
  radius: number
  yaw: number
  pitch: number
  fov: number
}

/** What the renderer needs each frame. */
export interface RigOutput {
  position: [number, number, number]
  /** Euler angles in YXZ order. */
  rotation: [number, number, number]
  fov: number
}

/** Damping constants. Higher follows the pointer more tightly. */
const FOLLOW = 15
const FOV_FOLLOW = 9
/** Inertia decay after release, per second. */
const GLIDE_DECAY = 3.4
/** Below this the glide is over; stops a value creeping for ever. */
const GLIDE_EPSILON = 0.0006

export class CameraRigState {
  pose: CameraPose
  private poses: Record<PoseId, CameraPose>

  /** Where the user has asked to be. Hard-clamped to the pose's ranges. */
  private target: Frame
  /** Where the camera actually is. Eases toward `target`. */
  private current: Frame

  /** Radians per second, carried after release. */
  private velYaw = 0
  private velPitch = 0

  /** Transition in flight, if any. */
  private from: Frame | null = null
  private transitionT = 0
  private transitionMs = 0

  /** Extra rotation from vehicle motion; never clamped, never user-controlled. */
  private cuePitch = 0
  private cueRoll = 0

  constructor(poses: Record<PoseId, CameraPose>, start: PoseId = 'interiorDefault') {
    this.poses = poses
    this.pose = poses[start]
    this.target = frameOf(this.pose)
    this.current = frameOf(this.pose)
  }

  /** Swap in poses for a different car without losing where the camera is looking. */
  retarget(poses: Record<PoseId, CameraPose>) {
    this.poses = poses
    const next = poses[this.pose.id]
    this.pose = next
    // Keep the user's current yaw/pitch, re-clamped to the new pose.
    this.target.anchor = next.anchor
    this.target.radius = next.radius
    this.clampTarget()
  }

  get isTransitioning() {
    return this.from !== null
  }

  transitionTo(id: PoseId) {
    if (this.pose.id === id && !this.isTransitioning) return
    const next = this.poses[id]
    this.from = { ...this.current, anchor: [...this.current.anchor] as [number, number, number] }
    this.pose = next
    this.target = frameOf(next)
    this.transitionT = 0
    this.transitionMs = next.transitionMs
    this.velYaw = 0
    this.velPitch = 0
  }

  /** Pointer drag, in radians. Ignored while a transition is playing. */
  drag(dYaw: number, dPitch: number) {
    if (this.isTransitioning) return
    if (this.pose.allow.yaw) this.target.yaw += dYaw
    if (this.pose.allow.pitch) this.target.pitch += dPitch
    this.clampTarget()
  }

  /** Hand the rig a release velocity so the view glides to a stop. */
  release(velYaw: number, velPitch: number) {
    if (this.isTransitioning) return
    this.velYaw = this.pose.allow.yaw ? velYaw : 0
    this.velPitch = this.pose.allow.pitch ? velPitch : 0
  }

  /** Wheel or pinch. Positive zooms in (narrows the field of view). */
  zoom(delta: number) {
    if (this.isTransitioning || !this.pose.allow.zoom) return
    this.target.fov -= delta
    this.clampTarget()
  }

  /** Return to the pose's rest orientation — the double-click recentre. */
  recentre() {
    this.target.yaw = this.pose.yaw
    this.target.pitch = this.pose.pitch
    this.target.fov = this.pose.fov
    this.velYaw = 0
    this.velPitch = 0
  }

  /**
   * Advance one frame.
   *
   * `speedKph` narrows the interior yaw limit; `accel` and `curvature` supply the
   * body cues. The rig reads vehicle state and never writes to it.
   */
  update(dt: number, speedKph: number, accel: number, curvature: number): RigOutput {
    if (this.from) {
      this.transitionT += (dt * 1000) / this.transitionMs
      if (this.transitionT >= 1) {
        this.transitionT = 1
        this.current = { ...this.target, anchor: [...this.target.anchor] as [number, number, number] }
        this.from = null
      } else {
        const e = easeInOutCubic(this.transitionT)
        this.current = blend(this.from, this.target, e)
      }
    } else {
      // Inertia: the glide moves the *target*, so it still respects the clamps.
      if (Math.abs(this.velYaw) > GLIDE_EPSILON || Math.abs(this.velPitch) > GLIDE_EPSILON) {
        this.target.yaw += this.velYaw * dt
        this.target.pitch += this.velPitch * dt
        const decay = Math.exp(-GLIDE_DECAY * dt)
        this.velYaw *= decay
        this.velPitch *= decay
        this.clampTarget()
      } else {
        this.velYaw = 0
        this.velPitch = 0
      }

      // Speed-dependent clamp, applied every frame so the view eases forward as
      // the car accelerates rather than being cut back.
      if (this.pose.motionCues) this.clampTarget(speedKph)

      const k = 1 - Math.exp(-FOLLOW * dt)
      this.current.yaw += (this.target.yaw - this.current.yaw) * k
      this.current.pitch += (this.target.pitch - this.current.pitch) * k
      this.current.fov += (this.target.fov - this.current.fov) * (1 - Math.exp(-FOV_FOLLOW * dt))
      this.current.anchor = this.target.anchor
      this.current.radius = this.target.radius
    }

    // Body cues, outside the clamped user rotation.
    if (this.pose.motionCues) {
      const targetCuePitch = clamp(-accel * 0.012, -0.05, 0.05)
      const targetCueRoll = clamp(curvature * 0.06, -0.06, 0.06)
      this.cuePitch += (targetCuePitch - this.cuePitch) * Math.min(1, dt * 4)
      this.cueRoll += (targetCueRoll - this.cueRoll) * Math.min(1, dt * 3)
    } else {
      this.cuePitch += (0 - this.cuePitch) * Math.min(1, dt * 4)
      this.cueRoll += (0 - this.cueRoll) * Math.min(1, dt * 3)
    }

    const { anchor, radius, yaw, pitch, fov } = this.current
    const pitchOut = pitch + this.cuePitch

    if (radius <= 0.0001) {
      return { position: anchor, rotation: [pitchOut, yaw, this.cueRoll], fov }
    }

    // Orbit: sit on the sphere and look back at the anchor. Positive pitch
    // raises the camera, so the sign is inverted relative to the nodal case.
    const cp = Math.cos(pitchOut)
    const position: [number, number, number] = [
      anchor[0] + Math.sin(yaw) * cp * radius,
      anchor[1] + Math.sin(pitchOut) * radius,
      anchor[2] + Math.cos(yaw) * cp * radius,
    ]
    return { position, rotation: [-pitchOut, yaw, this.cueRoll], fov }
  }

  private clampTarget(speedKph = 0) {
    const p = this.pose
    let [yawLo, yawHi] = p.yawRange
    if (p.motionCues && Number.isFinite(yawLo)) {
      const limit = yawLimitForSpeed(speedKph)
      yawLo = Math.max(yawLo, -limit)
      yawHi = Math.min(yawHi, limit)
    }

    const yaw = clamp(this.target.yaw, yawLo, yawHi)
    // Killing the velocity at the wall is what makes the stop soft instead of a
    // bounce: the glide simply ends, and the follower eases into the limit.
    if (yaw !== this.target.yaw) this.velYaw = 0
    this.target.yaw = yaw

    const pitch = clamp(this.target.pitch, p.pitchRange[0], p.pitchRange[1])
    if (pitch !== this.target.pitch) this.velPitch = 0
    this.target.pitch = pitch

    this.target.fov = clamp(this.target.fov, p.fovRange[0], p.fovRange[1])
  }
}

const frameOf = (p: CameraPose): Frame => ({
  anchor: [...p.anchor] as [number, number, number],
  radius: p.radius,
  yaw: p.yaw,
  pitch: p.pitch,
  fov: p.fov,
})

function blend(a: Frame, b: Frame, t: number): Frame {
  return {
    anchor: [
      lerp(a.anchor[0], b.anchor[0], t),
      lerp(a.anchor[1], b.anchor[1], t),
      lerp(a.anchor[2], b.anchor[2], t),
    ],
    radius: lerp(a.radius, b.radius, t),
    // Shortest way round, so a turntable never unwinds the long way home.
    yaw: a.yaw + shortestAngle(a.yaw, b.yaw) * t,
    pitch: lerp(a.pitch, b.pitch, t),
    fov: lerp(a.fov, b.fov, t),
  }
}

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (v: number) => clamp(v, 0, 1)
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
