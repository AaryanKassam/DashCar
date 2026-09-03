import { create } from 'zustand'
import { CARS, DEFAULT_CAR_ID, getCar } from './carRegistry'
import type { CarDefinition } from './carTypes'

/**
 * Which car is loaded is a separate concern from what the car is *doing*, so it
 * lives in its own store. Swapping cars never touches vehicle signals.
 */
interface GarageState {
  carId: string
  car: CarDefinition
  selectCar: (id: string) => void
  cars: CarDefinition[]
}

export const useGarageStore = create<GarageState>((set) => ({
  carId: DEFAULT_CAR_ID,
  car: getCar(DEFAULT_CAR_ID),
  cars: CARS,
  selectCar: (id) => set({ carId: id, car: getCar(id) }),
}))

export const useCar = () => useGarageStore((s) => s.car)
