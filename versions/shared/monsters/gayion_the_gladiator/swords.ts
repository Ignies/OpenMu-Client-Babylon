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
