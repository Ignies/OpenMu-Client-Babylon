import { defineImprovement } from '@/controllers/fidelity';

/**
 * Start / Stop and Settings buttons for the MU Helper on the HUD, under the event timers.
 * Classic: only the Home and End keys and the helper's own panel buttons.
 * Read in `ui/hud/mu_helper_buttons`.
 */
export default defineImprovement({
  id: 'muHelperButtons',
  preset: 'enhanced',
  labelKey: 'fidelity.muHelperButtons',
  hintKey: 'fidelity.muHelperButtons.hint',
});
