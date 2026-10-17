import type { BodyFxGate, BodyPuff, MonsterBodyFx } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { SMOKE_LINES, cards, puff, spotsOn, swampStrike, trail, walkSand } from '../_shared/bodyFx';

/** MoveMonsterVisual's Attack1 / Attack2 past `2 < CurrentAnimationFrame` (:544-545). */
const ATTACK: BodyFxGate = { action: [A.Attack1, A.Attack2], frames: [[3, Infinity]] };

/** `switch (rand() % 3)`: BITMAP_FIRE_HIK1_MONO SubType 4, HIK2_MONO 8 or HIK3_MONO 5 (:557-569). */
const JETS: readonly BodyPuff[] = ['fireMono1_4', 'fireMono2_8', 'fireMono3_5'];

/** `TransformByObjectBone(vPos, o, 19 / 31, (10, 5, 0))`, at `o->Scale` 1.5, on her Angle and riding her. */
const hands = { local: [10, 5, 0], scale: 1.5, turned: true, ride: 'body', gate: ATTACK } as const;

/**
 * MODEL_MEDUSA: RenderMonsterVisual (GMSwampOfQuiet.cpp:1044-1134) and MoveMonsterVisual's walk smoke and
 * hand fires (:532-578). Not here yet: the 0.8 cm nudge of the eye cards.
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
  // Two fires a hand a tick, the second skipped on `rand_fps_check(2)`.
  puff(1, [19, 31], [JETS], [0, 1, 0.5], hands),
  puff(2, [19, 31], [JETS], [0, 1, 0.5], { ...hands, rollEach: true }),
  // `rand_fps_check(2)`: a BITMAP_WATERFALL_4 riding bone 68, its three cards circling it (:1082-1085).
  puff(2, [68], ['waterfall4Orbit0', 'waterfall4Orbit1', 'waterfall4Orbit2'], [0.9, 1, 0.9], { ride: 'bone' }),
  // BITMAP_HOLE in each hand, `(sinf(WorldTime * 0.005f) + 1) * 0.1 + 0.1` big (:572-573).
  cards([1, 1, 1], spotsOn([19, 31], 'hole', 0.2, [10, 5, 0]), { swell: { speed: 0.005, amount: 0.1 }, gate: ATTACK }),
  // The Ice Napin's strike, which her case shares (:583-618).
  ...swampStrike([0.25, 0.6, 0.7]),
];
