import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import type { SurfaceProps } from './materials'

/**
 * The instrument panel as one swept form.
 *
 * A dashboard is not a stack of boxes. It is a single surface whose
 * cross-section rolls from the cowl, over the crown, down the driver-facing
 * face, under the shelf and back toward the bulkhead — and that continuity is
 * most of what the eye uses to tell a moulded interior from an assembly of
 * parts. Rounded boxes give the right silhouette from one angle and fall apart
 * the moment the camera moves, which is exactly what this project lets a viewer
 * do.
 *
 * So: define the cross-section once, extrude it across the cabin, and let the
 * bevel round the edges.
 *
 * ## Orientation
 *
 * A `Shape` lives in XY and extrudes along +Z, but this profile is drawn in the
 * car's Z-Y plane and needs to sweep along X. `rotateY(-PI/2)` maps
 * `(x, y, z) -> (-z, y, x)`, which puts the profile's x (depth) onto world z
 * with the right sign and the extrusion axis onto world x. Using `+PI/2`
 * instead mirrors the depth axis and lands the whole dashboard behind the
 * driver, which is not a subtle failure but is an easy one to write.
 */
export function DashProfile({
  cowlZ,
  fasciaZ,
  dashTopY,
  trimY,
  width,
  material,
}: {
  cowlZ: number
  fasciaZ: number
  dashTopY: number
  trimY: number
  width: number
  material: SurfaceProps
}) {
  const geometry = useMemo(() => {
    // Cross-section, walked as a closed loop. u is depth (world z, negative is
    // forward), v is height (world y). Straight segments with a generous bevel:
    // a spline through these points is prettier on paper and self-intersects at
    // the tight roll-over, which produces holes in the surface.
    const profile: [number, number][] = [
      // Along the top, cowl to crown.
      [cowlZ, dashTopY - 0.05],
      [cowlZ + 0.06, dashTopY - 0.01],
      [cowlZ + 0.24, dashTopY + 0.012],
      [fasciaZ - 0.16, dashTopY + 0.008],
      [fasciaZ - 0.05, dashTopY - 0.012],
      // Roll over the crown onto the face the driver looks at.
      [fasciaZ - 0.005, dashTopY - 0.05],
      [fasciaZ + 0.012, dashTopY - 0.09],
      [fasciaZ + 0.016, trimY + 0.015],
      // Step back under the trim line to form the switch shelf.
      [fasciaZ - 0.03, trimY - 0.015],
      [fasciaZ - 0.012, trimY - 0.12],
      [fasciaZ + 0.004, trimY - 0.175],
      // Tuck under toward the knee bolster and return along the underside.
      [fasciaZ - 0.07, trimY - 0.235],
      [fasciaZ - 0.24, trimY - 0.25],
      [cowlZ + 0.1, trimY - 0.16],
      [cowlZ, dashTopY - 0.19],
    ]

    const shape = new Shape()
    shape.moveTo(profile[0][0], profile[0][1])
    for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1])
    shape.closePath()

    const geo = new ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 4,
      curveSegments: 8,
    })

    geo.rotateY(-Math.PI / 2)
    geo.translate(width / 2, 0, 0)
    geo.computeVertexNormals()
    return geo
  }, [cowlZ, fasciaZ, dashTopY, trimY, width])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...material} />
    </mesh>
  )
}
