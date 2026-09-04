import { useEffect } from 'react'
import { DashboardCluster } from './cluster/DashboardCluster'
import { InfotainmentScreen } from './infotainment/InfotainmentScreen'
import { useDrivingLoop } from './simulation/drivingLoop'
import { useGarageStore } from './cars/garageStore'
import { useVehicleStore } from './state/vehicleStore'

/**
 * Design harness, reachable at `#panels`.
 *
 * The cluster and the centre screen are fixed-resolution panels that normally
 * live on a plane in the 3D cabin, at an angle, at arm's length. That is the
 * right place to judge glanceability and the wrong place to judge typography.
 * This view renders both at 1:1 against a neutral ground so layout work does
 * not require squinting through a windscreen.
 */
export default function PanelPreview() {
  useDrivingLoop()
  const cars = useGarageStore((s) => s.cars)
  const carId = useGarageStore((s) => s.carId)
  const selectCar = useGarageStore((s) => s.selectCar)

  // Put the car in a plausible driving state so the panels have something to
  // show; a preview full of zeroes hides most layout problems.
  // Written as absolute state, not toggles: StrictMode runs effects twice in
  // development, and a pair of toggles cancels itself out.
  useEffect(() => {
    const v = useVehicleStore.getState()
    v.applyTick({ engineRunning: true, parkingBrake: false, speed: 18, rpm: 1150, coolantTemp: 91 })
    v.setGear('D')
    v.setThrottle(0.04)
    v.setWarning('tirePressure', true)
    v.setIndicator('right')
    // Dev hook so the screenshot harness can exercise surround view.
    ;(window as unknown as { __toggleSurround?: () => void }).__toggleSurround = () =>
      useVehicleStore.getState().toggleSurroundView()
  }, [])

  return (
    <div className="preview">
      <nav className="preview__bar">
        <strong>Panel preview</strong>
        {cars.map((c) => (
          <button key={c.id} data-active={c.id === carId || undefined} onClick={() => selectCar(c.id)}>
            {c.name}
          </button>
        ))}
        <a href="#">← back to cockpit</a>
      </nav>
      <div className="preview__stage">
        <section>
          <h2>Instrument cluster — 1080 × 405</h2>
          <DashboardCluster />
        </section>
        <section>
          <h2>Centre screen — 1400 × 840</h2>
          <InfotainmentScreen />
        </section>
      </div>
    </div>
  )
}
