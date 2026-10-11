import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 210,
  name: "Spell of Protection",
  // 210–213 spells of protection/restriction/pursuit, shield-burn.
  visual: { impact: flash(TEX.flareBlue, RGBS.soul, 1.4, 0.6) },
});
