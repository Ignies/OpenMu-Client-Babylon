import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, SMOKE, TEX } from '@/controllers/fx/recipes';
import { ICE_MOTES } from '../_shared';
import { IMPACT_HEIGHT, arrow, cm, hitSparks, orbiting, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { entityYaw } from '@/controllers/fx/core';

import { frost } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 51,
  name: "Ice Arrow",
  checksArrows: true, // CheckArrow() before the shot (SkillCast.cpp:580)
  // ReceiveMagicFinish drops eDeBuff_Harden (WSclient.cpp:3935-3938).
  effect: 57,
  effectAliases: [424],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [424],
  // 51 Ice Arrow: at the packet, MODEL_ICE sub1 + sub2 (+180°) on the target LT 20 (WSclient.cpp:4479-4500), Scale 0.8,
  // BlendMeshLight 0.5, 3× BITMAP_SMOKE, a BITMAP_FIRE+2 sub10 orbiting r=60; the arrow at the release (ZzzCharacter.cpp:4902-4905).
  visual: {
    cast: (at, c) => {
      const feet = at.clone();
      feet.y -= IMPACT_HEIGHT;
      // At the target's Angle and that + 180 (WSclient.cpp:4486-4491); a node's yaw is MU's turned the other way.
      const yaw = c.target ? -entityYaw(c.target) : 0;
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5], yaw });
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5], yaw: yaw - Math.PI });
      effects.spawn('particles', c.scene, feet, { recipe: SMOKE, count: 3, height: 0.3 });
      if (c.target) effects.spawn('sprite', c.scene, feet, { texture: TEX.fire3, colour: RGBS.ice, size: 0.5, seconds: ticks(20), follow: orbiting(c.target, cm(60), 0.3, 4, 0), spin: 3 });
    },
    travel: { ...arrow(MODEL.arrow, RGBS.ice), release: true },
    impact: hitSparks(ICE_MOTES, 10),
  },
  // Ice Arrow: MODEL_ARROW range 2 (:11777), riding the arrow; the frost at the ice when it forms.
  light: { arrow: { ...frost(2, 3), release: 0.2 }, impact: frost(2, 0.4) },
});
