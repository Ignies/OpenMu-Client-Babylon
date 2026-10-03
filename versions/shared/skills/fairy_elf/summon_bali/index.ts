import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 35,
  name: "Summon Bali",
  // The old skill -> effect table's row, labelled Infinity Arrow (6); kept as found, the number looks wrong.
  effect: 6,
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  sound: 'Sound/sKnightDefense', // Summon Bali
  target: 'self',
});
