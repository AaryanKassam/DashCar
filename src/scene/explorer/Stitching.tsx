import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'

/**
 * A run of contrast stitching.
 *
 * Drawn as discrete instanced segments rather than a continuous strip, because a
 * continuous line of saturated colour across a dark dashboard does not read as
 * thread — it reads as a light bar, which is exactly what an earlier version of
 * this scene looked like. Individual stitches at a slight angle carry the cue at
 * a fraction of the visual weight.
 */
export function StitchRun({
  from,
  to,
  color,
  count = 44,
  size = 0.0024,
  rotation = [0, 0, 0],
}: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  count?: number
  size?: number
  rotation?: [number, number, number]
}) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1)
      dummy.position.set(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t,
      )
      dummy.rotation.set(rotation[0], rotation[1], rotation[2] + 0.42)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [from, to, count, rotation, dummy])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[size * 2.2, size, size]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
    </instancedMesh>
  )
}

/**
 * Stitching that follows a circular arc — the contrast thread on a wheel rim.
 *
 * Each stitch is laid tangent to the arc, which is what makes it read as thread
 * following a seam rather than as beads scattered on a circle.
 */
export function StitchArc({
  radius,
  from,
  to,
  color,
  count = 30,
  size = 0.0026,
  offset = 0,
}: {
  radius: number
  /** Arc bounds in radians, measured from the +x axis. */
  from: number
  to: number
  color: string
  count?: number
  size?: number
  /** Push the stitches out of the rim surface toward the viewer. */
  offset?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / Math.max(1, count - 1)
      dummy.position.set(Math.cos(a) * radius, Math.sin(a) * radius, offset)
      dummy.rotation.set(0, 0, a + Math.PI / 2)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [radius, from, to, count, offset, dummy])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[size * 0.9, size * 2.4, size]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
    </instancedMesh>
  )
}
