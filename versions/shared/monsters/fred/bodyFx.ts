import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, rageSmoke, spotsOn, trail } from '../_shared/bodyFx';

const BLUE = [0.7, 0.7, 1] as const;

/**
 * MODEL_FRED (Daesuler): the SubType 24 / 25 ribbons on MoveEye(14, 15, ...)'s eyes (GMEmpireGuardian1.cpp:109-111,
 * MoveEye each frame in ZzzObject.cpp:542) with the flare02 card each lays at its head (ZzzEffectJoint.cpp:3220-3226),
 * and his rage smoke (GMEmpireGuardian1.cpp:2168-2186). Not here yet: the four SubType 54 blade ribbons drawn
 * through Attack1 (:112-116, ZzzEffectJoint.cpp:6995) and his cloth (ZzzObject.cpp:544-560).
 */
export const FRED_FX: MonsterBodyFx = [
  trail(15, 10, 10, BLUE),
  trail(14, 10, 10, BLUE),
  cards(BLUE, spotsOn([15, 14], 'flare2', 0.2), {
    pulse: { speed: 0.002, amount: 0.1, base: 0.2 },
    swell: { speed: 0.002, amount: 0.1 },
  }),
  rageSmoke(76),
];
