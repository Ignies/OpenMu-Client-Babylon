import { defineImprovement } from '@/controllers/fidelity';

/**
 * A plain attack whose clip is quicker than the time between swings plays the rest of it slower
 * after the blow, so it ends as the next swing may start instead of standing still in between. The
 * blow and the hit request keep their time. Classic: the clip plays at the attack speed's rate
 * (`SetAttackSpeed`, ZzzCharacter.cpp:812) and the hero stands until the next swing. Read in
 * `src/ecs/systems/attackSystem.ts`; `animationSystem.ts` applies it.
 */
export default defineImprovement({
  id: 'swingFill',
  preset: 'enhanced',
  labelKey: 'fidelity.swingFill',
  hintKey: 'fidelity.swingFill.hint',
});
