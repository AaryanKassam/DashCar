import { create } from 'zustand'
import type { PoseId } from '../scene/camera/rig'

/** Poses a viewer can enter by clicking something in the cabin. */
export type FocusablePose = Extract<PoseId, 'infotainmentFocus' | 'clusterFocus' | 'wheelFocus'>

/**
 * What the viewer is looking at.
 *
 * Deliberately separate from `vehicleStore`. Where the camera is pointing is not
 * a vehicle signal — a real car has no idea you are looking at the door card —
 * and mixing the two would make the camera a writer on the bus. The rig reads
 * vehicle state; nothing about the view ever flows back.
 */

export type ViewMode = 'interior' | 'exterior'

interface ViewState {
  mode: ViewMode
  pose: PoseId
  /** Where a focus view came from, so backing out returns you there. */
  returnPose: PoseId | null
  /** True while a panel is focused and interactive. */
  focused: boolean

  setMode: (mode: ViewMode) => void
  focus: (pose: FocusablePose) => void
  back: () => void
  /** The driving loop nudges the camera between resting and driving poses. */
  setDriving: (driving: boolean) => void
}

export const useViewStore = create<ViewState>((set, get) => ({
  mode: 'interior',
  pose: 'interiorDefault',
  returnPose: null,
  focused: false,

  setMode: (mode) =>
    set({
      mode,
      pose: mode === 'exterior' ? 'exteriorTurntable' : 'interiorDefault',
      returnPose: null,
      focused: false,
    }),

  focus: (pose) => {
    const { pose: current, focused } = get()
    if (focused && current === pose) return
    set({ pose, returnPose: focused ? get().returnPose : current, focused: true })
  },

  back: () => {
    const { returnPose, focused } = get()
    if (!focused) return
    set({ pose: returnPose ?? 'interiorDefault', returnPose: null, focused: false })
  },

  setDriving: (driving) => {
    const { pose, focused, mode } = get()
    // Never pull the camera out of a focused panel or the exterior turntable —
    // those are places the viewer chose to be.
    if (focused || mode === 'exterior') return
    if (driving && pose === 'interiorDefault') set({ pose: 'driving' })
    else if (!driving && pose === 'driving') set({ pose: 'interiorDefault' })
  },
}))
