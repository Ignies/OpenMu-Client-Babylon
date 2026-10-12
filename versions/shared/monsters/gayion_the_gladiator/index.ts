import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 504,
  Name: 'Gaion Kharein',
  maxHealth: 1800000,
  // Gaion's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(72)],
  model: { type: 164, scale: 1.4 },
});
