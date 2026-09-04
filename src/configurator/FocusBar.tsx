import { useViewStore } from '../state/viewStore'

/**
 * The way back out of a focused display.
 *
 * Appears only while a panel is focused. Three ways out — this button, Escape,
 * or clicking away from the panel — because a view you can enter and not
 * obviously leave is the most common way a zoom interaction goes wrong.
 */
export function FocusBar() {
  const focused = useViewStore((s) => s.focused)
  const pose = useViewStore((s) => s.pose)
  const back = useViewStore((s) => s.back)

  const label = pose === 'clusterFocus' ? 'Instrument cluster' : 'Centre touchscreen'

  return (
    <div className="focusbar" data-open={focused || undefined}>
      <span className="focusbar__label">{label}</span>
      <button type="button" className="focusbar__back" onClick={back}>
        Back to cabin
        <kbd>Esc</kbd>
      </button>
    </div>
  )
}
