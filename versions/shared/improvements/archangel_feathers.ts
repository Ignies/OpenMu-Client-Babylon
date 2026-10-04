import { defineImprovement } from '@/controllers/fidelity';

/**
 * The Blood Castle archangels shed feathers and their halo is wider, a tile ahead, and stops at
 * walls. Classic: no feathers, the 2.7-tile halo centred on the NPC (ZzzCharacter.cpp:8695-8708).
 * Read in `versions/shared/monsters/_archangels/model.ts`.
 */
export default defineImprovement({
  id: 'archangelFeathers',
  preset: 'enhanced',
  labelKey: 'fidelity.archangelFeathers',
  hintKey: 'fidelity.archangelFeathers.hint',
});
