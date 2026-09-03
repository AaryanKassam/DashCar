import { useVehicleStore } from '../state/vehicleStore'
import { audio } from './audio'

/**
 * Scripted demo scenarios.
 *
 * A demo that requires the presenter to press eight keys in the right order is
 * a demo that goes wrong. Each scenario is a list of timed steps that drive the
 * same public store actions a human would, so nothing here is a special path
 * through the app — it is just a very fast, very reliable driver.
 */

export interface ScenarioStep {
  /** Milliseconds after the previous step. */
  after: number
  run: () => void
  note?: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  steps: ScenarioStep[]
}

const v = () => useVehicleStore.getState()

export const SCENARIOS: Scenario[] = [
  {
    id: 'cold-start',
    name: 'Cold start & pull away',
    description: 'Engine off to rolling: interlocks, telltale sweep, gear engagement.',
    steps: [
      { after: 0, run: () => v().reset(), note: 'Reset to a parked, engine-off car' },
      { after: 400, run: () => v().toggleEngine(), note: 'Ignition on' },
      { after: 900, run: () => audio.chime() },
      { after: 300, run: () => v().toggleParkingBrake(), note: 'Release parking brake' },
      { after: 500, run: () => v().setGear('D'), note: 'Select Drive' },
      { after: 400, run: () => v().setThrottle(0.55), note: 'Accelerate' },
      { after: 4200, run: () => v().setThrottle(0.28) },
    ],
  },
  {
    id: 'engine-fault',
    name: 'Fault at speed',
    description: 'Raises an amber engine fault, then a red oil-pressure fault, while moving.',
    steps: [
      { after: 0, run: () => v().setWarning('engine', true), note: 'Check-engine (amber): service soon' },
      { after: 2600, run: () => v().setWarning('abs', true), note: 'ABS unavailable' },
      { after: 2600, run: () => { v().setWarning('oilPressure', true); audio.chime() }, note: 'Oil pressure (red): stop driving — outranks the amber message' },
    ],
  },
  {
    id: 'night-drive',
    name: 'Night drive',
    description: 'Dusk to dark, headlights, high beams, and the cabin dimming with them.',
    steps: [
      { after: 0, run: () => v().setTimeOfDay(19.2), note: 'Dusk' },
      { after: 1800, run: () => v().setTimeOfDay(21.5), note: 'Dark' },
      { after: 900, run: () => v().toggleHeadlights(), note: 'Low beams — screens dim automatically' },
      { after: 2400, run: () => v().toggleHighBeams(), note: 'High beams: longer, narrower throw' },
      { after: 3000, run: () => v().toggleHighBeams(), note: 'Back to low beams' },
    ],
  },
  {
    id: 'pedestrian',
    name: 'Pedestrian crossing',
    description: 'Surround view takes over the centre screen; threat escalates to a red alert.',
    steps: [
      { after: 0, run: () => { v().setThrottle(0); v().setBrake(0.55) }, note: 'Slowing — surround view is a low-speed system' },
      { after: 2600, run: () => v().setBrake(0.25) },
      { after: 1200, run: () => { if (!v().surroundViewActive) v().toggleSurroundView() }, note: 'Surround view takes over the centre screen' },
      { after: 2600, run: () => { v().setBrake(0.8); audio.alert() }, note: 'Track closes inside 2 m — red alert, driver brakes' },
      { after: 2000, run: () => v().setBrake(0.1) },
    ],
  },
  {
    id: 'door-ajar',
    name: 'Door & belt monitors',
    description: 'Body-controller monitors raising telltales on their own, with no fault injected.',
    steps: [
      { after: 0, run: () => v().toggleDoor('frontRight'), note: 'Passenger door opened' },
      { after: 2000, run: () => v().toggleSeatbelt(), note: 'Belt unfastened' },
      { after: 2600, run: () => v().toggleDoor('frontRight'), note: 'Door closed — telltale clears itself' },
      { after: 1600, run: () => v().toggleSeatbelt(), note: 'Belt fastened' },
    ],
  },
]

export interface ScenarioRunner {
  play: (scenario: Scenario, onNote: (note: string | null) => void) => void
  stop: () => void
}

/** One runner instance; starting a scenario cancels any scenario in flight. */
export function createScenarioRunner(): ScenarioRunner {
  let timers: number[] = []

  const stop = () => {
    timers.forEach(window.clearTimeout)
    timers = []
  }

  return {
    stop,
    play(scenario, onNote) {
      stop()
      let t = 0
      scenario.steps.forEach((step) => {
        t += step.after
        timers.push(
          window.setTimeout(() => {
            step.run()
            if (step.note) onNote(step.note)
          }, t),
        )
      })
      timers.push(window.setTimeout(() => onNote(null), t + 3200))
    },
  }
}
