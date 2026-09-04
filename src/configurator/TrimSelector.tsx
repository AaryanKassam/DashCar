import { useEffect, useRef, useState } from 'react'
import { useGarageStore } from '../cars/garageStore'

/**
 * The trim pill, top left.
 *
 * Switching trim re-materials the same cabin rather than loading a different
 * one, because every Explorer trim shares a package. The control does not know
 * that: it lists whatever `carRegistry` holds, so pointing it at a genuinely
 * different vehicle would need no change here at all.
 *
 * Keyboard: Enter or Space opens, arrows move, Enter selects, Escape closes and
 * returns focus to the trigger. A control that can only be operated with a mouse
 * is a control half the people who meet it cannot use.
 */
export function TrimSelector() {
  const cars = useGarageStore((s) => s.cars)
  const carId = useGarageStore((s) => s.carId)
  const selectCar = useGarageStore((s) => s.selectCar)
  const active = cars.find((c) => c.id === carId) ?? cars[0]

  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setCursor(cars.findIndex((c) => c.id === carId))

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    // Capture, so Escape closes the menu before the camera rig sees it.
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, cars, carId])

  const choose = (id: string) => {
    selectCar(id)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="trim" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="trim__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span>{active.name}</span>
        <Chevron open={open} />
      </button>

      <div className="trim__menu" data-open={open || undefined} role="listbox" aria-label="Trim">
        {cars.map((car, i) => (
          <button
            key={car.id}
            type="button"
            role="option"
            aria-selected={car.id === carId}
            className="trim__option"
            data-active={car.id === carId || undefined}
            data-cursor={i === cursor || undefined}
            tabIndex={open ? 0 : -1}
            onMouseEnter={() => setCursor(i)}
            onClick={() => choose(car.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(cars.length - 1, c + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(0, c - 1))
              }
            }}
            ref={(el) => {
              if (open && i === cursor) el?.focus()
            }}
          >
            <span className="trim__option-name">{car.name}</span>
            <span className="trim__option-meta">{car.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="trim__chevron"
      data-open={open || undefined}
      viewBox="0 0 16 16"
      width={16}
      height={16}
      aria-hidden="true"
    >
      <path d="M4 6.2 8 10.2l4-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
