import { defineImprovement } from '@/controllers/fidelity';

/**
 * The login scene's six chandeliers burn, with their light. Classic: cold, as
 * `GMEmpireGuardian4::RenderObjectVisual` case 157 returns early on World74/75
 * (GMEmpireGuardian4.cpp:1050-1053). Read in `versions/shared/maps/loginscene/create.ts`.
 */
export default defineImprovement({
  id: 'loginChandeliers',
  preset: 'enhanced',
  labelKey: 'fidelity.loginChandeliers',
  hintKey: 'fidelity.loginChandeliers.hint',
});
