import type { CarDefinition } from './carTypes'
import { auroraGT } from './car-01/aurora'
import { terraXL } from './car-02/terra'
import { voltEV } from './car-03/volt'

export const CARS: CarDefinition[] = [auroraGT, terraXL, voltEV]

export const DEFAULT_CAR_ID = auroraGT.id

export function getCar(id: string): CarDefinition {
  return CARS.find((c) => c.id === id) ?? auroraGT
}

export type { CarDefinition }
