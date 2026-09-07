import { useState } from 'react'
import { useAudioStore } from '../../state/audioStore'
import type { AudioSource } from '../../state/audioStore'
import { useVehicleStore } from '../../state/vehicleStore'
import { STATIONS } from '../stations'
import { useLiveStations } from '../useLiveStations'
import { TransportIcon } from '../appRegistry'

/**
 * Audio.
 *
 * Two tabs, because these are two different jobs. **Source** is the thing you
 * touch while driving — pick a station, skip a track — so it is big targets and
 * short glances. **Sound** is the thing you set once in a car park, so it can
 * afford sliders and a drag pad.
 *
 * Every control here is wired to a real WebAudio graph. Balance genuinely pans,
 * the EQ genuinely filters, and speed compensation genuinely lifts the level
 * against road speed. A tone control that moves a number and nothing else is
 * exactly the detail that gives a demo away when somebody drags it.
 */

const SOURCES: { id: AudioSource; label: string }[] = [
  { id: 'fm', label: 'FM' },
  { id: 'dab', label: 'DAB' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'usb', label: 'USB' },
]

export function AudioApp() {
  const [tab, setTab] = useState<'source' | 'sound'>('source')

  return (
    <div className="audio">
      <div className="audio__tabs">
        <button className="chip" data-active={tab === 'source' || undefined} onClick={() => setTab('source')}>
          Source
        </button>
        <button className="chip" data-active={tab === 'sound' || undefined} onClick={() => setTab('sound')}>
          Sound
        </button>
      </div>
      {tab === 'source' ? <SourcePane /> : <SoundPane />}
    </div>
  )
}

