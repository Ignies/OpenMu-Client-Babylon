import { defineSkill } from '@/controllers/skills/define';
import { type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { NO_KEY, Step, afterRelease, atCaster, magicGround, perTick, seq, ticks } from '@/controllers/skills/visuals';
import { streamerFan } from '../../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_COMMAND } from '../../_shared';

/**
 * Swell Life / Add Mana: 36× CreateJoint(JOINT_SPIRIT sub2, Angle(−10,0,i*10),
 * width 60) - Vel 50, LT 20, MaxTails 3, Light 0.5 - with BITMAP_MAGIC+1 every
 * 20th. Drawn at half the count: 18 ribbons read the same and cost half.
 */
const spiritBurst = (colour: RGB): Step =>
  seq(
    streamerFan(18, (Math.PI * 2) / 18, { velocity: perTick(50), seconds: ticks(20), maxTails: 3, width: 0.6, colour, pitch: (10 * Math.PI) / 180, texture: TEX.jointSpirit }),
    magicGround(colour, ticks(40), 3)
  );

const manaBurst: Step = afterRelease(atCaster(spiritBurst(RGBS.soul), 1), { clips: NO_KEY });

export default defineSkill({
  id: 69,
  name: "Swell Mana",
  // ReceiveMagicFinish drops eBuff_AddMana (WSclient.cpp:3915-3917).
  effect: 9,
  // 69 Add Mana (Swell Mana): 36× JOINT_SPIRIT sub21 (= sub2) fan + BITMAP_MAGIC+1 sub10, at the release; no key
  // forces it (ZzzCharacter.cpp:2918, :4239-4258).
  visual: { impact: manaBurst, area: manaBurst },
  clip: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Mana
});
