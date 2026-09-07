import { useVehicleStore } from '../../state/vehicleStore'
import { useGarageStore } from '../../cars/garageStore'
import { useLiveDataStore } from '../../state/liveDataStore'
import { audioEngine } from '../../simulation/audioEngine'
import { useAudioStore } from '../../state/audioStore'
import { useState } from 'react'

/**
 * Settings.
 *
 * Display, ambient lighting, units, and the live-data switches. Ambient colour
 * is not a display preference here — it drives the actual emissive strips in the
 * cabin, which is why it sits next to the interior colourway rather than in a
 * cosmetic menu.
 */
export function SettingsApp() {
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const setTimeOfDay = useVehicleStore((s) => s.setTimeOfDay)
  const interiors = useGarageStore((s) => s.interiors)
  const interiorId = useGarageStore((s) => s.interiorId)
  const selectInterior = useGarageStore((s) => s.selectInterior)

  const live = useLiveDataStore()
  const [soundOn, setSoundOn] = useState(audioEngine.isEnabled())
  const audio = useAudioStore()

  return (
    <div className="settings">
      <section className="scard">
        <h3>Sound output</h3>
        <p className="scard__note">
          The audio controls drive a real filter chain. Turn this on to hear balance, the equaliser and
          speed-compensated volume actually working. Browsers block audio that starts without a gesture,
          so nothing plays until you ask.
        </p>
        <button
          className="chip"
          data-active={soundOn || undefined}
          onClick={() => {
            const next = !soundOn
            setSoundOn(next)
            audioEngine.setEnabled(next)
            if (next) audio.set({ playing: true, muted: false })
          }}
        >
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>
      </section>

      <section className="scard">
        <h3>Live data</h3>
        <p className="scard__note">
          Off by default: the build makes no network requests unless you switch these on. Neither needs
          an API key.
        </p>
        <SettingToggle
          label="Live radio stations"
          note="Real stations from the Radio Browser directory"
          on={live.radio}
          onClick={live.toggleRadio}
        />
        <SettingToggle
          label="Live map tiles"
          note="OpenStreetMap raster tiles under the route"
          on={live.mapTiles}
          onClick={live.toggleMapTiles}
        />
        {live.error && <p className="scard__error">{live.error}</p>}
      </section>

      <section className="scard">
        <h3>Ambient lighting</h3>
        <p className="scard__note">Drives the emissive strips along the door cards after dark.</p>
        <div className="settings__swatches">
          {interiors.map((c) => (
            <button
              key={c.id}
              className="settings__swatch"
              data-active={c.id === interiorId || undefined}
              onClick={() => selectInterior(c.id)}
              title={c.name}
            >
              <i style={{ background: c.theme.ambient }} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="scard">
        <h3>Display</h3>
        <label className="settings__slider">
          <span>Time of day</span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(Number(e.target.value))}
          />
          <b>{formatHour(timeOfDay)}</b>
        </label>
        <p className="scard__note">
          Screens dim automatically with the headlight switch, which is how a real cluster behaves.
        </p>
      </section>

      <section className="scard">
        <h3>Units</h3>
        <div className="settings__segments">
          <button className="chip" data-active>Metric</button>
          <button className="chip" disabled title="Not implemented in this build">Imperial</button>
        </div>
      </section>
    </div>
  )
}

function SettingToggle({
  label,
  note,
  on,
  onClick,
}: {
  label: string
  note: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button className="settings__row" onClick={onClick} aria-pressed={on}>
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <span className="settings__state" data-on={on || undefined}>
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}

function formatHour(h: number) {
  const hh = String(Math.floor(h) % 24).padStart(2, '0')
  const mm = String(Math.round((h % 1) * 60)).padStart(2, '0')
  return `${hh}:${mm}`
}
