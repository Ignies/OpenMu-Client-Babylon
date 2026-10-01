import { defineSkill } from '@/controllers/skills/define';
import { force, forceGraded, litStrike, strikeKey } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

export default defineSkill({
  id: 66,
  name: "Force Wave",
  visual: {
    impact: strikeKey(force, 'Sound/sDarkSpear'),
    area: strikeKey(force, 'Sound/sDarkSpear'),
    enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear'), area: litStrike(forceGraded, 'Sound/sDarkSpear') },
  },
  sound: 'Sound/sKnightSkill1', // Force Wave
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force Wave
});
