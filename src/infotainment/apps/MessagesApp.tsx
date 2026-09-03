import { useState } from 'react'
import { useVehicleStore } from '../../state/vehicleStore'

/**
 * Messages.
 *
 * The interesting part is what it refuses to do. Above walking pace the free
 * text field is replaced by fixed-length canned replies, because composing text
 * is the highest eyes-off-road task in any vehicle HMI. Parked, the full field
 * comes back. The restriction is tied to the `speed` signal, not to a mode the
 * driver can switch off — which is the whole point.
 */

interface Message {
  id: number
  from: 'them' | 'me'
  text: string
  time: string
}

interface Thread {
  id: string
  name: string
  initials: string
  preview: string
  time: string
  unread: number
  messages: Message[]
}

const THREADS: Thread[] = [
  {
    id: 't1',
    name: 'Priya Raman',
    initials: 'PR',
    preview: 'Are you close? We can hold the table',
    time: '17:42',
    unread: 2,
    messages: [
      { id: 1, from: 'them', text: 'Heading over now?', time: '17:38' },
      { id: 2, from: 'me', text: 'Just left, about 20 minutes', time: '17:39' },
      { id: 3, from: 'them', text: 'Are you close? We can hold the table', time: '17:42' },
    ],
  },
  {
    id: 't2',
    name: 'Dad',
    initials: 'D',
    preview: 'Call me when you park',
    time: '16:05',
    unread: 0,
    messages: [{ id: 1, from: 'them', text: 'Call me when you park', time: '16:05' }],
  },
  {
    id: 't3',
    name: 'Service — Riverside',
    initials: 'SR',
    preview: 'Your appointment is confirmed for Thursday',
    time: 'Yesterday',
    unread: 0,
    messages: [{ id: 1, from: 'them', text: 'Your appointment is confirmed for Thursday at 09:00.', time: 'Yesterday' }],
  },
]

const QUICK_REPLIES = ['On my way', 'Running 10 min late', "Can't talk, driving", 'Call you when I park', '👍']

export function MessagesApp() {
  const [activeId, setActiveId] = useState(THREADS[0].id)
  const [sent, setSent] = useState<Record<string, Message[]>>({})
  const [draft, setDraft] = useState('')
  const speed = useVehicleStore((s) => s.speed)
  const moving = speed > 5

  const thread = THREADS.find((t) => t.id === activeId)!
  const messages = [...thread.messages, ...(sent[activeId] ?? [])]

  const send = (text: string) => {
    if (!text.trim()) return
    setSent((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), { id: Date.now(), from: 'me', text, time: 'now' }],
    }))
    setDraft('')
  }

  return (
    <div className="msg">
      <aside className="msg__list">
        {THREADS.map((t) => (
          <button key={t.id} className="msg__thread" data-active={t.id === activeId || undefined} onClick={() => setActiveId(t.id)}>
            <span className="msg__avatar">{t.initials}</span>
            <span className="msg__thread-body">
              <strong>{t.name}</strong>
              <small>{t.preview}</small>
            </span>
            <span className="msg__thread-meta">
              <time>{t.time}</time>
              {t.unread > 0 && <i className="msg__badge">{t.unread}</i>}
            </span>
          </button>
        ))}
      </aside>

      <section className="msg__pane">
        <header className="msg__header">
          <strong>{thread.name}</strong>
          <button className="btn btn--ghost">Read aloud</button>
        </header>

        <div className="msg__scroll">
          {messages.map((m) => (
            <div key={m.id} className="msg__bubble" data-mine={m.from === 'me' || undefined}>
              <p>{m.text}</p>
              <time>{m.time}</time>
            </div>
          ))}
        </div>

        <footer className="msg__compose">
          {moving ? (
            <>
              <span className="msg__lock">Keyboard locked above 5 km/h — choose a reply or use voice</span>
              <div className="msg__quick">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} className="btn" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="msg__input-row">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(draft)}
                placeholder="Message…"
                aria-label="Message text"
              />
              <button className="btn btn--primary" onClick={() => send(draft)}>Send</button>
            </div>
          )}
        </footer>
      </section>
    </div>
  )
}
