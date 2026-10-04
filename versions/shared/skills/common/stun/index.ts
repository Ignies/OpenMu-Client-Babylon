import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { NO_KEY, afterRelease, atCaster, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { followEntity } from '@/controllers/fx/core';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_COMMAND } from '../../_shared';

export default defineSkill({
  id: 67,
  name: "Stun",
  // ReceiveMagicFinish drops eDeBuff_Stun (WSclient.cpp:3909-3911).
  effect: 61,
  // 67 Stun: CreateJoint(BITMAP_FLASH sub7 at the caster), at the release; no key forces it (ZzzCharacter.cpp:2917, :4214-4219).
  visual: { area: afterRelease(atCaster((at, c) => effects.spawn('joint', c.scene, at, { head: followEntity(c.caster, 1.2), maxTails: 10, width: 0.5, colour: RGBS.gold, seconds: ticks(20) }), 1.2), { clips: NO_KEY }) },
  buffs: {
    // 0x3D Stun: three ribbons climbing off the head, once.
    61: () => ({ stun: true }),
  },
  // --- Castle siege commands (AttackCommon, ZzzInterface.cpp:6442-6690) ----
  clip: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Stun
});
