import { defineImprovement } from '@/controllers/fidelity';

/**
 * The camera's zoom, turn and tilt carry over a warp, and a Reset camera button shows once the view
 * is off the map's opening frame. Classic: a world change resets the camera level (WSclient.cpp:600)
 * and the view with it. Read in `src/controllers/camera/index.ts`; the button is the
 * `camera_reset` HUD element.
 */
export default defineImprovement({
  id: 'cameraKeepsView',
  preset: 'enhanced',
  labelKey: 'fidelity.cameraKeepsView',
  hintKey: 'fidelity.cameraKeepsView.hint',
});
