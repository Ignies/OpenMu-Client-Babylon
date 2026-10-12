import type { RGB } from '../fx/core';
import type { Sounds } from '../sound/recipes';
import { combat, MASTER_BASES, SKILL_DELAY_MS } from '../combat';
import { SKILL_LIGHTS } from '../lighting/skills';
import { LANDING_SOUNDS, SILENT_HERO_CASTS, SKILL_CLIP_SOUNDS, SKILL_SOUNDS, SKILL_TARGET_SOUNDS } from '../sound/combat';
import { SKILL_EFFECTS } from './tables';
import { HEAVY_VISUAL_GAP } from './castBudget';
import type { SkillCancel, SkillDef } from './define';
import type { Entity } from '@/ecs/world';
import type { Scene } from '../render/babylon/exports';
import { isOn } from '../fidelity';
import { BUFF_ARRIVALS, BUFF_HITS, BUFF_VISUALS, LAUNCHER_ARROWS, LOOK_ALIASES, SKILL_VISUALS, WARRIOR_GLINTS, type BuffLook } from './visuals';

export { defineSkill, defineBuffLooks, type SkillCancel, type SkillDef, type Mount } from './define';
export { defineMonsterSkill, monsterAttackLook, monsterSkillLook, registerMonsterSkills, type MonsterSkillDef, type MonsterSkillLook } from './monsterSkills';

const SKILL_CANCELS: Record<number, SkillCancel> = {};

/** Adds skills to every table the controllers read. A skill's file is the only place its data lives. */
export function registerSkills(defs: readonly SkillDef[]): void {
  const seen = new Set<number>();
  for (const d of defs) {
    if (seen.has(d.id)) throw new Error(`skill ${d.id} is defined twice`);
    seen.add(d.id);
    if (d.visual) SKILL_VISUALS[d.id] = d.visual;
    for (const id of d.lookAliases ?? []) LOOK_ALIASES[id] = d.id;
    for (const id of d.masterAliases ?? []) LOOK_ALIASES[id] = MASTER_BASES[id] = d.id;
    if (d.light) SKILL_LIGHTS[d.id] = d.light;
    if (d.sound) (SKILL_SOUNDS as Record<number, Sounds>)[d.id] = d.sound;
    if (d.clipSound) SKILL_CLIP_SOUNDS[d.id] = d.clipSound;
    if (d.soundOnLanding) LANDING_SOUNDS.add(d.id);
    if (d.silentHeroCast) SILENT_HERO_CASTS.add(d.id);
    if (d.targetSound) SKILL_TARGET_SOUNDS[d.id] = d.targetSound;
    if (d.delayMs !== undefined) (SKILL_DELAY_MS as Record<number, number>)[d.id] = d.delayMs;
    if (d.effect !== undefined) for (const id of [d.id, ...(d.effectAliases ?? [])]) SKILL_EFFECTS[id] = d.effect;
    if (d.cancel) SKILL_CANCELS[d.id] = d.cancel;
    if (d.warriorGlint) WARRIOR_GLINTS[d.id] = d.warriorGlint;
    if (d.heavyVisualGap) HEAVY_VISUAL_GAP[d.id] = d.heavyVisualGap;
    Object.assign(BUFF_VISUALS, d.buffs);
    Object.assign(BUFF_ARRIVALS, d.buffArrivals);
    Object.assign(BUFF_HITS, d.buffHits);
    // Clip rules, target, step-in, kill, combat layer and hooks.
    combat.registerSkill(d.id, d);
  }
}

/**
 * The effects a `MagicEffectCancelled` naming `skill` drops from `target`: its `cancel` hook's, which
 * runs first, then the skill's `effect` (ReceiveMagicFinish, WSclient.cpp:3878-3987).
 */
export function cancelledEffects(skill: number, scene: Scene, target: Entity | null): readonly number[] {
  const out = new Set(target ? (SKILL_CANCELS[skill]?.(scene, target) ?? []) : []);
  // Classic: ReceiveMagicFinish reads a BYTE (WSclient.cpp:3884), so 256+ cancels nothing.
  const effect = skill > 0xff && !isOn('masterBuffCancel') ? undefined : SKILL_EFFECTS[skill];
  if (effect !== undefined) out.add(effect);
  return [...out];
}

/** Whether the hero's cast of `skill` takes UseSkillWarrior's glint (`SkillDef.warriorGlint`). */
export function hasWarriorGlint(skill: number, mounted: boolean): boolean {
  const glint = WARRIOR_GLINTS[skill];
  return glint === true || (glint === 'mounted' && mounted);
}

export function registerBuffLooks(looks: Partial<Record<number, BuffLook>>): void {
  Object.assign(BUFF_VISUALS, looks);
}

export function registerLauncherArrows(arrows: Partial<Record<number, { model: string; colour: RGB }>>): void {
  Object.assign(LAUNCHER_ARROWS, arrows);
}
