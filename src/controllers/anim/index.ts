// Public API of the anim controller: code outside this folder imports from here.
export { monsterPlaySpeed } from './playSpeed';
export { animations, defineAnimation, registerAnimations, AnimationRegistry } from './animation';
export type { AnimationDef, FrameSpeed, PlayerActionName, SpeedRule } from './animation';
export { defineMonsterCast, defineMonsterSwing, registerMonsterCasts, registerMonsterSwings } from './monsterRules';
export type { MonsterCastDef, MonsterSwingClip, MonsterSwingDef } from './monsterRules';
export { playerActionEnumSource, replacePlayerActionEnum, PLAYER_ACTION_ENUM_MARK } from './playerActionEnum';
