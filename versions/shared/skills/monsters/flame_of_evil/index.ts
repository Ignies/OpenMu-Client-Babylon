import { defineSkill } from '@/controllers/skills/define';
import { EFFECT_LUMINOSITY } from '@/controllers/lighting/skills';
import { BOMB_SPARKS, DUST, FIRE_PUFF, FIRE_SPARKS, FIRE_TRAIL, MODEL, RGBS, SHADE_MOTES, TEX } from '@/controllers/fx/recipes';
import { DEG, FIRE_BLEND_MESH, FX_FLICKER, dropOldest, groundAt, lightHere, magicScrew, muForward, randInt, rideLightFor, stones, writePath } from '../../_shared';
import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { type ModelOptions } from '@/controllers/fx/model';
import { delay, entityGone, entityPos, entityYaw, fxNow, scaleRGB, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { SkillContext, Step, TICK, cm, explosion, forwardOf, model, particles, repeat, scorch, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { type SpriteOptions } from '@/controllers/fx/sprite';
import { effectLight } from '@/controllers/lighting/recipes';
import { effects } from '@/controllers/fx';

/** MODEL_FIRE sub0 / sub1 in flight: (1, 0.1, 0) * Luminosity at range 2 (ZzzEffect.cpp:7936-7945). */
const METEOR_LIGHT: LightRecipe = {
  color: [1, 0.1, 0],
  range: 2,
  seconds: 0.4,
  release: 0.04,
  flicker: EFFECT_LUMINOSITY,
};

/** MODEL_SKILL_BLAST and MODEL_STAFF_OF_DESTRUCTION in flight: (0.2, 0.4, 1) * Luminosity at range 2 (MoveHandlers.cpp:2576, :4361). */
const BLAST_LIGHT: LightRecipe = {
  color: [0.2, 0.4, 1],
  range: 2,
  seconds: 0.4,
  release: 0.04,
  flicker: EFFECT_LUMINOSITY,
};

/** MODEL_CIRCLE_LIGHT sub0: (1, 0.8, 0.2) * Luminosity at range 4 for its 40 ticks (MoveHandlers.cpp:3862). */
const HELLFIRE_CIRCLE_LIGHT: LightRecipe = {
  color: [1, 0.8, 0.2],
  range: 4,
  seconds: 1.6,
  release: 0.08,
  flicker: EFFECT_LUMINOSITY,
};

/**
 * BITMAP_BOSS_LASER sub0: (0.5, 0.7, 1) at range 2 on each of its 20 cards, 50 cm apart, for 20
 * ticks (ZzzEffect.cpp:8990-9003). Two range-3 lights per beam stand in for the twenty.
 */
const BOSS_LASER_LIGHT: LightRecipe = {
  color: [0.5, 0.7, 1],
  range: 3,
  seconds: 0.8,
  release: 0.04,
};
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';

// AT_SKILL_BOSS (rows 50 / 150): the per-monster branches of AttackEffect.

/** The 0x19 only sets AttackTime 1 (WSclient.cpp:4824-4826); AttackEffect runs on ticks 1..14 (ZzzCharacter.cpp:4132-4141). */
const BOSS_TICKS = 14;
/** MODEL_FIRE sub0 / MODEL_SKILL_BLAST: Angle (0, 20, 0) tips their Dir(0, 0, -v) 20 degrees toward -x (ZzzEffect.cpp:2555, :1363). */
const FALL_TILT = 20 * DEG;
/** MODEL_STAFF_OF_DESTRUCTION = MODEL_STAFF + 8 (_enum.h:1606). */
const STAFF_OF_DESTRUCTION = 'Item/Staff09.glb';
/** BITMAP_BOSS_LASER sub0's Light (ZzzEffect.cpp:985). */
const BOSS_LASER_TINT: RGB = [0.5, 0.7, 1];

/** A light riding `where`, which its effect keeps moving. */
function rideLight(scene: Scene, recipe: LightRecipe, where: Vector3): void {
  lighting.flash(scene, recipe, {
    position: { x: where.x, y: where.y, z: where.z },
    follow: out => {
      out.x = where.x;
      out.y = where.y;
      out.z = where.z;
    },
  });
}

// Enhanced and Ultra: the same bodies, glowing where they fly, throwing sparks and embers where they land,
// and each lit by a light the size and colour of its art.

/** The orange MODEL_FIRE's art shows (METEOR_LIGHT's (1, 0.1, 0) is the original's terrain red). */
const METEOR_TINT: RGB = [1, 0.42, 0.12];
const BLAST_TINT: RGB = [0.35, 0.55, 1];
/** Phantom Knight's BITMAP_LIGHT and Dark Phoenix's spirits. */
const PHANTOM_TINT: RGB = [0.8, 0.4, 1];
const PHOENIX_TINT: RGB = [1, 0.5, 0.1];
/** The phoenix's spirits drawn deeper: (1, 0.5, 0.1) added over lit grass clips red first and reads yellow under the tone curve. */
const PHOENIX_GRADED_TINT: RGB = [0.8, 0.3, 0.04];
const METEOR_GLOW: Omit<SpriteOptions, 'follow' | 'seconds'> = { texture: TEX.flare, colour: [0.9, 0.38, 0.1], size: 1.3, fadeTail: 0.1 };
const BLAST_GLOW: Omit<SpriteOptions, 'follow' | 'seconds'> = { texture: TEX.flareBlue, colour: [0.45, 0.65, 1], size: 1.2, fadeTail: 0.1 };
const STAFF_GLOW: Omit<SpriteOptions, 'follow' | 'seconds'> = { texture: TEX.flareBlue, colour: [0.35, 0.5, 0.9], size: 0.8, fadeTail: 0.1 };
/** Riding lights: the body's glow reaches about a tile; the fall sets `seconds`. */
const METEOR_RIDE_LIGHT = effectLight(METEOR_TINT, 1, 0, { flicker: FX_FLICKER, release: ticks(2) });
const BLAST_RIDE_LIGHT = effectLight(BLAST_TINT, 1, 0, { flicker: FX_FLICKER, release: ticks(2) });
const STAFF_RIDE_LIGHT = effectLight(BLAST_TINT, 0.8, 0, { flicker: FX_FLICKER, release: ticks(2) });
/** The landing: BITMAP_EXPLOTION is 2.56 tiles across and bright for about 12 of its 20 ticks. */
const METEOR_LAND_LIGHT = effectLight(METEOR_TINT, 1.3, ticks(14), { release: ticks(10) });
const BLAST_LAND_LIGHT = effectLight(BLAST_TINT, 1.5, ticks(16), { release: ticks(12) });
const HOT_SPARKS: ParticleRecipe = { ...FIRE_SPARKS, size: 0.14, power: 4, gravity: -5, dir1: [-0.8, 0.6, -0.8], dir2: [0.8, 1.4, 0.8], capacity: 256 };
const BLUE_SPARKS: ParticleRecipe = { ...BOMB_SPARKS, texture: TEX.flare, colour: [0.55, 0.75, 1], colourEnd: [0.1, 0.2, 0.6], size: 0.14, power: 4, capacity: 256 };
const DUST_PUFF: ParticleRecipe = { ...DUST, size: 0.5, life: 0.8, power: 1, capacity: 128 };
/** Embers lifting off a fire on the ground (the inferno, the Balrog's circle). */
const GROUND_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.5, 0.15],
  colourEnd: [0.5, 0.12, 0.02],
  size: 0.14,
  sizeJitter: 0.4,
  life: 1,
  lifeJitter: 0.3,
  box: [1.6, 0.05, 1.6],
  dir1: [-0.2, 1, -0.2],
  dir2: [0.2, 1, 0.2],
  power: 1.4,
  powerJitter: 0.4,
  gravity: 0.2,
  endScale: 0.3,
  capacity: 128,
};
/** Four of the spirits' heads carry a light as wide as their 2.56-tile flare, for their 49 ticks. */
const PHANTOM_HEAD_LIGHT = effectLight(PHANTOM_TINT, 1.3, ticks(50), { release: ticks(12) });
const PHOENIX_HEAD_LIGHT = effectLight(PHOENIX_TINT, 1.2, ticks(50), { release: ticks(12) });
const PHANTOM_SPARKS: ParticleRecipe = { ...SHADE_MOTES, colour: [0.85, 0.5, 1], colourEnd: [0.3, 0.1, 0.5], size: 0.18, life: 0.7, power: 4, gravity: -1, endScale: 0.4, capacity: 128 };

