import type { ReactNode } from 'react'

/**
 * The head unit's app list.
 *
 * One registry, so adding an app is a single entry and the rail, the home
 * screen and the router all pick it up. The apps themselves know nothing about
 * each other — each reads only the signals it needs, which is why Media can be
 * developed without touching the vehicle bus at all.
 */

export type AppId =
  | 'home'
  | 'navigation'
  | 'audio'
  | 'phone'
  | 'messages'
  | 'climate'
  | 'vehicle'
  | 'settings'

export interface AppEntry {
  id: AppId
  label: string
  /** Shown on the home screen tile. */
  blurb: string
  icon: ReactNode
}

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const APPS: AppEntry[] = [
  {
    id: 'home',
    label: 'Home',
    blurb: 'Everything at a glance',
    icon: (
      <>
        <path {...S} d="M4 10.5 12 4l8 6.5V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19z" />
        <path {...S} d="M9.6 20.4v-6h4.8v6" />
      </>
    ),
  },
  {
    id: 'navigation',
    label: 'Navigation',
    blurb: 'Route, traffic and points of interest',
    icon: (
      <>
        <path {...S} d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z" />
        <path {...S} d="M9 4.5v12.7M15 6.8v12.7" />
      </>
    ),
  },
  {
    id: 'audio',
    label: 'Audio',
    blurb: 'Sources, presets and sound shaping',
    icon: (
      <>
        <path {...S} d="M4 15V9h3.2L12 5.2v13.6L7.2 15z" />
        <path {...S} d="M15.6 9.4a4.2 4.2 0 0 1 0 5.2M18.2 7.2a7.6 7.6 0 0 1 0 9.6" />
      </>
    ),
  },
  {
    id: 'phone',
    label: 'Phone',
    blurb: 'Recents, contacts and keypad',
    icon: (
      <path
        {...S}
        d="M6.2 4.6h3l1.5 3.8-2 1.4a11 11 0 0 0 5.5 5.5l1.4-2 3.8 1.5v3a1.6 1.6 0 0 1-1.8 1.6C11.4 18.8 5.2 12.6 4.6 6.4A1.6 1.6 0 0 1 6.2 4.6z"
      />
    ),
  },
  {
    id: 'messages',
    label: 'Messages',
    blurb: 'Read aloud and reply hands-free',
    icon: (
      <>
        <path {...S} d="M4 6.6A2.1 2.1 0 0 1 6.1 4.5h11.8A2.1 2.1 0 0 1 20 6.6v8a2.1 2.1 0 0 1-2.1 2.1H9.4L5 20.2v-3.5a2.1 2.1 0 0 1-1-1.8z" />
        <path {...S} d="M8.2 9.4h7.6M8.2 12.6h5" />
      </>
    ),
  },
  {
    id: 'climate',
    label: 'Climate',
    blurb: 'Dual-zone temperature and airflow',
    icon: (
      <>
        <path {...S} d="M12 3.5v17M4.6 7.8l14.8 8.4M19.4 7.8 4.6 16.2" />
        <path {...S} d="M12 6.8 9.9 5M12 6.8 14.1 5M12 17.2 9.9 19M12 17.2l2.1 1.8" />
      </>
    ),
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    blurb: 'Tyres, trip, drive modes and assists',
    icon: (
      <>
        <path {...S} d="M3.6 14.4h16.8M5.4 14.4l1.6-5a2 2 0 0 1 1.9-1.4h6.2a2 2 0 0 1 1.9 1.4l1.6 5" />
        <path {...S} d="M4.6 14.4v3h2.6v-3M16.8 14.4v3h2.6v-3" />
        <circle {...S} cx="7.6" cy="11.6" r="0.6" />
        <circle {...S} cx="16.4" cy="11.6" r="0.6" />
      </>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    blurb: 'Display, ambient lighting and units',
    icon: (
      <>
        <circle {...S} cx="12" cy="12" r="3" />
        <path
          {...S}
          d="M12 3.6v2.2M12 18.2v2.2M20.4 12h-2.2M5.8 12H3.6M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"
        />
      </>
    ),
  },
]

export function AppIcon({ id, size = 24 }: { id: AppId; size?: number }) {
  const entry = APPS.find((a) => a.id === id)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {entry?.icon}
    </svg>
  )
}

/**
 * Transport and volume glyphs.
 *
 * Drawn rather than typed. The obvious shortcut is a character — ▶, ❚❚, 🔊 —
 * but emoji render in colour from a font the cabin theme does not control, and
 * the text glyphs sit on a baseline rather than centred in their button. Both
 * read as placeholder next to the line icons above.
 */
export type Glyph = 'prev' | 'next' | 'play' | 'pause' | 'volume' | 'muted'

export function TransportIcon({ glyph, size = 22 }: { glyph: Glyph; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {glyph === 'prev' && <path d="M18.5 5.6v12.8L11.4 12zM10.2 5.6v12.8L3.1 12z" fill="currentColor" />}
      {glyph === 'next' && <path d="M5.5 5.6v12.8L12.6 12zM13.8 5.6v12.8L20.9 12z" fill="currentColor" />}
      {glyph === 'play' && <path d="M7.4 4.9v14.2L19 12z" fill="currentColor" />}
      {glyph === 'pause' && (
        <>
          <rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
          <rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
        </>
      )}
      {(glyph === 'volume' || glyph === 'muted') && (
        <>
          <path d="M4 14.6V9.4h3.4L12 5.6v12.8L7.4 14.6z" fill="currentColor" />
          {glyph === 'volume' ? (
            <path {...S} d="M15.2 9.5a3.9 3.9 0 0 1 0 5M17.8 7.2a7.4 7.4 0 0 1 0 9.6" />
          ) : (
            <path {...S} d="m15.4 9.8 4.6 4.4M20 9.8l-4.6 4.4" />
          )}
        </>
      )}
    </svg>
  )
}

