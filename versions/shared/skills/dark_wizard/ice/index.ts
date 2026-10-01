import { defineSkill } from '@/controllers/skills/define';
import { FROST_GLINTS, ICE_MIST, ICE_SHARD_SMOKE, ICE_SMOKE, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Step, after, particles, ring, seq, ticks } from '@/controllers/skills/visuals';
import { atRelease, groundFlare, releaseSound } from '../_shared';
import { delay, entityYaw } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

/**
 * 7 Ice (ZzzCharacter.cpp:4955-4969): MODEL_ICE at the target's feet, Scale 0.8, Light (1, 1, 1), its only
 * mesh the additive blend mesh, clip at 1 key a tick held at key 5; from then a BITMAP_SMOKE one tick in two,
 * and it pops out when `Alpha -= 0.05` crosses 0, about 25 ticks in (ZzzEffect.cpp:2187-2195, :7637-7661).
 * 5 MODEL_ICE_SMALL thrown from 50 cm up at BlendMeshLight 0.3 (ZzzEffect.cpp:2719-2790). SOUND_ICE.
 */
const iceCrystal = (extra?: Step): Step =>
  atRelease((feet, c) => {
    effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(25), scale: 0.8, colour: RGBS.white, yaw: entityYaw(c.caster), keysPerTick: 1, playTo: 5, fadeTail: 0.04 });
    const smokeAt = feet.clone();
    delay(ticks(5), () => effects.spawn('particles', c.scene, smokeAt, { recipe: ICE_SMOKE, rate: 12.5, seconds: ticks(20), height: 0.955 }));
    effects.spawn('debris', c.scene, feet, { model: MODEL.ice2, count: 5, colour: [0.3, 0.3, 0.3], liftCm: 50, puff: ICE_SHARD_SMOKE });
    releaseSound('Sound/sIce')(feet, c);
    lighting.skillLand(c.scene, 7, feet);
    extra?.(feet, c);
  });

/** Ice on the graded tiers: the same crystal over a frost ring and glow on the ground, cold mist rolling out and glints. */
const iceImproved: Step = seq(
  ring({ texture: TEX.shockwave, colour: [0.45, 0.7, 1], scale: 0.8, grow: 2.6, growFrom: 0.4, seconds: 0.4, fadeTail: 0.7 }),
  groundFlare([0.35, 0.6, 1], 2, ticks(25)),
  particles({ recipe: ICE_MIST, count: 8, height: 0.08 }),
  after(ticks(3), particles({ recipe: FROST_GLINTS, rate: 20, seconds: ticks(20), height: 0.6 }))
);

export default defineSkill({
  id: 7,
  name: "Ice",
  // 7 Ice: at the release, MODEL_ICE + 5 MODEL_ICE_SMALL at the target's feet (iceCrystal). Enhanced: frost on the ground, mist and glints.
  visual: { impact: iceCrystal(), enhanced: { impact: iceCrystal(iceImproved) } },
});
