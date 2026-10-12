import type { SkillContext } from './visuals';

/** What a map hook draws when a monster's 0x69 skill (`ATMON_SKILL_*`) reaches it; `c.target` is the skill's target. */
export type MonsterSkillLook = (c: SkillContext) => void;

/** One monster skill file: its looks by skill number, for the monsters (npc numbers) whose hook draws them. */
export interface MonsterSkillDef {
  readonly name: string;
  readonly monsters: readonly number[];
  readonly looks: Readonly<Record<number, MonsterSkillLook>>;
}

export function defineMonsterSkill(def: MonsterSkillDef): MonsterSkillDef {
  return def;
}

const looks = new Map<number, Readonly<Record<number, MonsterSkillLook>>>();

export function registerMonsterSkills(defs: readonly MonsterSkillDef[]): void {
  for (const d of defs) for (const monster of d.monsters) looks.set(monster, { ...looks.get(monster), ...d.looks });
}

/** The look a monster draws for its 0x69 skill, if its hook draws one. */
export function monsterSkillLook(monster: number, skill: number): MonsterSkillLook | undefined {
  return looks.get(monster)?.[skill];
}
