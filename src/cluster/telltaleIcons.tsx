import type { ReactNode } from 'react'

/**
 * Telltale glyphs.
 *
 * Drawn to match the ISO 2575 symbols drivers already recognise rather than
 * invented icons — recognition speed is the entire point of a telltale, and a
 * cluster is the wrong place to be original.
 */

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export type IconName =
  | 'lowBeam' | 'highBeam' | 'turnLeft' | 'turnRight' | 'hazard'
  | 'engine' | 'oilPressure' | 'battery' | 'brake' | 'abs'
  | 'tirePressure' | 'coolant' | 'lowFuel' | 'seatbelt' | 'doorAjar'
  | 'eco' | 'sport' | 'parkingBrake'

export const ICONS: Record<IconName, ReactNode> = {
  lowBeam: (
    <>
      <path {...S} d="M4 6.5h3.2a5.5 5.5 0 0 1 0 11H4z" />
      <path {...S} d="M11 8.2h6.5M11 12h6.5M11 15.8h6.5" transform="rotate(14 14 12)" />
    </>
  ),
  highBeam: (
    <>
      <path {...S} d="M4 6.5h3.2a5.5 5.5 0 0 1 0 11H4z" />
      <path {...S} d="M11 8.2h7M11 12h7M11 15.8h7" />
    </>
  ),
  turnLeft: <path d="M13.5 5.5v4.2h4.3v4.6h-4.3v4.2L5 12z" fill="currentColor" />,
  turnRight: <path d="M10.5 5.5v4.2H6.2v4.6h4.3v4.2L19 12z" fill="currentColor" />,
  hazard: (
    <>
      <path d="M9.5 6.5v3.4h2.8v4.2H9.5v3.4L4 12z" fill="currentColor" />
      <path d="M14.5 6.5v3.4h-2.8v4.2h2.8v3.4L20 12z" fill="currentColor" />
    </>
  ),
  engine: (
    <>
      <path {...S} d="M4 9.5h2V7.5h3.5V9.5H13l2.2 2.2h1.6V9.8h2.2v6.4h-2.2v-1.9h-1.6L13 16.5H6.5v-2H4z" />
      <path {...S} d="M8.5 6.2h3.6" />
    </>
  ),
  oilPressure: (
    <>
      <path {...S} d="M3.5 14.4c1.6 0 2.3-.8 3-1.7.7-.9 1.6-1.9 3.4-1.9h5.4l2.5-2.3v6.6c0 1-.8 1.7-1.8 1.7H5.6c-1.2 0-2.1-.9-2.1-2.4z" />
      <path {...S} d="M12.5 8.6c0-1.4 1.6-3.1 1.6-3.1s1.6 1.7 1.6 3.1a1.6 1.6 0 0 1-3.2 0z" />
    </>
  ),
  battery: (
    <>
      <rect {...S} x="3.5" y="7" width="17" height="10" rx="1.4" />
      <path {...S} d="M7 5.6h3M14 5.6h3M6.2 12h3M14.8 10.5v3M13.3 12h3" />
    </>
  ),
  brake: (
    <>
      <circle {...S} cx="12" cy="12" r="4.6" />
      <path {...S} d="M12 9.6v3.2M12 15.1h.01" />
      <path {...S} d="M4.4 7.4a8.4 8.4 0 0 0 0 9.2M19.6 7.4a8.4 8.4 0 0 1 0 9.2" />
    </>
  ),
  abs: (
    <>
      <circle {...S} cx="12" cy="12" r="5.2" />
      <text x="12" y="14.3" textAnchor="middle" fontSize="5.2" fontWeight="700" fill="currentColor" stroke="none">ABS</text>
      <path {...S} d="M4 7.4a8.4 8.4 0 0 0 0 9.2M20 7.4a8.4 8.4 0 0 1 0 9.2" />
    </>
  ),
  tirePressure: (
    <>
      <path {...S} d="M4.5 16.5V12a7.5 7.5 0 0 1 15 0v4.5z" />
      <path {...S} d="M3.2 18.4h17.6" />
      <path {...S} d="M12 8.8v3.4M12 14.6h.01" />
    </>
  ),
  coolant: (
    <>
      <path {...S} d="M12 5v7.4a2.4 2.4 0 1 0 0 0z" />
      <circle {...S} cx="12" cy="14.6" r="2.6" />
      <path {...S} d="M4 10.5c1-1 2-1 3 0s2 1 3 0M14 10.5c1-1 2-1 3 0s2 1 3 0" />
    </>
  ),
  lowFuel: (
    <>
      <path {...S} d="M5 19V6.4A1.4 1.4 0 0 1 6.4 5h5.2A1.4 1.4 0 0 1 13 6.4V19z" />
      <path {...S} d="M3.6 19h10.8M6.8 8.2h4.4v3.2H6.8z" />
      <path {...S} d="M13 10.5h2.6a1.4 1.4 0 0 1 1.4 1.4v3.4a1.3 1.3 0 0 0 2.6 0V8.6l-2-2" />
    </>
  ),
  seatbelt: (
    <>
      <circle {...S} cx="9.4" cy="6.4" r="2.1" />
      <path {...S} d="M6.6 10.2c2.8-1 4.6-.4 5.6 1.4l3 6.6M7.2 11.4l-1.1 7.2h8.8" />
      <path {...S} d="M16.4 12.6l2.6 6" />
    </>
  ),
  doorAjar: (
    <>
      <path {...S} d="M11 5.6h4.4l2.6 4.4v8H11z" />
      <path {...S} d="M11 18H6.6c-1 0-1.6-.7-1.6-1.6V9.6L8 5.6h3" />
      <path {...S} d="M8.4 12.4h1.4M14.6 12.4H16" />
    </>
  ),
  eco: (
    <>
      <path {...S} d="M6 17c0-6 4.5-9.5 12-9.5C18 14 13.5 18 6 17z" />
      <path {...S} d="M6 19c1.5-4 4-6.5 7.5-8" />
    </>
  ),
  sport: <path d="M13.6 3.5 5 13.4h5.1L9.2 20.5 18 10.3h-5z" fill="currentColor" />,
  parkingBrake: (
    <>
      <circle {...S} cx="12" cy="12" r="4.6" />
      <text x="12" y="14.2" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">P</text>
      <path {...S} d="M4.4 7.4a8.4 8.4 0 0 0 0 9.2M19.6 7.4a8.4 8.4 0 0 1 0 9.2" />
    </>
  ),
}

export function Telltale({ name, size = 26 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