/** A soft tinted pool on the ground under an effect. */
const groundGlowStep = (colour: RGB, size: number, seconds: number): Step =>
  sprite({ texture: TEX.flare, colour, size, growFrom: 0.5, seconds, fadeTail: 0.6, flat: true, height: 0.04 });

interface Fall {
  model: Omit<ModelOptions, 'follow' | 'seconds'>;
  trail?: ParticleRecipe;
  light?: LightRecipe;
  /** A card riding the body for its flight (the graded tiers' glow). */
  glow?: Omit<SpriteOptions, 'follow' | 'seconds'>;
  /** Where it meets the ground; not called when its life runs out first. */
  land?: Step;
  /** MODEL_SKILL_BLAST's JOINT_ENERGY sub5 tail, width 100, 10 tails (ZzzEffect.cpp:1364, ZzzEffectJoint.cpp:285). */
  energyTail?: boolean;
}

/** An effect model moving `v` tiles a tick until it is below the ground or `lifeTicks` run out (MoveParticle + its terrain test). */
function fallFrom(c: SkillContext, start: Vector3, v: Vector3, lifeTicks: number, o: Fall): void {
  const end = start.clone();
  let landed = false;
  let n = 0;
  while (n < lifeTicks && !landed) {
    n++;
    end.addInPlace(v);
    const ground = groundAt(end.x, end.z, start.y - 50);
    if (end.y < ground) {
      end.y = ground;
      landed = true;
    }
  }
  const head = start.clone();
  effects.spawn('projectile', c.scene, start, {
    to: end,
    speed: v.length() / TICK,
    model: o.model,
    ...(o.trail ? { trail: { recipe: o.trail, rate: 25 } } : {}),
    trace: p => head.copyFrom(p),
    onArrive: p => {
      if (landed) o.land?.(p, c);
    },
  });
  if (o.light) rideLight(c.scene, { ...o.light, seconds: ticks(n) }, head);
  if (o.glow) effects.spawn('sprite', c.scene, start, { ...o.glow, seconds: ticks(n), follow: out => out.copyFrom(head) });
  if (o.energyTail) {
    effects.spawn('joint', c.scene, start, { head: out => out.copyFrom(head), maxTails: 10, width: 1, colour: RGBS.white, texture: TEX.jointEnergy, seconds: ticks(n), fadeTail: 0 });
  }
}

