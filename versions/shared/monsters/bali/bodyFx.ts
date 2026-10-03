import type { BodyFxEmitter } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { bone, bones } from '../_shared/bodyFx';

/** Bali's attack (ZzzCharacter.cpp:6021-6045): `BITMAP_ENERGY` (0.6, 1, 0.8) and `BITMAP_FIRE` (1, 0.6, 1) on one bone. */
const strike = (action: number, at: number): BodyFxEmitter[] => [
  bone(1, 'energyChips', at, {
    colour: [0.6, 1, 0.8],
    gate: { action: [action] },
  }),
  bone(1, 'firePuff', at, { colour: [1, 0.6, 1], gate: { action: [action] } }),
];

/**
 * MODEL_BALI: energy and fire on the striking limb per attack; dying, twenty `BITMAP_FIRE`
 * (0.1, 0.8, 0.6) on random bones while the Die clip is under frame 12 (:6018-6058).
 */
export const BALI_FX: readonly BodyFxEmitter[] = [
  ...strike(A.Attack1, 33),
  ...strike(A.Attack2, 20),
  ...strike(A.Attack3, 41),
  ...strike(A.Attack4, 49),
  bones(1, 20, 'firePuff', {
    colour: [0.1, 0.8, 0.6],
    gate: { action: [A.Die], frames: [[0, 12]] },
  }),
];
