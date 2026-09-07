import { useState } from 'react'
import { useVehicleStore } from '../../state/vehicleStore'
import { CRUISE_MIN_KPH } from '../../state/vehicleStore'
import { useCar } from '../../cars/garageStore'

/**
 * Vehicle.
 *
 * The screen a driver opens when something is wrong, or when they want to change
 * how the car behaves. Three panes: condition, trip, and the systems they can
 * actually switch.
 *
 * Everything here reads the same signals the cluster does. Tyre pressures are
 * derived from the tyre-pressure warning rather than invented separately, so the
 * telltale and this screen can never disagree - which is exactly the class of
 * bug that makes a driver stop trusting the car.
 */

type Pane = 'status' | 'trip' | 'systems'

export function VehicleApp() {
  const [pane, setPane] = useState<Pane>('status')

  return (
    <div className="vehicle">
      <div className="vehicle__tabs">
        {(['status', 'trip', 'systems'] as const).map((p) => (
          <button key={p} className="chip" data-active={pane === p || undefined} onClick={() => setPane(p)}>
            {p === 'status' ? 'Condition' : p === 'trip' ? 'Trip' : 'Systems'}
          </button>
        ))}
      </div>
      {pane === 'status' && <StatusPane />}
      {pane === 'trip' && <TripPane />}
      {pane === 'systems' && <SystemsPane />}
    </div>
  )
}