/** BITMAP_EXPLOTION 80 cm up in white and six MODEL_STONE1/2 (ZzzEffect.cpp:7809-7856, MoveHandlers.cpp:4351-4358). */
const groundBurst: Step = (at, c) => {
  explosion(RGBS.white)(new Vector3(at.x, at.y + cm(80), at.z), c);
  stones(6)(at, c);
};

/** Graded: the burst, hot sparks, a puff of dust, the fire's pool, melted snow and its light (no grass fire: 14 a cast char the whole field). */
const bossMeteorLanding: Step = seq(
  groundBurst,
  particles({ recipe: HOT_SPARKS, count: 10, height: 0.3 }),
  particles({ recipe: FIRE_PUFF, count: 3, height: 0.2 }),
  particles({ recipe: DUST_PUFF, count: 2, height: 0.1 }),
  groundGlowStep(scaleRGB(METEOR_TINT, 0.45), 2.4, ticks(16)),
  scorch(0.8),
  lightHere(METEOR_LAND_LIGHT)
);

const blastLanding: Step = (at, c) => {
  stones(6)(at, c);
  // BITMAP_SHINY+4 sub0: LT 20, Scale sin(LT * 10) * 3 + 2 (1 -> 5 -> 2.5), Light LT / 5 (ZzzEffectParticle.cpp:7326-7331).
  sprite({ texture: TEX.shiny5, colour: RGBS.white, size: cm(64) * 5, growFrom: 0.2, grow: 0.5, seconds: ticks(20), fadeTail: 0.25, height: cm(80) })(at, c);
  explosion(RGBS.white)(new Vector3(at.x, at.y + cm(80), at.z), c);
};
/** Graded: the same, blue sparks and a shock ring running out on the ground, dust, and its light. */
const blastLandingGraded: Step = seq(
  blastLanding,
  particles({ recipe: BLUE_SPARKS, count: 12, height: 0.4 }),
  particles({ recipe: DUST_PUFF, count: 2, height: 0.1 }),
  sprite({ texture: TEX.ring, colour: [0.3, 0.5, 1], size: 0.6, grow: 4, growFrom: 1, seconds: ticks(12), fadeTail: 0.7, flat: true, height: 0.05 }),
  groundGlowStep([0.12, 0.2, 0.45], 2.6, ticks(16)),
  lightHere(BLAST_LAND_LIGHT)
);
/** Graded staff landing: the burst with a few blue sparks; every third one carries the ring's light. */
const staffLanding: Step = seq(groundBurst, particles({ recipe: BLUE_SPARKS, count: 5, height: 0.3 }));
const staffLandingLit: Step = seq(staffLanding, lightHere(BLAST_LAND_LIGHT));

