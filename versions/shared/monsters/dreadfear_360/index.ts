import { defineMonster } from '@/controllers/monsters';
import { DREADFEAR_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 360,
  Name: 'Dreadfear',
  maxHealth: 94000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: DREADFEAR_BLURS,
  model: { type: 116, scale: 1.3 },
});
