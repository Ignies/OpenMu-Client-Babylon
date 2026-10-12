import { isOn } from '@/controllers/fidelity';

/** Ours: the Skill effects selector is on Enhanced (the `enhancedSkillEffects` improvement). */
export const enhancedSkillFx = (): boolean => isOn('enhancedSkillEffects');
