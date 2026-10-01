import { defineSkill } from '@/controllers/skills/define';
import { FIRE_PUFF, MODEL, RGBS } from '@/controllers/fx/recipes';
import { atCaster, flying, particles, perTick, repeat, seq, steelHit, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { entityYaw } from '@/controllers/fx/core';
import { streamerFan } from '../../_shared';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 269,
  name: "Charge",
  // 269 Occupy (Charge): Rush's charge with BITMAP_FIRE sub18; impact MODEL_SWORD_FORCE sub2.
  visual: {
    cast: repeat(4, ticks(2), atCaster(streamerFan(4, 0.35, { velocity: perTick(40), seconds: ticks(8), maxTails: 4, width: 0.15, colour: RGBS.fire, pitch: -0.9 }), 0.2)),
    impact: seq(
      (at, c) => effects.spawn('model', c.scene, at, { model: MODEL.swordForce, seconds: ticks(15), scale: 1, colour: RGBS.fire, grow: 3, follow: flying(c, 1, perTick(10)), yaw: entityYaw(c.caster) }),
      particles({ recipe: FIRE_PUFF, count: 8 }),
      steelHit
    ),
  },
  sound: 'Sound/battlecastle/sCHaveyBlow', // Occupy
  clip: { ground: A.PLAYER_ATTACK_RUSH }, // Occupy (WSclient.cpp:4725)
  stepIn: 'cast',
});
