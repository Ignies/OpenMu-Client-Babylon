import { defineMonster } from '@/controllers/monsters';
import { SATYROS_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 353,
  Name: 'Satyros',
  maxHealth: 22000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: SATYROS_BLURS,
  model: { type: 109, scale: 1.3 },
});
