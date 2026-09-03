/** Single source for key bindings — the loop and the on-screen help share it. */

export interface Binding {
  keys: string[]
  label: string
  group: 'Driving' | 'Lighting' | 'Systems'
  /** Held bindings are analog (ramped); the rest fire once per press. */
  held?: boolean
}

export const BINDINGS: Record<string, Binding> = {
  throttle: { keys: ['w', 'arrowup'], label: 'Accelerate', group: 'Driving', held: true },
  brake: { keys: ['s', 'arrowdown'], label: 'Brake', group: 'Driving', held: true },
  steerLeft: { keys: ['a', 'arrowleft'], label: 'Steer left', group: 'Driving', held: true },
  steerRight: { keys: ['d', 'arrowright'], label: 'Steer right', group: 'Driving', held: true },
  shiftUp: { keys: ['.'], label: 'Shift up (P→R→N→D)', group: 'Driving' },
  shiftDown: { keys: [','], label: 'Shift down', group: 'Driving' },
  ignition: { keys: ['i'], label: 'Engine start / stop', group: 'Driving' },
  parkingBrake: { keys: ['b'], label: 'Parking brake', group: 'Driving' },
  driveMode: { keys: ['m'], label: 'Cycle drive mode', group: 'Driving' },

  headlights: { keys: ['l'], label: 'Headlights', group: 'Lighting' },
  highBeams: { keys: ['k'], label: 'High beams', group: 'Lighting' },
  indicatorLeft: { keys: ['q'], label: 'Left turn signal', group: 'Lighting' },
  indicatorRight: { keys: ['e'], label: 'Right turn signal', group: 'Lighting' },
  hazards: { keys: ['h'], label: 'Hazard flashers', group: 'Lighting' },
  timeOfDay: { keys: ['t'], label: 'Cycle day / dusk / night', group: 'Lighting' },

  surroundView: { keys: ['v'], label: 'Surround view (ADAS)', group: 'Systems' },
  help: { keys: ['?', '/'], label: 'Show / hide controls', group: 'Systems' },
}

export const BINDING_GROUPS = ['Driving', 'Lighting', 'Systems'] as const

export function keyLabel(binding: Binding): string {
  return binding.keys
    .map((k) =>
      k.startsWith('arrow') ? { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' }[k] ?? k : k.toUpperCase(),
    )
    .join(' / ')
}
