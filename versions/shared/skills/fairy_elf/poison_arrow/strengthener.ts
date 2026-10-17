import { defineSkill } from '@/controllers/skills/define';
import { arrow } from '@/controllers/skills/visuals';
import { VENOM_MOTES, venomHit } from './';

export default defineSkill({
  id: 434,
  name: "Poison Arrow Str",
  visual: { travel: { ...arrow(), bowArrow: true, trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
});
