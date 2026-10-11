import { defineSkill } from '@/controllers/skills/define';
import { atCaster, holyCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 429,
  name: "Party Healing Str",
  visual: { impact: holyCircle(), area: atCaster(holyCircle(), 0) },
});
