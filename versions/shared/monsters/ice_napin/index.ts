import { defineMonster } from '@/controllers/monsters';
import { napinFires, swampStrike } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 558,
  Name: 'Ice Napin',
  maxHealth: 230000,
  // MODEL_ICE_NAPIN (GMSwampOfQuiet.cpp:1147-1188) and its attack strike (:583-618).
  bodyFx: [...napinFires([1, 1, 1], [0.25, 0.6, 0.7]), ...swampStrike([0.25, 0.6, 0.7])],
  model: { type: 202, scale: 1.1 },
});
