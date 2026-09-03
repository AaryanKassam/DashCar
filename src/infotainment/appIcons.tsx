export type AppId = 'map' | 'radio' | 'messages' | 'climate'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const PATHS: Record<AppId, React.ReactNode> = {
  map: (
    <>
      <path {...S} d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z" />
      <path {...S} d="M9 4.5v12.7M15 6.8v12.7" />
    </>
  ),
  radio: (
    <>
      <circle {...S} cx="12" cy="12" r="8" />
      <circle {...S} cx="12" cy="12" r="2.6" />
      <path {...S} d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20" />
    </>
  ),
  messages: (
    <>
      <path {...S} d="M4 6.6A2.1 2.1 0 0 1 6.1 4.5h11.8A2.1 2.1 0 0 1 20 6.6v8a2.1 2.1 0 0 1-2.1 2.1H9.4L5 20.2v-3.5a2.1 2.1 0 0 1-1-1.8z" />
      <path {...S} d="M8.2 9.4h7.6M8.2 12.6h5" />
    </>
  ),
  climate: (
    <>
      <path {...S} d="M12 3.5v17M4.6 7.8l14.8 8.4M19.4 7.8 4.6 16.2" />
      <path {...S} d="M12 6.8 9.9 5M12 6.8 14.1 5M12 17.2 9.9 19M12 17.2l2.1 1.8" />
    </>
  ),
}

export function AppIcon({ name, size = 26 }: { name: AppId; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
