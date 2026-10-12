import type { MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { SMOKE_LINES, cards, puff, spotsOn, trail, walkSand } from '../_shared/bodyFx';

/**
 * MODEL_MEDUSA: RenderMonsterVisual (GMSwampOfQuiet.cpp:1044-1134) and the walk smoke of
 * MoveMonsterVisual (:532-542). Not here yet: Attack1/2's hand fires and BITMAP_HOLE (:544-578),
 * the BITMAP_WATERFALL_4 effect on bone 68 (:1072-1075) and the 0.8 cm nudge of the eye cards.
 */
export const MEDUSA_FX: MonsterBodyFx = [
  walkSand,
  cards([0.9, 0.8, 0.3], [...spotsOn([5], 'lightMarks', 2), ...spotsOn([33], 'lightMarks', 1.2)]),
  cards([0.1, 1, 0], [...spotsOn([5], 'light', 2.4), ...spotsOn([33], 'light', 1.4), ...spotsOn([68], 'light', 4)]),
  cards([1, 1, 1], spotsOn([34, 35, 66, 67, 69, 70], 'lightRed', 0.4)),
  cards([0.9, 1, 0.1], [...spotsOn([68], 'shockWave', 0.35), ...spotsOn([68], 'shockWave', 0.22)]),
  cards([0.9, 1, 0.9], spotsOn([68], 'shiny2', 1.2)),
  // A SubType 55 / 56 joint a tick on MoveEye(34, 35)'s eyes and 57 on bones 67 and 70, each living
  // 10 ticks: one ribbon per bone stands for them.
  trail(35, 6, 8, [1, 0, 0]),
  trail(34, 6, 8, [1, 0, 0]),
  trail(67, 10, 15, [0.1, 0.6, 0.3]),
  trail(70, 10, 15, [0.1, 0.6, 0.3]),
  // `rand() % 6` on bone 5 (the loop's `i % 5 == 0` keeps only the first of 5, 37, 52).
  puff(6, [5], ['smoke50', SMOKE_LINES], [0.25, 1, 0]),
  puff(3, [0, 5, 124], ['smoke1', 'smoke1'], [0.4, 0.9, 0.6], { gate: { action: [A.Die] } }),
];
