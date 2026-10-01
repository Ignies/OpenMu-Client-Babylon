import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW } from '../_shared';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { atCaster, flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 268,
  name: "Increase Block",
  visual: { impact: flash(TEX.shiny, RGBS.steel, 1.3, 0.6), area: atCaster(flash(TEX.shiny, RGBS.steel, 1.3, 0.6), 0.8) },
  buffs: {
    131: () => ({ boneGlow: OURFORCES_GLOW }),
    155: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (rageBuffSound)
  target: 'self',
});
