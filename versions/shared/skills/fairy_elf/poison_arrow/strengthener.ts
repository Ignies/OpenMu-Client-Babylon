import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { arrow } from '@/controllers/skills/visuals';
import { VENOM_MOTES, venomHit } from './';

export default defineSkill({
  id: 434,
  name: "Poison Arrow Str",
  visual: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
});
