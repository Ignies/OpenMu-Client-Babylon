import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 32,
  name: "Summon Assassin",
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
});
