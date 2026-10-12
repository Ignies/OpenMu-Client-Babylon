import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, mayaHandMoves, spot as finger, trail } from '../_shared/bodyFx';

const ALIVE = { alive: true } as const;

/**
 * MODEL_MAYA_HAND_LEFT: the SubType 18-21 and 27 ribbons on MoveEye(5, 11, 17, 29, 23)'s bones
 * (GM_Kanturu_3rd.cpp:707-743, :1091) and the blue finger cards (:1093-1144), none once it dies
 * (:1088), and the die and Stop2 effects of the Move visual off bone 24 (:879-907).
 */
export const LEFT_HAND_FX: MonsterBodyFx = [
  ...[11, 5, 29, 17, 23].map(bone => trail(bone, 15, 8, [0.8, 0.5, 1], { gate: ALIVE })),
  cards(
    [0.5, 0.5, 0.8],
    [
      finger(7, 'flareBlue', 1.3),
      finger(7, 'flareBlue', 0.7, [-10, 0, 3]),
      finger(13, 'flareBlue', 1.3),
      finger(13, 'flareBlue', 0.7, [-12, 5, 0]),
      finger(19, 'flareBlue', 1.3),
      finger(19, 'flareBlue', 0.7, [-12, 5, 0]),
      finger(25, 'flareBlue', 1.3),
      finger(25, 'flareBlue', 0.7, [-10, 5, 0]),
      finger(31, 'flareBlue', 1.3),
      finger(31, 'flareBlue', 0.7, [-8, 9, 0]),
      ...[12, 18, 24, 30, 6].map(bone => finger(bone, 'flareBlue', 1)),
    ],
    { gate: ALIVE }
  ),
  ...mayaHandMoves(24, [0, -50, 0]),
];
