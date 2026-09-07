import type { StationEntry } from './stations'

/**
 * Optional live data sources.
 *
 * Both were chosen because they need **no API key and no account**, which is the
 * only way an opt-in switch in a portfolio build can actually work for whoever
 * clones it. Everything is off by default: the app makes no network request
 * until someone asks it to, so it runs offline and has no credentials to leak.
 *
 * See `docs/live-data.md` for the key-requiring alternatives (Google Maps,
 * Mapbox, TomTom) and what they cost.
 */

/* ------------------------------------------------------------------ radio -- */

/**
 * Radio Browser — a community-run directory of internet radio streams.
 *
 * Free, no key, CORS-enabled, and it returns a directly playable stream URL.
 * The API asks clients to identify themselves, which is what the header below
 * is for. Servers are load-balanced behind `all.api.radio-browser.info`; the
 * regional hosts are stable enough to hit directly and one fewer round trip.
 */
const RADIO_BROWSER = 'https://de1.api.radio-browser.info/json'

interface RadioBrowserStation {
  name: string
  url_resolved: string
  homepage: string
  tags: string
  codec: string
  bitrate: number
  countrycode: string
}

export interface LiveStation extends StationEntry {
  /** Playable stream, handed to an <audio> element. */
  streamUrl: string
}

/**
 * Fetch a handful of well-voted stations.
 *
 * Deliberately small: a head unit preset list is eight buttons, not a search
 * engine, and pulling hundreds of rows to show eight would be rude to a service
 * that runs on donations.
 */
export async function fetchLiveStations(limit = 8, signal?: AbortSignal): Promise<LiveStation[]> {
  const res = await fetch(`${RADIO_BROWSER}/stations/topvote/${limit * 3}?hidebroken=true`, {
    signal,
    headers: { 'User-Agent': 'ExplorerCabin/1.0 (portfolio HMI study)' },
  })
  if (!res.ok) throw new Error(`Radio Browser returned ${res.status}`)

  const rows = (await res.json()) as RadioBrowserStation[]
  return rows
    .filter((r) => r.url_resolved?.startsWith('https://'))
    .slice(0, limit)
    .map((r, i) => ({
      badge: shorten(r.name),
      subtitle: [r.countrycode, r.codec, r.bitrate ? `${r.bitrate}k` : null].filter(Boolean).join(' · '),
      title: r.name.trim(),
      artist: firstTag(r.tags) ?? 'Live stream',
      artKey: 40 + i,
      streamUrl: r.url_resolved,
    }))
}

const shorten = (name: string) => {
  const cleaned = name.replace(/[^\w\s.-]/g, '').trim()
  return cleaned.length > 9 ? `${cleaned.slice(0, 8)}…` : cleaned || 'Live'
}

const firstTag = (tags: string) => {
  const t = tags.split(',')[0]?.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : null
}

/* ------------------------------------------------------------- map tiles -- */

/**
 * OpenStreetMap raster tiles.
 *
 * Free and keyless, but the tile servers are donated infrastructure with a
 * published usage policy: identify yourself, do not bulk download, and always
 * attribute. This build requests at most a dozen tiles for one fixed view and
 * shows the attribution on the map, which sits comfortably inside that.
 *
 * https://operations.osmfoundation.org/policies/tiles/
 */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'

/** Slippy-map tile maths: WGS84 degrees to tile indices at a zoom level. */
export function lonLatToTile(lon: number, lat: number, zoom: number) {
  const n = 2 ** zoom
  const x = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export function tileUrl(z: number, x: number, y: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
}

/** The demo route's neighbourhood: Woodward Avenue, Detroit. */
export const MAP_CENTRE = { lon: -83.0458, lat: 42.3314 }
