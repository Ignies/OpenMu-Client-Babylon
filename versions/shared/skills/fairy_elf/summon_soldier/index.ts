import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 36,
  name: "Summon Soldier",
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  sound: 'Sound/sKnightDefense', // Summon Soldier
  target: 'self',
});
