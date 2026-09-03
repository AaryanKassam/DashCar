import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCar } from '../cars/garageStore'
import { world } from '../simulation/worldState'

/**
 * Camera behaviour from the driver's eye point.
 *
 * Three things happen here, all of them cues the body expects and notices when
 * they are missing:
 *  - drag to look around the cabin, clamped to a realistic neck range
 *  - the view pitches slightly under acceleration and braking
 *  - the view rolls a little into a turn
 *
 * Without these the cockpit reads as a photograph. With them it reads as a
 * place you are sitting in.
 */

const YAW_LIMIT = 1.25
const PITCH_LIMIT = 0.5
/** Drivers look slightly down the road, not at the horizon. */
const BASE_PITCH = -0.085

export function CameraRig() {
  const car = useCar()
  const { camera, gl } = useThree()
  const look = useRef({ yaw: 0, pitch: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const smoothed = useRef({ yaw: 0, pitch: 0, roll: 0, pitchOffset: 0 })

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current = { x: e.clientX, y: e.clientY }
      look.current.yaw = clamp(look.current.yaw - dx * 0.0032, -YAW_LIMIT, YAW_LIMIT)
      look.current.pitch = clamp(look.current.pitch - dy * 0.0028, -PITCH_LIMIT, PITCH_LIMIT)
    }
    const up = (e: PointerEvent) => {
      drag.current = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      el.style.cursor = 'grab'
    }
    const recenter = () => {
      look.current.yaw = 0
      look.current.pitch = 0
    }

    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('dblclick', recenter)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('dblclick', recenter)
    }
  }, [gl])

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 9)
    const s = smoothed.current

    s.yaw += (look.current.yaw - s.yaw) * k
    s.pitch += (look.current.pitch - s.pitch) * k
    // Body pitches back under acceleration, forward under braking.
    const targetPitchOffset = clamp(-world.accel * 0.012, -0.05, 0.05)
    s.pitchOffset += (targetPitchOffset - s.pitchOffset) * Math.min(1, dt * 4)
    // Lean into the corner, proportional to how hard the road is bending.
    const targetRoll = clamp(world.curvature * 0.06, -0.06, 0.06)
    s.roll += (targetRoll - s.roll) * Math.min(1, dt * 3)

    camera.position.set(...car.cockpit.eyePoint)
    camera.rotation.set(BASE_PITCH + s.pitch + s.pitchOffset, s.yaw, s.roll, 'YXZ')
  })

  return null
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
