import { defineImprovement } from '@/controllers/fidelity';

/**
 * On a world whose server.json offers login tokens (our OpenMU plugin), "remember" keeps a token instead of the
 * password and the next login sends it. Classic: the password is typed each time, as in the original.
 * Read in `modules/session/state.ts` (`keepsLoginTokens`).
 */
export default defineImprovement({
  id: 'loginTokens',
  preset: 'enhanced',
  labelKey: 'fidelity.loginTokens',
  hintKey: 'fidelity.loginTokens.hint',
});
