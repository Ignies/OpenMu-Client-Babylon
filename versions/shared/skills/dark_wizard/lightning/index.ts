import { defineSkill } from '@/controllers/skills/define';
import { ENERGY_CHIPS, RGBS, TEX } from '@/controllers/fx/recipes';
import { IMPACT_HEIGHT, arcHit, cm, ticks, weaponBone } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { followEntity } from '@/controllers/fx/core';

export default defineSkill({
  id: 3,
  name: "Lightning",
  // 3 Lightning: SOUND_THUNDER01 at cast; per frame JOINT_THUNDER weaponBone → target (width 50 + width 10,
  // LT 2, MaxTails 50, Vel 50) + BITMAP_ENERGY particles at the bone. Bolts re-roll every 2 ticks for the clip.
  visual: {
    impact: (at, c) => {
      const from = weaponBone(c.caster);
      const to = c.target ? followEntity(c.target, IMPACT_HEIGHT) : at;
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.arc, seconds: ticks(10), width: cm(50), segments: 24, forks: 2, jitter: 0.1, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.white, seconds: ticks(10), width: cm(10), segments: 24, jitter: 0.12, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      effects.spawn('particles', c.scene, at, { recipe: ENERGY_CHIPS, rate: 25, seconds: ticks(10), follow: from });
      arcHit(at, c);
    },
  },
});