/**
 * MODEL_FIRE sub0 on `spot` (ZzzEffect.cpp:2548-2556, :7732-7856, :7920-7962): LT 40, Scale 1.0-1.7, from
 * +130..161 cm x and +400 cm up, 50 cm a tick along its tilt, a BITMAP_FIRE a frame and a red range-2
 * light; on the ground the burst. SOUND_METEORITE01 as it is made.
 */
function bossMeteor(spot: Vector3, c: SkillContext, graded = false): void {
  const start = new Vector3(spot.x + cm(130 + randInt(32)), spot.y + cm(400), spot.z);
  const v = new Vector3(-Math.sin(FALL_TILT) * cm(50), -Math.cos(FALL_TILT) * cm(50), 0);
  const fall: Fall = {
    model: { model: MODEL.fire, colour: RGBS.white, scale: (randInt(8) + 10) * 0.1, blendMesh: FIRE_BLEND_MESH, alongPath: true },
    trail: FIRE_TRAIL,
    light: METEOR_LIGHT,
    land: groundBurst,
  };
  if (graded) Object.assign(fall, { glow: METEOR_GLOW, light: METEOR_RIDE_LIGHT, land: bossMeteorLanding });
  fallFrom(c, start, v, 40, fall);
  playCombat('Sound/eMeteorite', spot);
}

/** `Position +/- randInt() % 1024 - 512` about the monster, then a meteor there. */
const scatteredMeteor = (feet: Vector3, c: SkillContext, graded = false): void =>
  bossMeteor(new Vector3(feet.x + cm(randInt(1024) - 512), feet.y, feet.z + cm(randInt(1024) - 512)), c, graded);

/**
 * MODEL_SKILL_BLAST (ZzzEffect.cpp:1355-1366, MoveHandlers.cpp:2550-2580): Scale 1.0-1.7, from +200..299 cm x,
 * -50..49 y and +300..799 up, 50-99 cm a tick along its tilt, its energy tail and a blue range-2 light; on the
 * ground 6 stones, BITMAP_SHINY+4 and BITMAP_EXPLOTION.
 */
function blast(spot: Vector3, c: SkillContext, graded = false): void {
  const start = new Vector3(spot.x + cm(200 + randInt(100)), spot.y + cm(300 + randInt(500)), spot.z + cm(randInt(100) - 50));
  const speed = cm(50 + randInt(50));
  const v = new Vector3(-Math.sin(FALL_TILT) * speed, -Math.cos(FALL_TILT) * speed, 0);
  const fall: Fall = {
    model: { model: MODEL.blast, colour: RGBS.white, scale: (randInt(8) + 10) * 0.1, blendMesh: 0, alongPath: true },
    light: BLAST_LIGHT,
    energyTail: true,
    land: blastLanding,
  };
  if (graded) Object.assign(fall, { glow: BLAST_GLOW, light: BLAST_RIDE_LIGHT, land: blastLandingGraded });
  fallFrom(c, start, v, 30, fall);
}

/**
 * 18 MODEL_STAFF_OF_DESTRUCTION at yaw + i * 20 (ZzzCharacter.cpp:1826-1834): Staff09, every mesh additive, LT 30,
 * +280 cm up, Dir(0, -80, -10) turned by Angle (20, 0, yaw), so 72 cm out and 37 cm down a tick
 * (ZzzEffect.cpp:1330-1336); a blue range-2 light, and on the ground the burst (MoveHandlers.cpp:4342-4363).
 */
const staffRing = (feet: Vector3, c: SkillContext, graded = false): void => {
  const out = cm(80) * Math.cos(FALL_TILT) - cm(10) * Math.sin(FALL_TILT);
  const down = cm(80) * Math.sin(FALL_TILT) + cm(10) * Math.cos(FALL_TILT);
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < 18; i++) {
    const a = yaw + i * 20 * DEG;
    const f = forwardOf(a);
    const start = new Vector3(feet.x, feet.y + cm(280), feet.z);
    const fall: Fall = {
      model: { model: STAFF_OF_DESTRUCTION, colour: RGBS.white, scale: 1, yaw: a },
      light: BLAST_LIGHT,
      land: groundBurst,
    };
    // Graded: a light on every other staff and every third landing, so the ring does not fill the light pool.
    if (graded) Object.assign(fall, { glow: STAFF_GLOW, light: i % 2 === 0 ? STAFF_RIDE_LIGHT : undefined, land: i % 3 === 0 ? staffLandingLit : staffLanding });
    fallFrom(c, start, new Vector3(f.x * out, -down, f.z * out), 30, fall);
  }
};

