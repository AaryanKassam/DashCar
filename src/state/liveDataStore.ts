import { create } from 'zustand'

/**
 * Opt-in live data.
 *
 * The build makes no network requests by default, and that is a feature rather
 * than a limitation: it runs offline, it has no keys to leak, and nothing it
 * shows depends on a third party staying up. These switches let a viewer pull in
 * real data when they want to see it, and both sources were chosen because they
 * need no API key at all.
 */
interface LiveDataState {
  /** Real stations from the Radio Browser directory. */
  radio: boolean
  /** OpenStreetMap raster tiles under the navigation route. */
  mapTiles: boolean
  /** Last failure, surfaced in Settings rather than swallowed. */
  error: string | null

  toggleRadio: () => void
  toggleMapTiles: () => void
  setError: (error: string | null) => void
}

export const useLiveDataStore = create<LiveDataState>((set, get) => ({
  radio: false,
  mapTiles: false,
  error: null,
  toggleRadio: () => set({ radio: !get().radio, error: null }),
  toggleMapTiles: () => set({ mapTiles: !get().mapTiles, error: null }),
  setError: (error) => set({ error }),
}))
