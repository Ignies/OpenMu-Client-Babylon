import type { BodyFxEmitter } from '@/controllers/monsters';
import { bone } from '../_shared/bodyFx';

/**
 * Death Beam Knight's wing (ZzzCharacter.cpp:5843-5904): the 35 bones of `vec_list` (:137) as the
 * `wingLeft` / `wingRight` pair starts (scale 1, then 0.5 from pair 11), the four `arm_leg_*`
 * starts at 0.6, and on even ticks the body (bone 2 of the list) at 1.3 and the head (bone 1) at
 * 0.5. A bone index here is the list's entry, not the pair's.
 */
const VEC_LIST = [
  5, 6, 33, 53, 35, 49, 50, 45, 46, 41, 42, 37, 38, 11, 31, 13, 27, 28, 23, 24,
  19, 20, 15, 16, 54, 55, 62, 69, 70, 77, 2, 79, 81, 84, 86,
] as const;
const WING_LEFT = [0, 2, 2, 4, 5, 4, 7, 4, 9, 4, 11, 6, 8, 10, 12] as const;
const WING_RIGHT = [0, 13, 13, 15, 16, 15, 18, 15, 20, 15, 22, 17, 19, 21, 23] as const;
const ARM_LEG_LEFT = [29, 28, 34, 33] as const;
const ARM_LEG_RIGHT = [26, 25, 32, 31] as const;

export const DEATH_BEAM_KNIGHT_WINGS = ((): BodyFxEmitter[] => {
  const out: BodyFxEmitter[] = [];
  const lick = (entry: number, scale: number, every = 1) => out.push(bone(every, 'flameLick', VEC_LIST[entry], { scale }));
  WING_LEFT.forEach((entry, i) => lick(entry, i >= 11 ? 0.5 : 1));
  WING_RIGHT.forEach((entry, i) => lick(entry, i >= 11 ? 0.5 : 1));
  for (const entry of ARM_LEG_LEFT) lick(entry, 0.6);
  for (const entry of ARM_LEG_RIGHT) lick(entry, 0.6);
  lick(30, 1.3, 2);
  lick(1, 0.5, 2);
  return out;
})();
