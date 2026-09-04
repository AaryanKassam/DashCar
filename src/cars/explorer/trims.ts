import type { CarDefinition } from '../carTypes'
import { ECOBOOST_23, ECOBOOST_30, EXPLORER_COCKPIT, EXPLORER_EXTERIOR } from './cockpit'

/**
 * The five Explorer trims.
 *
 * Each is a full `CarDefinition` and each shares `EXPLORER_COCKPIT`. That is the
 * seam the prompt asked for: swapping a trim and swapping to an entirely
 * different vehicle go through the same registry, and the only difference is
 * whether the new entry brings its own cabin package.
 *
 * Only Active is dialled in against the reference imagery. The rest are
 * plausible rather than verified — they exist to prove the theming path, and
 * their material choices are informed guesses, not measured from Ford's own
 * renders.
 */

const base = {
  bodyStyle: 'Mid-size SUV',
  energyType: 'fuel' as const,
  singleSpeed: false,
  cockpit: EXPLORER_COCKPIT,
}

export const explorerActive: CarDefinition = {
  ...base,
  id: 'active',
  name: 'Explorer® Active',
  shortName: 'Active',
  badge: 'ACTIVE',
  tagline: '2.3L EcoBoost® · 10-speed automatic',
  powertrain: ECOBOOST_23,
  theme: {
    accent: '#1b6ac9',
    accentDim: '#12365f',
    clusterBg: '#0a0c10',
    dashUpper: '#2b2c31',
    dashLower: '#655f55',
    trim: '#7d8186',
    upholstery: '#43454b',
    stitching: '#9a4526',
    ambient: '#e8a24a',
    carpet: '#1c1d20',
    headliner: '#8d8b86',
  },
  cluster: { skin: 'standard', maxSpeedKph: 200, maxRpm: 7000, redlineRpm: 6200 },
  exterior: { ...EXPLORER_EXTERIOR, paint: '#c6cbd1', cladding: '#26282b', wheel: '#9a9ea3' },
}

export const explorerSTLine: CarDefinition = {
  ...base,
  id: 'st-line',
  name: 'Explorer® ST-Line',
  shortName: 'ST-Line',
  badge: 'ST-LINE',
  tagline: '2.3L EcoBoost® · sport appearance',
  powertrain: ECOBOOST_23,
  theme: {
    accent: '#d92d20',
    accentDim: '#5e1410',
    clusterBg: '#08090c',
    dashUpper: '#2b2c31',
    dashLower: '#3a3b40',
    trim: '#4a4d52',
    upholstery: '#2f3136',
    stitching: '#d92d20',
    ambient: '#d92d20',
    carpet: '#161719',
    headliner: '#5a5b5f',
  },
  cluster: { skin: 'sport', maxSpeedKph: 220, maxRpm: 7000, redlineRpm: 6200 },
  exterior: { ...EXPLORER_EXTERIOR, paint: '#8f1a17', cladding: '#1a1b1d', wheel: '#3b3e42' },
}

export const explorerTremor: CarDefinition = {
  ...base,
  id: 'tremor',
  name: 'Explorer® Tremor',
  shortName: 'Tremor',
  badge: 'TREMOR',
  tagline: '2.3L EcoBoost® · off-road package',
  powertrain: { ...ECOBOOST_23, mass: 2130, rollingResistance: 0.019, wheelRadius: 0.39 },
  theme: {
    accent: '#e07b26',
    accentDim: '#5c3210',
    clusterBg: '#0b0a08',
    dashUpper: '#31322f',
    dashLower: '#7c7566',
    trim: '#6b6a63',
    upholstery: '#3b3a34',
    stitching: '#e07b26',
    ambient: '#e07b26',
    carpet: '#1a1a17',
    headliner: '#8d8b84',
  },
  cluster: { skin: 'rugged', maxSpeedKph: 200, maxRpm: 7000, redlineRpm: 6200 },
  exterior: { ...EXPLORER_EXTERIOR, paint: '#4c5054', cladding: '#1d1e20', wheel: '#2e3033' },
}

export const explorerST: CarDefinition = {
  ...base,
  id: 'st',
  name: 'Explorer® ST',
  shortName: 'ST',
  badge: 'ST',
  tagline: '3.0L EcoBoost® V6 · 400 hp',
  powertrain: ECOBOOST_30,
  theme: {
    accent: '#e0242b',
    accentDim: '#5c0f12',
    clusterBg: '#07080a',
    dashUpper: '#26272b',
    dashLower: '#2c2d31',
    trim: '#33353a',
    upholstery: '#232428',
    stitching: '#e0242b',
    // The gallery's ST night shot is unmistakably red from the footwells up.
    ambient: '#e0242b',
    carpet: '#131416',
    headliner: '#3f4044',
  },
  cluster: { skin: 'sport', maxSpeedKph: 250, maxRpm: 7000, redlineRpm: 6500 },
  exterior: { ...EXPLORER_EXTERIOR, paint: '#b81f24', cladding: '#151617', wheel: '#232528' },
}

export const explorerPlatinum: CarDefinition = {
  ...base,
  id: 'platinum',
  name: 'Explorer® Platinum',
  shortName: 'Platinum',
  badge: 'PLATINUM',
  tagline: '3.0L EcoBoost® V6 · quilted leather',
  powertrain: ECOBOOST_30,
  theme: {
    accent: '#c9a227',
    accentDim: '#4f3f0d',
    clusterBg: '#0c0b09',
    dashUpper: '#3c3833',
    dashLower: '#cdc6b8',
    trim: '#b6a888',
    upholstery: '#6d6357',
    stitching: '#8c7a5c',
    ambient: '#e8dcc0',
    carpet: '#2a2724',
    headliner: '#c4c0b8',
  },
  cluster: { skin: 'luxury', maxSpeedKph: 220, maxRpm: 7000, redlineRpm: 6500 },
  exterior: { ...EXPLORER_EXTERIOR, paint: '#e9eaec', cladding: '#3a3c3f', wheel: '#b9bcc0' },
}

export const EXPLORER_TRIMS: CarDefinition[] = [
  explorerActive,
  explorerSTLine,
  explorerTremor,
  explorerST,
  explorerPlatinum,
]
