import { Html } from '@react-three/drei'
import { RoundedBox } from '@react-three/drei'
import type { ReactNode } from 'react'

/**
 * A display surface inside the cabin.
 *
 * The screens are real DOM, positioned in 3D by drei's CSS3D transform, rather
 * than UI painted into a texture. That is the trade this project makes
 * deliberately: a canvas texture would composite more correctly, but every
 * button would then need manual raycast hit-testing, and the infotainment stack
 * is the part an interviewer will actually click on. Real DOM keeps it
 * accessible, focusable, and cheap to iterate.
 *
 * Sizing: drei maps 1 world unit to `400 / distanceFactor` pixels, so the
 * factor below converts a panel's design resolution into its physical size.
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
  occlude?: boolean
  children: ReactNode
}

export function ScreenPanel({ position, rotation = [0, 0, 0], size, resolution, bezel = 0.012, occlude = false, children }: ScreenPanelProps) {
  const [w, h] = size

  return (
    <group position={position} rotation={rotation}>
      {/* Bezel and housing, so the panel reads as a component set into the dash
          rather than a glowing rectangle floating on it. */}
      <RoundedBox args={[w + bezel * 2, h + bezel * 2, 0.014]} radius={0.006} smoothness={3} position={[0, 0, -0.009]}>
        <meshStandardMaterial color="#0a0b0e" roughness={0.45} metalness={0.25} />
      </RoundedBox>

      {/* Glass: black, slightly glossy, sitting just behind the DOM so the
          panel still looks like a screen when the HTML is occluded. */}
      <mesh position={[0, 0, -0.0005]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#05060a" roughness={0.16} metalness={0.1} />
      </mesh>

      <Html
        transform
        distanceFactor={htmlDistanceFactor(w, resolution[0])}
        position={[0, 0, 0.001]}
        occlude={occlude ? 'blending' : false}
        style={{ width: `${resolution[0]}px`, height: `${resolution[1]}px` }}
        zIndexRange={[10, 0]}
      >
        {children}
      </Html>
    </group>
  )
}
