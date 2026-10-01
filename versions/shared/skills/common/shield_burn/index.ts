import { defineSkill } from '@/controllers/skills/define';
import { BLOOD_CHIPS, RGBS, TEX } from '@/controllers/fx/recipes';
import { flash, particles, seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 213,
  name: "Shield-Burn",
  visual: { impact: seq(flash(TEX.flareRed, RGBS.blood, 1.4, 0.5), particles({ recipe: BLOOD_CHIPS, count: 12, height: 0.6 })) },
});
