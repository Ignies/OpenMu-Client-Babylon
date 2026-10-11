import { defineSkill } from '@/controllers/skills/define';
import { summonCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 432,
  name: "Summon Satyros",
  visual: { area: summonCircle },
});
