import { defineSkill } from '@/controllers/skills/define';
import { atCaster, holyCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 426,
  name: "Party Healing",
  visual: { impact: holyCircle(), area: atCaster(holyCircle(), 0) },
});
