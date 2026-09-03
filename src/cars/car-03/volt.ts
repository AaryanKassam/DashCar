import type { CarDefinition } from '../carTypes'

/**
 * Car 03 — battery EV. Exists mainly to prove the architecture: it has no
 * gearbox and no fuel tank, so the cluster swaps a power meter in for the tach
 * and a state-of-charge gauge in for the fuel gauge, with zero changes to the
 * store or the simulation loop.
 */
export const voltEV: CarDefinition = {
  id: 'volt-ev',
  name: 'Volt E',
  badge: 'EV',
  tagline: 'Dual-motor AWD · 82 kWh',
  bodyStyle: 'Liftback',
  energyType: 'battery',
  singleSpeed: true,
  powertrain: {
    mass: 1890,
    dragArea: 0.55,
    rollingResistance: 0.011,
    peakPowerW: 258000,
    maxTractionN: 8600,
    maxBrakeForceN: 15200,
    idleRpm: 0,
    redlineRpm: 16000,
    gearRatios: [9.0],
    finalDrive: 1,
    wheelRadius: 0.34,
    steeringLockDeg: 460,
  },
  theme: {
    accent: '#3ddc97',
    accentDim: '#12503a',
    clusterBg: '#070b0c',
    dashBase: '#191d20',
    dashTrim: '#4e5a5f',
    upholstery: '#282f32',
    stitching: '#3ddc97',
    ambient: '#43e8b0',
  },
  cockpit: {
    eyePoint: [-0.06, 1.18, 0],
    dashTopY: 0.98,
    cowlZ: -1.12,
    fasciaZ: -0.5,
    cabinHalfWidth: 0.86,
    roofY: 1.43,
    headerZ: -0.56,
    steeringWheelRadius: 0.168,
    columnRake: 0.4,
    wheelPosition: [-0.34, 0.84, -0.44],
    clusterPosition: [-0.32, 1.01, -0.6],
    clusterSize: [0.38, 0.158],
    clusterAim: [-0.17, 0.2],
    screenPosition: [0.07, 0.99, -0.56],
    screenSize: [0.28, 0.17],
    screenAim: [-0.14, -0.13],
  },
  cluster: { style: 'digital', maxSpeedKph: 240, maxRpm: 16000, redlineRpm: 16000 },
}
