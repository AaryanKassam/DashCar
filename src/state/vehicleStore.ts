import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { DoorId, DriveMode, Gear, Hazard, VehicleSignals, WarningId } from './vehicleTypes'

/**
 * The vehicle store is the single source of truth — the "bus".
 *
 * Two kinds of writers exist, and only these two:
 *   1. `applyTick`  — the simulation loop, once per frame, with physics results.
 *   2. the intent actions below — driver/HMI requests (press a pedal, flick a stalk).
 *
 * Readers subscribe with selectors so a needle moving at 60fps never re-renders
 * the infotainment stack. `subscribeWithSelector` additionally lets the
 * imperative 3D layer read signals inside `useFrame` without any React work.
 */

export interface VehicleActions {
  applyTick: (patch: Partial<VehicleSignals>) => void

  setThrottle: (v: number) => void
  setBrake: (v: number) => void
  setSteering: (v: number) => void

  setGear: (gear: Gear) => void
  shiftUp: () => void
  shiftDown: () => void
  setDriveMode: (mode: DriveMode) => void
  toggleEngine: () => void
  toggleParkingBrake: () => void

  toggleHeadlights: () => void
  toggleHighBeams: () => void
  setIndicator: (side: 'left' | 'right' | null) => void
  toggleHazards: () => void
  setTimeOfDay: (hour: number) => void

  /** Engage or cancel cruise. Refuses below the minimum engage speed. */
  toggleCruise: () => void
  /** Nudge the set speed, or capture the current speed if not yet set. */
  nudgeCruise: (deltaKph: number) => void
  resumeCruise: () => void
  toggleLaneKeeping: () => void

  toggleDoor: (door: DoorId) => void
  toggleSeatbelt: () => void

  setWarning: (id: WarningId, active: boolean) => void
  clearWarnings: () => void

  toggleSurroundView: () => void
  setHazards: (hazards: Hazard[], nearest: number | null) => void

  setClimate: (patch: { cabinTempSetpoint?: number; fanSpeed?: number; acOn?: boolean }) => void

  reset: () => void
}

export type VehicleStore = VehicleSignals & VehicleActions

const GEAR_ORDER: Gear[] = ['P', 'R', 'N', 'D']

/** Below this, cruise will not engage. */
export const CRUISE_MIN_KPH = 30

