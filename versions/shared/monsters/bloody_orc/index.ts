import { defineMonster } from '@/controllers/monsters';
import { ORC_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 549,
  Name: 'Bloody Orc',
  maxHealth: 117000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: ORC_BLURS,
  model: { type: 193, scale: 1.35 },
});
