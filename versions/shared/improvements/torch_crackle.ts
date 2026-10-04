import { defineImprovement } from '@/controllers/fidelity';

/**
 * A looping fire sound under the nearest burning torches. Classic: silent, the original has no
 * `SOUND_FIRE` and `CreateFire` plays nothing. Read in `controllers/sound/crackle.ts`.
 */
export default defineImprovement({
  id: 'torchCrackle',
  preset: 'enhanced',
  labelKey: 'fidelity.torchCrackle',
  hintKey: 'fidelity.torchCrackle.hint',
});
