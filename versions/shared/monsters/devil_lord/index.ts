import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 511,
  Name: 'Galia',
  maxHealth: 1100000,
  // Gallia's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(145)],
  model: { type: 171, scale: 1.35 },
});
