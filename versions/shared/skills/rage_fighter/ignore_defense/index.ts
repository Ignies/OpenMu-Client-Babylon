import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW } from '../_shared';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 266,
  name: "Ignore Defense",
  visual: { impact: flash(TEX.shiny, RGBS.blood, 1.3, 0.6) },
  buffs: {
    // 129-131 Ourforces (Rage Fighter): the red glow on 17 bones; 153-155 their power-ups.
    129: () => ({ boneGlow: OURFORCES_GLOW }),
    153: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (rageBuffSound)
  target: 'self',
});
