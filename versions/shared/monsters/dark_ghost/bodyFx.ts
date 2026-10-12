import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, spotsOn, trail } from '../_shared/bodyFx';

/** `fLumi = (sinf(WorldTime * 0.08f) + 1) * 0.5f * 0.3f + 0.7f`. */
const FLICKER = { pulse: { speed: 0.08, amount: 0.15, base: 0.85 } };

/**
 * MODEL_DARK_GHOST: the SubType 22 / 23 ribbons on MoveEye(80, 34)'s eyes (GMEmpireGuardian2.cpp:96-98, :923,
 * ZzzEffectJoint.cpp:339-350) with the BITMAP_LIGHTNING + 1 SubType 4 each lays at its head a tick, living two
 * (ZzzEffectJoint.cpp:3213-3218), and RenderMonsterVisual's lights (:897-920). Not here yet: the BITMAP_CHROME2 on
 * bones 80 / 34 (:917), the attack sparks (:925-940) and the death effects (:942-962). Mesh 3 is in `index.ts`.
 */
export const DARK_GHOST_FX: MonsterBodyFx = [
  trail(34, 30, 10, [1, 1, 1]),
  trail(80, 30, 10, [1, 1, 1]),
  cards([0.1, 0.6, 1], spotsOn([93, 100, 47, 54], 'light', 3), FLICKER),
  cards([0.1, 1, 0.2], spotsOn([92, 99, 46, 53, 95, 88, 42, 49], 'light', 1), FLICKER),
  cards([0.1, 1, 0.3], spotsOn([80, 34], 'light', 3), FLICKER),
  cards([1, 1, 1], spotsOn([34, 34, 80, 80], 'lightning2', 0.25), { pulse: { speed: 0.002, amount: 0.2, base: 0.8 } }),
];
