import { defineMonster } from '@/controllers/monsters';
import { BERSERKER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 350,
  Name: 'Berserker',
  maxHealth: 44370,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: BERSERKER_BLURS,
  model: { type: 106, scale: 0.95 },
});
