import { defineMonster } from '@/controllers/monsters';
import { BERSERKER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 553,
  Name: 'Berserker Warrior',
  maxHealth: 184370,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: BERSERKER_BLURS,
  model: { type: 197, scale: 1.15 },
});
