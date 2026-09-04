import { useMemo } from 'react'
import type { CarTheme } from '../../cars/carTypes'

/**
 * The cabin's material vocabulary.
 *
 * Every surface in the Explorer interior is one of seven treatments. Naming them
 * once and spreading them onto meshes keeps a trim change to a data edit, and
 * stops the geometry files from quietly inventing a ninth shade of grey.
 *
 * The roughness values matter more than the colours. A car interior is
 * overwhelmingly matte — dashboards are deliberately non-reflective so they do
 * not throw an image into the windscreen — and the only surfaces with a tight
 * highlight are the brightwork and the screens. Getting that contrast right is
 * most of what makes a render read as an interior rather than as coloured
 * plastic.
 */

export interface SurfaceProps {
  color: string
  roughness: number
  metalness: number
}

export interface CabinMaterials {
  /** Upper dash, door uppers, pillars: dark padded, near-zero specular. */
  dashUpper: SurfaceProps
  /** Lower fascia, door lowers, console flanks: light greige, satin. */
  dashLower: SurfaceProps
  /** Brightwork: trim strips, handles, vent blades, shifter ring. */
  trim: SurfaceProps
  /** Gloss black: screen surrounds, piano-black switch panels. */
  gloss: SurfaceProps
  /** Seat facing. */
  fabric: SurfaceProps
  /** Carpet and footwells. Fully matte, no highlight at all. */
  carpet: SurfaceProps
  headliner: SurfaceProps
  /** Switch bodies and vent housings. */
  switchgear: SurfaceProps
}

export function useCabinMaterials(theme: CarTheme): CabinMaterials {
  return useMemo(
    () => ({
      dashUpper: { color: theme.dashUpper, roughness: 0.92, metalness: 0.02 },
      dashLower: { color: theme.dashLower, roughness: 0.68, metalness: 0.03 },
      // Satin, not chrome: a tight highlight that still shows its own colour.
      trim: { color: theme.trim, roughness: 0.44, metalness: 0.55 },
      gloss: { color: '#0b0c0e', roughness: 0.14, metalness: 0.35 },
      fabric: { color: theme.upholstery, roughness: 0.95, metalness: 0 },
      carpet: { color: theme.carpet, roughness: 1, metalness: 0 },
      headliner: { color: theme.headliner, roughness: 1, metalness: 0 },
      switchgear: { color: '#1b1c20', roughness: 0.6, metalness: 0.1 },
    }),
    [theme],
  )
}
