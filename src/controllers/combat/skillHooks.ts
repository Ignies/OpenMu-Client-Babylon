/**
 * Slots for skill-owned combat state. The combat facade keeps its methods
 * (`beginNova`, `comboFlash`, ...) and forwards to whichever skill filled the
 * slot; an empty slot answers "nothing happening".
 */
export interface NovaHooks {
  /** The release cast, sent when the button comes up (`AT_SKILL_NOVA`). */
  readonly skill: number;
  /** Sent when the button goes down; starts the charge (`AT_SKILL_NOVA_BEGIN`). */
  readonly beginSkill: number;
  charging(): boolean;
  charge(): number;
  stage(): number;
  begin(): boolean;
  release(): number;
}

export interface ComboHooks {
  flash(): number;
  landed(): number;
  knockUp(netId: number): boolean;
  observeSkillAnimation(skill: number, targetNetId: number | undefined): boolean;
}

export interface DarkSideHooks {
  isDarkSide(skill: number): boolean;
  begin(skill: number, targetId: number): void;
  observeTargets(skill: number, targetIds: readonly number[]): void;
  nextHit(): number;
  pendingSkill(): number;
  observeRageHit(isStreak: boolean, isFinal: boolean): void;
  streak(): number;
}

export type CombatHooks = { nova?: NovaHooks; combo?: ComboHooks; darkSide?: DarkSideHooks };

export const skillHooks: CombatHooks = {};
