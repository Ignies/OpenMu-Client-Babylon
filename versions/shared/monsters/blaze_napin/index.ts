import { defineMonster } from '@/controllers/monsters';
import { napinFires } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 449,
  Name: 'Blaze Napin',
  maxHealth: 70000,
  // MODEL_BLAZE_NAPIN (GMSwampOfQuiet.cpp:1002-1043); its attack strike is not here yet.
  bodyFx: napinFires([1, 0.2, 0], [1, 1, 1]),
  model: { type: 144, scale: 0.95 },
});