export const initialSignals: VehicleSignals = {
  speed: 0,
  rpm: 0,
  gear: 'P',
  driveMode: 'comfort',
  fuel: 0.72,
  engineRunning: false,
  coolantTemp: 20,
  odometer: 24518,

  throttle: 0,
  brake: 0,
  steering: 0,

  headlights: false,
  highBeams: false,
  hazards: false,
  leftIndicator: false,
  rightIndicator: false,
  indicatorOn: false,
  timeOfDay: 14,

  cruiseActive: false,
  cruiseSetKph: 0,
  laneKeeping: true,

  doors: { frontLeft: false, frontRight: false, rearLeft: false, rearRight: false, trunk: false },
  seatbeltFastened: true,
  parkingBrake: true,

  warnings: [],

  surroundViewActive: false,
  trackedHazards: [],
  nearestHazardDistance: null,

  cabinTempSetpoint: 21,
  fanSpeed: 2,
  acOn: true,
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export const useVehicleStore = create<VehicleStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialSignals,

    applyTick: (patch) => set(patch),

    setThrottle: (v) => set({ throttle: clamp(v, 0, 1) }),
    setBrake: (v) => {
      const brake = clamp(v, 0, 1)
      // Touching the brake cancels cruise. Not a nicety: it is the primary way
      // a driver expects to take back control.
      if (brake > 0.02 && get().cruiseActive) set({ cruiseActive: false })
      set({ brake })
    },
    setSteering: (v) => set({ steering: clamp(v, -1, 1) }),

    setGear: (gear) => {
      const { speed, parkingBrake } = get()
      // Interlock: a real transmission refuses P/R above walking pace. Modelling
      // the refusal (rather than silently allowing it) is the point of the demo.
      if ((gear === 'P' || gear === 'R') && speed > 5) return
      if (gear !== 'P' && parkingBrake) set({ parkingBrake: false })
      set({ gear })
    },
    shiftUp: () => {
      const i = GEAR_ORDER.indexOf(get().gear)
      if (i < GEAR_ORDER.length - 1) get().setGear(GEAR_ORDER[i + 1])
    },
    shiftDown: () => {
      const i = GEAR_ORDER.indexOf(get().gear)
      if (i > 0) get().setGear(GEAR_ORDER[i - 1])
    },
    setDriveMode: (driveMode) => set({ driveMode }),
    toggleEngine: () => {
      const running = get().engineRunning
      if (running) {
        // Refuse to stop the engine while rolling.
        if (get().speed > 1) return
        set({ engineRunning: false, rpm: 0, gear: 'P', parkingBrake: true })
      } else {
        set({ engineRunning: true, rpm: 800 })
      }
    },
    toggleParkingBrake: () => set({ parkingBrake: !get().parkingBrake }),

    toggleHeadlights: () => {
      const on = !get().headlights
      set({ headlights: on, highBeams: on ? get().highBeams : false })
    },
    toggleHighBeams: () => {
      // High beams imply low beams — matches real stalk behaviour.
      const on = !get().highBeams
      set({ highBeams: on, headlights: on ? true : get().headlights })
    },
    setIndicator: (side) =>
      set({
        leftIndicator: side === 'left',
        rightIndicator: side === 'right',
        indicatorOn: side !== null,
      }),
    toggleHazards: () => {
      const on = !get().hazards
      set({ hazards: on, leftIndicator: on, rightIndicator: on, indicatorOn: on })
    },
    setTimeOfDay: (hour) => set({ timeOfDay: clamp(hour, 0, 24) }),

    toggleCruise: () => {
      const { cruiseActive, speed, gear } = get()
      if (cruiseActive) {
        set({ cruiseActive: false })
        return
      }
      // Real systems refuse to engage below a floor and out of Drive; modelling
      // the refusal is more informative than silently allowing it.
      if (gear !== 'D' || speed < CRUISE_MIN_KPH) return
      set({ cruiseActive: true, cruiseSetKph: Math.round(speed) })
    },
    nudgeCruise: (deltaKph) => {
      const { cruiseSetKph, speed } = get()
      const base = cruiseSetKph > 0 ? cruiseSetKph : Math.round(speed)
      set({ cruiseSetKph: clamp(base + deltaKph, CRUISE_MIN_KPH, 180) })
    },
    resumeCruise: () => {
      const { cruiseSetKph, gear, speed } = get()
      if (gear !== 'D' || cruiseSetKph < CRUISE_MIN_KPH || speed < CRUISE_MIN_KPH) return
      set({ cruiseActive: true })
    },
    toggleLaneKeeping: () => set({ laneKeeping: !get().laneKeeping }),

    toggleDoor: (door) => set({ doors: { ...get().doors, [door]: !get().doors[door] } }),
    toggleSeatbelt: () => set({ seatbeltFastened: !get().seatbeltFastened }),

    setWarning: (id, active) => {
      const current = get().warnings
      const has = current.includes(id)
      if (active === has) return
      set({ warnings: active ? [...current, id] : current.filter((w) => w !== id) })
    },
    clearWarnings: () => set({ warnings: [] }),

    toggleSurroundView: () => set({ surroundViewActive: !get().surroundViewActive }),
    setHazards: (trackedHazards, nearestHazardDistance) => set({ trackedHazards, nearestHazardDistance }),

    setClimate: (patch) =>
      set({
        cabinTempSetpoint: patch.cabinTempSetpoint ?? get().cabinTempSetpoint,
        fanSpeed: patch.fanSpeed ?? get().fanSpeed,
        acOn: patch.acOn ?? get().acOn,
      }),

    reset: () => set({ ...initialSignals }),
  })),
)

/** Non-reactive read, for use inside animation frames. */
export const readVehicle = () => useVehicleStore.getState()