/**
 * MODEL_SKILL_INFERNO sub1 (ZzzEffect.cpp:1378-1394, MoveHandlers.cpp:2628-2680): Inferno01, every mesh additive,
 * Scale 0.9, clip speed 0.5, Light (1, 0.5, 0.2), LT 35, BlendMeshLight LT / 20, which the fixed pipeline
 * clamps at 1: full, then fading over its last 20 ticks.
 */
const bossInferno: Step = model({ model: MODEL.inferno, seconds: ticks(35), colour: [1, 0.5, 0.2], scale: 0.9, keysPerTick: 0.5, fadeTail: 20 / 35 });

/**
 * MODEL_CIRCLE sub0 (LT 45) and MODEL_CIRCLE_LIGHT sub0 (LT 40) (ZzzEffect.cpp:2137-2175, MoveHandlers.cpp:3758-3863):
 * BlendMeshLight LT * 0.1 and (40 - LT) * 0.1 then LT * 0.1, clamped at 1, so each holds full and fades over its
 * last 10 ticks, the second fading in over its first 10. A stone every 4th tick within 3 m, a range-4 light.
 */
const bossHellfireArt: Step = (at, c) => {
  model({ model: MODEL.circle, seconds: ticks(45), colour: RGBS.white, scale: 1, blendMesh: 0, fadeTail: 10 / 45 })(at, c);
  model({ model: MODEL.circle2, seconds: ticks(40), colour: RGBS.white, scale: 1, blendMesh: 0, fadeIn: 10 / 40, fadeTail: 10 / 40 })(at, c);
  repeat(10, ticks(4), stones(1, 3))(at, c);
};
const bossHellfire: Step = seq(bossHellfireArt, lightHere(HELLFIRE_CIRCLE_LIGHT));

/** Graded inferno: a warm pool under the ring, embers lifting off it, and a light as wide as the ring (2 tiles). */
const bossInfernoGraded: Step = seq(
  bossInferno,
  groundGlowStep(scaleRGB(PHOENIX_TINT, 0.4), 4.6, ticks(35)),
  particles({ recipe: GROUND_EMBERS, rate: 45, seconds: ticks(28), height: 0.1 }),
  lightHere(effectLight([1, 0.5, 0.2], 2, ticks(35), { attack: ticks(3), release: ticks(20), flicker: FX_FLICKER, heightOffset: 0.6 }))
);
/** Graded hellfire circle: its pool, embers, and a flickering light the circle's size in place of the range-4 one. */
const bossHellfireGraded: Step = seq(
  bossHellfireArt,
  groundGlowStep([0.4, 0.25, 0.06], 4.4, ticks(45)),
  particles({ recipe: GROUND_EMBERS, rate: 35, seconds: ticks(36), height: 0.1 }),
  lightHere(effectLight([1, 0.75, 0.3], 2.2, ticks(45), { attack: ticks(4), release: ticks(10), flicker: FX_FLICKER, heightOffset: 0.6 }))
);

/**
 * Phantom Knight, tick 14 (ZzzCharacter.cpp:1709-1731): 36 JOINT_SPIRIT sub1 from +100 cm at random angles, each
 * dark (ALPHA_BLEND_MINUS) JointSpirit01, Vel 70, LT 49, MaxTails 6, width 60, with a (0.8, 0.4, 1) BITMAP_LIGHT
 * of Scale 4 on its head every tick and SOUND_BRANDISH_SWORD03 (ZzzEffectJoint.cpp:660-666, :3833-3836).
 */
const phantomKnight = (n: number, feet: Vector3, c: SkillContext, graded = false): void => {
  if (n !== 14) return;
  const from = new Vector3(feet.x, feet.y + 1, feet.z);
  for (let i = 0; i < 36; i++) {
    const head = from.clone();
    const step = muForward([randInt(360), randInt(360), randInt(360)], 1, new Vector3()).scaleInPlace(cm(70));
    const pts: number[] = [];
    const path = (buf: number[]): number => {
      head.addInPlace(step);
      pts.push(head.x, head.y, head.z);
      if (pts.length > 21) dropOldest(pts);
      return writePath(pts, buf);
    };
    effects.spawn('joint', c.scene, from, { polyline: path, seconds: ticks(50), maxTails: 6, width: cm(60), colour: RGBS.white, blend: 'subtract', texture: TEX.jointSpirit, maxCover: 1, fadeTail: 0 });
    effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: [0.8, 0.4, 1], size: cm(64) * 4, roll: Math.random() * Math.PI * 2, seconds: ticks(50), fadeTail: 0, follow: out => out.copyFrom(head) });
    if (graded && i < 4) rideLightFor(c, PHANTOM_HEAD_LIGHT, out => out.copyFrom(head));
  }
  if (graded) spiritBurstGraded(feet, c, PHANTOM_TINT, PHANTOM_SPARKS);
  playCombat('Sound/eSwingLightSword', feet);
};

