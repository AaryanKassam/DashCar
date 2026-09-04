import { Html, RoundedBox } from '@react-three/drei'
import type { ReactNode } from 'react'
import { useViewStore } from '../state/viewStore'
import { gesture } from './camera'
import type { PoseId } from './camera'

/**
 * A display surface inside the cabin.
 *
 * The screens are real DOM, positioned in 3D by drei's CSS3D transform, rather
 * than UI painted into a texture. A canvas texture would composite more
 * correctly, but every button would then need manual raycast hit-testing, and
 * the infotainment stack is the part a reviewer actually clicks on. Real DOM
 * keeps it accessible, focusable and cheap to iterate.
 *
 * Sizing: drei maps one world unit to `400 / distanceFactor` pixels, so the
 * factor below converts a panel's design resolution into its physical size.
 *
 * ## Why the shield exists
 *
 * A panel that is always live can never be *clicked to zoom into* — the DOM
 * swallows the first tap and the camera never moves. So until the panel is
 * focused it wears a transparent shield that intercepts the click and asks the
 * camera to come closer. Once focused, the shield lifts and the screen behaves
 * like a screen. This is the same "look, then act" progression a driver makes,
 * and it means a glance never triggers an action.
 */

export function htmlDistanceFactor(widthMetres: number, widthPx: number) {
  return (widthMetres * 400) / widthPx
}

interface ScreenPanelProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  /** Physical size of the glass, metres. */
  size: [number, number]
  /** Design resolution of the DOM inside. */
  resolution: [number, number]
  bezel?: number
  /** The camera pose this panel focuses to when tapped. */
  focusPose?: Extract<PoseId, 'infotainmentFocus' | 'clusterFocus'>
  /** Accessible name for the shield's button. */
  label?: string
  children: ReactNode
}

export function ScreenPanel({
  position,
  rotation = [0, 0, 0],
  size,
  resolution,
  bezel = 0.012,
  focusPose,
  label,
  children,
}: ScreenPanelProps) {
  const [w, h] = size
  const activePose = useViewStore((s) => s.pose)
  const focus = useViewStore((s) => s.focus)
  const shielded = focusPose !== undefined && activePose !== focusPose

  return (
    <group position={position} rotation={rotation}>
      {/* Bezel and housing, so the panel reads as a component set into the dash
          rather than a glowing rectangle floating on it. */}
      <RoundedBox args={[w + bezel * 2, h + bezel * 2, 0.016]} radius={0.006} smoothness={3} position={[0, 0, -0.01]}>
        <meshStandardMaterial color="#0a0b0e" roughness={0.42} metalness={0.3} />
      </RoundedBox>

      {/* Glass behind the DOM, so the panel still looks like a screen if the
          HTML layer is occluded or slow to paint. */}
      <mesh position={[0, 0, -0.0005]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#05060a" roughness={0.12} metalness={0.1} />
      </mesh>

      <Html
        transform
        distanceFactor={htmlDistanceFactor(w, resolution[0])}
        position={[0, 0, 0.001]}
        occlude={false}
        style={{ width: `${resolution[0]}px`, height: `${resolution[1]}px` }}
        zIndexRange={[10, 0]}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {children}
          {shielded && (
            <button
              type="button"
              aria-label={label ?? 'Focus this display'}
              onClick={(e) => {
                e.stopPropagation()
                // A pointerup that ended a pan is not a tap.
                if (gesture.didDrag) return
                focus(focusPose)
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'zoom-in',
              }}
            />
          )}
        </div>
      </Html>
    </group>
  )
}
