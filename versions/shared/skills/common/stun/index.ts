import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { atCaster, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { followEntity } from '@/controllers/fx/core';

export default defineSkill({
  id: 67,
  name: "Stun",
  // 67 Stun: CreateJoint(BITMAP_FLASH sub7 at the caster).
  visual: { area: atCaster((at, c) => effects.spawn('joint', c.scene, at, { head: followEntity(c.caster, 1.2), maxTails: 10, width: 0.5, colour: RGBS.gold, seconds: ticks(20) }), 1.2) },
  buffs: {
    // 0x3D Stun: three ribbons climbing off the head, once.
    61: () => ({ stun: true }),
  },
});
