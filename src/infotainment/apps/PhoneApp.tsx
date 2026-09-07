import { useState } from 'react'
import { useVehicleStore } from '../../state/vehicleStore'

/**
 * Phone.
 *
 * The keypad is deliberately unavailable above walking pace, for the same reason
 * the messages keyboard is: dialling is a long, eyes-down, multi-step task and
 * it is the one thing on this screen that cannot be done in glances. Recents and
 * favourites stay available at any speed, because picking a known name off a
 * list is a single glance.
 */

interface Contact {
  name: string
  number: string
  detail: string
  favourite?: boolean
}

const CONTACTS: Contact[] = [
  { name: 'Priya Raman', number: '+1 313 555 0148', detail: 'Mobile', favourite: true },
  { name: 'Dad', number: '+1 313 555 0102', detail: 'Mobile', favourite: true },
  { name: 'Riverside Service', number: '+1 313 555 0900', detail: 'Work' },
  { name: 'Marcus Bell', number: '+1 248 555 0177', detail: 'Mobile' },
  { name: 'Home', number: '+1 313 555 0111', detail: 'Home', favourite: true },
]

const RECENTS = [
  { name: 'Priya Raman', when: '17:42', kind: 'outgoing' as const },
  { name: 'Riverside Service', when: '16:10', kind: 'missed' as const },
  { name: 'Dad', when: 'Yesterday', kind: 'incoming' as const },
  { name: 'Marcus Bell', when: 'Yesterday', kind: 'outgoing' as const },
]

export function PhoneApp() {
  const [tab, setTab] = useState<'recents' | 'contacts' | 'keypad'>('recents')
  const [dialled, setDialled] = useState('')
  const [inCall, setInCall] = useState<string | null>(null)
  const speed = useVehicleStore((s) => s.speed)
  const moving = speed > 5

  if (inCall) return <ActiveCall name={inCall} onEnd={() => setInCall(null)} />

  return (
    <div className="phone">
      <div className="phone__tabs">
        <button className="chip" data-active={tab === 'recents' || undefined} onClick={() => setTab('recents')}>
          Recents
        </button>
        <button className="chip" data-active={tab === 'contacts' || undefined} onClick={() => setTab('contacts')}>
          Contacts
        </button>
        <button
          className="chip"
          data-active={tab === 'keypad' || undefined}
          onClick={() => setTab('keypad')}
          disabled={moving}
          title={moving ? 'Keypad locked while moving' : undefined}
        >
          Keypad
        </button>
      </div>

      {tab === 'recents' && (
        <ul className="phone__list">
          {RECENTS.map((r) => (
            <li key={r.name + r.when}>
              <button onClick={() => setInCall(r.name)}>
                <span className="phone__avatar">{initials(r.name)}</span>
                <span className="phone__body">
                  <strong>{r.name}</strong>
                  <small data-kind={r.kind}>{r.kind}</small>
                </span>
                <time>{r.when}</time>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'contacts' && (
        <ul className="phone__list">
          {CONTACTS.map((c) => (
            <li key={c.number}>
              <button onClick={() => setInCall(c.name)}>
                <span className="phone__avatar">{initials(c.name)}</span>
                <span className="phone__body">
                  <strong>
                    {c.name}
                    {c.favourite && <i className="phone__star" aria-label="Favourite" />}
                  </strong>
                  <small>
                    {c.detail} · {c.number}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'keypad' &&
        (moving ? (
          <p className="phone__lock">Keypad locked above 5 km/h. Choose a contact or use voice.</p>
        ) : (
          <div className="keypad">
            <div className="keypad__display">{dialled || 'Enter a number'}</div>
            <div className="keypad__grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                <button key={d} onClick={() => setDialled((v) => (v + d).slice(0, 16))}>
                  {d}
                </button>
              ))}
            </div>
            <div className="keypad__actions">
              <button className="btn" onClick={() => setDialled((v) => v.slice(0, -1))}>
                Delete
              </button>
              <button className="btn btn--primary" disabled={!dialled} onClick={() => setInCall(dialled)}>
                Call
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}

function ActiveCall({ name, onEnd }: { name: string; onEnd: () => void }) {
  return (
    <div className="call">
      <span className="call__avatar">{initials(name)}</span>
      <strong>{name}</strong>
      <small>Connected · 00:14</small>
      <div className="call__actions">
        <button className="btn">Mute</button>
        <button className="btn">Keypad</button>
        <button className="btn">Hold</button>
        <button className="btn call__end" onClick={onEnd}>
          End call
        </button>
      </div>
    </div>
  )
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
