import { defineSkill } from '@/controllers/skills/define';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { entityGone, fixedPoint, scaleRGB, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, cm, perTick, repeat, ring, seq, ticks } from '@/controllers/skills/visuals';
import { type SummonBody } from '@/controllers/fx/summon';
import { SummonCast, bodyLight, bookTier, curseLight, levelLight, summonCast, summonCastGrace, yawToward } from '../_shared';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { rad, randInt } from '../../_shared';

const CAST_POLLUTION: SummonCast = { impact: [0.6, 0.6, 0.9], outer: [0.6, 0.3, 0.9], inner: [0.8, 0.1, 0.6], burst: [0.9, 0.1, 1] };

/** JOINT_ENERGY sub48-53 ride these Lagul bones (ZzzEffectJoint.cpp:3161-3196); the blue shiny05 sit on 54-59 (ZzzEffect.cpp:8927-8936). */
const LAGUL_TRAIL_BONES = [24, 28, 32, 44, 48, 52];
const LAGUL_SHINY_BONES = [54, 55, 56, 57, 58, 59];
/** Spirit ribbons by book tier (SummonSystem.cpp:186-192) and the controller's odds a tick (MoveHandlers.cpp:1310). */
const LAGUL_RIBBONS = [1, 2, 4];
const LAGUL_ODDS = [5, 4, 3];

/**
 * BITMAP_SMOKE sub57 (smoke01, 64 px): LT 32, Scale `s x (1.48..1.79)` growing 0.05 a tick, rising on a
 * gravity that gains 0.1 cm a tick (53 cm over its life), light (0.5, 0.1, 0.8) x LT / 32 whatever it was
 * made with (ZzzEffectParticle.cpp:1355-1359, :5753-5758).
 */
function pollutionSmoke(c: SkillContext, p: Vector3, s: number): void {
  effects.spawn('sprite', c.scene, p, { texture: TEX.smoke, colour: [0.5, 0.1, 0.8], size: cm(64) * s * (1.48 + randInt(32) * 0.01), scaleRate: perTick(3.2), rise: cm(53) / ticks(32), seconds: ticks(32), fadeTail: 1 });
}
/**
 * BITMAP_TWINTAIL_WATER sub1 (water.jpg, 32 px): within 40 cm and 0..80 cm up, LT 20..29, Scale 0.5..0.81
 * shrinking 0.013 a tick, rising 2..2.9 cm a tick, light x 1/1.02 a tick (ZzzEffectParticle.cpp:1127-1143, :5255-5270).
 */
function pollutionDrop(c: SkillContext, p: Vector3, colour: RGB): void {
  const at = new Vector3(p.x + cm(randInt(80) - 40), p.y + cm(randInt(80)), p.z + cm(randInt(80) - 40));
  effects.spawn('sprite', c.scene, at, { texture: TEX.water, colour, size: cm(32) * (0.5 + randInt(32) * 0.01), scaleRate: -perTick(32 * 0.013), rise: perTick(2 + randInt(10) * 0.1), decay: 1 / 1.02, seconds: ticks(20 + randInt(10)), fadeTail: 0 });
}

/** The Lagul's light: its blue shiny05 and laser trails. */
const LAGUL_TINT: RGB = [0.5, 0.55, 1];
/** The cloud field's violet (the clouds.jpg decals and smoke). */
const POLLUTION_TINT: RGB = [0.6, 0.12, 1];
/** Violet motes drifting up out of the cloud field. */
const POLLUTION_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.6, 0.2, 1],
  size: 0.22,
  sizeJitter: 0.5,
  life: 1.8,
  lifeJitter: 0.4,
  box: [2.2, 0.15, 2.2],
  dir1: [-0.1, 0.3, -0.1],
  dir2: [0.1, 0.7, 0.1],
  power: 0.5,
  endScale: 0.4,
  fade: [
    [0, 0],
    [0.25, 1],
    [0.7, 0.6],
    [1, 0],
  ],
  capacity: 128,
};

