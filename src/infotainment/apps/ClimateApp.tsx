import { useState } from 'react'
import { useVehicleStore } from '../../state/vehicleStore'

/**
 * Climate.
 *
 * The one app that writes vehicle state, and the one whose controls are sized
 * for use without looking: temperature steps are big repeated targets rather
 * than a slider, because a slider requires you to watch where your finger
 * lands. Physical-control parity matters more here than screen elegance.
 */

const MODES = [
  { id: 'face', label: 'Face' },
  { id: 'feet', label: 'Feet' },
  { id: 'both', label: 'Face + Feet' },
  { id: 'screen', label: 'Screen' },
] as const

export function ClimateApp() {
  const setpoint = useVehicleStore((s) => s.cabinTempSetpoint)
  const fanSpeed = useVehicleStore((s) => s.fanSpeed)
  const acOn = useVehicleStore((s) => s.acOn)
  const setClimate = useVehicleStore((s) => s.setClimate)

  const [passenger, setPassenger] = useState(21.5)
  const [mode, setMode] = useState<(typeof MODES)[number]['id']>('both')
  const [recirculate, setRecirculate] = useState(false)
  const [seats, setSeats] = useState<[number, number]>([0, 0])
  const [auto, setAuto] = useState(true)
  const [sync, setSync] = useState(false)

  const step = (delta: number) => {
    const next = clamp(setpoint + delta, 16, 28)
    setClimate({ cabinTempSetpoint: next })
    // Sync ties the passenger zone to the driver's — the point of the control is
    // that one adjustment moves both, so it has to move both here too.
    if (sync) setPassenger(next)
  }

  return (
    <div className="climate">
      <div className="climate__zones">
        <TempZone label="Driver" value={setpoint} onStep={step} seat={seats[0]} onSeat={() => setSeats(([d, p]) => [(d + 1) % 4, p])} />
        <div className="climate__centre">
          <button className="climate__ac" data-on={acOn || undefined} onClick={() => setClimate({ acOn: !acOn })}>
            A/C
          </button>
          <button className="climate__ac" data-on={recirculate || undefined} onClick={() => setRecirculate((r) => !r)}>
            Recirc
          </button>
          <button className="climate__ac" onClick={() => setClimate({ fanSpeed: 6, cabinTempSetpoint: 24 })}>
            Defrost
          </button>
        </div>
        <TempZone
          label="Passenger"
          value={passenger}
          onStep={(d) => setPassenger((v) => clamp(v + d, 16, 28))}
          seat={seats[1]}
          onSeat={() => setSeats(([d, p]) => [d, (p + 1) % 4])}
        />
      </div>

      <div className="climate__toggles">
        <button className="chip" data-active={auto || undefined} onClick={() => setAuto((a) => !a)}>AUTO</button>
        <button
          className="chip"
          data-active={sync || undefined}
          onClick={() => {
            const next = !sync
            setSync(next)
            if (next) setPassenger(setpoint)
          }}
        >
          SYNC
        </button>
        <button className="chip" onClick={() => setClimate({ fanSpeed: 7, acOn: true, cabinTempSetpoint: 16 })}>MAX A/C</button>
        <button className="chip">Rear defrost</button>
      </div>

      <div className="climate__fan">
        <span className="climate__fan-label">Fan</span>
        <div className="climate__fan-bars">
          {Array.from({ length: 7 }).map((_, i) => (
            <button
              key={i}
              className="climate__fan-bar"
              data-on={i < fanSpeed || undefined}
              style={{ height: 22 + i * 7 }}
              onClick={() => setClimate({ fanSpeed: i + 1 })}
              aria-label={`Fan speed ${i + 1}`}
            />
          ))}
        </div>
        <span className="climate__fan-value">{fanSpeed}</span>
      </div>

      <div className="climate__modes">
        {MODES.map((m) => (
          <button key={m.id} className="chip" data-active={mode === m.id || undefined} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <footer className="climate__status">
        <span>Cabin <b>19.4°C</b></span>
        <span>Outside <b>12°C</b></span>
        <span>{recirculate ? 'Recirculating cabin air' : 'Drawing outside air'}</span>
        <span>Filter <b>Good</b></span>
      </footer>
    </div>
  )
}

function TempZone({
  label,
  value,
  onStep,
  seat,
  onSeat,
}: {
  label: string
  value: number
  onStep: (delta: number) => void
  seat: number
  onSeat: () => void
}) {
  return (
    <div className="climate__zone">
      <span className="climate__zone-label">{label}</span>
      <div className="climate__temp">
        <button className="climate__step" onClick={() => onStep(-0.5)} aria-label={`Decrease ${label} temperature`}>−</button>
        <strong>{value.toFixed(1)}<sup>°C</sup></strong>
        <button className="climate__step" onClick={() => onStep(0.5)} aria-label={`Increase ${label} temperature`}>+</button>
      </div>
      <button className="climate__seat" data-level={seat || undefined} onClick={onSeat}>
        Seat heat
        <span className="climate__seat-bars">
          {[0, 1, 2].map((i) => (
            <i key={i} data-on={i < seat || undefined} />
          ))}
        </span>
      </button>
    </div>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
