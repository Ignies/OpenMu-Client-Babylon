import { defineImprovement } from '@/controllers/fidelity';

/**
 * A master or Rage Fighter skill's `MagicEffectCancelled` drops its buff (`effectAliases`, the
 * Rage Fighter `effect`s 129-131). Classic: `ReceiveMagicFinish` reads the skill as a BYTE
 * (WSclient.cpp:3884), so ids 256+ cancel nothing and the buff stays until its timer ends.
 * Read in `controllers/skills/index.ts` (`cancelledEffects`).
 */
export default defineImprovement({
  id: 'masterBuffCancel',
  preset: 'enhanced',
  labelKey: 'fidelity.masterBuffCancel',
  hintKey: 'fidelity.masterBuffCancel.hint',
});
