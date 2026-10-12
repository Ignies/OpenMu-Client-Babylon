import type { BodyCardSpot, MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { blur, cards, puff, trail } from '../_shared/bodyFx';

type Cm3 = readonly [number, number, number];

/** BITMAP_LIGHT and BITMAP_FLARE_BLUE at one registered bone, its offset on both. */
const pair = (bone: number, light: number, flare: number, local?: Cm3): BodyCardSpot[] =>
  local
    ? [
        { bone, card: 'light', scale: light, local },
        { bone, card: 'flareBlue', scale: flare, local },
      ]
    : [
        { bone, card: 'light', scale: light },
        { bone, card: 'flareBlue', scale: flare },
      ];

const ALIVE = { alive: true } as const;
const PURPLE = [0.8, 0.5, 1] as const;

/**
 * MODEL_DARK_SKULL_SOLDIER_5: the SubType 18-21 ribbons his creation hangs on MoveEye(9, 10, 39, 40)'s eyes
 * (GM_Kanturu_3rd.cpp:695-701, ZzzEffectJoint.cpp:286-303, :462) and RenderKanturu3rdMonsterVisual's cards on
 * his registered bones (:1015-1076), none once he dies (:1012), the Attack1 / Attack4 sword blur (:961-988) and the
 * dark smoke of his death (:865-869), and Body_Bone13's BITMAP_FIRE + 1 (:1061-1062). Not here yet: the windmill
 * sparks (SPARK + 1 SubType 16, :1078-1080), the Attack2 storm and laser, the Attack3 flares and the death's
 * JOINT_SPIRIT2 (:838-876).
 */
export const NIGHTMARE_FX: MonsterBodyFx = [
  trail(10, 10, 8, PURPLE, { gate: ALIVE }),
  trail(9, 10, 8, PURPLE, { gate: ALIVE }),
  trail(40, 10, 8, PURPLE, { gate: ALIVE }),
  trail(39, 10, 8, PURPLE, { gate: ALIVE }),
  cards(
    [1, 1, 1],
    [
      ...pair(61, 0.3, 0.5),
      ...pair(62, 0.3, 0.5),
      ...pair(54, 0.3, 0.5),
      ...pair(55, 0.3, 0.5),
      ...pair(21, 0.3, 0.5, [5, 0, 0]),
      ...pair(22, 0.3, 0.5, [9, 0, 0]),
      ...pair(25, 0.4, 0.7, [6, 0, 0]),
      ...pair(26, 0.4, 0.7),
      ...pair(71, 0.4, 0.7),
      ...pair(70, 0.4, 0.7),
      ...pair(43, 0.4, 0.7, [10, 0, 0]),
      ...pair(44, 0.4, 0.7),
      ...pair(39, 0.3, 0.6, [3, 0, 0]),
      ...pair(40, 0.3, 0.6, [3, 0, 0]),
      { bone: 9, card: 'flareBlue', scale: 0.3, local: [0, -2, 0] },
      { bone: 10, card: 'flareBlue', scale: 0.3, local: [4, -4, 0] },
    ],
    { gate: ALIVE }
  ),
  blur(32, 38, [1, 1, 1], 'blur02', { fromLocal: [10, 0, 0], toLocal: [10, -10, 0], short: true, gate: { action: [A.Attack1, A.Attack4], frames: [[0, 5.9]] } }),
  // Alive: a BITMAP_FIRE + 1 SubType 3 at 1.7 on his Angle from Body_Bone13 a tick.
  puff(1, [63], ['fire1_3'], [1, 1, 1], { scale: 1.7, turned: true, gate: ALIVE }),
  // Die from frame 3: two SMOKE + 3 SubType 3 at 1.5 from Body_Bone13 a tick.
  puff(1, [63], ['smoke3_3', 'smoke3_3'], [1, 1, 1], { scale: 1.5, gate: { action: [A.Die], frames: [[3, Infinity]] } }),
];
