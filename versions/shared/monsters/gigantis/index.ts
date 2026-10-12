import { defineMonster } from '@/controllers/monsters';
import { GIGANTIS_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 356,
  Name: 'Gigantis',
  maxHealth: 43000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: GIGANTIS_BLURS,
  model: { type: 112, scale: 1.2 },
});
