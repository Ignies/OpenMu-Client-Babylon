import type { RGB } from '../fx/core';
import type { Sounds } from '../sound/recipes';
import { combat } from '../combat';
import { SKILL_LIGHTS } from '../lighting/skills';
import { LANDING_SOUNDS, SILENT_HERO_CASTS, SKILL_CLIP_SOUNDS, SKILL_SOUNDS } from '../sound/combat';
import { MASTER_BASES, SKILL_DELAY_MS, SKILL_EFFECTS } from '@/modules/skills/recipes';
import type { SkillDef } from './define';
import { BUFF_ARRIVALS, BUFF_HITS, BUFF_VISUALS, LAUNCHER_ARROWS, LOOK_ALIASES, SKILL_VISUALS, type BuffLook } from './visuals';

export { defineSkill, defineBuffLooks, type SkillDef, type Mount } from './define';

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
    if (d.delayMs !== undefined) (SKILL_DELAY_MS as Record<number, number>)[d.id] = d.delayMs;
    if (d.effect !== undefined) SKILL_EFFECTS[d.id] = d.effect;
    Object.assign(BUFF_VISUALS, d.buffs);
    Object.assign(BUFF_ARRIVALS, d.buffArrivals);
    Object.assign(BUFF_HITS, d.buffHits);
    // Clip rules, target, step-in, kill, combat layer and hooks.
    combat.registerSkill(d.id, d);
  }
}

export function registerBuffLooks(looks: Partial<Record<number, BuffLook>>): void {
  Object.assign(BUFF_VISUALS, looks);
}

export function registerLauncherArrows(arrows: Partial<Record<number, { model: string; colour: RGB }>>): void {
  Object.assign(LAUNCHER_ARROWS, arrows);
}
