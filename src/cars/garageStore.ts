import { create } from 'zustand'
import { CARS, DEFAULT_CAR_ID, getCar } from './carRegistry'
import { DEFAULT_INTERIOR_ID, INTERIOR_COLOURWAYS, getInterior } from './explorer/interiors'
import type { CarDefinition } from './carTypes'
import type { InteriorColourway } from './explorer/interiors'

/**
 * Which vehicle is loaded, and how its cabin is finished.
 *
 * Two separate choices. The vehicle brings the package, powertrain and cluster;
 * the colourway repaints the surfaces. Swapping either never touches vehicle
 * signals — the car does not care what colour its dashboard is.
 */
interface GarageState {
  carId: string
  interiorId: string
  cars: CarDefinition[]
  interiors: InteriorColourway[]
  selectCar: (id: string) => void
  selectInterior: (id: string) => void
}

export const useGarageStore = create<GarageState>((set) => ({
  carId: DEFAULT_CAR_ID,
  interiorId: DEFAULT_INTERIOR_ID,
  cars: CARS,
  interiors: INTERIOR_COLOURWAYS,
  selectCar: (carId) => set({ carId }),
  selectInterior: (interiorId) => set({ interiorId }),
}))

/**
 * The active vehicle with its colourway applied.
 *
 * Merged here rather than stored merged, so the colourway stays a presentation
 * choice layered over the vehicle instead of mutating it. Everything downstream
 * reads one object and does not need to know a merge happened.
 */
export function useCar(): CarDefinition {
  const carId = useGarageStore((s) => s.carId)
  const interiorId = useGarageStore((s) => s.interiorId)
  const base = getCar(carId)
  const interior = getInterior(interiorId)
  return { ...base, theme: { ...base.theme, ...interior.theme } }
}

export const useInterior = () => getInterior(useGarageStore((s) => s.interiorId))
