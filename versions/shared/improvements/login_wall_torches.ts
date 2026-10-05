import { defineImprovement } from '@/controllers/fidelity';

/**
 * The login scene's wall torches burn, with fire particles, a warm flare and a light on the ground.
 * Classic: the grey flare alone, as `GMEmpireGuardian4::RenderObjectVisual` case 37 draws it
 * (GMEmpireGuardian4.cpp:864-875). Read in `versions/shared/maps/loginscene/wallTorchObject.ts`.
 */
export default defineImprovement({
  id: 'loginWallTorches',
  preset: 'enhanced',
  labelKey: 'fidelity.loginWallTorches',
  hintKey: 'fidelity.loginWallTorches.hint',
});
