import { defineMonster } from '@/controllers/monsters';
import { DEATH_RIDER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 550,
  Name: 'Bloody Death Rider',
  maxHealth: 88000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: DEATH_RIDER_BLURS,
  model: { type: 194, scale: 1.2 },
});
