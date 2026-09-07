import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useVehicleStore } from '../../state/vehicleStore'
import { useAudioStore } from '../../state/audioStore'
import { gesture } from '../camera'
import { keyLegend } from './textures'

/**
 * The switch packs on the wheel spokes.
 *
 * Individual meshes rather than glyphs painted on a texture, because these are
 * meant to be pressed. Once the camera can come to the wheel, a pad that only
 * *looks* like buttons is the thing that breaks the illusion.
 *
 * The split follows the real car: cruise and lane keeping on the left, where the
 * left thumb rests; audio, phone and menu on the right. Worth copying rather
 * than inventing, because these are controls a driver operates without looking,
 * and the muscle memory is the feature.
 *
 * Every action goes through the same public store action a keyboard shortcut
 * would use. There is no path here that the rest of the app cannot also reach.
 */

export interface WheelButtonSpec {
  id: string
  /** Grid position within the pad. */
  col: 0 | 1
  row: 0 | 1 | 2
  label: string
  glyph: string
  press: () => void
  /** Lit when the function it controls is active. */
  lit?: () => boolean
}

export function leftPadButtons(): WheelButtonSpec[] {
  const v = () => useVehicleStore.getState()
  return [
    {
      id: 'cruise',
      col: 0,
      row: 0,
      label: 'Cruise on/off',
      glyph: 'CRZ',
      press: () => v().toggleCruise(),
      lit: () => v().cruiseActive,
    },
    {
      id: 'lane',
      col: 1,
      row: 0,
      label: 'Lane keeping',
      glyph: 'LKA',
      press: () => v().toggleLaneKeeping(),
      lit: () => v().laneKeeping,
    },
    { id: 'set-up', col: 0, row: 1, label: 'Set speed up', glyph: 'SET+', press: () => v().nudgeCruise(1) },
    { id: 'set-down', col: 1, row: 1, label: 'Set speed down', glyph: 'SET−', press: () => v().nudgeCruise(-1) },
    { id: 'resume', col: 0, row: 2, label: 'Resume cruise', glyph: 'RES', press: () => v().resumeCruise() },
    {
      id: 'mode',
      col: 1,
      row: 2,
      label: 'Drive mode',
      glyph: 'MODE',
      press: () => {
        const modes = ['eco', 'comfort', 'sport'] as const
        const i = modes.indexOf(v().driveMode)
        v().setDriveMode(modes[(i + 1) % modes.length])
      },
    },
  ]
}

export function rightPadButtons(): WheelButtonSpec[] {
  const a = () => useAudioStore.getState()
  const v = () => useVehicleStore.getState()
  return [
    { id: 'vol-up', col: 0, row: 0, label: 'Volume up', glyph: 'VOL+', press: () => a().nudgeVolume(0.06) },
    { id: 'vol-down', col: 1, row: 0, label: 'Volume down', glyph: 'VOL−', press: () => a().nudgeVolume(-0.06) },
    { id: 'prev', col: 0, row: 1, label: 'Previous track', glyph: '◀◀', press: () => a().previousStation() },
    { id: 'next', col: 1, row: 1, label: 'Next track', glyph: '▶▶', press: () => a().nextStation() },
    {
      id: 'mute',
      col: 0,
      row: 2,
      label: 'Mute',
      glyph: 'MUTE',
      press: () => a().toggleMute(),
      lit: () => a().muted,
    },
    {
      id: 'lights',
      col: 1,
      row: 2,
      label: 'Headlights',
      glyph: 'LAMP',
      press: () => v().toggleHeadlights(),
      lit: () => v().headlights,
    },
  ]
}

/** A pad of six switches, laid into a spoke. */
export function WheelPad({
  side,
  radius,
  buttons,
  accent,
}: {
  side: -1 | 1
  radius: number
  buttons: WheelButtonSpec[]
  accent: string
}) {
  const padW = radius * 0.62
  const padH = 0.072
  const keyW = padW / 2 - 0.008
  const keyH = padH / 3 - 0.005

  return (
    <group position={[side * radius * 0.56, 0, 0.014]}>
      <RoundedBox args={[padW, padH, 0.012]} radius={0.005} smoothness={3}>
        <meshStandardMaterial color="#22242a" roughness={0.55} metalness={0.12} />
      </RoundedBox>
      {buttons.map((b) => (
        <WheelKey
          key={b.id}
          spec={b}
          accent={accent}
          width={keyW}
          height={keyH}
          x={(b.col - 0.5) * (padW / 2)}
          y={(1 - b.row) * (padH / 3)}
        />
      ))}
    </group>
  )
}

function WheelKey({
  spec,
  accent,
  width,
  height,
  x,
  y,
}: {
  spec: WheelButtonSpec
  accent: string
  width: number
  height: number
  x: number
  y: number
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  // Reading the lit flag on every render is cheap here: these repaint only when
  // hover or press changes, and the store push re-renders the tree anyway.
  const lit = spec.lit?.() ?? false

  return (
    <group position={[x, y, 0.008]}>
      <RoundedBox
        args={[width, height, 0.008]}
        radius={0.003}
        smoothness={3}
        position={[0, 0, pressed ? -0.0025 : 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          setPressed(false)
          document.body.style.cursor = ''
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          setPressed(true)
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          setPressed(false)
          // A pointerup that ended a camera pan is not a press.
          if (gesture.didDrag) return
          spec.press()
        }}
      >
        <meshStandardMaterial
          color={lit ? accent : hovered ? '#3b3f47' : '#2c2f36'}
          emissive={lit ? accent : '#000000'}
          emissiveIntensity={lit ? 0.5 : 0}
          roughness={0.5}
          metalness={0.1}
        />
      </RoundedBox>
      {/* Legend on the cap. Illegible at driving distance by design. */}
      <mesh position={[0, 0, pressed ? 0.0025 : 0.005]} raycast={() => null}>
        <planeGeometry args={[width * 0.86, height * 0.7]} />
        <meshBasicMaterial map={keyLegend(spec.glyph, lit ? '#0d1013' : '#c9ced6')} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}
