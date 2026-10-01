import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 35,
  name: "Summon Bali",
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  sound: 'Sound/sKnightDefense', // Summon Bali
  target: 'self',
});
