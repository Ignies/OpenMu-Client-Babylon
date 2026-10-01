import { defineSkill } from '@/controllers/skills/define';
import { holyCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 425,
  name: "Cure",
  // 425 Cure, 426/429 Party Healing, 430/433 Bless, 432 Summon Satyros
  visual: { impact: holyCircle([0.7, 1, 0.8]) },
});
