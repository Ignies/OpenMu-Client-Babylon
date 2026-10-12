import { defineMonster } from '@/controllers/monsters';
import { GENOCIDER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 357,
  Name: 'Genocider',
  maxHealth: 48500,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: GENOCIDER_BLURS,
  model: { type: 113, scale: 1.2 },
});
