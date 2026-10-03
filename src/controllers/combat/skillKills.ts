/**
 * What a kill with a given skill does to the body (`ReceiveDie`'s `m_byDieType`,
 * ZzzCharacter.cpp:3145-3193, WSclient.cpp:5527-5546). Read by `DeathSystem`;
 * each skill's file fills its row through `registerSkills`. See controllers/combat/readme.md.
 */
import type { Entity, World } from '../../ecs/world';

// ---- 1. tuning -------------------------------------------------------------

export interface SkillKill {
  /** The body slides away from the killer for 15 ticks (`AT_SKILL_NOVA` / `AT_SKILL_COMBO` knock). */
  readonly knock?: boolean;
  /**
   * Called every frame the body is dying, after its motion: `ticks` is this frame's share of 25 Hz
   * ticks, `dead` the Dead counter after it.
   */
  readonly dying?: (body: Entity, ticks: number, dead: number, world: World) => void;
}

/** Skill number (exact, as `ObjectGotKilled` sends it) to its kill rule. */
export const SKILL_KILLS: Record<number, SkillKill> = {};

// ---- 2. readers ------------------------------------------------------------

/** The kill rule of a skill, `undefined` when the body just dies. */
export function skillKill(skill: number): SkillKill | undefined {
  return SKILL_KILLS[skill];
}
