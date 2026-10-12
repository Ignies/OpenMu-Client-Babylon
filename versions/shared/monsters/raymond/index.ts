import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 506,
  Name: 'Raymond',
  maxHealth: 1600000,
  // Raymond's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(61)],
  model: { type: 166, scale: 1.45 },
});
