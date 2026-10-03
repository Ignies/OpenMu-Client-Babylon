import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { after, arcHit, atCaster, flying, perTick, seq, slash, sprite, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { entityPos, entityYaw } from '@/controllers/fx/core';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 262,
  name: "Chain Drive",
  // A hit does not cut the swing short, and the target is swung round on the facing it started with
  // (ZzzCharacter.cpp:1283-1297, ZzzInterface.cpp:7394-7419).
  noFlinch: [A.PLAYER_SKILL_GIANTSWING],
  holdsFacing: [A.PLAYER_SKILL_GIANTSWING],
  // 262 Chain Drive: BITMAP_SWORDEFF at the caster; the giant-swing MODEL_SHOCKWAVE01 wave runs at the target.
  visual: {
    cast: seq(
      slash(RGBS.arc, TEX.motionBlur, 0.7),
      atCaster(sprite({ texture: TEX.swordEff, colour: RGBS.arc, size: 1.6, seconds: 0.5, spin: 4, grow: 1.6 }), 0.9),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(15), scale: 0.8, colour: RGBS.arc, follow: flying(c, 0.05, perTick(40)), yaw: entityYaw(c.caster) })
    ),
    impact: seq(arcHit, after(0.12, arcHit), after(0.24, arcHit)),
  },
  sound: 'Sound/Ragefighter/Rage_Giantswing', // Chain Drive (MonkSystem.cpp:1125)
  delayMs: 700, // Chain Drive
  clip: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive
  stepIn: 'midClip',
});