/** Graded: the flash the spirits burst out of, sparks thrown with them, and its light. */
function spiritBurstGraded(feet: Vector3, c: SkillContext, tint: RGB, sparks: ParticleRecipe): void {
  const from = new Vector3(feet.x, feet.y + 1, feet.z);
  effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: scaleRGB(tint, 0.8), size: 3, growFrom: 0.3, grow: 1.4, seconds: ticks(10), fadeTail: 0.6 });
  effects.spawn('particles', c.scene, from, { recipe: sparks, count: 24 });
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: scaleRGB(tint, 0.2), size: 3, growFrom: 0.4, seconds: ticks(14), fadeTail: 0.6, flat: true, height: 0.04 });
  lighting.flash(c.scene, effectLight(tint, 2.5, ticks(14), { release: ticks(10) }), { position: { x: from.x, y: from.y, z: from.z } });
}

/**
 * Dark Phoenix, ticks 2 and 6 (ZzzCharacter.cpp:1782-1803): 40 JOINT_SPIRIT sub3 from +100 cm at random angles,
 * additive (1, 0.5, 0.1), Vel 140 plus 50 cm a tick along GetMagicScrew, LT 49, MaxTails 10, width 50, a
 * BITMAP_LIGHT (Scale 3) and a BITMAP_SHINY+1 (Scale 1.5) on the head every tick (ZzzEffectJoint.cpp:676-690, :3838-3897).
 */
const darkPhoenix = (n: number, feet: Vector3, c: SkillContext, graded = false): void => {
  if (n !== 2 && n !== 6) return;
  if (graded) spiritBurstGraded(feet, c, PHOENIX_GRADED_TINT, HOT_SPARKS);
  const tint: RGB = graded ? PHOENIX_GRADED_TINT : [1, 0.5, 0.1];
  const from = new Vector3(feet.x, feet.y + 1, feet.z);
  for (let i = 0; i < 40; i++) {
    const dir = muForward([randInt(360), randInt(360), randInt(360)], 1, new Vector3()).scaleInPlace(cm(140));
    const pos = from.clone();
    const screw = new Vector3();
    const slot = randInt(1000);
    const pts: number[] = [];
    // Built a tick at a time, as the original moves it: the head and its 10 tails.
    const path = (buf: number[]): number => {
      pos.addInPlace(dir);
      magicScrew(slot + Math.floor(fxNow() * 25), 1, 0, screw);
      pos.x += screw.x * cm(50);
      pos.y += screw.y * cm(50);
      pos.z += screw.z * cm(50);
      pts.push(pos.x, pos.y, pos.z);
      if (pts.length > 33) dropOldest(pts);
      return writePath(pts, buf);
    };
    const head: PointSource = out => out.copyFrom(pos);
    effects.spawn('joint', c.scene, from, { polyline: path, seconds: ticks(50), maxTails: 10, width: cm(50), colour: tint, texture: TEX.jointSpirit, fadeTail: 0 });
    effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: tint, size: cm(64) * 3, roll: Math.random() * Math.PI * 2, seconds: ticks(50), fadeTail: 0, follow: head });
    effects.spawn('sprite', c.scene, from, { texture: TEX.shiny2, colour: tint, size: cm(32) * 1.5, aspect: 2, roll: Math.random() * Math.PI * 2, seconds: ticks(50), fadeTail: 0, follow: head });
    if (graded && i < 3) rideLightFor(c, PHOENIX_HEAD_LIGHT, head);
  }
};

/**
 * Hydra, tick 1 (ZzzCharacter.cpp:1903-1929): 9 BITMAP_BOSS_LASER sub0 from +50 cm at yaw + 60, + 100 ... + 380, a
 * full ring. Each is a row of 20 Spark03 cards of Scale 16 (5.12 tiles) 50 cm apart along its heading, for 20
 * ticks, and lights the ground under every card (ZzzEffect.cpp:978-996, :8967-9003).
 */
const hydra = (n: number, feet: Vector3, c: SkillContext, graded = false): void => {
  if (n !== 1) return;
  if (graded) {
    hydraGraded(feet, c);
    return;
  }
  const yaw = entityYaw(c.caster);
  for (let i = 1; i <= 9; i++) {
    const f = forwardOf(yaw + (20 + 40 * i) * DEG);
    for (let k = 0; k < 20; k++) {
      const p = new Vector3(feet.x + f.x * cm(50) * k, feet.y + cm(50), feet.z + f.z * cm(50) * k);
      effects.spawn('sprite', c.scene, p, { texture: TEX.spark3, colour: BOSS_LASER_TINT, size: cm(32) * 16, seconds: ticks(20), fadeTail: 0 });
    }
    for (const k of [5, 15]) lighting.flash(c.scene, BOSS_LASER_LIGHT, { position: { x: feet.x + f.x * cm(50) * k, y: feet.y, z: feet.z + f.z * cm(50) * k } });
  }
};

