import { defineMonster } from '@/controllers/monsters';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 510,
  Name: 'Kato',
  maxHealth: 1400000,
  // Kato's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(127)],
  model: { type: 170, scale: 1.35 },
});
