import type { CarTheme } from '../carTypes'

/**
 * Interior colourways.
 *
 * The trim selector this replaces was dishonest: five entries that claimed to
 * be different vehicles but only ever repainted the cabin. Naming the thing it
 * actually does — choose an interior colour — is both truthful and more useful,
 * because that *is* the decision a configurator exists to make.
 *
 * A colourway overrides only the surfaces a real trim choice changes. The cabin
 * package, powertrain and cluster layout stay where they belong, on the vehicle.
 */

export interface InteriorColourway {
  id: string
  name: string
  /** One-line description, shown under the name. */
  note: string
  /** Swatches for the picker: dark surface, light surface, accent. */
  swatch: [string, string, string]
  theme: Pick<
    CarTheme,
    'dashUpper' | 'dashLower' | 'trim' | 'upholstery' | 'stitching' | 'ambient' | 'carpet' | 'headliner'
  >
}

export const INTERIOR_COLOURWAYS: InteriorColourway[] = [
  {
    id: 'ebony-grey',
    name: 'Ebony / Medium Grey',
    note: 'Standard Active cloth with orange contrast stitch',
    swatch: ['#2b2c31', '#767c83', '#c25a2e'],
    theme: {
      dashUpper: '#2b2c31',
      dashLower: '#767c83',
      trim: '#7d8186',
      upholstery: '#3f434a',
      stitching: '#c25a2e',
      ambient: '#e8a24a',
      carpet: '#1c1d20',
      headliner: '#8d8b86',
    },
  },
  {
    id: 'ebony',
    name: 'Ebony',
    note: 'All-dark cabin, grey stitch',
    swatch: ['#25262a', '#3a3d43', '#8b9199'],
    theme: {
      dashUpper: '#25262a',
      dashLower: '#3a3d43',
      trim: '#6c7075',
      upholstery: '#2e3136',
      stitching: '#8b9199',
      ambient: '#cfd6e0',
      carpet: '#17181a',
      headliner: '#4a4c50',
    },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    note: 'Warm two-tone with a light upper',
    swatch: ['#4b453c', '#bdb3a0', '#7a6a52'],
    theme: {
      dashUpper: '#4b453c',
      dashLower: '#bdb3a0',
      trim: '#a2957c',
      upholstery: '#8d8069',
      stitching: '#5f5340',
      ambient: '#f0dfbe',
      carpet: '#33302a',
      headliner: '#c8c2b4',
    },
  },
  {
    id: 'st-red',
    name: 'ST Red Accent',
    note: 'Black leather, red piping and red ambient',
    swatch: ['#232428', '#2f3136', '#e0242b'],
    theme: {
      dashUpper: '#232428',
      dashLower: '#2f3136',
      trim: '#3a3d42',
      upholstery: '#242529',
      stitching: '#e0242b',
      ambient: '#e0242b',
      carpet: '#141517',
      headliner: '#3d3f43',
    },
  },
  {
    id: 'tremor-khaki',
    name: 'Tremor Khaki',
    note: 'Rugged cloth with orange accents',
    swatch: ['#31322f', '#7d7a6c', '#e07b26'],
    theme: {
      dashUpper: '#31322f',
      dashLower: '#7d7a6c',
      trim: '#6b6a63',
      upholstery: '#3b3a34',
      stitching: '#e07b26',
      ambient: '#e07b26',
      carpet: '#1a1a17',
      headliner: '#8d8b84',
    },
  },
]

export const DEFAULT_INTERIOR_ID = INTERIOR_COLOURWAYS[0].id

export function getInterior(id: string): InteriorColourway {
  return INTERIOR_COLOURWAYS.find((c) => c.id === id) ?? INTERIOR_COLOURWAYS[0]
}
