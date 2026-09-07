import { useAudioStore } from '../state/audioStore'
import { useVehicleStore } from '../state/vehicleStore'

/**
 * A real WebAudio graph behind the head unit's audio controls.
 *
 * ```
 *   programme ──▶ bass ──▶ mid ──▶ treble ──▶ boost ──▶ balance ──▶ master ──▶ out
 *   (synth)       (low     (peak)  (high      (low      (stereo     (volume ×
 *                  shelf)           shelf)     shelf)    panner)     speed comp)
 * ```
 *
 * Why bother, when the "programme material" is a synthesised pad rather than a
 * real station? Because the controls are the point. A balance slider that pans
 * nothing, or a bass control that moves a number, is the detail that gives a
 * demo away the instant somebody drags it. Wiring them to a genuine filter
 * chain costs very little and means every claim the UI makes is true.
 *
 * Nothing starts until the user opts in: browsers block an AudioContext created
 * without a gesture, and a page that makes noise unasked is worse than a silent
 * one.
 */

interface Graph {
  ctx: AudioContext
  bass: BiquadFilterNode
  mid: BiquadFilterNode
  treble: BiquadFilterNode
  boost: BiquadFilterNode
  balance: StereoPannerNode
  master: GainNode
  voices: OscillatorNode[]
  programme: GainNode
}

let graph: Graph | null = null
let enabled = false
let raf = 0

/** Chord voicings per source, so switching source audibly changes something. */
const PROGRAMME: Record<string, number[]> = {
  fm: [146.83, 220, 293.66, 369.99],
  dab: [130.81, 196, 261.63, 329.63],
  bluetooth: [164.81, 246.94, 329.63, 415.3],
  usb: [110, 164.81, 220, 277.18],
}

function build(): Graph | null {
  try {
    const ctx = new AudioContext()

    const bass = ctx.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 180

    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 0.9

    const treble = ctx.createBiquadFilter()
    treble.type = 'highshelf'
    treble.frequency.value = 3500

    const boost = ctx.createBiquadFilter()
    boost.type = 'lowshelf'
    boost.frequency.value = 90
    boost.gain.value = 0

    const balance = ctx.createStereoPanner()
    const master = ctx.createGain()
    master.gain.value = 0

    const programme = ctx.createGain()
    programme.gain.value = 0.06

    programme.connect(bass).connect(mid).connect(treble).connect(boost).connect(balance).connect(master)
    master.connect(ctx.destination)

    // A quiet sustained pad. Detuned pairs so it is not a pure sine, which is
    // both unpleasant and useless for hearing an EQ change.
    const voices = PROGRAMME.fm.flatMap((freq) => {
      const a = ctx.createOscillator()
      a.type = 'triangle'
      a.frequency.value = freq
      const b = ctx.createOscillator()
      b.type = 'sine'
      b.frequency.value = freq * 1.005
      const mix = ctx.createGain()
      mix.gain.value = 0.25
      a.connect(mix)
      b.connect(mix)
      mix.connect(programme)
      a.start()
      b.start()
      return [a, b]
    })

    return { ctx, bass, mid, treble, boost, balance, master, voices, programme }
  } catch {
    return null
  }
}

/**
 * Volume actually delivered to the speakers.
 *
 * Road noise rises steeply with speed, so compensation is applied against speed
 * rather than linearly against it — a curve, not a ramp. Fade biases the front
 * pair, which in a stereo-only graph shows up as a small level change rather
 * than a true four-channel mix; the honest limit of doing this in a browser.
 */
function deliveredGain(): number {
  const a = useAudioStore.getState()
  if (a.muted || !a.playing) return 0

  const speed = useVehicleStore.getState().speed
  const compensation = 1 + (a.speedCompensation / 3) * Math.min(1, (speed / 120) ** 1.6) * 0.85
  // Steering the stage at the driver costs a little overall level.
  const occupancy = a.occupancy === 'driver' ? 0.9 : 1
  const fade = 0.85 + (a.fade + 1) * 0.075

  return a.volume * compensation * occupancy * fade * 0.5
}

function apply() {
  if (!graph) return
  const a = useAudioStore.getState()
  const t = graph.ctx.currentTime
  const glide = 0.08

  graph.bass.gain.setTargetAtTime(a.bass, t, glide)
  graph.mid.gain.setTargetAtTime(a.mid, t, glide)
  graph.treble.gain.setTargetAtTime(a.treble, t, glide)
  graph.boost.gain.setTargetAtTime(a.bassBoost ? 6 : 0, t, glide)
  // Occupancy nudges the image toward the driver on top of the balance control.
  const bias = a.occupancy === 'driver' ? -0.35 : 0
  graph.balance.pan.setTargetAtTime(Math.max(-1, Math.min(1, a.balance + bias)), t, glide)
  graph.master.gain.setTargetAtTime(deliveredGain(), t, glide)

  const voicing = PROGRAMME[a.source] ?? PROGRAMME.fm
  graph.voices.forEach((osc, i) => {
    const base = voicing[Math.floor(i / 2) % voicing.length]
    // Shift the voicing by station, so skipping tracks is audible.
    const semitone = Math.pow(2, ((a.stationIndex % 5) - 2) / 12)
    const target = i % 2 === 0 ? base * semitone : base * semitone * 1.005
    osc.frequency.setTargetAtTime(target, t, 0.12)
  })
}

export const audioEngine = {
  isEnabled: () => enabled,

  setEnabled(on: boolean) {
    enabled = on
    if (on) {
      if (!graph) graph = build()
      void graph?.ctx.resume()
      const tick = () => {
        apply()
        raf = requestAnimationFrame(tick)
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(raf)
      if (graph) graph.master.gain.setTargetAtTime(0, graph.ctx.currentTime, 0.05)
    }
  },

  /** The level actually reaching the speakers, for the UI's own meter. */
  deliveredGain,
}
