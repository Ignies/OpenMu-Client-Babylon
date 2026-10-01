import type { RGB } from '../fx/core';
import type { Sounds } from '../sound/recipes';
import type { SkillClipSet } from '../combat/recipes';
import { SKILL_CLIPS } from '../combat/recipes';
import { SKILL_LIGHTS } from '../lighting/skills';
import { SKILL_SOUNDS } from '../sound/combat';
import { SKILL_DELAY_MS } from '@/features/skills/recipes';
import type { SkillDef } from './define';
import { BUFF_ARRIVALS, BUFF_VISUALS, LAUNCHER_ARROWS, SKILL_VISUALS, type BuffLook } from './visuals';

export { defineSkill, defineBuffLooks, type SkillDef } from './define';

/** Adds skills to every table the controllers read. A skill's file is the only place its data lives. */
export function registerSkills(defs: readonly SkillDef[]): void {
  const seen = new Set<number>();
  for (const d of defs) {
    if (seen.has(d.id)) throw new Error(`skill ${d.id} is defined twice`);
    seen.add(d.id);
    if (d.visual) SKILL_VISUALS[d.id] = d.visual;
    if (d.light) SKILL_LIGHTS[d.id] = d.light;
    if (d.sound) (SKILL_SOUNDS as Record<number, Sounds>)[d.id] = d.sound;
    if (d.clip) (SKILL_CLIPS as Record<number, SkillClipSet>)[d.id] = d.clip;
    if (d.delayMs !== undefined) (SKILL_DELAY_MS as Record<number, number>)[d.id] = d.delayMs;
    Object.assign(BUFF_VISUALS, d.buffs);
    Object.assign(BUFF_ARRIVALS, d.buffArrivals);
  }
}

export function registerBuffLooks(looks: Partial<Record<number, BuffLook>>): void {
  Object.assign(BUFF_VISUALS, looks);
}

export function registerLauncherArrows(arrows: Partial<Record<number, { model: string; colour: RGB }>>): void {
  Object.assign(LAUNCHER_ARROWS, arrows);
}
