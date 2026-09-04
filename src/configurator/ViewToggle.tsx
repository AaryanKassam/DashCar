import { useViewStore } from '../state/viewStore'
import type { ViewMode } from '../state/viewStore'

/**
 * Exterior / Interior, bottom left.
 *
 * The active segment is a solid dark pill. Switching does not cut between two
 * cameras — it asks the rig to transition, and the camera flies out through the
 * windscreen and settles onto the turntable. That move is the feedback for the
 * action, which is why the control needs no spinner of its own.
 */

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'exterior', label: 'Exterior' },
  { id: 'interior', label: 'Interior' },
]

export function ViewToggle() {
  const mode = useViewStore((s) => s.mode)
  const setMode = useViewStore((s) => s.setMode)

  return (
    <div className="viewtoggle" role="group" aria-label="View">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className="viewtoggle__segment"
          data-active={mode === m.id || undefined}
          aria-pressed={mode === m.id}
          onClick={() => setMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