function StatusPane() {
  const warnings = useVehicleStore((s) => s.warnings)
  const coolant = useVehicleStore((s) => s.coolantTemp)
  const fuel = useVehicleStore((s) => s.fuel)
  const doors = useVehicleStore((s) => s.doors)

  // One low tyre when the telltale is lit, so the two views agree by construction.
  const lowTyre = warnings.includes('tirePressure')
  const tyres = [
    { id: 'FL', psi: lowTyre ? 26 : 35 },
    { id: 'FR', psi: 35 },
    { id: 'RL', psi: 34 },
    { id: 'RR', psi: 35 },
  ]

  return (
    <div className="vehicle__pane">
      <section className="vcard">
        <h3>Tyre pressure</h3>
        <div className="tyres">
          {tyres.map((t) => (
            <div key={t.id} className="tyre" data-low={t.psi < 30 || undefined}>
              <span className="tyre__pos">{t.id}</span>
              <strong>{t.psi}</strong>
              <small>psi</small>
            </div>
          ))}
        </div>
        <p className="vcard__note">
          {lowTyre ? 'Front left below recommended. Inflate to 35 psi.' : 'All tyres at recommended pressure.'}
        </p>
      </section>

      <section className="vcard">
        <h3>Fluids and temperature</h3>
        <Meter label="Fuel" value={fuel} display={`${Math.round(fuel * 100)}%`} warn={fuel < 0.12} />
        <Meter label="Coolant" value={(coolant - 20) / 110} display={`${Math.round(coolant)}°C`} warn={coolant > 112} />
        <Meter label="Engine oil" value={0.78} display="78%" />
        <Meter label="Washer fluid" value={0.42} display="42%" />
      </section>

      <section className="vcard">
        <h3>Doors and closures</h3>
        <div className="closures">
          {Object.entries(doors).map(([id, open]) => (
            <div key={id} className="closure" data-open={open || undefined}>
              <span>{labelForDoor(id)}</span>
              <strong>{open ? 'Open' : 'Closed'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="vcard">
        <h3>Service</h3>
        <div className="service">
          <div>
            <small>Next service</small>
            <strong>8,400 km</strong>
          </div>
          <div>
            <small>Oil life</small>
            <strong>62%</strong>
          </div>
          <div>
            <small>Software</small>
            <strong>Up to date</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

function TripPane() {
  const odometer = useVehicleStore((s) => s.odometer)
  const fuel = useVehicleStore((s) => s.fuel)
  const speed = useVehicleStore((s) => s.speed)

  return (
    <div className="vehicle__pane">
      <section className="vcard vcard--wide">
        <h3>Trip A</h3>
        <div className="trip">
          <Stat label="Distance" value="184.2" unit="km" />
          <Stat label="Average speed" value="61" unit="km/h" />
          <Stat label="Average" value="9.4" unit="L/100km" />
          <Stat label="Driving time" value="3:01" unit="h:mm" />
        </div>
      </section>
      <section className="vcard vcard--wide">
        <h3>Since refuel</h3>
        <div className="trip">
          <Stat label="Distance" value="322.7" unit="km" />
          <Stat label="Range" value={String(Math.round(fuel * 640))} unit="km" />
          <Stat label="Instant" value={speed > 5 ? (6 + speed / 22).toFixed(1) : '--'} unit="L/100km" />
          <Stat label="Odometer" value={Math.floor(odometer).toLocaleString()} unit="km" />
        </div>
      </section>
    </div>
  )
}

function SystemsPane() {
  const driveMode = useVehicleStore((s) => s.driveMode)
  const setDriveMode = useVehicleStore((s) => s.setDriveMode)
  const laneKeeping = useVehicleStore((s) => s.laneKeeping)
  const toggleLaneKeeping = useVehicleStore((s) => s.toggleLaneKeeping)
  const cruiseActive = useVehicleStore((s) => s.cruiseActive)
  const cruiseSet = useVehicleStore((s) => s.cruiseSetKph)
  const surround = useVehicleStore((s) => s.surroundViewActive)
  const toggleSurround = useVehicleStore((s) => s.toggleSurroundView)
  const car = useCar()

  return (
    <div className="vehicle__pane">
      <section className="vcard vcard--wide">
        <h3>Drive mode</h3>
        <div className="modes">
          {(['eco', 'comfort', 'sport'] as const).map((m) => (
            <button key={m} className="modebtn" data-active={driveMode === m || undefined} onClick={() => setDriveMode(m)}>
              <strong>{m === 'comfort' ? 'Normal' : m === 'eco' ? 'Eco' : 'Sport'}</strong>
              <small>
                {m === 'eco'
                  ? 'Lazier throttle, earlier upshifts'
                  : m === 'comfort'
                    ? 'Balanced response'
                    : 'Sharper throttle, later upshifts'}
              </small>
            </button>
          ))}
        </div>
      </section>

      <section className="vcard vcard--wide">
        <h3>Driver assistance</h3>
        <Toggle label="Lane keeping" note="Steers back from an unsignalled lane departure" on={laneKeeping} onClick={toggleLaneKeeping} />
        <Toggle
          label="Surround view"
          note={`Short-range sensors. Available below ${25} km/h`}
          on={surround}
          onClick={toggleSurround}
        />
        <div className="assistrow">
          <div>
            <strong>Cruise control</strong>
            <small>
              {cruiseActive
                ? `Holding ${cruiseSet} km/h`
                : cruiseSet > 0
                  ? `Set to ${cruiseSet} km/h, not engaged`
                  : `Engages in Drive above ${CRUISE_MIN_KPH} km/h`}
            </small>
          </div>
          <span className="assistrow__state" data-on={cruiseActive || undefined}>
            {cruiseActive ? 'Active' : 'Standby'}
          </span>
        </div>
      </section>

      <section className="vcard vcard--wide">
        <h3>About</h3>
        <div className="trip">
          <Stat label="Model" value={car.name.replace('Explorer® ', '')} unit="" />
          <Stat label="Engine" value={car.tagline.split('·')[0].trim()} unit="" />
          <Stat label="Transmission" value="10-speed" unit="auto" />
          <Stat label="Software" value="6.4.1" unit="" />
        </div>
      </section>
    </div>
  )
}

function Meter({ label, value, display, warn }: { label: string; value: number; display: string; warn?: boolean }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="meter__track">
        <i style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }} data-warn={warn || undefined} />
      </div>
      <b>{display}</b>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong>
        {value} <span>{unit}</span>
      </strong>
    </div>
  )
}

function Toggle({ label, note, on, onClick }: { label: string; note: string; on: boolean; onClick: () => void }) {
  return (
    <button className="assistrow" onClick={onClick} aria-pressed={on}>
      <div>
        <strong>{label}</strong>
        <small>{note}</small>
      </div>
      <span className="assistrow__state" data-on={on || undefined}>
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}

const labelForDoor = (id: string) =>
  ({ frontLeft: 'Driver', frontRight: 'Passenger', rearLeft: 'Rear left', rearRight: 'Rear right', trunk: 'Tailgate' })[
    id
  ] ?? id
