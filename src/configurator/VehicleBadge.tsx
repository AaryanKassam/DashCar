import { useCar } from '../cars/garageStore'

/**
 * The vehicle name, top left.
 *
 * Static on purpose. This was a dropdown offering five "trims" that only ever
 * repainted the cabin, which promised a choice the build could not honour. The
 * choice that is real — interior colour — now lives in the bench panel where
 * the other vehicle controls are.
 */
export function VehicleBadge() {
  const car = useCar()
  return (
    <div className="badge">
      <span className="badge__name">{car.name}</span>
      <span className="badge__meta">{car.tagline}</span>
    </div>
  )
}
