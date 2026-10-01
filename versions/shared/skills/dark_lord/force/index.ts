import { defineSkill } from '@/controllers/skills/define';
import { force, forceGraded, litStrike, strikeKey } from '../_shared';

export default defineSkill({
  id: 60,
  name: "Force",
  // 60 Force / 66 Force Wave (and 509): at the strike key, caster-anchored rings, streaks and lance; sDarkSpear.
  visual: { impact: strikeKey(force, 'Sound/sDarkSpear'), enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear') } },
});
