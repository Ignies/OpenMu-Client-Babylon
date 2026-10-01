import { defineSkill } from '@/controllers/skills/define';
import { IMPACT_HEIGHT, atCaster, offset, sprite, ticks } from '@/controllers/skills/visuals';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects } from '@/controllers/fx';
import { spiralRibbons } from '../../_shared';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 234,
  name: "Recovery",
  // 234 Recover: cast - BITMAP_IMPACT at caster (0,−220,130), Light (0.7,0.6,0), LT 80, Scale 0→; target - 19× JOINT
  // FLARE sub47 width 40 + MODEL_SUMMON (LT 60, Scale 0.7) + BITMAP_TWLIGHT sub0/1/2 + 2× FLARE sub3 on random bones.
  visual: {
    cast: atCaster(offset(sprite({ texture: TEX.impact3, colour: [0.7, 0.6, 0], size: 2, seconds: ticks(80), growFrom: 0, grow: 1.2 }), 2.2, 0.2), 1.1),
    impact: (at, c) => {
      const feet = at.clone();
      feet.y -= IMPACT_HEIGHT;
      effects.spawn('model', c.scene, feet, { model: MODEL.nightmareSummon, seconds: ticks(60), scale: 0.7, colour: RGBS.holy });
      if (c.target) spiralRibbons(6, RGBS.holy, 0.4, 10, ticks(40))(feet, c);
      effects.spawn('sprite', c.scene, feet, { texture: TEX.twilight, colour: RGBS.holy, size: 1.6, seconds: ticks(40), count: 3, spread: 0.2, height: 0.9, grow: 1.5, spin: 1 });
      effects.spawn('sprite', c.scene, feet, { texture: TEX.flareBig, colour: RGBS.holy, size: 0.5, seconds: ticks(30), count: 2, spread: 0.4, height: 1, rise: 0.5 });
    },
  },
  sound: 'Sound/recover', // Recovery
  clip: { ground: A.PLAYER_RECOVER_SKILL }, // Recovery (:4993-5000)
});
