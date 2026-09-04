/**
 * Vehicle signal definitions.
 *
 * Everything here models what would arrive on a real vehicle bus (CAN / SOME-IP):
 * a flat set of *signals* that the HMI only ever reads, plus the driver *inputs*
 * that a real system would publish back out as request messages.
 *
 * Deliberate rule for this project: no UI component owns a copy of a signal.
 * If two widgets show speed, they both read `speed` from the store.
 */

export type Gear = 'P' | 'R' | 'N' | 'D'

export type DriveMode = 'eco' | 'comfort' | 'sport'

export type DoorId = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight' | 'trunk'

export type IndicatorSide = 'left' | 'right'

/**
 * Telltales follow the ISO 2575 severity convention that real clusters use:
 *  - red    => stop driving / immediate hazard
 *  - amber  => service required soon, reduced function
 *  - green  => system active & operating normally
 *  - blue   => high beam only, by convention
 */
export type TelltaleSeverity = 'red' | 'amber' | 'green' | 'blue'

export type WarningId =
  | 'engine'
  | 'oilPressure'
  | 'battery'
  | 'brake'
  | 'abs'
  | 'tirePressure'
  | 'coolant'
  | 'lowFuel'
  | 'seatbelt'
  | 'doorAjar'

export interface WarningDefinition {
  id: WarningId
  label: string
  severity: TelltaleSeverity
  /** Short driver-facing explanation, shown in the cluster message line. */
  message: string
  /** True when the driver should pull over rather than continue. */
  stopDriving?: boolean
}

/** A hazard tracked by the (simulated) surround-view sensor fusion stack. */
export interface Hazard {
  id: number
  kind: 'pedestrian' | 'cyclist' | 'vehicle'
  /** Metres, vehicle frame: +x right, +z forward. */
  x: number
  z: number
  /** Metres/second in the vehicle frame. */
  vx: number
  vz: number
}

export interface VehicleSignals {
  // --- powertrain -----------------------------------------------------------
  /** Kilometres per hour. Single source of truth for the whole app. */
  speed: number
  rpm: number
  gear: Gear
  driveMode: DriveMode
  /** 0..1 */
  fuel: number
  engineRunning: boolean
  /** Celsius. */
  coolantTemp: number
  odometer: number

  // --- driver inputs (0..1) -------------------------------------------------
  throttle: number
  brake: number
  /** -1 (full left) .. +1 (full right) */
  steering: number

  // --- lighting -------------------------------------------------------------
  headlights: boolean
  highBeams: boolean
  hazards: boolean
  leftIndicator: boolean
  rightIndicator: boolean
  /** Blink phase, driven by the sim loop so cluster + audio stay in sync. */
  indicatorOn: boolean
  /** 0 = midnight, 12 = noon. Drives the whole scene's lighting. */
  timeOfDay: number

  // --- body / safety --------------------------------------------------------
  doors: Record<DoorId, boolean>
  seatbeltFastened: boolean
  parkingBrake: boolean

  // --- active warnings ------------------------------------------------------
  warnings: WarningId[]

  // --- ADAS -----------------------------------------------------------------
  surroundViewActive: boolean
  trackedHazards: Hazard[]
  /** Metres to the closest hazard, or null when nothing is tracked. */
  nearestHazardDistance: number | null

  // --- cabin ----------------------------------------------------------------
  cabinTempSetpoint: number
  fanSpeed: number
  acOn: boolean
}

export const WARNING_DEFINITIONS: Record<WarningId, WarningDefinition> = {
  engine: {
    id: 'engine',
    label: 'Check Engine',
    severity: 'amber',
    message: 'Engine fault detected. Service required',
  },
  oilPressure: {
    id: 'oilPressure',
    label: 'Oil Pressure',
    severity: 'red',
    message: 'Low oil pressure. Stop safely and switch off',
    stopDriving: true,
  },
  battery: {
    id: 'battery',
    label: 'Charging',
    severity: 'red',
    message: 'Charging system fault. Battery not charging',
  },
  brake: {
    id: 'brake',
    label: 'Brake',
    severity: 'red',
    message: 'Brake system fault. Stop safely',
    stopDriving: true,
  },
  abs: { id: 'abs', label: 'ABS', severity: 'amber', message: 'ABS unavailable. Braking distance may increase' },
  tirePressure: { id: 'tirePressure', label: 'Tire Pressure', severity: 'amber', message: 'Low tire pressure. Check tires' },
  coolant: { id: 'coolant', label: 'Coolant Temp', severity: 'red', message: 'Engine overheating. Stop safely', stopDriving: true },
  lowFuel: { id: 'lowFuel', label: 'Low Fuel', severity: 'amber', message: 'Low fuel. Approx. 50 km remaining' },
  seatbelt: { id: 'seatbelt', label: 'Seatbelt', severity: 'red', message: 'Fasten seatbelt' },
  doorAjar: { id: 'doorAjar', label: 'Door Ajar', severity: 'red', message: 'Door open' },
}

/** Ordered worst-first so the cluster can pick one message line to show. */
export const SEVERITY_RANK: Record<TelltaleSeverity, number> = { red: 0, amber: 1, blue: 2, green: 3 }
