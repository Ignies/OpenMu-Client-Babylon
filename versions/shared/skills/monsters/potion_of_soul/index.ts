import { defineSkill } from '@/controllers/skills/define';
import { RGBS, SOUL_MOTES, TEX } from '@/controllers/fx/recipes';
import { flash, particles, seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 204,
  name: "Potion of Soul",
  visual: { impact: seq(flash(TEX.shiny, RGBS.soul, 1.3, 0.6), particles({ recipe: SOUL_MOTES, count: 16, height: 0.4 })) },
});
