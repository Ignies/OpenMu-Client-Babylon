import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 509,
  Name: 'Vermont',
  maxHealth: 1300000,
  // Bermont's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(53)],
  model: { type: 169, scale: 1.3 },
});
