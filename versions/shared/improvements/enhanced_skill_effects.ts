import { defineImprovement } from '@/controllers/fidelity';

/**
 * Our own looks for the skills we drew our way (the list is in `versions/shared/skills/readme.md`).
 * Also the Options window's "Skill effects: Original / Enhanced". Classic: every skill draws as the
 * original. Read in `src/controllers/skills/visuals.ts` (`enhancedSkillFx`, `tiered`).
 */
export default defineImprovement({
  id: 'enhancedSkillEffects',
  preset: 'enhanced',
  labelKey: 'fidelity.enhancedSkillEffects',
  hintKey: 'fidelity.enhancedSkillEffects.hint',
});
