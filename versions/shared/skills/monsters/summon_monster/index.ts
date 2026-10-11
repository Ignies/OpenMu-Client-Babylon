import { defineSkill } from '@/controllers/skills/define';
import { summonCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 200,
  name: "Summon Monster",
  // 200 Summon Monster (a monster calling reinforcements): the summon circle, like rows 30-36.
  visual: { impact: summonCircle, area: summonCircle },
});
