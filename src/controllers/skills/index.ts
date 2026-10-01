import type { RGB } from '../fx/core';
import type { SkillDef } from './define';
import { BUFF_ARRIVALS, BUFF_VISUALS, LAUNCHER_ARROWS, SKILL_VISUALS, type BuffLook } from './visuals';

export { defineSkill, defineBuffLooks, type SkillDef } from './define';

/** Adds skills to every table the controllers read. A skill's folder is the only place its data lives. */
export function registerSkills(defs: readonly SkillDef[]): void {
  const seen = new Set<number>();
  for (const d of defs) {
    if (seen.has(d.id)) throw new Error(`skill ${d.id} is defined twice`);
    seen.add(d.id);
    if (d.visual) SKILL_VISUALS[d.id] = d.visual;
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
