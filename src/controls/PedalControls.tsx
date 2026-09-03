import { useRef } from 'react'
import { useSignalAnimation } from '../cluster/useSignalAnimation'
import { pedalIntent } from '../input/pedalIntent'
import type { PedalControl } from '../input/pedalIntent'

/**
 * On-screen driving controls, for pointer and touch.
 *
 * These publish *intent* and nothing else — the ramp that turns a held control
 * into an analog signal lives in `useDriverInput`, so pointer and keyboard can
 * never disagree about how far the pedal is down.
 */
export function PedalControls() {
  return (
    <div className="pedals">
      <Control control="steerLeft" label="Left" hint="A" variant="steer" />
      <Control control="brake" label="Brake" hint="S" variant="brake" />
      <Control control="throttle" label="Accelerate" hint="W" variant="throttle" />
      <Control control="steerRight" label="Right" hint="D" variant="steer" />
    </div>
  )
}

const SIGNAL: Record<string, (s: { throttle: number; brake: number; steering: number }) => number> = {
  throttle: (s) => s.throttle,
  brake: (s) => s.brake,
  steerLeft: (s) => Math.max(0, -s.steering),
  steerRight: (s) => Math.max(0, s.steering),
}

function Control({
  control,
  label,
  hint,
  variant,
}: {
  control: PedalControl
  label: string
  hint: string
  variant: 'throttle' | 'brake' | 'steer'
}) {
  const fillRef = useRef<HTMLDivElement>(null)

  useSignalAnimation(SIGNAL[control], (v) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${v})`
  }, 30)

  const press = (held: boolean) => pedalIntent.set('pointer', control, held)

  return (
    <button
      className="pedal"
      data-variant={variant}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        press(true)
      }}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
      aria-label={label}
    >
      <div className="pedal__fill" ref={fillRef} />
      <span className="pedal__label">{label}</span>
      <kbd>{hint}</kbd>
    </button>
  )
}
