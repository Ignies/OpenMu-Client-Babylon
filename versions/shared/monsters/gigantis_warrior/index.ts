import { defineMonster } from '@/controllers/monsters';
import { GENOCIDER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 555,
  Name: 'Gigantis Warrior',
  maxHealth: 203000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: GENOCIDER_BLURS,
  model: { type: 199, scale: 1.5 },
});
