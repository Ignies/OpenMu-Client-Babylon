import { defineImprovement } from '@/controllers/fidelity';

/**
 * The hero's plain attack sends its hit request when the blow lands (the clip's hit key), so the
 * damage number and the swing match. Classic: `SendHitRequest` on the click
 * (ZzzInterface.cpp:3355). Read in `ecs/systems/attackSystem.ts` and `modules/combat/net.ts`.
 */
export default defineImprovement({
  id: 'heldHitRequest',
  preset: 'enhanced',
  labelKey: 'fidelity.heldHitRequest',
  hintKey: 'fidelity.heldHitRequest.hint',
});
