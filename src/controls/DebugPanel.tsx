import { useMemo, useState } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { WARNING_DEFINITIONS } from '../state/vehicleTypes'
import type { DoorId, WarningId } from '../state/vehicleTypes'
import { useGarageStore } from '../cars/garageStore'
import { SCENARIOS, createScenarioRunner } from '../simulation/scenarios'
import { audio } from '../simulation/audio'

/**
 * Engineering panel.
 *
 * The equivalent of a bench harness: it injects faults onto the bus so the HMI
 * can be exercised without a real vehicle producing them. Everything it does
 * goes through the same public store actions the rest of the app uses, so
 * nothing is reachable here that would not be reachable from a real signal.
 */

/** Faults a technician injects; the rest are raised by monitors on their own. */
const INJECTABLE: WarningId[] = ['engine', 'oilPressure', 'battery', 'brake', 'abs', 'tirePressure']

const DOORS: { id: DoorId; label: string }[] = [
  { id: 'frontLeft', label: 'FL' },
  { id: 'frontRight', label: 'FR' },
  { id: 'rearLeft', label: 'RL' },
  { id: 'rearRight', label: 'RR' },
  { id: 'trunk', label: 'Trunk' },
]

export function DebugPanel() {
  const [open, setOpen] = useState(true)
  const [note, setNote] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const runner = useMemo(() => createScenarioRunner(), [])

  const warnings = useVehicleStore((s) => s.warnings)
  const doors = useVehicleStore((s) => s.doors)
  const seatbelt = useVehicleStore((s) => s.seatbeltFastened)
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const surround = useVehicleStore((s) => s.surroundViewActive)
  const setWarning = useVehicleStore((s) => s.setWarning)

  const cars = useGarageStore((s) => s.cars)
  const carId = useGarageStore((s) => s.carId)
  const selectCar = useGarageStore((s) => s.selectCar)

  return (
    <aside className={`debug ${open ? '' : 'debug--closed'}`}>
      <button className="debug__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '›' : '‹'}
      </button>

      <div className="debug__inner">
        <header className="debug__header">
          <h1>Vehicle bench</h1>
          <p>Inject signals onto the simulated bus.</p>
        </header>

        <section>
          <h2>Garage</h2>
          <div className="debug__cars">
            {cars.map((c) => (
              <button
                key={c.id}
                className="debug__car"
                data-active={c.id === carId || undefined}
                onClick={() => selectCar(c.id)}
                style={{ '--car-accent': c.theme.accent } as React.CSSProperties}
              >
                <strong>{c.name}</strong>
                <small>{c.tagline}</small>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Scenarios</h2>
          <div className="debug__scenarios">
            {SCENARIOS.map((s) => (
              <button key={s.id} className="debug__scenario" onClick={() => runner.play(s, setNote)} title={s.description}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="debug__note" data-on={note ? true : undefined}>
            {note ?? ''}
          </div>
        </section>

        <section>
          <h2>Fault injection</h2>
          <div className="debug__grid">
            {INJECTABLE.map((id) => {
              const def = WARNING_DEFINITIONS[id]
              const on = warnings.includes(id)
              return (
                <button
                  key={id}
                  className="debug__chip"
                  data-on={on || undefined}
                  data-severity={def.severity}
                  onClick={() => setWarning(id, !on)}
                >
                  {def.label}
                </button>
              )
            })}
          </div>
          <button className="debug__wide" onClick={() => useVehicleStore.getState().clearWarnings()}>
            Clear all faults
          </button>
        </section>

        <section>
          <h2>Body</h2>
          <div className="debug__grid">
            {DOORS.map((d) => (
              <button
                key={d.id}
                className="debug__chip"
                data-on={doors[d.id] || undefined}
                data-severity="red"
                onClick={() => useVehicleStore.getState().toggleDoor(d.id)}
              >
                {d.label}
              </button>
            ))}
            <button
              className="debug__chip"
              data-on={!seatbelt || undefined}
              data-severity="red"
              onClick={() => useVehicleStore.getState().toggleSeatbelt()}
            >
              Belt off
            </button>
          </div>
        </section>

        <section>
          <h2>Environment</h2>
          <label className="debug__slider">
            <span>Time of day</span>
            <input
              type="range"
              min={0}
              max={24}
              step={0.25}
              value={timeOfDay}
              onChange={(e) => useVehicleStore.getState().setTimeOfDay(Number(e.target.value))}
            />
            <b>{formatHour(timeOfDay)}</b>
          </label>
        </section>

        <section>
          <h2>Systems</h2>
          <div className="debug__grid">
            <button
              className="debug__chip"
              data-on={surround || undefined}
              data-severity="green"
              onClick={() => useVehicleStore.getState().toggleSurroundView()}
            >
              Surround view
            </button>
            <button
              className="debug__chip"
              data-on={soundOn || undefined}
              data-severity="green"
              onClick={() => {
                const next = !soundOn
                setSoundOn(next)
                audio.setEnabled(next)
                if (next) audio.chime()
              }}
            >
              Sound
            </button>
            <button className="debug__chip" onClick={() => useVehicleStore.getState().reset()}>
              Reset
            </button>
          </div>
        </section>
      </div>
    </aside>
  )
}

function formatHour(h: number) {
  const hh = String(Math.floor(h) % 24).padStart(2, '0')
  const mm = String(Math.round((h % 1) * 60)).padStart(2, '0')
  return `${hh}:${mm}`
}
