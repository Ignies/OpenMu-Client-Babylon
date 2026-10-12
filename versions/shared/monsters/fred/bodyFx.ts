import type { MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { cards, rageSmoke, spotsOn, trail } from '../_shared/bodyFx';

const BLUE = [0.7, 0.7, 1] as const;

/**
 * MODEL_FRED (Daesuler): the SubType 24 / 25 ribbons on MoveEye(14, 15, ...)'s eyes (GMEmpireGuardian1.cpp:109-111,
 * MoveEye each frame in ZzzObject.cpp:542) with the flare02 card each lays at its head (ZzzEffectJoint.cpp:3220-3226),
 * his rage smoke (GMEmpireGuardian1.cpp:2168-2186) and the four SubType 54 blade ribbons on bones 71-74 (:112-116,
 * ZzzEffectJoint.cpp:394-413), 30 tails laid two a tick (CreateTail's Blur, :2855-2900) and so 15 ticks long, drawn
 * only through Attack1 (:6995). Not here: the dim BITMAP_BLUR card at each blade head (:3227-3231). His cloth
 * (ZzzObject.cpp:544-560) is in `versions/shared/cloaks/`.
 */
export const FRED_FX: MonsterBodyFx = [
  trail(15, 10, 10, BLUE),
  trail(14, 10, 10, BLUE),
  cards(BLUE, spotsOn([15, 14], 'flare2', 0.2), {
    pulse: { speed: 0.002, amount: 0.1, base: 0.2 },
    swell: { speed: 0.002, amount: 0.1 },
  }),
  rageSmoke(76),
  ...[71, 72, 73, 74].map(b => trail(b, 100, 15, BLUE, { ribbon: 'spark', gate: { action: [A.Attack1] } })),
];
