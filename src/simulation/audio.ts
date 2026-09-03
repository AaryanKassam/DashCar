/**
 * Minimal synthesised audio — no asset files.
 *
 * Everything here is a short oscillator envelope: the indicator relay tick and
 * the warning chime. Audio stays muted until the user opts in, because a
 * browser will block an AudioContext started without a gesture anyway.
 */

let ctx: AudioContext | null = null
let enabled = false

function context(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(freq: number, duration: number, gain: number, type: OscillatorType = 'square') {
  const ac = context()
  if (!ac) return
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  env.gain.setValueAtTime(0, ac.currentTime)
  env.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
  osc.connect(env).connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + duration + 0.02)
}

let tickHigh = false

export const audio = {
  setEnabled(v: boolean) {
    enabled = v
    if (v) context()
  },
  isEnabled: () => enabled,
  /** The two-tone relay click of a turn signal: on-click and off-click differ. */
  tick() {
    tickHigh = !tickHigh
    blip(tickHigh ? 1750 : 1150, 0.045, 0.05)
  },
  chime() {
    blip(880, 0.16, 0.06, 'sine')
    setTimeout(() => blip(1320, 0.2, 0.05, 'sine'), 120)
  },
  alert() {
    blip(660, 0.09, 0.08, 'sawtooth')
  },
}
