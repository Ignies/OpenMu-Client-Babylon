import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import type { ParticleRecipe } from '@/controllers/fx';
import { Step, arrow, flash, particles, seq } from '@/controllers/skills/visuals';

/** Poison bubbles: green flare motes wobbling up. */
export const VENOM_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.venom,
  colourEnd: RGBS.decay,
  size: 0.22,
  life: 0.8,
  power: 0.6,
  gravity: 0.8,
  dir1: [-0.4, 0.3, -0.4],
  dir2: [0.4, 1, 0.4],
  endScale: 1.5,
};

export const venomHit: Step = seq(flash(TEX.flare, RGBS.venom, 1.1, 0.5), particles({ recipe: VENOM_MOTES, count: 16 }));

export default defineSkill({
  id: 427,
  name: "Poison Arrow",
  // 427/434 Poison Arrow
  visual: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
});
