import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityPos, entityYaw } from '@/controllers/fx/core';
import { explosion, seq, slash, steelHit } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 260,
  name: "Killing Blow",
  // 260-270 Rage Fighter (MonkSystem.cpp RageCreateEffect).
  // 260 Killing Blow: MODEL_WOLF_HEAD_EFFECT at the caster aimed at the target + BITMAP_SBUMB Scale 2.1 there.
  visual: {
    cast: seq(
      slash(RGBS.gold, TEX.motionBlur, 0.7),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: MODEL.wolfHead, seconds: 0.6, colour: RGBS.gold, grow: 1.4, yaw: entityYaw(c.caster) })
    ),
    impact: seq(steelHit, explosion(RGBS.gold, 0.9)),
  },
});
