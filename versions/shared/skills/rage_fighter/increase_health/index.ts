import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW } from '../_shared';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { atCaster, flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 267,
  name: "Increase Health",
  visual: { impact: flash(TEX.shiny, RGBS.holy, 1.3, 0.6), area: atCaster(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), 0.8) },
  buffs: {
    130: () => ({ boneGlow: OURFORCES_GLOW }),
    154: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_2', // Increase Block
});
