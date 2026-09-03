import { useEffect, useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import type { VehicleStore } from '../state/vehicleStore'

/**
 * Drive a DOM node from a vehicle signal without re-rendering React.
 *
 * The cluster shows values that change every frame. Rendering React 60 times a
 * second to move a needle is wasteful and, at this component count, visibly
 * janky. So: React renders the cluster's *structure* once, and this hook writes
 * the fast-changing parts straight to the DOM.
 *
 * The low-pass filter is not just smoothing for looks — real instrument
 * clusters damp their needles deliberately, so the driver reads a stable value
 * instead of a twitching one. `responsiveness` is that damping constant.
 */
export function useSignalAnimation(
  read: (s: VehicleStore) => number,
  apply: (smoothed: number, raw: number) => void,
  responsiveness = 6,
) {
  const applyRef = useRef(apply)
  const readRef = useRef(read)
  applyRef.current = apply
  readRef.current = read

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let value = readRef.current(useVehicleStore.getState())

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const raw = readRef.current(useVehicleStore.getState())
      // Frame-rate independent exponential approach.
      value += (raw - value) * (1 - Math.exp(-responsiveness * dt))
      applyRef.current(value, raw)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [responsiveness])
}
