import { useMemo } from 'react'
import type { Texture } from 'three'
import type { CarTheme } from '../../cars/carTypes'
import { leatherGrain, perforation, wovenBump, wovenFabric } from './textures'

/**
 * The cabin's material vocabulary.
 *
 * Every surface in the Explorer interior is one of eight treatments. Naming them
 * once and spreading them onto meshes keeps a trim change to a data edit, and
 * stops the geometry files from quietly inventing a ninth shade of grey.
 *
 * ## Texture is what stops this reading as CAD
 *
 * The roughness numbers matter, but the maps matter more. A car interior is
 * overwhelmingly matte — dashboards are deliberately non-reflective so they do
 * not throw an image into the windscreen — and a flat matte plane under soft
 * studio light contains no information at all. Every large surface therefore
 * carries a bump map:
 *
 * - **Padded surfaces** get leather grain. Not so you can see the grain, but so
 *   the specular response varies across the panel and the eye has something to
 *   land on.
 * - **The pale panels are woven textile**, not painted plastic. In the reference
 *   you can read the weave on the passenger dash and the door cards. Rendering
 *   them flat is the main reason an early pass looked moulded, and no amount of
 *   colour correction fixes it — the missing information is texture, not hue.
 * - **Seat centres are perforated.** The bolsters are not.
 *
 * The only surfaces left smooth are the brightwork and the screens, which is
 * exactly the contrast a real cabin has.
 */

export interface SurfaceProps {
  color: string
  roughness: number
  metalness: number
  map?: Texture
  bumpMap?: Texture
  bumpScale?: number
  roughnessMap?: Texture
}

export interface CabinMaterials {
  /** Upper dash, door uppers, pillars: dark padded, grained, near-zero specular. */
  dashUpper: SurfaceProps
  /** The pale woven-textile insert panels. */
  textile: SurfaceProps
  /** Brightwork: trim strips, handles, vent blades, shifter ring. */
  trim: SurfaceProps
  /** Gloss black: screen surrounds, piano-black switch panels. */
  gloss: SurfaceProps
  /** Seat bolsters: grained, unperforated. */
  fabric: SurfaceProps
  /** Seat centre panels: perforated. */
  fabricPerforated: SurfaceProps
  /** Carpet and footwells. Fully matte, no highlight at all. */
  carpet: SurfaceProps
  headliner: SurfaceProps
  /** Switch bodies and vent housings. */
  switchgear: SurfaceProps
}

export function useCabinMaterials(theme: CarTheme): CabinMaterials {
  return useMemo(() => {
    const grainFine = leatherGrain(4)
    const grainCoarse = leatherGrain(2)
    const weave = wovenFabric(theme.dashLower)
    const weaveBump = wovenBump()

    return {
      dashUpper: {
        color: theme.dashUpper,
        roughness: 0.9,
        metalness: 0.02,
        bumpMap: grainFine,
        bumpScale: 0.0022,
        roughnessMap: grainFine,
      },
      textile: {
        color: '#ffffff',
        roughness: 0.86,
        metalness: 0,
        map: weave,
        bumpMap: weaveBump,
        bumpScale: 0.0007,
      },
      // Satin, not chrome: a tight highlight that still shows its own colour.
      trim: { color: theme.trim, roughness: 0.42, metalness: 0.6 },
      gloss: { color: '#0b0c0e', roughness: 0.12, metalness: 0.35 },
      fabric: {
        color: theme.upholstery,
        roughness: 0.94,
        metalness: 0,
        bumpMap: grainCoarse,
        bumpScale: 0.0026,
        roughnessMap: grainCoarse,
      },
      fabricPerforated: {
        color: '#ffffff',
        roughness: 0.95,
        metalness: 0,
        map: perforation(theme.upholstery),
        bumpMap: grainCoarse,
        bumpScale: 0.0022,
      },
      carpet: { color: theme.carpet, roughness: 1, metalness: 0, bumpMap: grainCoarse, bumpScale: 0.004 },
      headliner: { color: theme.headliner, roughness: 1, metalness: 0, bumpMap: grainFine, bumpScale: 0.0012 },
      switchgear: { color: '#1b1c20', roughness: 0.58, metalness: 0.1 },
    }
  }, [theme])
}
