import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { useCar } from '../../cars/garageStore'
import { useViewStore } from '../../state/viewStore'
import { useVehicleStore } from '../../state/vehicleStore'
import { world } from '../../simulation/worldState'
import { CameraRigState, buildPoses } from './rig'

/**
 * Binds pointer, wheel and touch input to the camera rig.
 *
 * Input handling notes that matter for the feel:
 *
 * - Drag uses window-level move/up listeners rather than pointer capture on the
 *   canvas, so react-three-fiber's own raycast events keep working. Capturing
 *   on the canvas would swallow the click that focuses the centre screen.
 * - A gesture is only a *click* if it moved less than a few pixels. `didDrag`
 *   is exported so panel handlers can ignore the pointerup that ends a pan.
 * - Release velocity comes from the last ~90 ms of movement, not the final
 *   frame, so a flick that stutters on one frame still glides.
 */

/** Radians of rotation per pixel of drag. Tuned so a full sweep is ~1.5 screens. */
const YAW_PER_PX = 0.0042
const PITCH_PER_PX = 0.0034
/** Field-of-view degrees per wheel notch. */
const ZOOM_PER_WHEEL = 0.045
const CLICK_SLOP_PX = 5
const VELOCITY_WINDOW_MS = 90

/** True when the last pointer gesture was a pan rather than a click. */
export const gesture = { didDrag: false }

export function CameraRig() {
  const car = useCar()
  const { camera, gl } = useThree()
  const poses = useMemo(() => buildPoses(car), [car])
  const rig = useRef<CameraRigState>(null as unknown as CameraRigState)
  if (!rig.current) rig.current = new CameraRigState(poses)

  // A car swap keeps the pose but moves the anchors with the new cabin.
  useEffect(() => {
    rig.current.retarget(poses)
  }, [poses])

  // Drive the rig from the view store.
  useEffect(() => {
    rig.current.transitionTo(useViewStore.getState().pose)
    return useViewStore.subscribe((s) => {
      rig.current.transitionTo(s.pose)
    })
  }, [])

  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = 'grab'
    el.style.touchAction = 'none'

    let dragging = false
    let last = { x: 0, y: 0 }
    let travelled = 0
    let samples: { t: number; dYaw: number; dPitch: number }[] = []
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance = 0

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        pinchDistance = spread(pointers)
        dragging = false
        return
      }
      dragging = true
      gesture.didDrag = false
      travelled = 0
      samples = []
      last = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.size === 2) {
        const next = spread(pointers)
        if (pinchDistance > 0) rig.current.zoom((next - pinchDistance) * 0.09)
        pinchDistance = next
        return
      }
      if (!dragging) return

      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      travelled += Math.abs(dx) + Math.abs(dy)
      if (travelled > CLICK_SLOP_PX) gesture.didDrag = true

      const dYaw = -dx * YAW_PER_PX
      const dPitch = -dy * PITCH_PER_PX
      rig.current.drag(dYaw, dPitch)

      const now = performance.now()
      samples.push({ t: now, dYaw, dPitch })
      while (samples.length > 1 && now - samples[0].t > VELOCITY_WINDOW_MS) samples.shift()
    }

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinchDistance = 0
      if (!dragging) return
      dragging = false
      el.style.cursor = 'grab'

      // Average the recent samples into a velocity, in radians per second.
      if (samples.length >= 2) {
        const span = (samples[samples.length - 1].t - samples[0].t) / 1000
        if (span > 0.008) {
          const yaw = samples.reduce((a, s) => a + s.dYaw, 0) / span
          const pitch = samples.reduce((a, s) => a + s.dPitch, 0) / span
          rig.current.release(yaw, pitch)
        }
      }
      samples = []
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      rig.current.zoom(-e.deltaY * ZOOM_PER_WHEEL)
    }

    const onDoubleClick = () => rig.current.recentre()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useViewStore.getState().back()
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', onDoubleClick)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('dblclick', onDoubleClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [gl])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1)
    const speed = useVehicleStore.getState().speed

    // Resting and driving are the same seat with different limits; the store
    // decides which, so the camera never contradicts the vehicle.
    useViewStore.getState().setDriving(speed > 4)

    const out = rig.current.update(step, speed, world.accel, world.curvature)
    camera.position.set(...out.position)
    camera.rotation.set(out.rotation[0], out.rotation[1], out.rotation[2], 'YXZ')

    const cam = camera as PerspectiveCamera
    if (Math.abs(cam.fov - out.fov) > 0.01) {
      cam.fov = out.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}

function spread(pointers: Map<number, { x: number; y: number }>): number {
  const [a, b] = [...pointers.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}
