import { defineSkill } from '@/controllers/skills/define';
import { force, forceGraded, litStrike, strikeKey } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 60,
  name: "Force",
  // 60 Force / 66 Force Wave (and 509): at the strike key, caster-anchored rings, streaks and lance; sDarkSpear.
  visual: { impact: strikeKey(force, 'Sound/sDarkSpear'), enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear') } },
  sound: 'Sound/sKnightSkill1', // Force (SOUND_SKILL_SWORD1 at the packet, WSclient.cpp:4333-4350; sDarkSpear plays at the strike)
  // --- Dark Lord ----------------------------------------------------------
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force
  // Force / Force Wave: the original lights nothing. Enhanced: blue-violet (the streaks over the cyan rings),
  // over the 2-tile span of rings and streaks, bright for their first ~7 ticks (x1/1.4-1.5 a tick). These lights
  // hang over the ground, so the floor takes less of them: at floorGain 1 a day ground washed out under the art.
  light: { enhanced: { strike: effectLight([0.55, 0.6, 1], 2, 0.3, { floorGain: 0.45 }) } },
});
