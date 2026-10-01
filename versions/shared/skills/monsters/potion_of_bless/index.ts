import { defineSkill } from '@/controllers/skills/define';
import { HOLY_MOTES, RGBS, TEX } from '@/controllers/fx/recipes';
import { flash, particles, seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 203,
  name: "Potion of Bless",
  visual: { impact: seq(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), particles({ recipe: HOLY_MOTES, count: 16, height: 0.4 })) },
});
