import { defineSkill } from '@/controllers/skills/define';
import { MODEL, POISON_BUBBLES, POISON_MIST, POISON_SMOKE, RGBS } from '@/controllers/fx/recipes';
import { Step, particles, seq, ticks } from '@/controllers/skills/visuals';
import { atRelease, groundFlare, releaseSound } from '../_shared';
import { effects } from '@/controllers/fx';
import { entityYaw } from '@/controllers/fx/core';
import { lighting } from '@/controllers/lighting';

/**
 * 1 Poison (ZzzCharacter.cpp:4992-5005): MODEL_POISON at the target's feet, facing as the caster does, only
 * when a player casts it (LT 40, BlendMesh 1, both meshes fading over the last 10 ticks through
 * `BlendMeshLight = Alpha = LT/10`, MoveHandlers.cpp:2742-2752); 10 BITMAP_SMOKE sub1 for anyone; SOUND_HEART.
 * The model is terrain-lit in the original (its Light is the caster's offset); white stands in.
 */
const poisonCloud = (extra?: Step): Step =>
  atRelease((feet, c) => {
    if (c.caster.charAppearance) {
      effects.spawn('model', c.scene, feet, { model: MODEL.poison, seconds: ticks(40), scale: 1, colour: RGBS.white, blendMesh: 1, yaw: entityYaw(c.caster), loop: false, fadeTail: 0.25 });
    }
    particles({ recipe: POISON_SMOKE, count: 10, height: 0.64 })(feet, c);
    releaseSound('Sound/pHeartBeat')(feet, c);
    lighting.skillLand(c.scene, 1, feet);
    extra?.(feet, c);
  });

/** Poison on the graded tiers: the same cloud over a venom glow on the ground, a low green haze and bubbles rising through it. */
const poisonImproved: Step = seq(
  groundFlare([0.2, 0.75, 0.4], 2.4, ticks(40)),
  particles({ recipe: POISON_MIST, count: 8, height: 0.1 }),
  particles({ recipe: POISON_BUBBLES, rate: 14, seconds: ticks(34), height: 0.3 })
);

export default defineSkill({
  id: 1,
  name: "Poison",
  // 1 Poison: at the release, MODEL_POISON + 10 BITMAP_SMOKE sub1 at the target's feet (poisonCloud).
  visual: { impact: poisonCloud(), enhanced: { impact: poisonCloud(poisonImproved) } },
});
