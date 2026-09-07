import { useEffect, useRef, useState } from 'react'
import { useVehicleStore } from '../state/vehicleStore'
import { useAudioStore } from '../state/audioStore'
import { useCar } from '../cars/garageStore'
import { screenBrightness } from '../scene/lighting'
import { MapApp } from './apps/MapApp'
import { AudioApp } from './apps/AudioApp'
import { PhoneApp } from './apps/PhoneApp'
import { MessagesApp } from './apps/MessagesApp'
import { ClimateApp } from './apps/ClimateApp'
import { VehicleApp } from './apps/VehicleApp'
import { SettingsApp } from './apps/SettingsApp'
import { HomeApp } from './apps/HomeApp'
import { SurroundView } from './apps/SurroundView'
import { APPS, AppIcon, TransportIcon } from './appRegistry'
import type { AppId } from './appRegistry'
import './infotainment.css'

/**
 * The centre touchscreen.
 *
 * Laid out as the reference does: a vertical app rail down the left edge, the
 * app itself filling the middle, and a persistent climate strip along the
 * bottom. The strip is persistent for a reason — temperature and fan are the
 * controls a driver reaches for most often and should never require leaving
 * whatever app is open to find.
 *
 * Each app reads only the signals it needs. Climate writes cabin setpoints,
 * Vehicle reads the same warnings the cluster does, and Audio touches no vehicle
 * state except road speed for its volume compensation. Adding a ninth app means
 * one registry entry and one case here.
 */

/** Above this speed a long dwell on the screen counts as a distraction. */
const DISTRACTION_SPEED_KPH = 25
const DISTRACTION_DWELL_S = 4

export function InfotainmentScreen() {
  const car = useCar()
  const [active, setActive] = useState<AppId>('home')
  const headlights = useVehicleStore((s) => s.headlights)
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const surround = useVehicleStore((s) => s.surroundViewActive)
  const distracted = useDistractionMonitor() && !surround

  return (
    <div
      className="ivi"
      style={
        {
          '--accent': car.theme.accent,
          '--accent-dim': car.theme.accentDim,
          filter: `brightness(${screenBrightness(timeOfDay, headlights)})`,
        } as React.CSSProperties
      }
    >
      <StatusBar carName={car.name} />

      <div className="ivi__body">
        <nav className="ivi__rail" aria-label="Applications">
          {APPS.map((app) => (
            <button
              key={app.id}
              className="rail__item"
              data-active={(!surround && active === app.id) || undefined}
              aria-current={!surround && active === app.id ? 'page' : undefined}
              onClick={() => {
                if (surround) useVehicleStore.getState().toggleSurroundView()
                setActive(app.id)
              }}
            >
              <AppIcon id={app.id} />
              <span>{app.label}</span>
            </button>
          ))}
        </nav>

        <div className="ivi__stage">
          {/* Surround view pre-empts whatever app is open. When the system has
              something to say about the space around the car, that outranks
              media and messages — the priority a production HMI applies. */}
          {surround ? (
            <SurroundView />
          ) : (
            <>
              {active === 'home' && <HomeApp onOpen={setActive} />}
              {active === 'navigation' && <MapApp />}
              {active === 'audio' && <AudioApp />}
              {active === 'phone' && <PhoneApp />}
              {active === 'messages' && <MessagesApp />}
              {active === 'climate' && <ClimateApp />}
              {active === 'vehicle' && <VehicleApp />}
              {active === 'settings' && <SettingsApp />}
            </>
          )}

          {/* Glanceability nudge. It dims rather than blocks: hard lockouts get
              worked around, and a driver mid-task needs to be able to finish. */}
          <div className="ivi__nudge" data-on={distracted || undefined} aria-live="polite">
            <span>Eyes on the road</span>
            <small>Tap to continue</small>
          </div>
        </div>
      </div>

      <ClimateStrip />
    </div>
  )
}

function StatusBar({ carName }: { carName: string }) {
  const timeOfDay = useVehicleStore((s) => s.timeOfDay)
  const driveMode = useVehicleStore((s) => s.driveMode)
  const outside = 12

  const hh = String(Math.floor(timeOfDay) % 24).padStart(2, '0')
  const mm = String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')

  return (
    <header className="ivi__status">
      <span className="ivi__badge">{carName}</span>
      <span className="ivi__spacer" />
      <span>{outside}°C outside</span>
      <span className="ivi__mode">{driveMode === 'comfort' ? 'NORMAL' : driveMode.toUpperCase()}</span>
      <span className="ivi__signal" aria-label="Signal strength">
        {[6, 9, 12, 15].map((h, i) => (
          <i key={h} style={{ height: h, opacity: i < 3 ? 1 : 0.3 }} />
        ))}
      </span>
      <time>
        {hh}:{mm}
      </time>
    </header>
  )
}

/**
 * The persistent climate and volume strip.
 *
 * Always present, whatever app is open, because these are the controls a driver
 * uses most and burying them behind a screen change is the single most common
 * complaint about touchscreen-only cabins.
 */
function ClimateStrip() {
  const setpoint = useVehicleStore((s) => s.cabinTempSetpoint)
  const fanSpeed = useVehicleStore((s) => s.fanSpeed)
  const setClimate = useVehicleStore((s) => s.setClimate)
  const volume = useAudioStore((s) => s.volume)
  const nudgeVolume = useAudioStore((s) => s.nudgeVolume)
  const muted = useAudioStore((s) => s.muted)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  const step = (d: number) => setClimate({ cabinTempSetpoint: Math.max(16, Math.min(28, setpoint + d)) })

  return (
    <footer className="ivi__strip">
      <div className="strip__group">
        <button className="strip__btn" onClick={() => step(-0.5)} aria-label="Decrease temperature">−</button>
        <span className="strip__value">{setpoint.toFixed(1)}°</span>
        <button className="strip__btn" onClick={() => step(0.5)} aria-label="Increase temperature">+</button>
      </div>

      <div className="strip__group">
        <span className="strip__label">Fan</span>
        {Array.from({ length: 7 }).map((_, i) => (
          <button
            key={i}
            className="strip__bar"
            data-on={i < fanSpeed || undefined}
            style={{ height: 10 + i * 3 }}
            onClick={() => setClimate({ fanSpeed: i + 1 })}
            aria-label={`Fan speed ${i + 1}`}
          />
        ))}
      </div>

      <button className="strip__pill" onClick={() => setClimate({ fanSpeed: 4, cabinTempSetpoint: 21 })}>
        AUTO
      </button>
      <button className="strip__pill" onClick={() => setClimate({ fanSpeed: 7, cabinTempSetpoint: 24 })}>
        Defrost
      </button>

      <span className="ivi__spacer" />

      <div className="strip__group">
        <button className="strip__btn" onClick={toggleMute} aria-label="Mute" data-on={muted || undefined}>
          <TransportIcon glyph={muted ? 'muted' : 'volume'} size={18} />
        </button>
        <button className="strip__btn" onClick={() => nudgeVolume(-0.05)} aria-label="Volume down">−</button>
        <span className="strip__value">{Math.round(volume * 100)}</span>
        <button className="strip__btn" onClick={() => nudgeVolume(0.05)} aria-label="Volume up">+</button>
      </div>
    </footer>
  )
}

/**
 * Distraction monitor.
 *
 * Counts continuous interaction while the car is moving above a threshold, and
 * decays once the driver looks away. The simplest honest model of the thing
 * regulators actually care about: total eyes-off-road time, not tap count.
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
      if (engaged.current && speed > DISTRACTION_SPEED_KPH) dwell.current += 0.25
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
