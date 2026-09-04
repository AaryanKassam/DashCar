import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { ExplorerCabin } from './explorer/ExplorerCabin'
import { ExplorerBody } from './exterior/ExplorerBody'
import { WindshieldView } from './WindshieldView'
import { SceneLighting } from './SceneLighting'
import { CameraRig } from './camera'
import { HazardActors } from './HazardActors'
import { ScreenPanel } from './ScreenPanel'
import { DashboardCluster } from '../cluster/DashboardCluster'
import { InfotainmentScreen } from '../infotainment/InfotainmentScreen'
import { useCar } from '../cars/garageStore'
import { EXPLORER_BODY, EXPLORER_COCKPIT } from '../cars/explorer/cockpit'
import { ContactShadows } from '@react-three/drei'

/**
 * The scene.
 *
 * Assembly order mirrors how you would think about a real cabin: the world
 * outside, the light in it, the structure you sit in, then the displays set into
 * that structure. The camera rig goes first because everything else is framed
 * by it.
 *
 * `near` is deliberately tiny. The nodal camera sits between the seats, and the
 * console and seat bolsters are only centimetres away — a conventional 0.1 m
 * near plane slices straight through them.
 */
export function CockpitScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 75, near: 0.02, far: 1200, position: EXPLORER_COCKPIT.eyePoint }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.86 }}
    >
      <Suspense fallback={null}>
        <CameraRig />
        <SceneLighting />
        <WindshieldView />
        <HazardActors />
        <ExplorerCabin />
        <ExplorerBody />
        {/* The car has to sit on the studio floor rather than hover over it.
            A contact shadow is the cheapest honest way to put it there. */}
        <ContactShadows
          position={[0, 0.01, (EXPLORER_BODY.frontBumperZ + EXPLORER_BODY.rearBumperZ) / 2]}
          scale={9}
          resolution={1024}
          blur={2.4}
          opacity={0.5}
          far={2.2}
          frames={1}
        />
        <Displays />
      </Suspense>
    </Canvas>
  )
}

function Displays() {
  const g = useCar().cockpit

  return (
    <>
      <ScreenPanel
        position={g.clusterPosition}
        rotation={[g.clusterAim[0], g.clusterAim[1], 0]}
        size={g.clusterSize}
        resolution={[1080, 405]}
        bezel={0.01}
        focusPose="clusterFocus"
        label="Focus the instrument cluster"
      >
        <DashboardCluster />
      </ScreenPanel>

      <ScreenPanel
        position={g.screenPosition}
        rotation={[g.screenAim[0], g.screenAim[1], 0]}
        size={g.screenSize}
        resolution={[1400, 840]}
        bezel={0.008}
        focusPose="infotainmentFocus"
        label="Focus the centre touchscreen"
      >
        <InfotainmentScreen />
      </ScreenPanel>
    </>
  )
}
