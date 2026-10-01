import { defineSkill } from '@/controllers/skills/define';
import { DUST, MODEL, RGBS, SMOKE } from '@/controllers/fx/recipes';
import { IMPACT_HEIGHT, SkillContext, Step, TICK, after, cm, model, particles, repeat, seq, ticks } from '@/controllers/skills/visuals';
import { type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { TW_NOGROUND, TW_NOMOVE, TW_WATER } from '@/controllers/terrain/consts';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { stones } from '../../_shared';
import { storeRef } from '@/app/storeRef';

/**
 * Earth Prison has no source: Season 6 only names EFFECT_EARTH_PRISON (_enum.h:4034). It is built from the
 * original's own stone ring, the Dark Horse earthshake's six MODEL_GROUND_STONE / STONE2 at 60 degree steps
 * from a random start (GOBoid.cpp:744-761), round the target instead of the horse.
 */
const EARTH_PRISON_RADIUS = 0.9;
/** BITMAP_SMOKE sub11 in (1, 0.8, 0.6) (MoveHandlers.cpp:5700-5702). */
const STONE_SMOKE: ParticleRecipe = { ...SMOKE, colour: [0.25, 0.18, 0.12], colourEnd: [0.1, 0.08, 0.06] };
const EARTH_BLOCKED = TW_NOMOVE | TW_NOGROUND | TW_WATER;

/**
 * Each stone (ZzzEffect.cpp:3480-3521, MoveHandlers.cpp:5688-5712): skipped on a NOMOVE, NOGROUND or water
 * tile; LT 40, Scale 1.2-1.5 (STONE2 1.0-1.3), random yaw, its clip at 0.3 a tick, opaque; smoke and a stone
 * chip each tick at LT 36-33, 60 cm off it and 50 up; Alpha x1/1.3 a tick over the last 8.
 */
const earthPrisonWith = (onStone?: (p: Vector3, c: SkillContext) => void): Step => (at, c) => {
  const world = storeRef().world;
  const feet = at.clone();
  feet.y -= IMPACT_HEIGHT;
  let a = Math.random() * Math.PI * 2;
  for (let i = 0; i < 6; i++) {
    a += Math.PI / 3;
    const x = feet.x + Math.cos(a) * EARTH_PRISON_RADIUS;
    const z = feet.z + Math.sin(a) * EARTH_PRISON_RADIUS;
    if (world && world.getTerrainFlag(Math.floor(x), Math.floor(z)) & EARTH_BLOCKED) continue;
    const p = new Vector3(x, world ? world.getTerrainHeight(x, z) : feet.y, z);
    const second = Math.random() < 0.5;
    effects.spawn('model', c.scene, p, {
      model: second ? MODEL.groundStone2 : MODEL.groundStone,
      seconds: ticks(40),
      scale: (second ? 1 : 1.2) + Math.floor(Math.random() * 30) / 100,
      yaw: Math.random() * Math.PI * 2,
      colour: RGBS.white,
      blendMesh: -1,
      fadeTail: 8 / 40,
    });
    const chip = new Vector3(x + cm(60), p.y + cm(50), z - cm(60));
    after(ticks(4), repeat(4, TICK, seq(particles({ recipe: STONE_SMOKE, count: 1 }), stones(1, 0.1))))(chip, c);
    onStone?.(p, c);
  }
  particles({ recipe: DUST, count: 20 })(feet, c);
};
const earthPrison = earthPrisonWith();

/** Earth Prison, Enhanced: the ground split under the ring, dust and chips burst from each stone's base. */
const PRISON_CRACK: RGB = [0.45, 0.3, 0.16];
const PRISON_DUST: ParticleRecipe = { ...DUST, colour: [0.4, 0.33, 0.24], size: 0.8, life: 0.9, power: 1.2, box: [0.25, 0.05, 0.25], dir1: [-0.8, 0.4, -0.8], dir2: [0.8, 1, 0.8] };

/**
 * Enhanced Earth Prison: every Classic stone, each breaking out of the ground in a burst of dust and chips,
 * and the ground under the ring split by a crack mark glowing the stones' dust tint.
 */
const earthPrisonEnhanced: Step = seq(
  earthPrisonWith((p, c) => {
    particles({ recipe: PRISON_DUST, count: 6 })(p, c);
    stones(2, 0.25)(p, c);
  }),
  (at, c) => {
    const feet = at.clone();
    feet.y -= IMPACT_HEIGHT;
    model({ model: MODEL.knightPlanCrack, seconds: ticks(40), scale: 1.3, colour: PRISON_CRACK, flat: true, yaw: Math.random() * Math.PI * 2, fadeTail: 0.3 })(feet, c);
  }
);

export default defineSkill({
  id: 495,
  name: "Earth Prison",
  // 495 Earth Prison (497 its Strengthener through the aliases): no source; the ground stone ring (earthPrison). Enhanced: earthPrisonEnhanced.
  visual: { impact: earthPrison, enhanced: { impact: earthPrisonEnhanced } },
});
