import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 31,
  name: "Summon Stone Golem",
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  sound: 'Sound/sKnightDefense', // Summon Stone Golem
  target: 'self',
});
