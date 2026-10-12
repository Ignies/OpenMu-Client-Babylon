import { defineMonster } from '@/controllers/monsters';
import { BLADE_HUNTER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 354,
  Name: 'Blade Hunter',
  maxHealth: 32000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: BLADE_HUNTER_BLURS,
  model: { type: 110, scale: 1.3 },
});
