import { BINDINGS, BINDING_GROUPS, keyLabel } from '../input/bindings'

/** Controls reference, generated from the same binding table the input layer reads. */
export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  const entries = Object.entries(BINDINGS)

  return (
    <div className="help" role="dialog" aria-label="Controls" onClick={onClose}>
      <div className="help__card" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Controls</h2>
          <button className="help__close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="help__cols">
          {BINDING_GROUPS.map((group) => (
            <section key={group}>
              <h3>{group}</h3>
              <dl>
                {entries
                  .filter(([, b]) => b.group === group)
                  .map(([id, b]) => (
                    <div key={id}>
                      <dt>{b.label}</dt>
                      <dd><kbd>{keyLabel(b)}</kbd></dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
        </div>
        <footer>
          <span>Drag to look around the cabin · double-click to recentre</span>
        </footer>
      </div>
    </div>
  )
}