/** The cloud field's light for its 160 ticks, flickering with the decals, a violet pool under it and motes rising. */
function pollutionGrace(c: SkillContext, point: Vector3): void {
  const at = new Vector3(point.x, point.y + 0.05, point.z);
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: scaleRGB(POLLUTION_TINT, 0.12), size: 5, seconds: ticks(160), fadeIn: 0.1, fadeTail: 0.2, flat: true });
  effects.spawn('particles', c.scene, at, { recipe: POLLUTION_MOTES, rate: 20, seconds: ticks(150), height: 0.1 });
  curseLight(c.scene, POLLUTION_TINT, 2.5, ticks(160), at, undefined, { attack: ticks(15), release: ticks(30), heightOffset: 0.8, floorGain: 0.25, flicker: { min: 0.8, max: 1.05, steps: 4 } });
}

/**
 * 225 Pollution (SummonSystem.cpp:175-195). At the point for 160 ticks, a controller that on one tick in
 * 5 / 4 / 3 (book tier) drops a violet smoke01 puff (Scale 3.5) within 2.5 tiles, and within 2 tiles a
 * clouds.jpg decal (2 tiles growing 0.03 a tick, LT 60, (0.6, 0.1, 1) x 1/1.05 a tick, flickering 0.8..1.1)
 * with a water drop (MoveHandlers.cpp:1306-1330, ZzzEffect.cpp:1137-1143, :9902-9907, MoveHandlers.cpp:1964-1974).
 * And 1 / 2 / 4 JOINT_SPIRIT sub24 (width 100, JointSpirit01, 40 tails, 10 cm a tick, LT 160) from 1.5
 * tiles round the point at world headings 90 deg apart, humming round the point 80 cm up (5 deg a tick
 * and damped +-3.2 / +-12.8 deg kicks), (0.7, 0.7, 0.9) in over 16 ticks and out over 30
 * (ZzzEffectJoint.cpp:903-924, :4138-4170). Each carries a MODEL_SUMMONER_SUMMON_LAGUL at Scale 100 / 70:
 * meshes 0 / 1 bright in terrain + (0, 0, 0.1), mesh 2 not drawn, Alpha 0 -> 0.75 over 15 ticks and
 * LT / 40 over the last 30 (MoveHandlers.cpp:1332-1339, ZzzObject.cpp:1767-1771); six blue shiny05 on bones
 * 54-59, a violet smoke (Scale 2) and a water drop off a random bone on one tick in five, and six
 * JointLaser01 trails (width 10, 3 tails) on bones 24-52 (ZzzEffect.cpp:808-827, :8922-8945). The width-20
 * twin of each ribbon never gets a Lagul (20 / 70 < 0.9) and dies on its first tick, so it is not drawn.
 */
