import type { MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { cards, puff, spotsOn } from '../_shared/bodyFx';

const ATTACK2 = { action: [A.Attack2] };

/**
 * MODEL_EROHIM: RenderHuntingGroundMonsterVisual (GMHuntingGround.cpp:672-712). Not here yet: Attack2's
 * MODEL_SKILL_FISSURE (:701) and the mesh passes of RenderHuntingGroundMonsterObjectMesh (:885-920).
 */
export const EROHIM_FX: MonsterBodyFx = [
  // Monster87_LeftEye / RightEye (bones 8, 9) at (0, -2, 0), two cards each.
  cards([0.9, 0.2, 0.1], [...spotsOn([8, 8], 'light', 0.5, [0, -2, 0]), ...spotsOn([9, 9], 'light', 0.5, [0, -2, 0])]),
  // Monster87_LeftHand (bone 16) at (0, 0, -10).
  puff(1, [16], ['trueFire'], [0.9, 0.2, 0.1], { local: [0, 0, -10], scale: 3, gate: ATTACK2 }),
  puff(1, [16], ['smoke21'], [0.9, 0.2, 0.1], { local: [0, 0, -10], scale: 2, gate: ATTACK2 }),
];
