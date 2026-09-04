import { Dashboard } from './Dashboard'
import { SteeringWheel } from './SteeringWheel'
import { Greenhouse } from './Greenhouse'
import { DoorCard } from './DoorCard'
import { CentreConsole } from './CentreConsole'
import { Seats } from './Seats'

/**
 * The Explorer cabin.
 *
 * Assembled in the order you would think about a real interior: the structure
 * you sit in, the surfaces in front of you, then the things you touch. The
 * displays are mounted separately in `CockpitScene` because they are DOM rather
 * than geometry.
 *
 * Every trim shares this cabin — the geometry comes from `EXPLORER_COCKPIT` and
 * the colours from the active trim's theme, so switching from Active to ST
 * re-materials the same model rather than loading a different one.
 */
export function ExplorerCabin() {
  return (
    <group>
      <Greenhouse />
      <Dashboard />
      <SteeringWheel />
      <DoorCard side={-1} />
      <DoorCard side={1} />
      <CentreConsole />
      <Seats />
    </group>
  )
}