function SourcePane() {
  const a = useAudioStore()
  const { stations: liveStations, loading, live } = useLiveStations()
  // Live stations replace the FM presets when the switch is on; every other
  // source keeps its offline list, because only FM has a real-world analogue
  // in the directory.
  const list = live && a.source === 'fm' && liveStations?.length ? liveStations : STATIONS[a.source]
  const current = list[a.stationIndex % list.length]

  return (
    <div className="audio__pane">
      <div className="audio__now">
        <div className="audio__art" style={{ background: artworkFor(current.artKey) }}>
          <span>{current.badge}</span>
        </div>
        <div className="audio__meta">
          <span className="audio__source">
            {SOURCES.find((s) => s.id === a.source)?.label} · {current.subtitle}
          </span>
          <h2>{current.title}</h2>
          <p>{current.artist}</p>
          <div className="audio__transport">
            <button className="btn btn--round" onClick={a.previousStation} aria-label="Previous"><TransportIcon glyph="prev" /></button>
            <button
              className="btn btn--round btn--primary"
              onClick={a.togglePlaying}
              aria-label={a.playing ? 'Pause' : 'Play'}
            >
              <TransportIcon glyph={a.playing ? 'pause' : 'play'} />
            </button>
            <button className="btn btn--round" onClick={a.nextStation} aria-label="Next"><TransportIcon glyph="next" /></button>
            <button
              className="btn btn--round"
              data-active={a.muted || undefined}
              onClick={a.toggleMute}
              aria-label="Mute"
            >
              <TransportIcon glyph={a.muted ? 'muted' : 'volume'} />
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="audio__live">Loading live stations…</p>}
      {live && a.source === 'fm' && (
        <p className="audio__live">
          Live streams from the Radio Browser directory. These bypass the equaliser: most public
          streams do not send the CORS headers WebAudio needs to process them.
        </p>
      )}

      <div className="audio__sources">
        {SOURCES.map((s) => (
          <button key={s.id} className="chip" data-active={a.source === s.id || undefined} onClick={() => a.setSource(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="audio__presets">
        {list.map((s, i) => (
          <button
            key={s.title}
            className="preset"
            data-active={i === a.stationIndex % list.length || undefined}
            onClick={() => a.setStation(i)}
          >
            <strong>{s.badge}</strong>
            <span>{s.subtitle}</span>
          </button>
        ))}
      </div>

      <VolumeRow />
    </div>
  )
}

/**
 * The volume row shows commanded level *and* what is actually reaching the
 * speakers, because with speed compensation on those differ — and a driver who
 * cannot see why the car got louder will go looking for the fault.
 */
function VolumeRow() {
  const volume = useAudioStore((s) => s.volume)
  const setVolume = useAudioStore((s) => s.setVolume)
  const compensation = useAudioStore((s) => s.speedCompensation)
  const speed = useVehicleStore((s) => s.speed)
  const lift = Math.round((compensation / 3) * Math.min(1, (speed / 120) ** 1.6) * 85)

  return (
    <label className="audio__volume">
      <span>Volume</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
      />
      <span className="audio__volume-value">{Math.round(volume * 100)}</span>
      {lift > 1 && <span className="audio__volume-lift">+{lift}% road</span>}
    </label>
  )
}

function SoundPane() {
  const a = useAudioStore()

  return (
    <div className="audio__pane audio__pane--sound">
      <section className="sound__block">
        <h3>Equaliser</h3>
        <Slider label="Bass" value={a.bass} onChange={(bass) => a.set({ bass })} />
        <Slider label="Mid" value={a.mid} onChange={(mid) => a.set({ mid })} />
        <Slider label="Treble" value={a.treble} onChange={(treble) => a.set({ treble })} />
        <button
          className="chip sound__boost"
          data-active={a.bassBoost || undefined}
          onClick={() => a.set({ bassBoost: !a.bassBoost })}
        >
          Bass boost
        </button>
      </section>

      <section className="sound__block">
        <h3>Balance and fade</h3>
        <BalancePad
          balance={a.balance}
          fade={a.fade}
          onChange={(balance, fade) => a.set({ balance, fade })}
        />
        <div className="sound__readout">
          <span>{describeBalance(a.balance)}</span>
          <span>{describeFade(a.fade)}</span>
          <button className="btn btn--ghost" onClick={() => a.set({ balance: 0, fade: 0 })}>
            Centre
          </button>
        </div>
      </section>

      <section className="sound__block">
        <h3>Speed compensated volume</h3>
        <p className="sound__note">
          Road noise climbs steeply with speed, so the level follows it. Off holds one level at every
          speed.
        </p>
        <div className="sound__segments">
          {(['Off', 'Low', 'Medium', 'High'] as const).map((label, i) => (
            <button
              key={label}
              className="chip"
              data-active={a.speedCompensation === i || undefined}
              onClick={() => a.set({ speedCompensation: i as 0 | 1 | 2 | 3 })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="sound__block">
        <h3>Occupancy</h3>
        <p className="sound__note">Steers the stereo image toward one seat or the whole cabin.</p>
        <div className="sound__segments">
          <button
            className="chip"
            data-active={a.occupancy === 'driver' || undefined}
            onClick={() => a.set({ occupancy: 'driver' })}
          >
            Driver
          </button>
          <button
            className="chip"
            data-active={a.occupancy === 'all' || undefined}
            onClick={() => a.set({ occupancy: 'all' })}
          >
            All seats
          </button>
        </div>
      </section>
    </div>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="sound__slider">
      <span>{label}</span>
      <input
        type="range"
        min={-8}
        max={8}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <b>
        {value > 0 ? '+' : ''}
        {value.toFixed(1)} dB
      </b>
    </label>
  )
}

/**
 * A drag pad rather than two sliders.
 *
 * Balance and fade are one spatial decision — where in the cabin the sound sits
 * — and splitting them into separate controls makes the driver do the mental
 * composition themselves. Every manufacturer that ships this ships a pad.
 */
function BalancePad({
  balance,
  fade,
  onChange,
}: {
  balance: number
  fade: number
  onChange: (balance: number, fade: number) => void
}) {
  const handleFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    onChange(clamp(x), clamp(-y))
  }

  return (
    <div
      className="sound__pad"
      role="application"
      aria-label="Balance and fade"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        handleFromEvent(e)
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) handleFromEvent(e)
      }}
    >
      <span className="sound__pad-label sound__pad-label--front">Front</span>
      <span className="sound__pad-label sound__pad-label--rear">Rear</span>
      <span className="sound__pad-label sound__pad-label--left">L</span>
      <span className="sound__pad-label sound__pad-label--right">R</span>
      <i className="sound__pad-cross" />
      <i
        className="sound__pad-puck"
        style={{ left: `${((balance + 1) / 2) * 100}%`, top: `${((1 - fade) / 2) * 100}%` }}
      />
    </div>
  )
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

function describeBalance(v: number) {
  if (Math.abs(v) < 0.06) return 'Balance centred'
  return `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'left' : 'right'}`
}

function describeFade(v: number) {
  if (Math.abs(v) < 0.06) return 'Fade centred'
  return `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'rear' : 'front'}`
}

/** Artwork keyed to the station, so every preset looks distinct without assets. */
export function artworkFor(key: number): string {
  const h = (key * 47) % 360
  return `linear-gradient(140deg, hsl(${h} 60% 40%), hsl(${(h + 52) % 360} 52% 18%))`
}
