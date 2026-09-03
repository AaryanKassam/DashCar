import { useRef } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { useCar } from '../cars/garageStore'
import { useSignalAnimation } from '../cluster/useSignalAnimation'

/**
 * Thin overlay strip: what car is loaded, what the driver is doing, and the way
 * into the controls list. Kept outside the 3D canvas because it is chrome for
 * the *demo*, not part of the vehicle.
 */
export function StatusStrip({ onHelp }: { onHelp: () => void }) {
  const car = useCar()
  const gear = useVehicleStore((s) => s.gear)
  const engineRunning = useVehicleStore((s) => s.engineRunning)
  const driveMode = useVehicleStore((s) => s.driveMode)
  const speedRef = useRef<HTMLSpanElement>(null)

  useSignalAnimation(
    (s) => s.speed,
    (v) => {
      if (speedRef.current) speedRef.current.textContent = String(Math.round(v))
    },
    9,
  )

  return (
    <header className="strip" style={{ '--accent': car.theme.accent } as React.CSSProperties}>
      <div className="strip__car">
        <strong>{car.name}</strong>
        <span>{car.tagline}</span>
      </div>
      <div className="strip__signals">
        <Signal label="Ignition" value={engineRunning ? 'Running' : 'Off'} on={engineRunning} />
        <Signal label="Gear" value={gear} on={gear === 'D' || gear === 'R'} />
        <Signal label="Mode" value={driveMode.toUpperCase()} on />
        <div className="strip__signal">
          <label>Speed</label>
          <b><span ref={speedRef}>0</span> km/h</b>
        </div>
      </div>
      <button className="strip__help" onClick={onHelp}>
        Controls <kbd>?</kbd>
      </button>
    </header>
  )
}

function Signal({ label, value, on }: { label: string; value: string; on?: boolean }) {
  return (
    <div className="strip__signal" data-on={on || undefined}>
      <label>{label}</label>
      <b>{value}</b>
    </div>
  )
}
