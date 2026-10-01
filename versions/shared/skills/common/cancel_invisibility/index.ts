import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { flashDrop } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_COMMAND } from '../../_shared';

export default defineSkill({
  id: 71,
  name: "Cancel Invisibility",
  visual: { impact: flashDrop(RGBS.soul) },
  clip: { ground: A.PLAYER_ATTACK_REMOVAL, ...MOUNTED_COMMAND }, // Removal Invisible
});
