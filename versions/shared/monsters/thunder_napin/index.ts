import { defineMonster } from '@/controllers/monsters';
import { cards, spotsOn } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 447,
  Name: 'Thunder Napin',
  maxHealth: 42000,
  // MODEL_NAPIN (GMSwampOfQuiet.cpp:971-981); its BITMAP_LIGHTNING_MEGA sparks and Attack2 strike are not here yet.
  bodyFx: [cards([0.1, 0.2, 1], spotsOn([7, 4, 5, 10, 22, 11, 23, 12, 24, 34, 39], 'light', 2.2))],
  model: { type: 142, scale: 0.95 },
});
