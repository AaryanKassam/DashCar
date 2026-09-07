import { useAudioStore } from '../../state/audioStore'
import { useVehicleStore } from '../../state/vehicleStore'
import { STATIONS } from '../stations'
import { APPS, AppIcon } from '../appRegistry'
import type { AppId } from '../appRegistry'

/**
 * Home.
 *
 * Live cards for the three things a driver checks constantly — where they are
 * going, what is playing, how the car is — then a tile grid for everything else.
 * The cards are the point: a home screen made only of launcher icons costs a
 * driver an extra tap and an extra glance for information they wanted at rest.
 */
export function HomeApp({ onOpen }: { onOpen: (id: AppId) => void }) {
  const audio = useAudioStore()
  const station = STATIONS[audio.source][audio.stationIndex % STATIONS[audio.source].length]
  const speed = useVehicleStore((s) => s.speed)
  const fuel = useVehicleStore((s) => s.fuel)
  const warnings = useVehicleStore((s) => s.warnings)
  const setpoint = useVehicleStore((s) => s.cabinTempSetpoint)

  return (
    <div className="home">
      <div className="home__cards">
        <button className="hcard hcard--nav" onClick={() => onOpen('navigation')}>
          <span className="hcard__label">Navigation</span>
          <strong>Woodward Ave</strong>
          <small>7 min · 2.4 km · arrive 14:07</small>
        </button>

        <button className="hcard" onClick={() => onOpen('audio')}>
          <span className="hcard__label">Now playing</span>
          <strong>{station.title}</strong>
          <small>
            {station.artist} · {station.badge}
          </small>
        </button>

        <button className="hcard" onClick={() => onOpen('vehicle')}>
          <span className="hcard__label">Vehicle</span>
          <strong>{warnings.length ? `${warnings.length} message${warnings.length > 1 ? 's' : ''}` : 'All systems normal'}</strong>
          <small>
            {Math.round(fuel * 640)} km range · {Math.round(speed)} km/h
          </small>
        </button>

        <button className="hcard" onClick={() => onOpen('climate')}>
          <span className="hcard__label">Climate</span>
          <strong>{setpoint.toFixed(1)}°C</strong>
          <small>Auto · dual zone</small>
        </button>
      </div>

      <div className="home__grid">
        {APPS.filter((a) => a.id !== 'home').map((a) => (
          <button key={a.id} className="htile" onClick={() => onOpen(a.id)}>
            <AppIcon id={a.id} size={26} />
            <strong>{a.label}</strong>
            <small>{a.blurb}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
