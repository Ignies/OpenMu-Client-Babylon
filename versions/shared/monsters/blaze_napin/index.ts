import { defineMonster } from '@/controllers/monsters';
import { napinFires, swampStrike } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 449,
  Name: 'Blaze Napin',
  maxHealth: 70000,
  // MODEL_BLAZE_NAPIN (GMSwampOfQuiet.cpp:1002-1043) and its attack strike (:501-531).
  bodyFx: [...napinFires([1, 0.2, 0], [1, 1, 1]), ...swampStrike([1, 1, 1])],
  model: { type: 144, scale: 0.95 },
});
