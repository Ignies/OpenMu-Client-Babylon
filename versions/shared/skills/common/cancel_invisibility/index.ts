import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { flashDrop } from '../_shared';

export default defineSkill({
  id: 71,
  name: "Cancel Invisibility",
  visual: { impact: flashDrop(RGBS.soul) },
});