const pollutionOf = (graded: boolean): Step => (at, c) => {
  if (entityGone(c.caster)) return;
  const tier = bookTier(c.caster);
  const point = at.clone();
  const odds = LAGUL_ODDS[tier];
  if (graded) pollutionGrace(c, point);
  repeat(160, TICK, (_p, cc) => {
    if (randInt(odds) !== 0) return;
    pollutionSmoke(cc, new Vector3(point.x + cm(randInt(500) - 250), point.y, point.z + cm(randInt(500) - 250)), 3.5);
    const spot = new Vector3(point.x + cm(randInt(400) - 200), point.y, point.z + cm(randInt(400) - 200));
    ring({ texture: TEX.cloud, colour: [0.6, 0.1, 1], scale: 2, grow: (2 + 0.03 * 60) / 2, seconds: ticks(60), spinFrom: randInt(360), alphaAt: p => 1.05 ** (-60 * p) * (0.8 + randInt(4) * 0.1) })(spot, cc);
    pollutionDrop(cc, spot, [0.6, 0.1, 1]);
  })(point, c);

  const seek = fixedPoint(new Vector3(point.x, point.y + cm(80), point.z));
  const lagulLight = bodyLight(point, [0, 0, 0.1]);
  for (let i = 0; i < LAGUL_RIBBONS[tier]; i++) {
    const start = new Vector3(point.x + cm(randInt(300) - 150), point.y, point.z + cm(randInt(300) - 150));
    const head = start.clone();
    const heading = new Vector3(Math.sin(rad(i * 90)), 0, Math.cos(rad(i * 90)));
    effects.spawn('joint', c.scene, start, {
      velocity: perTick(10),
      heading,
      steer: { seek, seekRate: rad(5), wander: { pitch: rad(3.2), yaw: rad(12.8) } },
      maxTails: 40,
      width: 1,
      texture: TEX.jointSpirit,
      colour: [0.7, 0.7, 0.9],
      seconds: ticks(160),
      fadeIn: 16 / 160,
      fadeTail: 30 / 160,
      track: h => head.copyFrom(h),
    });
    const prev = start.clone();
    const bone = new Vector3();
    let rigged = false;
    let done = 0;
    let body: SummonBody | null = null;
    if (graded) levelLight(c.scene, LAGUL_TINT, 0.9, ticks(160), head.clone(), out => out.copyFrom(head), () => (body ? body.alpha / 0.75 : 0), { release: ticks(4) });
    const lagul = effects.spawn('summon', c.scene, start, {
      model: MODEL.summonLagul,
      seconds: ticks(160),
      scale: 100 / 70,
      alpha: 0,
      meshes: [{ draw: 'add', colour: lagulLight }, { draw: 'add', colour: lagulLight }, { draw: 'hide' }],
      drive: (b, t) => {
        b.alpha = t <= 15 ? t / 20 : t < 130 ? 0.75 : (160 - t) / 40;
        body = b;
        b.at.copyFrom(head);
        if ((head.x - prev.x) ** 2 + (head.z - prev.z) ** 2 > 1e-8) b.yaw = yawToward(prev, head);
        prev.copyFrom(head);
        if (!b.loaded) return;
        if (!rigged) {
          rigged = true;
          const gone = (): boolean => !lagul.alive;
          const left = ticks(160 - t);
          const on = (n: number): PointSource => out => (b.bone(n, out) ? out : out.copyFrom(b.at));
          for (const n of LAGUL_SHINY_BONES) {
            effects.spawn('sprite', c.scene, b.at, { texture: TEX.shiny5, colour: [0.2, 0.3, 1], size: cm(64) * (100 / 70) * 0.3, seconds: left, fadeTail: 0, follow: on(n), until: gone });
          }
          for (const n of LAGUL_TRAIL_BONES) {
            effects.spawn('joint', c.scene, b.at, { head: on(n), maxTails: 3, width: cm(10), texture: TEX.jointLaser, colour: [0.5, 0.5, 0.9], seconds: left, fadeTail: 0, until: gone });
          }
        }
        for (; done < Math.floor(t); done++) {
          if (randInt(5) !== 0 || !b.bone(randInt(b.boneCount), bone)) continue;
          pollutionSmoke(c, bone, 2);
          pollutionDrop(c, bone, [0.7, 0.7, 1]);
        }
      },
    });
  }
};

export default defineSkill({
  id: 225,
  name: "Pollution",
  // 225 Pollution: the casting circle, and at the point for 160 ticks violet smoke, clouds and drops with the
  // Laguls riding their spirit ribbons round it (summonCast, pollution).
  visual: {
    cast: summonCast(CAST_POLLUTION),
    area: pollutionOf(false),
    enhanced: { cast: seq(summonCast(CAST_POLLUTION), summonCastGrace(CAST_POLLUTION)), area: pollutionOf(true) },
  },
  sound: 'Sound/Rargle', // Pollution (SOUND_SUMMOM_RARGLE)
});
