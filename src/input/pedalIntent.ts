/**
 * Pedal and steering intent, shared by every input device.
 *
 * The keyboard and the on-screen pedals both want to drive the same three
 * signals. The first version of this let each one run its own ramp, and they
 * fought: the keyboard raised the throttle while the pointer loop, seeing its
 * own button unheld, dragged it back to zero.
 *
 * The fix is the same one a real HMI uses for a control with several physical
 * inputs — devices publish *intent*, and exactly one arbiter turns intent into
 * a signal. `useDriverInput` owns that arbiter.
 */

export type PedalControl = 'throttle' | 'brake' | 'steerLeft' | 'steerRight'
export type InputSource = 'keyboard' | 'pointer'

const state: Record<InputSource, Record<PedalControl, boolean>> = {
  keyboard: { throttle: false, brake: false, steerLeft: false, steerRight: false },
  pointer: { throttle: false, brake: false, steerLeft: false, steerRight: false },
}

export const pedalIntent = {
  set(source: InputSource, control: PedalControl, held: boolean) {
    state[source][control] = held
  },
  /** Any device asking for this control counts as asking for it. */
  active(control: PedalControl): boolean {
    return state.keyboard[control] || state.pointer[control]
  },
  clear(source: InputSource) {
    for (const key of Object.keys(state[source]) as PedalControl[]) state[source][key] = false
  },
}
