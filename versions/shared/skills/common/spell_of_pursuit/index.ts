import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 212,
  name: "Spell of Pursuit",
  visual: { impact: flash(TEX.eye, RGBS.shade, 1.2, 0.6) },
});
