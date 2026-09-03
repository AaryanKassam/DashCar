import { useEffect } from 'react'
import { useVehicleStore } from '../state/vehicleStore'

/**
 * Deterministic entry points for the screenshot tooling in `tools/`.
 *
 * The capture scripts drive the app through real key events, which is the right
 * way to exercise it — but a few starting conditions are toggles, and a toggle
 * driven twice by accident lands you in the opposite state. These set absolute
 * state instead. Nothing in the UI calls them.
 */
export function useScreenshotHooks() {
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__forceRunning = () => useVehicleStore.getState().applyTick({ engineRunning: true, parkingBrake: false })
    w.__toggleSurround = () => useVehicleStore.getState().toggleSurroundView()
    return () => {
      delete w.__forceRunning
      delete w.__toggleSurround
    }
  }, [])
}
