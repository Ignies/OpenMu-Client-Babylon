import { defineMonster } from '@/controllers/monsters';
import { napinFires } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 558,
  Name: 'Ice Napin',
  maxHealth: 230000,
  // MODEL_ICE_NAPIN (GMSwampOfQuiet.cpp:1147-1188); its attack strike is not here yet.
  bodyFx: napinFires([1, 1, 1], [0.25, 0.6, 0.7]),
  model: { type: 202, scale: 1.1 },
});
