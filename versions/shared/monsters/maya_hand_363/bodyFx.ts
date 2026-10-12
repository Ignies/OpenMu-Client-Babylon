import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, spot as finger, trail } from '../_shared/bodyFx';

const ALIVE = { alive: true } as const;

/**
 * MODEL_MAYA_HAND_RIGHT: the SubType 28-31 and 33 ribbons (the flare sheet, white) on MoveEye(5, 20, 31,
 * 42, 53)'s bones (GM_Kanturu_3rd.cpp:745-781, :1154) and the red finger cards (:1156-1220), none once it
 * dies (:1151). Not here yet: the die and Stop2 effects of the Move visual (:909-937).
 */
export const RIGHT_HAND_FX: MonsterBodyFx = [
  ...[20, 5, 42, 31, 53].map(bone => trail(bone, 15, 8, [1, 1, 1], { ribbon: 'flare', gate: ALIVE })),
  cards(
    [0.5, 0.3, 0.3],
    [
      finger(59, 'flareRed', 1.5, [-2, 0, 4]),
      finger(59, 'flareRed', 0.7, [-10, -3, 3]),
      finger(48, 'flareRed', 1.5, [-1, -2, 4]),
      finger(48, 'flareRed', 0.7, [-10, -3, 5]),
      finger(11, 'flareRed', 1.3, [0, 0, 4]),
      finger(11, 'flareRed', 0.7, [-10, 0, 4]),
      finger(37, 'flareRed', 1.3, [0, 0, 4]),
      finger(37, 'flareRed', 0.7, [-10, 1, 4]),
      finger(26, 'flareRed', 1.3, [6, 3, 3]),
      finger(26, 'flareRed', 0.7, [-5, 10, 5]),
      finger(54, 'flareRed', 1, [0, 0, -5]),
      finger(43, 'flareRed', 1, [0, 0, -2]),
      finger(32, 'flareRed', 1, [0, 0, -5]),
      finger(6, 'flareRed', 1, [0, 0, -5]),
      finger(21, 'flareRed', 1, [10, -4, 0]),
    ],
    { gate: ALIVE }
  ),
];
