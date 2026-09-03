import { useEffect, useRef, useState } from 'react'

/**
 * Media.
 *
 * Deliberately touches no vehicle signals at all — it is the control case that
 * proves the apps are independent. If Media had to know about speed or gear,
 * the layering would be wrong.
 */

interface Station {
  freq: number
  name: string
  genre: string
  track: string
  artist: string
}

const STATIONS: Station[] = [
  { freq: 88.7, name: 'WDET', genre: 'Public Radio', track: 'Morning Edition', artist: 'Detroit Public' },
  { freq: 93.1, name: 'WDRQ', genre: 'Alternative', track: 'Reptilia', artist: 'The Strokes' },
  { freq: 96.3, name: 'WHTD', genre: 'Hip-Hop', track: 'Nuthin but a G Thang', artist: 'Dr. Dre' },
  { freq: 101.1, name: 'WRIF', genre: 'Rock', track: 'Search and Destroy', artist: 'The Stooges' },
  { freq: 105.9, name: 'WDMK', genre: 'Classic Soul', track: "Ain't No Mountain", artist: 'Marvin Gaye' },
  { freq: 107.5, name: 'WGPR', genre: 'Jazz', track: 'Maiden Voyage', artist: 'Herbie Hancock' },
]

const SOURCES = ['FM', 'DAB', 'Bluetooth'] as const

const UP_NEXT = [
  { track: 'Personality Crisis', artist: 'New York Dolls', time: '3:44' },
  { track: 'Kick Out the Jams', artist: 'MC5', time: '2:52' },
  { track: 'Cherry Bomb', artist: 'The Runaways', time: '2:18' },
]

export function RadioApp() {
  const [index, setIndex] = useState(3)
  const [source, setSource] = useState<(typeof SOURCES)[number]>('FM')
  const [volume, setVolume] = useState(0.42)
  const station = STATIONS[index]
  const elapsed = useElapsed(index)

  return (
    <div className="radio">
      <div className="radio__now">
        {/* Procedural artwork keyed to the station, so every preset looks
            distinct without shipping image assets. */}
        <div className="radio__art" style={{ background: artworkFor(station.freq) }}>
          <span>{station.name}</span>
        </div>
        <div className="radio__meta">
          <span className="radio__source">{source} · {station.freq.toFixed(1)} MHz · {station.genre}</span>
          <h2>{station.track}</h2>
          <p>{station.artist}</p>
          <div className="radio__progress">
            <i style={{ width: `${(elapsed % 210) / 210 * 100}%` }} />
          </div>
          <div className="radio__transport">
            <button className="btn btn--round" onClick={() => setIndex((i) => (i - 1 + STATIONS.length) % STATIONS.length)} aria-label="Previous station">‹‹</button>
            <button className="btn btn--round btn--primary" aria-label="Play or pause">❚❚</button>
            <button className="btn btn--round" onClick={() => setIndex((i) => (i + 1) % STATIONS.length)} aria-label="Next station">››</button>
          </div>
        </div>
      </div>

      <div className="radio__sources">
        {SOURCES.map((s) => (
          <button key={s} className="chip" data-active={s === source || undefined} onClick={() => setSource(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="radio__presets">
        {STATIONS.map((s, i) => (
          <button key={s.freq} className="preset" data-active={i === index || undefined} onClick={() => setIndex(i)}>
            <strong>{s.freq.toFixed(1)}</strong>
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      <div className="radio__queue">
        <span className="radio__queue-title">Up next on {station.name}</span>
        {UP_NEXT.map((item) => (
          <button key={item.track} className="radio__queue-row">
            <span className="radio__queue-track">{item.track}</span>
            <span className="radio__queue-artist">{item.artist}</span>
            <span className="radio__queue-time">{item.time}</span>
          </button>
        ))}
      </div>

      <label className="radio__volume">
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
        <span className="radio__vol-value">{Math.round(volume * 100)}</span>
      </label>
    </div>
  )
}

function useElapsed(resetKey: number) {
  const [t, setT] = useState(0)
  const start = useRef(Date.now())
  useEffect(() => {
    start.current = Date.now()
    setT(0)
    const id = window.setInterval(() => setT((Date.now() - start.current) / 1000), 500)
    return () => window.clearInterval(id)
  }, [resetKey])
  return t
}

function artworkFor(freq: number): string {
  const h = (freq * 7) % 360
  return `linear-gradient(140deg, hsl(${h} 62% 38%), hsl(${(h + 48) % 360} 55% 18%))`
}
