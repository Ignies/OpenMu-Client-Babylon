import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX, VENOM_MOTES } from '@/controllers/fx/recipes';
import { Step, arrow, flash, particles, seq } from '@/controllers/skills/visuals';

export const venomHit: Step = seq(flash(TEX.flare, RGBS.venom, 1.1, 0.5), particles({ recipe: VENOM_MOTES, count: 16 }));

export default defineSkill({
  id: 427,
  name: "Poison Arrow",
  // 427/434 Poison Arrow
  visual: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
});
