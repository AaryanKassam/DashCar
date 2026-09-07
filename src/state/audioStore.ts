import { create } from 'zustand'

/**
 * The audio system.
 *
 * Separate from the vehicle bus because sound is a cabin concern, not a vehicle
 * signal — but it *reads* the bus, because speed-compensated volume is a real
 * feature and the whole point is that it responds to the car.
 *
 * Every control here is wired to an actual WebAudio graph in `simulation/audioEngine.ts`,
 * so balance really pans, the EQ really filters and speed compensation really
 * lifts the level. A tone control that moves a slider and nothing else is the
 * kind of detail that makes a demo feel hollow the moment someone tries it.
 */

export type AudioSource = 'fm' | 'dab' | 'bluetooth' | 'usb'
export type Occupancy = 'driver' | 'all'

export interface AudioState {
  source: AudioSource
  /** Index into the active source's station or track list. */
  stationIndex: number
  playing: boolean
  muted: boolean
  /** 0..1 */
  volume: number

  /** −1 full left, +1 full right. */
  balance: number
  /** −1 full rear, +1 full front. */
  fade: number

  /** Shelf and peaking gains, in dB. */
  bass: number
  mid: number
  treble: number

  /**
   * How much road speed lifts the volume. Ford calls this Speed Compensated
   * Volume; every manufacturer ships some version of it, because road noise
   * rises roughly with the square of speed and a fixed level is unlistenable at
   * both ends of the range.
   */
  speedCompensation: 0 | 1 | 2 | 3
  /** Steers the stage toward the driver's seat or the whole cabin. */
  occupancy: Occupancy
  /** Adds a synthesised low shelf on top of the EQ. */
  bassBoost: boolean

  setSource: (source: AudioSource) => void
  setStation: (index: number) => void
  nextStation: () => void
  previousStation: () => void
  togglePlaying: () => void
  toggleMute: () => void
  setVolume: (v: number) => void
  nudgeVolume: (delta: number) => void
  set: (patch: Partial<AudioState>) => void
}

/** How many entries each source offers, for wrap-around on skip. */
export const SOURCE_LENGTHS: Record<AudioSource, number> = { fm: 8, dab: 6, bluetooth: 5, usb: 5 }

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export const useAudioStore = create<AudioState>((set, get) => ({
  source: 'fm',
  stationIndex: 3,
  playing: true,
  muted: false,
  volume: 0.42,

  balance: 0,
  fade: 0.15,

  bass: 2,
  mid: 0,
  treble: 1,

  speedCompensation: 2,
  occupancy: 'all',
  bassBoost: false,

  setSource: (source) => set({ source, stationIndex: 0 }),
  setStation: (stationIndex) => set({ stationIndex }),
  nextStation: () => {
    const { source, stationIndex } = get()
    set({ stationIndex: (stationIndex + 1) % SOURCE_LENGTHS[source] })
  },
  previousStation: () => {
    const { source, stationIndex } = get()
    const n = SOURCE_LENGTHS[source]
    set({ stationIndex: (stationIndex - 1 + n) % n })
  },
  togglePlaying: () => set({ playing: !get().playing }),
  toggleMute: () => set({ muted: !get().muted }),
  setVolume: (v) => set({ volume: clamp(v, 0, 1), muted: false }),
  nudgeVolume: (delta) => set({ volume: clamp(get().volume + delta, 0, 1), muted: false }),
  set: (patch) => set(patch),
}))
