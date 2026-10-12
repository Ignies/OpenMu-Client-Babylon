import { defineMonster } from '@/controllers/monsters';
import { TWIN_TAIL_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 359,
  Name: 'Twin Tale',
  maxHealth: 87500,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: TWIN_TAIL_BLURS,
  model: { type: 115, scale: 1.3 },
});
