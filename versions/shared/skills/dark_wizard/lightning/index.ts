import { defineSkill } from '@/controllers/skills/define';
import { ENERGY_CHIPS, RGBS, TEX } from '@/controllers/fx/recipes';
import { IMPACT_HEIGHT, arcHit, cm, ticks, weaponBone } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { followEntity } from '@/controllers/fx/core';

import { arc } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 3,
  name: "Lightning",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [379],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [480],
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
  // 1 Poison, 2 Meteorite, 4 Fire Ball, 7 Ice and their masters: none at the cast; the original plays them at the
  // release, 14 ticks after the packet (ZzzCharacter.cpp:4955-5034), and the rows do (controllers/skills/visuals.ts).
  // So do 11 Power Wave, 17 Energy Ball (sMagic) and 45 Lance (sCShockWave), ZzzCharacter.cpp:5011-5143.
  sound: 'Sound/eThunder', // Lightning
  // BITMAP_LIGHTNING: range 6 on the strike (ZzzEffectParticle.cpp:4298).
  // 0.4 s is the clip: the bolt is `ticks(10)` in skillVisuals, and a light
  // that ends before its effect leaves the ground dark under a live bolt.
  light: { impact: arc(6, 0.4, { gain: 1.4 }) },
});
