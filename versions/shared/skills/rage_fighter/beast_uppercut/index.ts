import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { seq, slash, sprite, steelHit } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 261,
  name: "Beast Uppercut",
  // 261 Beast Uppercut: MODEL_DOWN_ATTACK_DUMMY_R is not converted - a rising gold burst stands in.
  visual: { cast: slash(RGBS.gold, TEX.motionBlur, 0.7), impact: seq(steelHit, sprite({ texture: TEX.impact, colour: RGBS.gold, size: 1, seconds: 0.4, rise: 2, grow: 1.6 })) },
  sound: 'Sound/Ragefighter/Rage_Stamp', // Beast Uppercut (MonkSystem.cpp:1117)
  clip: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut
  stepIn: 'midClip',
});
