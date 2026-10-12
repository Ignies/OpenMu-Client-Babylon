import { MonsterActionType } from '../../objects/enum';

/**
 * `MODEL_SWORDLEFT01` .. `MODEL_SWORDMAIN01_EMPIREGUARDIAN_BOSS_GAION_`: the models Gaion loads with his body
 * (GMEmpireGuardian4.cpp:84-99) and the body bone each is drawn on (`arrBoneIdxs`, ZzzEffect.cpp:9374-9376).
 */
export const GAION_SWORDS = [
  { file: 'Boss_Karane_sword_left01', bone: 4 },
  { file: 'Boss_Karane_sword_left02', bone: 2 },
  { file: 'Boss_Karane_sword_right01', bone: 8 },
  { file: 'Boss_Karane_sword_right02', bone: 10 },
  { file: 'Boss_Karane_sword_main01', bone: 6 },
] as const;

const ALL = [true, true, true, true, true] as const;
const HELD: Readonly<Partial<Record<number, readonly boolean[]>>> = {
  [MonsterActionType.Attack1]: [true, false, true, false, true],
  [MonsterActionType.Attack2]: [false, true, false, true, true],
  [MonsterActionType.Attack3]: [false, false, false, false, false],
  [MonsterActionType.Attack4]: [true, true, true, true, false],
};

/**
 * The swords he holds (a `SubType 0` effect each frame) in an action, in `GAION_SWORDS` order; the others
 * are thrown that action (MoveMonsterVisual, GMEmpireGuardian4.cpp:287-445).
 */
export function heldSwords(action: number): readonly boolean[] {
  return HELD[action] ?? ALL;
}

/**
 * The sprites on each sword's own bones (RenderEffect, ZzzEffect.cpp:9405-9480): two `BITMAP_LIGHT_RED` jewels
 * at 1.3 in (1, 0.4, 0.1) and nine `BITMAP_LIGHT` edge lights in (0.3, 0.3, 1), the last two at 1.0, the rest 1.5.
 */
export const SWORD_SPRITES = [
  { red: [2, 3], edge: [13, 12, 5, 6, 1, 8, 9, 10, 4] },
  { red: [9, 10], edge: [13, 6, 1, 7, 2, 4, 3, 11, 8] },
  { red: [1, 2], edge: [3, 4, 5, 6, 12, 8, 9, 10, 7] },
  { red: [3, 10], edge: [4, 12, 2, 9, 5, 7, 6, 8, 1] },
  { red: [10, 11], edge: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
] as const;

/** A throw: while the clip's key is below `until`, every tick throws these swords (`GAION_SWORDS` order) as `sub`. */
export type SwordThrow = { readonly until: number; readonly sub: 1 | 3; readonly swords: readonly number[] };

/**
 * The swords each attack throws at the hero (MoveMonsterVisual, GMEmpireGuardian4.cpp:301-415; ReceiveAction
 * aims a monster's swing at `HeroIndex`, WSclient.cpp:3600). Attack4's main sword (SubType 1) is not a flight.
 */
export const THROWS: Readonly<Partial<Record<number, SwordThrow>>> = {
  [MonsterActionType.Attack1]: { until: 0.5, sub: 1, swords: [1, 3] },
  [MonsterActionType.Attack2]: { until: 0.7, sub: 1, swords: [0, 2] },
  [MonsterActionType.Attack3]: { until: 0.5, sub: 3, swords: [0, 2, 1, 3, 4] },
};
