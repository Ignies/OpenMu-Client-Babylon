import type { SkillContext } from './visuals';

/** What a map hook draws for a monster's swing or 0x69 skill (`ATMON_SKILL_*`); `c.target` is the swing's target. */
export type MonsterSkillLook = (c: SkillContext) => void;

/** One monster skill file: the looks of the monsters (npc numbers) whose map hook draws them. */
export interface MonsterSkillDef {
  readonly name: string;
  readonly monsters: readonly number[];
  /** The maps whose process runs the hook (`TheMapProcess`); every map when unset. */
  readonly worlds?: readonly number[];
  /** By 0x69 skill: what the hook that picks the clip draws (SetCurrentActionMonster, SetBossMonsterAction). */
  readonly looks?: Readonly<Record<number, MonsterSkillLook>>;
  /** After any swing (0x18, 0x69, or a 0x19 that starts AttackTime): the map's AttackEffectMonster, which reads the clip and `c->MonsterSkill`. */
  readonly attack?: MonsterSkillLook;
}

export function defineMonsterSkill(def: MonsterSkillDef): MonsterSkillDef {
  return def;
}

const defs = new Map<number, MonsterSkillDef[]>();

export function registerMonsterSkills(list: readonly MonsterSkillDef[]): void {
  for (const d of list) for (const monster of d.monsters) defs.set(monster, [...(defs.get(monster) ?? []), d]);
}

function defsOn(monster: number, world: number): readonly MonsterSkillDef[] {
  return (defs.get(monster) ?? []).filter(d => !d.worlds || d.worlds.includes(world));
}

/** The look a monster's hook draws for its 0x69 skill on this map, if any. */
export function monsterSkillLook(monster: number, skill: number, world: number): MonsterSkillLook | undefined {
  for (const d of defsOn(monster, world)) if (d.looks?.[skill]) return d.looks[skill];
  return undefined;
}

/** The map's AttackEffectMonster for this monster after a swing, if any. */
export function monsterAttackLook(monster: number, world: number): MonsterSkillLook | undefined {
  return defsOn(monster, world).find(d => d.attack)?.attack;
}
