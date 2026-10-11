/**
 * Skill number → re-use delay in milliseconds (Skill.bmd `Delay`). Filled by `registerSkills` from
 * each skill's `delayMs`; the skills module's cooldowns read it.
 */
export const SKILL_DELAY_MS: Readonly<Record<number, number>> = {};
