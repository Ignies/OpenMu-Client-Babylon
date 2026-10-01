import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 34,
  name: "Summon Dark Knight",
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  sound: 'Sound/sKnightDefense', // Summon Dark Knight
  target: 'self',
});
