import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 505,
  Name: 'Jerint',
  maxHealth: 1000000,
  // Jerint's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(103)],
  model: { type: 165, scale: 1.45 },
});
