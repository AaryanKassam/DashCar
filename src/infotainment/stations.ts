import type { AudioSource } from '../state/audioStore'

/**
 * Programme material per source.
 *
 * Offline fallbacks. When live data is enabled the FM list is replaced by real
 * stations from the Radio Browser directory (see `liveData.ts`), but the app has
 * to work with the network off — a head unit that shows nothing without a
 * connection is a head unit nobody would ship.
 */

export interface StationEntry {
  badge: string
  subtitle: string
  title: string
  artist: string
  /** Seed for the generated artwork. */
  artKey: number
}

export const STATIONS: Record<AudioSource, StationEntry[]> = {
  fm: [
    { badge: '88.7', subtitle: 'WDET · Public', title: 'Morning Edition', artist: 'Detroit Public Radio', artKey: 1 },
    { badge: '93.1', subtitle: 'WDRQ · Alternative', title: 'Reptilia', artist: 'The Strokes', artKey: 2 },
    { badge: '96.3', subtitle: 'WHTD · Hip-hop', title: "Nuthin' but a G Thang", artist: 'Dr. Dre', artKey: 3 },
    { badge: '101.1', subtitle: 'WRIF · Rock', title: 'Search and Destroy', artist: 'The Stooges', artKey: 4 },
    { badge: '105.9', subtitle: 'WDMK · Soul', title: "Ain't No Mountain High Enough", artist: 'Marvin Gaye', artKey: 5 },
    { badge: '107.5', subtitle: 'WGPR · Jazz', title: 'Maiden Voyage', artist: 'Herbie Hancock', artKey: 6 },
    { badge: '90.9', subtitle: 'WRCJ · Classical', title: 'The Lark Ascending', artist: 'Vaughan Williams', artKey: 7 },
    { badge: '98.7', subtitle: 'WDZH · Pop', title: 'Dreams', artist: 'Fleetwood Mac', artKey: 8 },
  ],
  dab: [
    { badge: 'BBC 6', subtitle: 'Digital · Alternative', title: 'Ceremony', artist: 'New Order', artKey: 11 },
    { badge: 'Jazz FM', subtitle: 'Digital · Jazz', title: 'So What', artist: 'Miles Davis', artKey: 12 },
    { badge: 'Absolute', subtitle: 'Digital · Classic rock', title: 'Go Your Own Way', artist: 'Fleetwood Mac', artKey: 13 },
    { badge: 'Kisstory', subtitle: 'Digital · Old skool', title: 'Finally', artist: 'CeCe Peniston', artKey: 14 },
    { badge: 'Planet R', subtitle: 'Digital · Rock', title: 'Bohemian Rhapsody', artist: 'Queen', artKey: 15 },
    { badge: 'Classic', subtitle: 'Digital · Classical', title: 'Nimrod', artist: 'Elgar', artKey: 16 },
  ],
  bluetooth: [
    { badge: 'Phone', subtitle: "Aaryan's iPhone", title: 'Weightless', artist: 'Marconi Union', artKey: 21 },
    { badge: 'Phone', subtitle: "Aaryan's iPhone", title: 'Nightcall', artist: 'Kavinsky', artKey: 22 },
    { badge: 'Phone', subtitle: "Aaryan's iPhone", title: 'Teardrop', artist: 'Massive Attack', artKey: 23 },
    { badge: 'Phone', subtitle: "Aaryan's iPhone", title: 'Motion Picture Soundtrack', artist: 'Radiohead', artKey: 24 },
    { badge: 'Phone', subtitle: "Aaryan's iPhone", title: 'An Ending (Ascent)', artist: 'Brian Eno', artKey: 25 },
  ],
  usb: [
    { badge: 'USB', subtitle: 'Road Trip.m4a', title: 'Born to Run', artist: 'Bruce Springsteen', artKey: 31 },
    { badge: 'USB', subtitle: 'Road Trip.m4a', title: 'Ramble On', artist: 'Led Zeppelin', artKey: 32 },
    { badge: 'USB', subtitle: 'Road Trip.m4a', title: 'Radar Love', artist: 'Golden Earring', artKey: 33 },
    { badge: 'USB', subtitle: 'Road Trip.m4a', title: 'Highway Star', artist: 'Deep Purple', artKey: 34 },
    { badge: 'USB', subtitle: 'Road Trip.m4a', title: 'Route 66', artist: 'Chuck Berry', artKey: 35 },
  ],
}
