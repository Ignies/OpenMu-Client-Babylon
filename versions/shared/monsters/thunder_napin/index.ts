import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { cards, napinStrike, spotsOn } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 447,
  Name: 'Thunder Napin',
  maxHealth: 42000,
  // MODEL_NAPIN (GMSwampOfQuiet.cpp:971-981) and its Attack2 strike 250 cm ahead (:427-460); its BITMAP_LIGHTNING_MEGA
  // sparks are not here yet.
  bodyFx: [
    cards([0.1, 0.2, 1], spotsOn([7, 4, 5, 10, 22, 11, 23, 12, 24, 34, 39], 'light', 2.2)),
    ...napinStrike([A.Attack2], 7.2, 250, [1, 1, 1], 'shockWave11', 2, [0.3, 0.2, 1]),
  ],
  model: { type: 142, scale: 0.95 },
});