/** A laser's light: along the middle of its 9.5 tiles, reaching both ends, for its 20 ticks. */
const HYDRA_BEAM_LIGHT = effectLight(BOSS_LASER_TINT, 3, ticks(20), { release: ticks(6) });

/**
 * Graded Hydra: the same nine lasers of 20 Spark03 cards, but each card 3 tiles and at 0.22 of the tint so the
 * ring reads as nine beams instead of one white disc (180 5-tile cards clip under the bloom), a straight
 * JointLaser core down each, a flash where they leave the body, and one light per beam.
 */
function hydraGraded(feet: Vector3, c: SkillContext): void {
  const yaw = entityYaw(c.caster);
  const halo = scaleRGB(BOSS_LASER_TINT, 0.22);
  for (let i = 1; i <= 9; i++) {
    const f = forwardOf(yaw + (20 + 40 * i) * DEG);
    for (let k = 0; k < 20; k++) {
      const p = new Vector3(feet.x + f.x * cm(50) * k, feet.y + cm(50), feet.z + f.z * cm(50) * k);
      effects.spawn('sprite', c.scene, p, { texture: TEX.spark3, colour: halo, size: 3, seconds: ticks(20), fadeTail: 0.3 });
    }
    const root = new Vector3(feet.x + f.x * cm(40), feet.y + cm(50), feet.z + f.z * cm(40));
    const tip = new Vector3(feet.x + f.x * cm(50) * 19, feet.y + cm(50), feet.z + f.z * cm(50) * 19);
    effects.spawn('joint', c.scene, root, { to: tip, jitter: 0, segments: 2, width: 0.7, colour: [0.6, 0.8, 1], texture: TEX.jointLaser, seconds: ticks(20), fadeTail: 0.3 });
    effects.spawn('sprite', c.scene, tip, { texture: TEX.flareBlue, colour: [0.4, 0.6, 1], size: 1.4, seconds: ticks(20), fadeTail: 0.3 });
    lightHere(HYDRA_BEAM_LIGHT)(new Vector3(feet.x + f.x * cm(50) * 10, feet.y, feet.z + f.z * cm(50) * 10), c);
  }
  const core = new Vector3(feet.x, feet.y + cm(50), feet.z);
  effects.spawn('sprite', c.scene, core, { texture: TEX.flareBlue, colour: [0.45, 0.65, 1], size: 2.2, growFrom: 0.4, seconds: ticks(20), fadeTail: 0.5 });
  effects.spawn('particles', c.scene, core, { recipe: BLUE_SPARKS, count: 20 });
}

/**
 * Death Gorgon, tick 1 (ZzzCharacter.cpp:1956-1970): 18 MODEL_FIRE sub1 at Angle (0, 0, i * 20) and SOUND_METEORITE01.
 * The Gorgon owns them, so on their first move each is inside CheckTargetRange's 100 cm of it and ends there with
 * its two stones (ZzzEffect.cpp:245-285, :7976-7979): a one-tick ring of fire at +120 cm and 36 stones.
 */
const deathGorgon = (n: number, feet: Vector3, c: SkillContext, graded = false): void => {
  if (n !== 1) return;
  for (let i = 0; i < 18; i++) {
    const a = i * 20 * DEG;
    const f = forwardOf(a);
    const p = new Vector3(feet.x + f.x * cm(50), feet.y + cm(120), feet.z + f.z * cm(50));
    // Graded: each fireball held 6 ticks and burning out, since one tick never reaches the screen.
    const life = graded ? { seconds: ticks(6), fadeTail: 0.6 } : { seconds: ticks(1), fadeTail: 0 };
    effects.spawn('model', c.scene, p, { model: MODEL.fire, ...life, scale: (randInt(4) + 8) * 0.1, colour: RGBS.white, yaw: -a, blendMesh: FIRE_BLEND_MESH });
    stones(2, 0.2)(p, c);
  }
  if (graded) {
    const ring = new Vector3(feet.x, feet.y + cm(120), feet.z);
    effects.spawn('sprite', c.scene, ring, { texture: TEX.flare, colour: [0.9, 0.4, 0.1], size: 2.6, growFrom: 0.4, grow: 1.3, seconds: ticks(10), fadeTail: 0.6 });
    effects.spawn('particles', c.scene, ring, { recipe: HOT_SPARKS, count: 24 });
    effects.spawn('particles', c.scene, ring, { recipe: FIRE_PUFF, count: 8 });
    groundGlowStep(scaleRGB(METEOR_TINT, 0.4), 3, ticks(14))(feet, c);
    lightHere(GORGON_LIGHT)(ring, c);
  }
  playCombat('Sound/eMeteorite', feet);
};
/** The ring of fire is 1 m across plus the fireballs' reach: about 1.2 tiles, bright for its 6 ticks. */
const GORGON_LIGHT = effectLight(METEOR_TINT, 1.4, ticks(10), { release: ticks(6), flicker: FX_FLICKER });

