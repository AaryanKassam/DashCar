import { useEffect, useRef, useState } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { useCar } from '../cars/garageStore'
import { screenBrightness } from '../scene/lighting'
import { MapApp } from './apps/MapApp'
import { RadioApp } from './apps/RadioApp'
import { MessagesApp } from './apps/MessagesApp'
import { ClimateApp } from './apps/ClimateApp'
import { SurroundView } from './apps/SurroundView'
import { AppIcon } from './appIcons'
import type { AppId } from './appIcons'
import './infotainment.css'

/**
 * The centre touchscreen.
 *
 * Each app is an independent module that reads only the signals it needs:
 * Climate writes cabin setpoints, Map reads speed and distance, Radio touches
 * no vehicle state at all. Adding a fifth app means adding a file and one
 * registry entry — nothing else in the system changes.
 */

const APPS: { id: AppId; label: string }[] = [
  { id: 'map', label: 'Navigation' },
  { id: 'radio', label: 'Media' },
  { id: 'messages', label: 'Messages' },
  { id: 'climate', label: 'Climate' },
]

/** Above this speed the system treats a long screen dwell as a distraction. */
const DISTRACTION_SPEED_KPH = 25
/** Seconds of continuous interaction before nudging the driver. */
const DISTRACTION_DWELL_S = 4

export function InfotainmentScreen() {
  const car = useCar()
  const [active, setActive] = useState<AppId>('map')
  const headlights = useVehicleStore((s) => s.headlights)
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const surround = useVehicleStore((s) => s.surroundViewActive)
  const distracted = useDistractionMonitor() && !surround

  return (
    <div
      className="ivi"
      data-night={timeOfDay < 7 || timeOfDay > 19 || undefined}
      style={
        {
          '--accent': car.theme.accent,
          '--accent-dim': car.theme.accentDim,
          filter: `brightness(${screenBrightness(timeOfDay, headlights)})`,
        } as React.CSSProperties
      }
    >
      <StatusBar carName={car.name} />

      <div className="ivi__stage">
        {/* Surround view pre-empts whatever app is open. When the system has
            something to say about the space around the car, that outranks
            media and messages — the same priority a production HMI applies. */}
        {surround ? (
          <SurroundView />
        ) : (
          <>
            {active === 'map' && <MapApp />}
            {active === 'radio' && <RadioApp />}
            {active === 'messages' && <MessagesApp />}
            {active === 'climate' && <ClimateApp />}
          </>
        )}

        {/* Glanceability nudge. It dims the content rather than blocking it:
            hard lockouts get worked around, and a driver mid-task needs to be
            able to finish. Softening the screen returns their eyes to the road
            without stranding them. */}
        <div className="ivi__nudge" data-on={distracted || undefined} aria-live="polite">
          <span>Eyes on the road</span>
          <small>Tap to continue</small>
        </div>
      </div>

      <nav className="ivi__dock" aria-label="Applications">
        {APPS.map((app) => (
          <button
            key={app.id}
            className="dock__item"
            data-active={(!surround && active === app.id) || undefined}
            onClick={() => {
              if (surround) useVehicleStore.getState().toggleSurroundView()
              setActive(app.id)
            }}
            aria-current={!surround && active === app.id ? 'page' : undefined}
          >
            {/* Touch targets are 68px: at arm's length in a moving car, small
                targets mean repeated attempts, and every retry is another
                glance away from the road. */}
            <AppIcon name={app.id} />
            <span>{app.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function StatusBar({ carName }: { carName: string }) {
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const driveMode = useVehicleStore((s) => s.driveMode)
  const acOn = useVehicleStore((s) => s.acOn)
  const setpoint = useVehicleStore((s) => s.cabinTempSetpoint)

  const hh = String(Math.floor(timeOfDay)).padStart(2, '0')
  const mm = String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')

  return (
    <header className="ivi__status">
      <span className="ivi__badge">{carName}</span>
      <span className="ivi__spacer" />
      <span>{acOn ? `${setpoint.toFixed(1)}°C` : 'A/C off'}</span>
      <span className="ivi__mode">{driveMode.toUpperCase()}</span>
      <span className="ivi__signal" aria-label="Signal strength">
        {[6, 9, 12, 15].map((h, i) => (
          <i key={h} style={{ height: h, opacity: i < 3 ? 1 : 0.3 }} />
        ))}
      </span>
      <time>{hh}:{mm}</time>
    </header>
  )
}

/**
 * Distraction monitor.
 *
 * Counts continuous interaction with the screen while the car is moving above
 * a threshold, and decays that count once the driver looks away. This is the
 * simplest honest model of the thing regulators actually care about: total
 * eyes-off-road time, not the number of taps.
 */
function useDistractionMonitor(): boolean {
  const [distracted, setDistracted] = useState(false)
  const dwell = useRef(0)
  const engaged = useRef(false)

  useEffect(() => {
    const el = document.querySelector('.ivi__stage')
    if (!el) return
    const on = () => (engaged.current = true)
    const off = () => (engaged.current = false)
    el.addEventListener('pointerenter', on)
    el.addEventListener('pointerleave', off)
    el.addEventListener('pointerdown', on)

    const id = window.setInterval(() => {
      const speed = useVehicleStore.getState().speed
      const moving = speed > DISTRACTION_SPEED_KPH
      if (engaged.current && moving) dwell.current += 0.25
      else dwell.current = Math.max(0, dwell.current - 0.5)
      setDistracted(dwell.current >= DISTRACTION_DWELL_S)
    }, 250)

    return () => {
      el.removeEventListener('pointerenter', on)
      el.removeEventListener('pointerleave', off)
      el.removeEventListener('pointerdown', on)
      window.clearInterval(id)
    }
  }, [])

  return distracted
}
