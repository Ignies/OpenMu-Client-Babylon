import { TICK, delay } from '@/controllers/fx/core';
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
  /** After any swing (0x18, 0x69, a 0x19 that starts AttackTime, or a 0x1E with no target): the map's AttackEffectMonster, which reads the clip and `c->MonsterSkill`. */
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

/**
 * A staged swing on `c->AttackTime` from 2 to `last`: `stage(t)` runs `t - 1` ticks from now, the tick it sees `t`,
 * while `holds()` (the clip has not moved on; once it fails, no later stage runs). A 0x69 sets AttackTime 1 and
 * MoveCharacter steps it before RenderMonsterVisual reads it (WSclient.cpp:4119-4121, ZzzCharacter.cpp:4132-4137).
 */
export function stageOnAttackTime(last: number, holds: () => boolean, stage: (t: number) => void): void {
  let on = true;
  for (let t = 2; t <= last; t++) {
    delay((t - 1) * TICK, () => {
      on &&= holds();
      if (on) stage(t);
    });
  }
}

/** The map's AttackEffectMonster for this monster after a swing, if any. */
export function monsterAttackLook(monster: number, world: number): MonsterSkillLook | undefined {
  return defsOn(monster, world).find(d => d.attack)?.attack;
}
