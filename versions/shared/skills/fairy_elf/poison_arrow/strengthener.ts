import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, VENOM_MOTES } from '@/controllers/fx/recipes';
import { arrow } from '@/controllers/skills/visuals';
import { venomHit } from './';

export default defineSkill({
  id: 434,
  name: "Poison Arrow Str",
  visual: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
});
