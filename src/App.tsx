import { useCallback, useState } from 'react'
import { CockpitScene } from './scene/CockpitScene'
import { PedalControls } from './controls/PedalControls'
import { DebugPanel } from './controls/DebugPanel'
import { HelpOverlay } from './controls/HelpOverlay'
import { StatusStrip } from './controls/StatusStrip'
import { VehicleBadge } from './configurator/VehicleBadge'
import { ViewToggle } from './configurator/ViewToggle'
import { FocusBar } from './configurator/FocusBar'
import { useDrivingLoop } from './simulation/drivingLoop'
import { useDriverInput } from './input/useDriverInput'
import { useScreenshotHooks } from './controls/screenshotHooks'
import { useViewStore } from './state/viewStore'
import './configurator/configurator.css'

/**
 * App shell.
 *
 * The two hooks here are the only places the simulation is started. Everything
 * else in the tree is a *reader* of vehicle state — which is the property worth
 * explaining: there is one writer of speed, and every needle, light cone, map
 * marker and camera clamp is downstream of it.
 *
 * The overlay is deliberately thin. Two configurator controls, a signal
 * readout, and an engineering panel that can be shut. The cabin is the
 * interface; chrome that competes with it is chrome in the way.
 */
export default function App() {
  const [helpOpen, setHelpOpen] = useState(false)
  const toggleHelp = useCallback(() => setHelpOpen((o) => !o), [])
  const mode = useViewStore((s) => s.mode)
  const focused = useViewStore((s) => s.focused)

  useDrivingLoop()
  useDriverInput(toggleHelp)
  useScreenshotHooks()

  const driving = mode === 'interior' && !focused

  return (
    <div className="app">
      <CockpitScene />

      <VehicleBadge />
      <ViewToggle />
      <FocusBar />

      {driving && <StatusStrip onHelp={toggleHelp} />}
      {driving && <PedalControls />}

      <DebugPanel />
      <HelpOverlay open={helpOpen} onClose={toggleHelp} />
    </div>
  )
}
