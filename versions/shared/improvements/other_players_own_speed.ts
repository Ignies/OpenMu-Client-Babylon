import { defineImprovement } from '@/controllers/fidelity';

/**
 * Other players swing and cast at their own attack / magic speed from the extended scope packet.
 * Classic: every player body plays at the hero's speeds, one `MODEL_PLAYER` table
 * (`SetAttackSpeed`, ZzzCharacter.cpp:812-1028). Read in `ecs/systems/animationSystem.ts`.
 */
export default defineImprovement({
  id: 'otherPlayersOwnSpeed',
  preset: 'enhanced',
  labelKey: 'fidelity.otherPlayersOwnSpeed',
  hintKey: 'fidelity.otherPlayersOwnSpeed.hint',
});
