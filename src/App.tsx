import { useCallback, useState } from 'react'
import { CockpitScene } from './scene/CockpitScene'
import { PedalControls } from './controls/PedalControls'
import { DebugPanel } from './controls/DebugPanel'
import { HelpOverlay } from './controls/HelpOverlay'
import { StatusStrip } from './controls/StatusStrip'
import { useDrivingLoop } from './simulation/drivingLoop'
import { useDriverInput } from './input/useDriverInput'
import { useScreenshotHooks } from './controls/screenshotHooks'

/**
 * App shell.
 *
 * The two hooks here are the only places the simulation is started. Everything
 * else in the tree is a *reader* of vehicle state — which is the property that
 * makes this architecture worth explaining: there is one writer of speed, and
 * every needle, light cone and map marker is downstream of it.
 */
export default function App() {
  const [helpOpen, setHelpOpen] = useState(false)
  const toggleHelp = useCallback(() => setHelpOpen((o) => !o), [])

  useDrivingLoop()
  useDriverInput(toggleHelp)
  useScreenshotHooks()

  return (
    <div className="app">
      <CockpitScene />
      <StatusStrip onHelp={toggleHelp} />
      <PedalControls />
      <DebugPanel />
      <HelpOverlay open={helpOpen} onClose={toggleHelp} />
    </div>
  )
}
