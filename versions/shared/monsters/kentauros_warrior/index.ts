import { defineMonster } from '@/controllers/monsters';
import { GIGANTIS_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 554,
  Name: 'Kentauros Warrior',
  maxHealth: 198500,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: GIGANTIS_BLURS,
  model: { type: 198, scale: 1.3 },
});
