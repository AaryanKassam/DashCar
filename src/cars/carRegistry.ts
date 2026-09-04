import type { CarDefinition } from './carTypes'
import { EXPLORER_TRIMS, explorerActive } from './explorer/trims'

/**
 * Every vehicle the app can load.
 *
 * Today that is the five Explorer trims. A different vehicle would be another
 * entry with its own `cockpit` package — the registry does not distinguish, and
 * neither does anything that reads from it.
 */
export const CARS: CarDefinition[] = EXPLORER_TRIMS

export const DEFAULT_CAR_ID = explorerActive.id

export function getCar(id: string): CarDefinition {
  return CARS.find((c) => c.id === id) ?? explorerActive
}

export type { CarDefinition }