type BossTick = (n: number, feet: Vector3, c: SkillContext, graded: boolean) => void;

const magicSkeleton: BossTick = (n, feet, c, g) => {
  // rand_fps_check(2): heads is the inferno on tick 1 only, tails a meteor on any tick (ZzzCharacter.cpp:1650-1669).
  if (Math.random() < 0.5) {
    if (n === 1) (g ? bossInfernoGraded : bossInferno)(feet, c);
  } else scatteredMeteor(feet, c, g);
};
const balrog: BossTick = (n, feet, c, g) => {
  if (n === 1) {
    (g ? bossHellfireGraded : bossHellfire)(feet, c);
    playCombat('Sound/sHellFire', feet);
  }
  scatteredMeteor(feet, c, g);
};

/**
 * The AT_SKILL_BOSS branches by monster type (ZzzCharacter.cpp:1589-2000). Only the ones behind the skill gate:
 * the ungated attack effects (Death Beam Knight's and Zaikan's tick-1 CreateInferno, Hydra's BOSS_LASER+1) play on
 * every attack and are not a skill's.
 */
const BOSS_SKILL: Partial<Record<number, BossTick>> = {
  35: deathGorgon,
  38: balrog,
  49: hydra,
  // Zaikan: the staff ring on tick 14 (:1878-1902).
  59: (n, feet, c, g) => {
    if (n === 14) staffRing(feet, c, g);
  },
  // Death Beam Knight: a MODEL_SKILL_BLAST +/-400 cm every tick, the staff ring on tick 14 (:1814-1836).
  63: (n, feet, c, g) => {
    blast(new Vector3(feet.x + cm(randInt(800) - 400), feet.y, feet.z + cm(randInt(800) - 400)), c, g);
    if (n === 14) staffRing(feet, c, g);
  },
  // Cursed King: MODEL_SKILL_INFERNO sub1 on tick 1 (:1845-1854).
  66: (n, feet, c, g) => {
    if (n === 1) (g ? bossInfernoGraded : bossInferno)(feet, c);
  },
  67: balrog,
  72: phantomKnight,
  77: darkPhoenix,
  89: magicSkeleton,
  95: magicSkeleton,
  // Meteorite Trap: a meteor every tick (:1991-1998).
  103: (_n, feet, c, g) => scatteredMeteor(feet, c, g),
  112: magicSkeleton,
  118: magicSkeleton,
  124: magicSkeleton,
  130: magicSkeleton,
  143: magicSkeleton,
};

/** Row 50 (and 150 through its alias): the caster's AT_SKILL_BOSS branch on each of its 14 ticks, where it stands then. */
const bossSkillFor = (graded: boolean): Step => (_at, c) => {
  const run = c.caster.npcType !== undefined ? BOSS_SKILL[c.caster.npcType] : undefined;
  if (!run) return;
  for (let n = 1; n <= BOSS_TICKS; n++) {
    const fire = (): void => {
      if (!entityGone(c.caster)) run(n, entityPos(c.caster, 0, new Vector3()), c, graded);
    };
    if (n === 1) fire();
    else delay(ticks(n - 1), fire);
  }
};
const bossSkill = bossSkillFor(false);
const bossSkillGraded = bossSkillFor(true);

export default defineSkill({
  id: 50,
  name: "Flame of Evil (Monster)",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [150],
  // 50 AT_SKILL_BOSS (OpenMU's Flame of Evil, the Lost Tower Meteorite Trap's): only AttackTime 1, then the
  // caster's per-monster branch of AttackEffect on ticks 1..14 (bossSkill). 150 lands here too (lookAliases).
  // Enhanced: the same pieces with glow, sparks, embers and ground contact, each lit by effectLight.
  visual: { impact: bossSkill, area: bossSkill, enhanced: { impact: bossSkillGraded, area: bossSkillGraded } },
});
