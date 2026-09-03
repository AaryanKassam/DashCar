import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three'
import { Cockpit } from './Cockpit'
import { SteeringWheel } from './SteeringWheel'
import { WindshieldView } from './WindshieldView'
import { SceneLighting } from './SceneLighting'
import { CameraRig } from './CameraRig'
import { HazardActors } from './HazardActors'
import { ScreenPanel } from './ScreenPanel'
import { DashboardCluster } from '../cluster/DashboardCluster'
import { InfotainmentScreen } from '../infotainment/InfotainmentScreen'
import { useCar } from '../cars/garageStore'

/**
 * The cockpit scene.
 *
 * Order of assembly mirrors how you would think about a real cabin: the world
 * outside, the light in it, the structure you sit in, then the displays set
 * into that structure.
 */
export function CockpitScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 62, near: 0.04, far: 1200, position: [-0.06, 1.2, 0] }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
      shadows={{ type: PCFSoftShadowMap }}
    >
      <Suspense fallback={null}>
        <CameraRig />
        <SceneLighting />
        <WindshieldView />
        <HazardActors />
        <Cockpit />
        <SteeringWheel />
        <Displays />
      </Suspense>
    </Canvas>
  )
}

function Displays() {
  const car = useCar()
  const g = car.cockpit

  return (
    <>
      {/* Instrument cluster, angled up toward the driver's eye point. */}
      <ScreenPanel
        position={g.clusterPosition}
        rotation={[g.clusterAim[0], g.clusterAim[1], 0]}
        size={g.clusterSize}
        resolution={[960, 400]}
        bezel={0.014}
      >
        <DashboardCluster />
      </ScreenPanel>

      {/* Centre touchscreen. Angled toward the driver, as production centre
          stacks are — a few degrees of yaw measurably cuts glance time. */}
      <ScreenPanel
        position={g.screenPosition}
        rotation={[g.screenAim[0], g.screenAim[1], 0]}
        size={g.screenSize}
        resolution={[1100, 700]}
      >
        <InfotainmentScreen />
      </ScreenPanel>
    </>
  )
}
