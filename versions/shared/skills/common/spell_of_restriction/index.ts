import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 211,
  name: "Spell of Restriction",
  visual: { impact: flash(TEX.flare, RGBS.shade, 1.4, 0.6) },
});
