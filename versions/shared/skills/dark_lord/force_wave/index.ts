import { defineSkill } from '@/controllers/skills/define';
import { force, forceGraded, litStrike, strikeKey } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 66,
  name: "Force Wave",
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [509],
  visual: {
    impact: strikeKey(force, 'Sound/sDarkSpear'),
    area: strikeKey(force, 'Sound/sDarkSpear'),
    enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear'), area: litStrike(forceGraded, 'Sound/sDarkSpear') },
  },
  sound: 'Sound/sKnightSkill1', // Force Wave
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force Wave
  light: { enhanced: { strike: effectLight([0.55, 0.6, 1], 2, 0.3, { floorGain: 0.45 }) } },
});
