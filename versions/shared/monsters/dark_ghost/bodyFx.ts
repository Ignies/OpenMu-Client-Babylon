import type { MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { cards, puff, spotsOn, trail } from '../_shared/bodyFx';

/** RenderMonsterVisual's Attack1 / Attack2 arm (GMEmpireGuardian2.cpp:925-940). */
const ATTACK = { action: [A.Attack1, A.Attack2] };

/** `fLumi = (sinf(WorldTime * 0.08f) + 1) * 0.5f * 0.3f + 0.7f`. */
const FLICKER = { pulse: { speed: 0.08, amount: 0.15, base: 0.85 } };

/**
 * MODEL_DARK_GHOST: the SubType 22 / 23 ribbons on MoveEye(80, 34)'s eyes (GMEmpireGuardian2.cpp:96-98, :923,
 * ZzzEffectJoint.cpp:339-350) with the BITMAP_LIGHTNING + 1 SubType 4 each lays at its head a tick, living two
 * (ZzzEffectJoint.cpp:3213-3218), RenderMonsterVisual's lights (:897-920), its attack drops and sparks (:925-940)
 * and the death smoke at its feet (:946-950). Mesh 3 and the Die's BlendMesh -2 are in `index.ts`. Not here: the Die's inferno
 * and twin-tail effects (:942-960); the BITMAP_CHROME2 on bones 80 / 34 (:917) is drawn at `Target->Position -
 * StartPosition` (ZzzEffectParticle.cpp:8789-8800), by the world origin, so nothing of it shows.
 */
export const DARK_GHOST_FX: MonsterBodyFx = [
  trail(34, 30, 10, [1, 1, 1]),
  trail(80, 30, 10, [1, 1, 1]),
  cards([0.1, 0.6, 1], spotsOn([93, 100, 47, 54], 'light', 3), FLICKER),
  cards([0.1, 1, 0.2], spotsOn([92, 99, 46, 53, 95, 88, 42, 49], 'light', 1), FLICKER),
  cards([0.1, 1, 0.3], spotsOn([80, 34], 'light', 3), FLICKER),
  cards([1, 1, 1], spotsOn([34, 34, 80, 80], 'lightning2', 0.25), { pulse: { speed: 0.002, amount: 0.2, base: 0.8 } }),
  // WATERFALL_4 SubType 15 at Scale 2, and two SPARK + 1 SubType 13 (SubType 11's spark) on its Angle.
  puff(1, [80, 34], ['waterfall4_15'], [0.3, 1, 0.8], { scale: 2, gate: ATTACK }),
  puff(1, [80, 34], ['spark1_11', 'spark1_11'], [0, 0.4, 0], { turned: true, gate: ATTACK }),
  // Die to frame 3: five SMOKE SubType 39 at `o->Position`.
  puff(1, [], Array(5).fill('smoke39'), [0.1, 1, 0.2], { origin: true, gate: { action: [A.Die], frames: [[0, 3]] } }),
];
