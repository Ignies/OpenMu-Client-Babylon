import { Vector3 } from '../libs/babylon/exports';
import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { lighting } from '../lighting';
import { combat } from '../combat';
import { weather } from '../weather';
import { effects, type EffectHandle } from '../effects';
import { bonePos, delay, entityGone, entityPos, entityYaw, followEntity, fxNow, type PointSource, type RGB } from '../effects/core';
import type { SpriteOptions } from '../effects/sprite';
import type { ModelOptions } from '../effects/model';
import type { RingOptions } from '../effects/ring';
import type { ParticlesOptions } from '../effects/particles';
import type { ProjectileOptions } from '../effects/projectile';
import type { JointOptions } from '../effects/joint';
import type { AuraOptions } from '../effects/aura';
import {
  ARC_MOTES,
  BLOOD_CHIPS,
  BLOOD_MIST,
  DUST,
  ENERGY_CHIPS,
  FIRE_PUFF,
  FIRE_SPARKS,
  FLAME_TONGUES,
  HOLY_MOTES,
  ICE_MOTES,
  MODEL,
  NOVA_MOTES,
  POISON_SMOKE,
  RGBS,
  SHADE_MOTES,
  SMOKE,
  SNOWFALL,
  SOUL_MOTES,
  SPARKS,
  STEEL_GLINTS,
  TEX,
  VENOM_MOTES,
  WIND_STREAKS,
  EXPLOSION_CELLS,
} from '../effects/recipes';
import { ItemsDatabase } from './itemsDatabase';
import { skillDefinition, type SkillDefinition } from './skillsDatabase';

/**
 * Skill → visual recipe. The **consumer** of the effects layer
 * : every row in `SKILL_VISUALS` is a handful of
 * `effects.spawn(...)` calls at the four moments a skill has — `cast` at the
 * caster's hands, `travel` from caster to target (a projectile whose arrival
 * fires `impact`), `impact` at the target, `area` at the ground point. A
 * skill with no row falls back on its type (`fallbackFor`), so nothing is
 * clip-only. `BUFF_VISUALS` is the persistent look of a MagicEffectStatus
 * effect, kept per entity until the server cancels it.
 *
 * The rows follow the original's per-skill spawn table (ZzzCharacter.cpp
 * `AT_SKILL_*` impact block, `AttackStage` charge stages, WSclient.cpp
 * `ReceiveMagic` cast spawns; ZzzEffect.cpp `CreateEffect` / `CreateParticle`
 * / `CreateJoint`): each row cites the MODEL_* / BITMAP_* it stands in for,
 * lifetimes are the original's 25 Hz ticks ÷ 25, distances its centimetres
 * ÷ 100, `Light` tints are the colours. Light is not decided here:
 * `lighting/skills.ts` owns `SKILL_LIGHTS` and is called alongside.
 */

// ---- units ------------------------------------------------------------------

/** One original tick, seconds (LifeTime is counted in these). */
const TICK = 0.04;
/** Ticks → seconds. */
const ticks = (n: number): number => n * TICK;
/** Centimetres → tiles (`TILE_CM`, common/terrain/consts.ts). */
const cm = (n: number): number => n / 100;
/** A per-tick `Direction` in cm → tiles/s. */
const perTick = (n: number): number => (n * 25) / 100;

// ---- heights (tiles above the feet) --------------------------------------------

/** The caster's hands. */
const CAST_HEIGHT = 1.1;
/** A target's chest, where bolts hit. */
const IMPACT_HEIGHT = 0.9;
/** The weapon hand's bone (MU index; the original's `weaponBone` on a wizard staff). */
const WEAPON_BONE = 37;
/** Arrows: MODEL_ARROW moves 35 units/tick. */
const ARROW_SPEED = perTick(35);
/** A slash sweep: from -60° to +60° of the caster's yaw at this reach. */
const SLASH_REACH = 0.9;
const SLASH_SECONDS = 0.35;
/** Hit particles per impact. */
const HIT_COUNT = 14;
/** Triple Shot's fan: ±15°; the five-arrow masters ±5/10/20. */
const TRIPLE_SPREAD = (15 * Math.PI) / 180;
const FIVE_SPREAD = [-20, -10, 0, 10, 20].map(d => (d * Math.PI) / 180);
/** Persistent-buff ribbons: the original's five MODEL_SPEARSKILL joints. */
const BUFF_RIBBONS = 5;

// ---- step helpers ---------------------------------------------------------------

export interface SkillContext {
  scene: Scene;
  caster: Entity;
  target: Entity | null;
  /** The caster's yaw, radians. */
  yaw: number;
}

/** One thing to spawn at a point. Returns the handle so a `seq` can chain. */
export type Step = (at: Vector3, ctx: SkillContext) => EffectHandle | void;

const sprite = (o: SpriteOptions): Step => (at, c) => effects.spawn('sprite', c.scene, at, o);
const particles = (o: ParticlesOptions): Step => (at, c) => effects.spawn('particles', c.scene, at, o);
const model = (o: ModelOptions): Step => (at, c) => effects.spawn('model', c.scene, at, o);
const ring = (o: RingOptions): Step => (at, c) => effects.spawn('ring', c.scene, at, o);
const seq = (...steps: Step[]): Step => (at, c) => {
  for (const s of steps) s(at, c);
};
/** `step`, but at the caster instead of the point. */
const atCaster = (step: Step, height = CAST_HEIGHT): Step => (_at, c) =>
  step(entityPos(c.caster, height, new Vector3()), c);
/** `step`, `n` times around `at` within `radius` tiles, staggered by `every` seconds. */
const scatter = (step: Step, n: number, radius: number, every = 0): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random();
    const r = radius * (0.3 + Math.random() * 0.7);
    const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    if (every > 0 && i > 0) delay(i * every, () => step(p, c));
    else step(p, c);
  }
};
/** `step` at `n` points on a ring of `radius` tiles, evenly spaced (CreateInferno's 45° bombs). */
const ringOf = (step: Step, n: number, radius: number, every = 0): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = new Vector3(at.x + Math.cos(a) * radius, at.y, at.z + Math.sin(a) * radius);
    if (every > 0 && i > 0) delay(i * every, () => step(p, c));
    else step(p, c);
  }
};
/**
 * `step` again after `seconds` — on the effects clock (`effects/core.ts`
 * `delay`), never `setTimeout`: a warp or a death resets the layer and the
 * pending step with it.
 */
const after = (seconds: number, step: Step): Step => (at, c) => {
  const p = at.clone();
  delay(seconds, () => step(p, c));
};
/** `step` `n` times, `every` seconds apart (a per-frame spawn over a few frames). */
const repeat = (n: number, every: number, step: Step): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const p = at.clone();
    if (i === 0) step(p, c);
    else delay(i * every, () => step(p, c));
  }
};
/**
 * The facing convention: `transform.rot.y` is `atan2(dz, dx) + π/2`
 * (skillCastSystem / logic.ts), so the forward vector is (sin yaw, −cos yaw)
 * — the same one deathSystem and the debris entry use.
 */
const forwardOf = (yaw: number): { x: number; z: number } => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });
/** `step`, offset from `at` by `forward` tiles along the caster's facing and `side` tiles to its right, `up` tiles higher. */
const offset = (step: Step, forward: number, up = 0, side = 0): Step => (at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const p = new Vector3(
    at.x + f.x * forward - f.z * side,
    at.y + up,
    at.z + f.z * forward + f.x * side
  );
  step(p, c);
};
/** The caster's facing as a unit vector (+ `turn` radians). */
const facing = (c: SkillContext, turn = 0): Vector3 => {
  const f = forwardOf(entityYaw(c.caster) + turn);
  return new Vector3(f.x, 0, f.z);
};
/** Toward `to` from `at`, flat, unit. */
const toward = (at: Vector3, to: Vector3): Vector3 => {
  const d = new Vector3(to.x - at.x, 0, to.z - at.z);
  return d.lengthSquared() > 1e-6 ? d.normalize() : new Vector3(0, 0, 1);
};
/** Follow a point `forward` tiles ahead of the caster at `height`. */
const ahead = (caster: Entity, forward: number, height: number): PointSource => out => {
  entityPos(caster, height, out);
  const f = forwardOf(entityYaw(caster));
  out.x += f.x * forward;
  out.z += f.z * forward;
  return out;
};
/** A point that leaves the caster along its facing at `speed` tiles/s (a MODEL with `Direction`). */
const flying = (c: SkillContext, height: number, speed: number, turn = 0, startForward = 0): PointSource => {
  const start = entityPos(c.caster, height, new Vector3());
  const dir = facing(c, turn);
  start.x += dir.x * startForward;
  start.z += dir.z * startForward;
  const t0 = fxNow();
  return out => {
    const t = fxNow() - t0;
    return out.set(start.x + dir.x * speed * t, start.y, start.z + dir.z * speed * t);
  };
};
/** Orbit the caster at `radius` tiles, `height` up, `rate` radians/s (negative = clockwise). */
const orbiting = (caster: Entity, radius: number, height: number, rate: number, phase: number): PointSource => {
  const t0 = fxNow();
  return out => {
    const a = phase + rate * (fxNow() - t0);
    entityPos(caster, height, out);
    out.x += Math.cos(a) * radius;
    out.z += Math.sin(a) * radius;
    return out;
  };
};
/** The caster's weapon bone. */
const weaponBone = (caster: Entity): PointSource => out => bonePos(caster, WEAPON_BONE, out, CAST_HEIGHT);
/** A blur trail swept in front of the caster (CreateWeaponBlur on the weapon bone). */
const slash = (colour: RGB = RGBS.steel, texture: string = TEX.swordBlur, reach = SLASH_REACH): Step => (_at, c) => {
  const t0 = fxNow();
  const sweep = (height: number, radius: number): PointSource => out => {
    const p = Math.min(1, (fxNow() - t0) / SLASH_SECONDS);
    const f = forwardOf(entityYaw(c.caster) + (p - 0.5) * (Math.PI * 2) / 3);
    entityPos(c.caster, height + (0.5 - p) * 0.4, out);
    out.x += f.x * radius;
    out.z += f.z * radius;
    return out;
  };
  effects.spawn('blur', c.scene, Vector3.Zero(), {
    follow: sweep(1.1, reach),
    base: sweep(0.9, reach * 0.35),
    colour,
    texture,
    seconds: SLASH_SECONDS,
  });
};

/**
 * The caster's weapon model file, for the skills the original renders the
 * weapon BMD as the effect (RenderWheelWeapon: MODEL_SKILL_WHEEL,
 * MODEL_SKILL_FURY_STRIKE). Null when the hands are empty or unknown.
 */
function weaponModelOf(e: Entity): string | null {
  const app = e.charAppearance;
  const part = app?.rightHand ?? app?.leftHand ?? null;
  if (!part) return null;
  const item = ItemsDatabase.getItem(part.group, part.num);
  return item ? item.szModelFolder + item.szModelName : null;
}

// ---- impact / cast building blocks -------------------------------------------------

const hitSparks = (recipe = SPARKS, count = HIT_COUNT): Step => particles({ recipe, count });
const flash = (texture: string, colour: RGB, size = 1, seconds = 0.4): Step =>
  sprite({ texture, colour, size, seconds, grow: 1.6, growFrom: 0.4, fadeTail: 0.5 });
/** MODEL_STONE1 / MODEL_STONE2 chips thrown up from a ground hit — either model, rolled per chip (ZzzEffect.cpp:280). */
const stones = (n: number, radius = 0.6): Step =>
  scatter(
    (at, c) => model({ model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, seconds: 1, colour: RGBS.gold, rise: 2.5, spin: 6, scale: 0.7 })(at, c),
    n,
    radius
  );
/**
 * BITMAP_EXPLOTION played through its 10 cells over 20 ticks, `Width = 256 cm × Scale`
 * (ZzzEffectParticle.cpp). Never a plain `flash`: the sheet's filler cells are white.
 */
const explosion = (colour: RGB, scale = 1, seconds = ticks(20)): Step =>
  sprite({ texture: TEX.explosion, colour, size: cm(256) * scale, seconds, cells: EXPLOSION_CELLS, fadeTail: 0.25 });
/**
 * Burn the settled snow off the ground under `at` (weather/snowMelt.ts).
 *
 * Not from the original — nothing in `ZzzEffect.cpp` has ever touched the
 * terrain — but the ground here is a simulation rather than a texture, and a
 * fireball that leaves a snowfield untouched is the one thing on screen that
 * gives that away. Radius in tiles; it takes only x/z, so a hit at a target's
 * chest still melts what is under them. Free to call anywhere: a map with no
 * snow overlay never samples the patch.
 */
const scorch = (radius: number, strength = 1): Step => at => {
  weather.meltSnow(at.x, at.z, radius, strength);
};
/** MODEL_FIRE's `o->BlendMesh = 1`: the fire01 tail is additive, the fire02 lava core is drawn opaque. */
const FIRE_BLEND_MESH = 1;
/** Every fire skill's landing, and so the one place the snow gets melted. */
const fireHit: Step = seq(explosion(RGBS.fire), hitSparks(FIRE_SPARKS, 16), particles({ recipe: FIRE_PUFF, count: 6 }), scorch(1.2));
/** MODEL_ICE (LT 50, Scale 0.8, white) + 5× MODEL_ICE_SMALL (LT 32–47, Scale 0.8–1.1, Gravity 8–23) — the Ice hit. */
const iceHit: Step = seq(
  model({ model: MODEL.ice, seconds: ticks(50), scale: 0.8, colour: RGBS.white }),
  scatter(model({ model: MODEL.ice2, seconds: ticks(40), scale: 0.95, colour: RGBS.white, rise: 1.5, spin: 3 }), 5, 0.5),
  hitSparks(ICE_MOTES, 10)
);
const arcHit: Step = seq(flash(TEX.thunder, RGBS.arc, 1.3, 0.3), hitSparks(ARC_MOTES, 20));
const venomHit: Step = seq(flash(TEX.flare, RGBS.venom, 1.1, 0.5), particles({ recipe: VENOM_MOTES, count: 16 }));
/** BITMAP_MAGIC+1 (Magic_Ground2) at a body's feet, LT 20 — the buff-cast circle. */
const magicGround = (colour: RGB, seconds = ticks(20), scale = 2.5): Step =>
  ring({ texture: TEX.magicGround2, colour, seconds, scale, spin: 60, growFrom: 0.5 });
const holyCircle = (colour: RGB = RGBS.holy): Step =>
  seq(magicGround(colour), particles({ recipe: HOLY_MOTES, count: 24, height: 0.2 }));
const shockRing = (colour: RGB = RGBS.gold, scale = 4): Step =>
  ring({ texture: TEX.shockwave, colour, seconds: 0.6, scale, grow: 2, growFrom: 0.2, fadeTail: 0.6 });
/**
 * A bleed skill landing. No `flash`: a card is additive whatever it is
 * tinted, and a red `flare` over a bright map clipped to white and bloomed
 * into a pink cloud — BLOOD_MIST is the same spray drawn straight-alpha.
 */
const bloodHit: Step = seq(hitSparks(BLOOD_CHIPS, 18), particles({ recipe: BLOOD_MIST, count: 5 }));
const steelHit: Step = seq(hitSparks(STEEL_GLINTS, 14), flash(TEX.spark2, RGBS.steel, 0.8, 0.25));
const wizardCast: Step = atCaster(sprite({ texture: TEX.magicCircle, colour: RGBS.energy, size: 0.5, seconds: 0.4, spin: 6, grow: 1.4 }));
/** BITMAP_SPARK+1 (Spark03) LT 10 — the Teleport flash. */
const teleportFlash: Step = sprite({ texture: TEX.spark3, colour: RGBS.energy, size: 1.6, seconds: ticks(10), count: 3, spread: 0.3, grow: 1.8, growFrom: 0.5 });
/** A JOINT_THUNDER bolt from the sky onto `at` (GiganticStorm, Twister's strikes). */
const skyBolt = (height: number, width = 0.3, seconds = ticks(20)): Step => (at, c) => {
  const top = at.clone();
  top.y += height;
  top.x += (Math.random() - 0.5) * 2;
  top.z += (Math.random() - 0.5) * 2;
  effects.spawn('joint', c.scene, top, { to: at, colour: RGBS.arc, seconds, width, forks: 2, jitter: 0.1 });
};
/** `n` streamers fanning around the up axis, `i*step` radians apart, from `at`. */
const streamerFan = (
  n: number,
  step: number,
  o: { velocity: number; seconds: number; maxTails: number; width: number; colour: RGB; pitch?: number; turn?: number; gravity?: number; blend?: JointOptions['blend'] }
): Step => (at, c) => {
  const base = entityYaw(c.caster);
  const pitch = o.pitch ?? 0;
  for (let i = 0; i < n; i++) {
    const f = forwardOf(base + i * step);
    const heading = new Vector3(f.x * Math.cos(pitch), Math.sin(pitch), f.z * Math.cos(pitch));
    effects.spawn('joint', c.scene, at, { ...o, heading });
  }
};
/**
 * Swell Life / Add Mana: 36× CreateJoint(JOINT_SPIRIT sub2, Angle(−10,0,i*10),
 * width 60) — Vel 50, LT 20, MaxTails 3, Light 0.5 — with BITMAP_MAGIC+1 every
 * 20th. Drawn at half the count: 18 ribbons read the same and cost half.
 */
const spiritBurst = (colour: RGB): Step =>
  seq(
    streamerFan(18, (Math.PI * 2) / 18, { velocity: perTick(50), seconds: ticks(20), maxTails: 3, width: 0.6, colour, pitch: (10 * Math.PI) / 180 }),
    magicGround(colour, ticks(40), 3)
  );

// ---- travel ------------------------------------------------------------------

export interface Travel extends Omit<ProjectileOptions, 'to' | 'onArrive' | 'from'> {
  /** Start high above the target and fall on it (Meteorite, Cometfall). */
  fromSky?: boolean;
  /** Sky start: tiles up and tiles along +x / -z from the target (the original's Pos += (x, y, z)). */
  skyOffset?: readonly [number, number, number];
}

export interface SkillVisual {
  cast?: Step;
  travel?: Travel;
  impact?: Step;
  area?: Step;
}

const bolt = (head: string, colour: RGB, trail: ParticlesOptions['recipe'], size = 0.6, speed = perTick(60)): Travel => ({
  speed,
  head: { texture: head, colour, size },
  trail: { recipe: trail, rate: 30 },
});

const modelBolt = (m: string, colour: RGB, trail: ParticlesOptions['recipe'] | null, speed = perTick(50), scale = 1, blendMesh?: number): Travel => ({
  speed,
  model: { model: m, colour, scale, blendMesh },
  ...(trail ? { trail: { recipe: trail, rate: 30 } } : {}),
});

const arrow = (m: string = MODEL.arrow, colour: RGB = RGBS.steel): Travel => ({
  speed: ARROW_SPEED,
  model: { model: m, colour, scale: 1 },
});

/**
 * A projectile that falls from the sky onto a ground point and fires `hit`
 * on landing (MODEL_FIRE sub0 / MODEL_SKILL_BLAST / MODEL_FIRE sub6 with
 * Pos += (…, +z) and Dir(0,0,−50)). `from` is tiles (+x, up, −z) off `at`.
 */
const skyfall = (m: string, colour: RGB, trail: ParticlesOptions['recipe'] | null, from: readonly [number, number, number], speed: number, scale: number, hit: Step): Step => (at, c) => {
  const start = new Vector3(at.x + from[0], at.y + from[1], at.z - from[2]);
  effects.spawn('projectile', c.scene, start, {
    to: at,
    speed,
    model: { model: m, colour, scale },
    ...(trail ? { trail: { recipe: trail, rate: 40 } } : {}),
    onArrive: p => hit(p, c),
  });
};

// ---- shared rows ---------------------------------------------------------------

/** Fire Slash's BITMAP_SKULL marks the target for LT 1000 (40 s) in the original; the defence debuff's length here. */
const SKULL_SECONDS = 10;
/** Party Teleport's circle: LT 250 in the original, ended by the teleport; 3 s here. */
const PARTY_TELEPORT_SECONDS = 3;

/** Summons: BITMAP_MAGIC+1 sub3 at the caster's feet + smoke at the point. */
function summonCircle(at: Vector3, c: SkillContext): void {
  atCaster(magicGround(RGBS.holy, ticks(20), 2.5), 0)(at, c);
  particles({ recipe: SMOKE, count: 12 })(at, c);
}

/**
 * Force / Force Wave's hit: 2× MODEL_WAVES sub1 (LT 15, z+80, Scale 0.1–0.6, Angle[0] 90, 2× JOINT PIERCING
 * width 70–110 each, jitter ±50) + MODEL_PIERCING2 (LT 10, Scale 2.0, Dir(0,−60,0), z+130) running on.
 */
const forceHit: Step = (at, c) => {
  const feet = at.clone();
  feet.y -= IMPACT_HEIGHT;
  for (let i = 0; i < 2; i++) {
    const p = new Vector3(feet.x + (Math.random() - 0.5), feet.y + cm(80), feet.z + (Math.random() - 0.5));
    effects.spawn('model', c.scene, p, { model: MODEL.waves, seconds: ticks(15), scale: 0.35, grow: 1.7, colour: RGBS.shade, flat: true, spin: 3 });
    for (let j = 0; j < 2; j++) {
      const a = Math.random() * Math.PI * 2;
      effects.spawn('joint', c.scene, p, { heading: new Vector3(Math.sin(a), 0.3, Math.cos(a)), velocity: perTick(40), seconds: ticks(15), maxTails: 6, width: cm(90), colour: RGBS.shade });
    }
  }
  effects.spawn('model', c.scene, feet, { model: MODEL.piercing2, seconds: ticks(10), scale: 2, colour: RGBS.shade, height: cm(130), follow: flying(c, cm(130), perTick(60), 0, Vector3.Distance(entityPos(c.caster, 0, new Vector3()), feet)), yaw: entityYaw(c.caster) });
  hitSparks(ARC_MOTES)(at, c);
};

/** Add Critical / Brand of Skill: MODEL_DARKLORD_SKILL at weapon bone 0 (sub0) and bone 1 (sub1), Light (1,0.6,0.3). */
const addCritical: Step = (_at, c) => {
  const tint: RGB = [1, 0.6, 0.3];
  effects.spawn('model', c.scene, entityPos(c.caster, CAST_HEIGHT, new Vector3()), { model: MODEL.darkLordSkill, seconds: ticks(20), scale: 0.6, colour: tint, follow: weaponBone(c.caster), grow: 1.5 });
  effects.spawn('model', c.scene, entityPos(c.caster, CAST_HEIGHT, new Vector3()), { model: MODEL.darkLordSkill, seconds: ticks(20), scale: 0.6, colour: tint, follow: weaponBone(c.caster), grow: 1.5, yaw: Math.PI / 2 });
  particles({ recipe: HOLY_MOTES, count: 12, height: 0.4 })(entityPos(c.caster, 0.6, new Vector3()), c);
};

/** RemovalStun / RemovalInvisible: a BITMAP_FLASH ribbon from +1200 z dropping on the target at Vel 70 (LT 40, MaxTails 10, width 120). */
const flashDrop = (colour: RGB): Step => (at, c) => {
  const top = at.clone();
  top.y += 12;
  effects.spawn('joint', c.scene, top, { heading: new Vector3(0, -1, 0), velocity: perTick(70), seconds: ticks(40), maxTails: 10, width: 1.2, colour });
  after(0.6, seq(flash(TEX.flash, colour, 1.4, 0.4), particles({ recipe: SOUL_MOTES, count: 16, height: 0.4 })))(at, c);
};

/**
 * `n` JOINT_HEALING-style ribbons spiralling up round a body from ±80 cm at
 * +300 z (ImproveAG's four sub10 joints; Recover's nineteen FLARE joints).
 */
function spiralRibbons(n: number, colour: RGB, width: number, tails: number, seconds: number): Step {
  return (at, c) => {
    for (let i = 0; i < n; i++) {
      const phase = (i * Math.PI * 2) / n;
      const t0 = fxNow();
      const head: PointSource = out => {
        const t = fxNow() - t0;
        const a = phase + t * 4;
        return out.set(at.x + Math.cos(a) * cm(80), at.y + 0.2 + t * 1.2, at.z + Math.sin(a) * cm(80));
      };
      effects.spawn('joint', c.scene, at, { head, maxTails: tails, width, colour, seconds });
    }
  };
}

/** Thorns / Sleep / Blind: BITMAP_MAGIC+1 at the caster + ALICE_BUFFSKILL_EFFECT + …2 at the target, tinted. */
const aliceBuff = (tint: RGB): Step =>
  seq(
    atCaster(magicGround(tint), 0),
    model({ model: MODEL.elShieldRing, seconds: ticks(30), scale: 0.5, grow: 1.6, colour: tint, height: -IMPACT_HEIGHT + 0.1 }),
    model({ model: MODEL.elShieldRing2, seconds: ticks(30), scale: 0.5, grow: 1.4, colour: tint, height: -IMPACT_HEIGHT + 0.1, yaw: Math.PI / 3 }),
    particles({ recipe: { ...SHADE_MOTES, colour: tint }, count: 12, height: 0.5 })
  );

/**
 * Weakness / Enervation: BITMAP_MAGIC_ZIN sub1 (LT 40, scale 7), sub0 (LT 50, scale 2), sub2 ×3 (LT 30; 1.0/0.2/0.1)
 * on the ground + SHINY+6 (0.5) + PIN_LIGHT (1.0) over the body. `wide` tints the big circle, `core` the rest.
 */
const zinCurse = (wide: RGB, core: RGB): Step => (at, c) => {
  const feet = at.clone();
  feet.y -= IMPACT_HEIGHT;
  ring({ texture: TEX.magicZin, colour: wide, seconds: ticks(40), scale: 7, spin: 30, growFrom: 0.6 })(feet, c);
  ring({ texture: TEX.magicZin, colour: core, seconds: ticks(50), scale: 2, spin: -60 })(feet, c);
  for (const s of [1, 0.2, 0.1]) sprite({ texture: TEX.magicZin, colour: core, size: s * 2, seconds: ticks(30), flat: true, spin: 2, height: 0.05 })(feet, c);
  sprite({ texture: TEX.shiny5, colour: core, size: 0.5, seconds: ticks(30), height: 0.9, grow: 1.6 })(feet, c);
  sprite({ texture: TEX.pinLights, colour: core, size: 1, seconds: ticks(30), height: 0.9, spin: 1.5 })(feet, c);
};

/** Nova's charge; see row 58. */
const novaCharge: Step = (_at, c) => {
  const hero = !!c.caster.localPlayer;
  const done = hero ? () => !combat.novaCharging || entityGone(c.caster) : () => entityGone(c.caster);
  const stage = hero ? () => 1 + combat.novaStage : () => 6;
  effects.spawn('particles', c.scene, entityPos(c.caster, 0, new Vector3()), {
    recipe: NOVA_MOTES,
    rate: 10,
    seconds: NOVA_MAX_SECONDS,
    follow: followEntity(c.caster, 0.3),
    height: 0.4,
    until: done,
    rateScale: stage,
  });
  // CreateForce: three JOINT_HEALING sub8 from a r=500 sphere onto the body, LT 17, re-cast as each set dies.
  const force = () => {
    if (done()) return;
    const to = followEntity(c.caster, 0.9);
    const centre = entityPos(c.caster, 0.9, new Vector3());
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * 0.8;
      const from = new Vector3(centre.x + Math.cos(a) * 5, centre.y + e * 3, centre.z + Math.sin(a) * 5);
      effects.spawn('joint', c.scene, from, { to, colour: [0.3, 0.3, 1], seconds: ticks(17), width: 0.1, segments: 6, jitter: 0.08, until: done });
    }
    delay(ticks(17), force);
  };
  force();
};
/** A Nova hold tops out at 12 stages × 5 ticks; anyone else's charge is shown that long. */
const NOVA_MAX_SECONDS = ticks(60);

// ---- the table -------------------------------------------------------------------

/** Keyed by skill number (common/skillsDatabase.ts). */
export const SKILL_VISUALS: Partial<Record<number, SkillVisual>> = {
  // 1 Poison: impact@target — MODEL_POISON LT 40 + 10× BITMAP_SMOKE tinted (0.4, 0.6, 1.0). No bolt.
  1: { impact: seq(model({ model: MODEL.poison, seconds: ticks(40), scale: 1, colour: RGBS.venom }), particles({ recipe: POISON_SMOKE, count: 10 })) },
  // 2 Meteorite: MODEL_FIRE sub0 LT 40, Scale 1.0–1.7, from target + (130…162, 400) cm, Dir(0,0,−50).
  2: {
    travel: { ...modelBolt(MODEL.fire, RGBS.fire, FIRE_PUFF, perTick(50), 1.35, FIRE_BLEND_MESH), fromSky: true, skyOffset: [cm(146), cm(400), 0] },
    impact: fireHit,
  },
  // 3 Lightning: SOUND_THUNDER01 at cast; per frame JOINT_THUNDER weaponBone → target (width 50 + width 10,
  // LT 2, MaxTails 50, Vel 50) + BITMAP_ENERGY particles at the bone. Bolts re-roll every 2 ticks for the clip.
  3: {
    impact: (at, c) => {
      const from = weaponBone(c.caster);
      const to = c.target ? followEntity(c.target, IMPACT_HEIGHT) : at;
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.arc, seconds: ticks(10), width: cm(50), segments: 24, forks: 2, jitter: 0.1 });
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.white, seconds: ticks(10), width: cm(10), segments: 24, jitter: 0.12 });
      effects.spawn('particles', c.scene, at, { recipe: ENERGY_CHIPS, rate: 25, seconds: ticks(10), follow: from });
      arcHit(at, c);
    },
  },
  // 4 Fire Ball: MODEL_FIRE sub1 LT 60, Scale 0.8–1.1, z+120, Dir(0,−50,0); within 100 → 2× MODEL_STONE.
  4: { travel: modelBolt(MODEL.fire, RGBS.fire, FIRE_PUFF, perTick(50), 0.95, FIRE_BLEND_MESH), impact: seq(fireHit, stones(2)) },
  // 5 Flame: BITMAP_FLAME sub0 LT 40 at SkillXY — 6 BITMAP_FLAME particles a frame in a ±25 cm box, 1/8 stones.
  5: { area: seq(particles({ recipe: FLAME_TONGUES, rate: 150, seconds: ticks(40) }), scatter(stones(1, 0.3), 5, 0.3, 0.3), scorch(1)) },
  // 6 Teleport: cast — BITMAP_SPARK+1 LT 10 at the caster (AlphaTarget 0).
  6: { cast: atCaster(teleportFlash, 0.6) },
  // 7 Ice: impact@target — MODEL_ICE sub0 + 5× MODEL_ICE_SMALL. No bolt.
  7: { impact: iceHit },
  // 8 Twister: impact@caster — MODEL_STORM LT 59, Dir(0,−10,0) (walks forward), smoke, JOINT_THUNDER from
  // ±200/+700 half the frames, stones 1/4.
  8: {
    area: (at, c) => {
      const storm = flying(c, 0, perTick(10));
      effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(59), colour: RGBS.wind, follow: storm, spin: 10, scale: 1.2 });
      effects.spawn('particles', c.scene, at, { recipe: SMOKE, rate: 20, seconds: ticks(59), follow: storm, height: 0.2 });
      effects.spawn('particles', c.scene, at, { recipe: WIND_STREAKS, rate: 40, seconds: ticks(59), follow: storm, height: 0.8 });
      repeat(6, 0.35, (p, cc) => skyBolt(7, 0.25, ticks(8))(storm(p), cc))(at, c);
      after(0.5, stones(3, 1))(at, c);
    },
  },
  // 9 Evil Spirit: impact@caster+100z — 4× JOINT_SPIRIT at Angle(0,0,i*90), width 80 + width 20:
  // ALPHA_BLEND_MINUS, Vel 70, LT 49, MaxTails 6.
  9: {
    area: atCaster(
      seq(
        streamerFan(4, Math.PI / 2, { velocity: perTick(70), seconds: ticks(49), maxTails: 6, width: 0.8, colour: RGBS.shade, turn: 1.2, blend: 'subtract' }),
        streamerFan(4, Math.PI / 2, { velocity: perTick(70), seconds: ticks(49), maxTails: 6, width: 0.2, colour: RGBS.dark, turn: 1.2, blend: 'subtract' }),
        particles({ recipe: SHADE_MOTES, count: 20 })
      ),
      1
    ),
  },
  // 10 Hellfire: impact@caster — MODEL_CIRCLE LT 45 + MODEL_CIRCLE_LIGHT LT 40 (BlendMesh 0), stones, EarthQuake shake.
  10: {
    area: atCaster(
      seq(
        model({ model: MODEL.circle, seconds: ticks(45), colour: RGBS.fire, flat: true, scale: 1, grow: 1.3 }),
        model({ model: MODEL.circle2, seconds: ticks(40), colour: [1, 0.8, 0.2], flat: true, scale: 1, spin: 2 }),
        stones(6, 2),
        particles({ recipe: FIRE_SPARKS, count: 30 }),
        // The whole circle the stones are thrown from, not a bolt's footprint.
        scorch(2.6)
      ),
      0.05
    ),
  },
  // 11 Power Wave: MODEL_MAGIC2 LT 20, Dir(0,−60,0) along the caster→target angle, 4× BITMAP_SMOKE sub3 a frame.
  11: {
    travel: { ...modelBolt(MODEL.magic2, RGBS.tide, SMOKE, perTick(60), 1), trail: { recipe: SMOKE, rate: 100 } },
    impact: flash(TEX.kwave, RGBS.tide, 1.2, 0.3),
  },
  // 12 Aqua Beam: BITMAP_BOSS_LASER sub0 at CalcAddPosition(−20,−90,100): LT 20, Light (0.5,0.7,1.0), Scale 16,
  // laid along the facing; 4 range checks marching 150 out. A straight beam 1 tile up, 6 tiles long.
  12: {
    area: (_at, c) => {
      const from = entityPos(c.caster, 1, new Vector3());
      const dir = facing(c);
      from.x += dir.x * 0.9 - dir.z * 0.2;
      from.z += dir.z * 0.9 + dir.x * 0.2;
      const to = new Vector3(from.x + dir.x * 6, from.y, from.z + dir.z * 6);
      effects.spawn('joint', c.scene, from, { to, colour: [0.5, 0.7, 1], seconds: ticks(20), width: 1.6, jitter: 0, segments: 4 });
      effects.spawn('joint', c.scene, from, { to, colour: RGBS.white, seconds: ticks(20), width: 0.4, jitter: 0.01, segments: 8 });
    },
  },
  // 13 Cometfall @SkillXY: 2× MODEL_SKILL_BLAST LT 30, Scale 1.0–1.7, Pos += (200–300, ±50, 300–800),
  // Dir(0,0,−50−rand%50), JOINT_ENERGY trail; on the ground 6 stones, BITMAP_SHINY+4 (ring), BITMAP_EXPLOTION.
  13: {
    area: seq(
      skyfall(MODEL.blast, RGBS.fire, ARC_MOTES, [2.5, 5.5, 0.2], perTick(75), 1.35, seq(fireHit, sprite({ texture: TEX.ring, colour: RGBS.gold, size: 2, seconds: 0.5, grow: 2.5, flat: true }), stones(6, 1))),
      after(0.15, skyfall(MODEL.blast, RGBS.fire, ARC_MOTES, [2, 3, -0.4], perTick(75), 1.1, seq(fireHit, stones(6, 1))))
    ),
  },
  // 14 Inferno: impact@caster — CreateInferno: 8 bombs on r=220 at 45° + 2 stones each; then MODEL_SKILL_INFERNO
  // sub0 LT 15, Light 0.8, Scale 0.9.
  14: {
    area: atCaster(
      seq(
        ringOf(seq(fireHit, stones(2, 0.4)), 8, cm(220), 0.02),
        model({ model: MODEL.inferno, seconds: ticks(15), colour: [0.8, 0.8, 0.8], flat: true, scale: 0.9 })
      ),
      0.05
    ),
  },
  // 15 Teleport Ally: CreateTeleportBegin(target) + CreateTeleportEnd(caster) — BITMAP_SPARK+1 at both.
  15: { impact: seq(teleportFlash, atCaster(teleportFlash, 0.6)) },
  // 16 Soul Barrier: 5× CreateJoint(MODEL_SPEARSKILL sub0, width 20, white, LT 999999, MaxTails 30) — persistent,
  // so the ribbons live in BUFF_VISUALS[4] and end on MagicEffectStatus. Here only the arrival glimmer.
  16: { impact: particles({ recipe: SOUL_MOTES, count: 12, height: 0.6 }) },
  // 17 Energy Ball: BITMAP_ENERGY sub0 LT 20, Dir(0,−60,0), z+100; per frame ENERGY + SPARK+1 (scale 4) particles;
  // arrival SPARK+1 sub1 scale 6.
  17: {
    travel: { ...bolt(TEX.thunder, RGBS.arc, ENERGY_CHIPS, 0.5, perTick(60)), trail: { recipe: ENERGY_CHIPS, rate: 25 } },
    impact: seq(sprite({ texture: TEX.spark3, colour: RGBS.arc, size: 0.6, seconds: ticks(10), grow: 2 }), hitSparks(ARC_MOTES, 8)),
  },
  // 18 Defense (knight): BITMAP_SHINY flash on the body.
  18: { impact: seq(flash(TEX.shiny, RGBS.steel, 1.4, 0.6), particles({ recipe: SPARKS, count: 12, height: 0.6 })) },
  // 19 Falling Slash / 20 Lunge / 21 Uppercut / 22 Cyclone / 23 Slash: cast only — the weapon blur (BlurType 1).
  19: { cast: slash() },
  20: { cast: slash(RGBS.steel, TEX.swordBlur, 1.1) },
  21: { cast: slash(RGBS.gold) },
  22: { cast: seq(slash(RGBS.wind, TEX.swordEff), atCaster(particles({ recipe: WIND_STREAKS, count: 16 }), 0.8)) },
  23: { cast: slash() },
  // 24 Triple Shot: CreateArrows(Skill=1) → 3 arrows at ±15°.
  24: { area: (at, c) => fanArrows(at, c, 3, MODEL.arrow, RGBS.steel, TRIPLE_SPREAD), impact: steelHit },
  // 26 Heal: BITMAP_MAGIC+1 sub1 LT 20 at the target → per frame 3× JOINT_HEALING from a r=200 sphere to the
  // target, width 5, LT 12, MaxTails 2.
  26: {
    impact: (at, c) => {
      magicGround(RGBS.holy)(at, c);
      const to = c.target ? followEntity(c.target, IMPACT_HEIGHT * 0.6) : at;
      repeat(6, ticks(2), (p, cc) => {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const e = Math.random() * Math.PI - Math.PI / 2;
          const from = new Vector3(p.x + Math.cos(a) * Math.cos(e) * 2, p.y + Math.sin(e) * 2 + 0.5, p.z + Math.sin(a) * Math.cos(e) * 2);
          effects.spawn('joint', cc.scene, from, { to, colour: RGBS.holy, seconds: ticks(12), width: cm(5), segments: 2, jitter: 0.05 });
        }
      })(at, c);
    },
  },
  // 27 Greater Defense: BITMAP_MAGIC+1 sub2 LT 20 + 5× MODEL_SPEARSKILL sub4 (Light (0.4,0.8,0.2), LT 10000) →
  // the ribbons persist in BUFF_VISUALS[2].
  27: { impact: magicGround([0.4, 0.8, 0.2]) },
  // 28 Greater Damage: BITMAP_MAGIC+1 sub3 LT 20.
  28: { impact: magicGround([1, 0.75, 0.55]) },
  // 30–36 Summons: impact@caster — BITMAP_MAGIC+1 sub3.
  30: { area: summonCircle }, 31: { area: summonCircle }, 32: { area: summonCircle }, 33: { area: summonCircle },
  34: { area: summonCircle }, 35: { area: summonCircle }, 36: { area: summonCircle },
  // 38 Decay @SkillXY: 2× MODEL_FIRE sub6 LT 40, Scale 1.5–2.2, Light (0.8,0.5,0.1), Pos += (200–300, ±50, 500–800),
  // Dir(0,0,−50−rand%50), BITMAP_SMOKE trail; landing → MODEL_SKILL_INFERNO sub2, smoke, 6 stones.
  38: {
    area: seq(
      skyfall(MODEL.fire, [0.8, 0.5, 0.1], SMOKE, [2.5, 6.5, 0.3], perTick(75), 1.85, seq(model({ model: MODEL.inferno, seconds: ticks(15), colour: RGBS.decay, flat: true, scale: 0.9 }), particles({ recipe: SMOKE, count: 15 }), stones(6, 1), venomHit)),
      after(0.12, skyfall(MODEL.fire, [0.8, 0.5, 0.1], SMOKE, [2, 5, -0.4], perTick(75), 1.6, seq(particles({ recipe: SMOKE, count: 7 }), stones(6, 1), venomHit)))
    ),
  },
  // 39 Ice Storm @SkillXY: 10× MODEL_BLIZZARD sub0, LT 15–29, Scale 0.5, scattered ±150 xy, +600 z, falling
  // (Gravity −20…−60); BITMAP_SHINY+1 + BITMAP_LIGHT sprites; on the ground 1/5 MODEL_ICE_SMALL + BLIZZARD sub1 LT 20.
  39: {
    area: seq(
      scatter(
        skyfall(MODEL.blizzard, RGBS.frost, ICE_MOTES, [0, 6, 0], perTick(45), 0.5, seq(model({ model: MODEL.blizzard, seconds: ticks(20), colour: RGBS.frost, scale: 0.5, fadeTail: 0.9 }), sprite({ texture: TEX.shiny2, colour: RGBS.frost, size: 1.1, seconds: 0.4, grow: 1.6 }))),
        10, 1.5, 0.05
      ),
      after(0.5, scatter(model({ model: MODEL.ice2, seconds: ticks(40), scale: 0.9, colour: RGBS.white, rise: 1, spin: 3 }), 2, 1.5)),
      particles({ recipe: SNOWFALL, rate: 120, seconds: 1.2, height: 3 })
    ),
  },
  // 40 Nova (release): MODEL_CIRCLE sub1 LT 45 at the caster; 36× JOINT_SPIRIT sub6 (width 60, LT 20,
  // MaxTails 5) burst out while LT > 44 − skillCount. Drawn at 24 ribbons.
  40: {
    impact: atCaster(
      seq(
        model({ model: MODEL.circle, seconds: ticks(45), colour: [0.3, 0.3, 1], flat: true, scale: 1, grow: 1.5 }),
        streamerFan(24, (Math.PI * 2) / 24, { velocity: perTick(70), seconds: ticks(20), maxTails: 5, width: 0.6, colour: RGBS.soul }),
        particles({ recipe: NOVA_MOTES, count: 40, height: 0.8 })
      ),
      0.05
    ),
  },
  // 41 Twisting Slash: MODEL_SKILL_WHEEL2 = the weapon BMD, 4 copies (one a frame) orbiting the owner at r=150,
  // Angle −18°/frame, alpha 0.6/0.5/0.4/0.3, LT 25; BITMAP_SMOKE sub3. Falls back to the wind spin without a weapon.
  41: {
    area: (_at, c) => {
      const weapon = weaponModelOf(c.caster);
      const rate = (-18 * Math.PI) / 180 / TICK;
      const alphas = [0.6, 0.5, 0.4, 0.3];
      if (weapon) {
        for (let i = 0; i < alphas.length; i++) {
          delay(i * TICK, () => {
            if (entityGone(c.caster)) return;
            effects.spawn('model', c.scene, entityPos(c.caster, 0.6, new Vector3()), {
              model: weapon,
              seconds: ticks(25),
              scale: 1,
              colour: RGBS.steel,
              alpha: alphas[i],
              follow: orbiting(c.caster, cm(150), 0.6, rate, (i * Math.PI) / 2),
              spin: rate,
            });
          });
        }
      } else {
        effects.spawn('model', c.scene, entityPos(c.caster, 0.1, new Vector3()), { model: MODEL.windSpin, seconds: ticks(25), colour: RGBS.wind, spin: rate, scale: 1.3 });
      }
      effects.spawn('particles', c.scene, entityPos(c.caster, 0.3, new Vector3()), { recipe: SMOKE, count: 8 });
      slash(RGBS.wind, TEX.swordEff2, 1.2)(_at, c);
    },
  },
  // 42 Rageful Blow: MODEL_SKILL_FURY_STRIKE = the weapon model, LT 20, spinning, HeadAngle (80,_,180), Gravity 50;
  // companions EarthQuake01..08 (LT 20/35/40/50/60).
  42: {
    area: seq(
      (_at, c) => {
        const weapon = weaponModelOf(c.caster);
        if (!weapon) return;
        effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: weapon, seconds: ticks(20), scale: 1, colour: RGBS.steel, alpha: 0.7, follow: ahead(c.caster, 0.8, 0.6), spin: (330 * Math.PI) / 180 / TICK / 10 });
      },
      offset(seq(
        model({ model: MODEL.earthQuake, seconds: ticks(20), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake2, seconds: ticks(35), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake3, seconds: ticks(40), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake4, seconds: ticks(50), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake5, seconds: ticks(60), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake6, seconds: ticks(60), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake7, seconds: ticks(50), colour: RGBS.gold, flat: true, scale: 1 }),
        model({ model: MODEL.earthQuake8, seconds: ticks(40), colour: RGBS.gold, flat: true, scale: 1 }),
        particles({ recipe: DUST, count: 24 })
      ), 0.8),
    ),
  },
  // 43 Death Stab: charge t∈[2,8] 3× MODEL_SPEARSKILL sub2 joints (Light (1,0.3,0.3), LT 20, MaxTails 5, width 40)
  // thrown forward; t∈[6,12] 2× MODEL_SPEAR sub1 LT 10; the victim gets JOINT_THUNDER sub7 per bone.
  43: {
    cast: seq(
      repeat(3, ticks(2), atCaster(streamerFan(3, 0.25, { velocity: perTick(140), seconds: ticks(20), maxTails: 5, width: 0.4, colour: [1, 0.3, 0.3] }), 0.9)),
      after(ticks(6), (_at, c) => {
        for (let i = 0; i < 2; i++) {
          effects.spawn('model', c.scene, entityPos(c.caster, 1.1, new Vector3()), { model: MODEL.spear, seconds: ticks(10), scale: 1, colour: RGBS.steel, follow: flying(c, 1.1, perTick(60), (i - 0.5) * 0.2, 0.5), yaw: entityYaw(c.caster) });
        }
      })
    ),
    impact: (at, c) => {
      if (c.target) {
        const t = c.target;
        repeat(6, ticks(2), (p, cc) => {
          const from = new Vector3(p.x + (Math.random() - 0.5), p.y + Math.random() * 0.8, p.z + (Math.random() - 0.5));
          effects.spawn('joint', cc.scene, from, { to: followEntity(t, 0.3 + Math.random() * 0.9), colour: RGBS.arc, seconds: ticks(4), width: 0.1, jitter: 0.15 });
        })(at, c);
      }
      bloodHit(at, c);
    },
  },
  // 44 Rush (Crescent Moon Slash): charge per frame 4× JOINT_SPARK (±15 xy, +20 z, Angle(150–210)) + BITMAP_FIRE
  // sub2 particles; impact MODEL_SWORD_FORCE sub0 LT 15, Scale 0 growing, z+100, Dir(0,−10,0).
  44: {
    cast: repeat(4, ticks(2), atCaster(streamerFan(4, 0.35, { velocity: perTick(40), seconds: ticks(8), maxTails: 4, width: 0.15, colour: RGBS.gold, pitch: -0.9 }), 0.2)),
    impact: seq(
      (at, c) => effects.spawn('model', c.scene, at, { model: MODEL.swordForce, seconds: ticks(15), scale: 1, colour: RGBS.gold, grow: 3, follow: flying(c, 1, perTick(10)), yaw: entityYaw(c.caster) }),
      particles({ recipe: FIRE_PUFF, count: 8 }),
      steelHit
    ),
  },
  // 45 Javelin (Lance): 3× MODEL_SKILL_JAVELIN sub0/1/2 — LT 35, Vel 10, Scale 1.2, z+150, HeadAngle ±Ang.
  45: {
    area: (at, c) => fanArrows(at, c, 3, MODEL.javelin, RGBS.steel, 0.3, 1.2),
    impact: steelHit,
  },
  // 46 Deep Impact (Starfall): the arrow, then MODEL_ARROW_IMPACT at its position.
  46: { travel: arrow(MODEL.arrowLaser, RGBS.holy), impact: seq(model({ model: MODEL.arrowImpact, seconds: ticks(20), scale: 1, colour: RGBS.holy, grow: 1.4 }), steelHit) },
  // 47 Impale: t=4 MODEL_SPEAR at the weapon bone (Light (1,1,0.5), LT 5); t=8 2× MODEL_SPEAR at +50 fwd +110 z
  // LT 10; t∈[13,14] 3× MODEL_SPEARSKILL at +145 fwd +110 z ±30 (Light 0.3, LT 20, Scale 1.5, Dir 5·facing).
  47: {
    cast: seq(
      after(ticks(4), (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 1.1, new Vector3()), { model: MODEL.spear, seconds: ticks(5), scale: 1, colour: [1, 1, 0.5], follow: weaponBone(c.caster), yaw: entityYaw(c.caster) })),
      after(ticks(8), (_at, c) => {
        for (let i = 0; i < 2; i++) effects.spawn('model', c.scene, entityPos(c.caster, 1.1, new Vector3()), { model: MODEL.spear, seconds: ticks(10), scale: 1, colour: RGBS.steel, follow: flying(c, 1.1, perTick(30), (i - 0.5) * 0.15, 0.5), yaw: entityYaw(c.caster) });
      }),
      after(ticks(13), (_at, c) => {
        for (let i = 0; i < 3; i++) effects.spawn('model', c.scene, entityPos(c.caster, 1.1, new Vector3()), { model: MODEL.ridingSpear, seconds: ticks(20), scale: 1.5, colour: [0.3, 0.3, 0.3], follow: flying(c, 1.1, perTick(5), (i - 1) * 0.2, 1.45), yaw: entityYaw(c.caster) });
      })
    ),
    impact: steelHit,
  },
  // 48 Swell Life: impact@caster+100z — 36× JOINT_SPIRIT sub2 fan (Light 0.5) + BITMAP_MAGIC+1 sub4 LT 40.
  48: { impact: atCaster(spiritBurst([0.5, 0.5, 0.5]), 1), area: atCaster(spiritBurst([0.5, 0.5, 0.5]), 1) },
  // 49 Rider / Dark Horse strike (Fire Breath): BITMAP_SHOTGUN LT 10, Dir(0,−30,0) + 40× JOINT_SPARK sub1 in two
  // fans from (−20,−20,60) / (30,−20,60). Drawn as 2×6 spark ribbons.
  49: {
    cast: (_at, c) => {
      const dir = facing(c);
      effects.spawn('sprite', c.scene, entityPos(c.caster, 0.6, new Vector3()), { texture: TEX.fire2, colour: RGBS.fire, size: 1, seconds: ticks(10), move: [dir.x * perTick(30), 0, dir.z * perTick(30)], grow: 1.8 });
      for (const side of [-0.2, 0.3]) {
        offset(streamerFan(6, 0.12, { velocity: perTick(60), seconds: ticks(10), maxTails: 4, width: 0.12, colour: RGBS.gold, pitch: -0.3 }), 0.2, 0.6, side)(entityPos(c.caster, 0, new Vector3()), c);
      }
    },
    impact: fireHit,
  },
  // 50 Flame of Evil (monster)
  50: { impact: fireHit },
  // 51 Ice Arrow: cast — MODEL_ICE sub1 + sub2 (+180°) at the target LT 20, Scale 0.8, BlendMeshLight 0.5, 3× BITMAP_SMOKE,
  // a BITMAP_FIRE+2 sub10 orbiting r=60; impact: a single arrow.
  51: {
    travel: arrow(MODEL.arrow, RGBS.ice),
    impact: (at, c) => {
      const feet = at.clone();
      feet.y -= IMPACT_HEIGHT;
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5] });
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5], yaw: Math.PI });
      effects.spawn('particles', c.scene, feet, { recipe: SMOKE, count: 3, height: 0.3 });
      if (c.target) effects.spawn('sprite', c.scene, feet, { texture: TEX.fire3, colour: RGBS.ice, size: 0.5, seconds: ticks(20), follow: orbiting(c.target, cm(60), 0.3, 4, 0), spin: 3 });
      hitSparks(ICE_MOTES, 10)(at, c);
    },
  },
  // 52 Penetration: charge t=3 BITMAP_GATHERING sub0 LT 10 at (−100 fwd, +150 z) — 3 a frame JOINT_THUNDER sub3 /
  // SPARK+1 sub2 on a r=120 ring + SHINY+1 sprite; impact: CreateArrows(sub 2).
  52: {
    cast: after(ticks(3), atCaster(offset(seq(
      repeat(5, ticks(2), (p, c) => {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const from = new Vector3(p.x + Math.cos(a) * cm(120), p.y + (Math.random() - 0.5) * 0.6, p.z + Math.sin(a) * cm(120));
          effects.spawn('joint', c.scene, from, { to: p, colour: RGBS.arc, seconds: ticks(6), width: 0.06, jitter: 0.12 });
        }
      }),
      sprite({ texture: TEX.shiny2, colour: RGBS.arc, size: 1.2, seconds: ticks(10), grow: 1.6 }),
      particles({ recipe: ARC_MOTES, count: 12 })
    ), -1, 0.4), CAST_HEIGHT)),
    area: (at, c) => fanArrows(at, c, 1, MODEL.arrowSteel, RGBS.arc),
    impact: seq(steelHit, flash(TEX.pierce, RGBS.arc, 1.2, 0.3)),
  },
  // 53 Improve AG: 4× JOINT_HEALING sub10 from ±80 offset +300 z, width 15, LT 80, MaxTails 20, Light (1,0.5,1)/11.
  53: { impact: atCaster(spiralRibbons(4, [1 / 11, 0.5 / 11, 1 / 11], cm(15), 20, ticks(80)), 0.2) },
  // 55 Fire Slash (MG): charge BITMAP_GATHERING sub1 LT 20 at the weapon bone; BITMAP_SWORD_FORCE LT 30, Light 0.8,
  // yaw+45; JOINT_FORCE +100 z width 150 on the first frame. Cast: BITMAP_SKULL on the target (eDeBuff_Defense).
  55: {
    cast: (at, c) => {
      effects.spawn('particles', c.scene, at, { recipe: FIRE_SPARKS, rate: 40, seconds: ticks(20), follow: weaponBone(c.caster) });
      if (c.target && c.target !== c.caster) {
        effects.spawn('sprite', c.scene, at, { texture: TEX.skull, colour: RGBS.blood, size: 0.6, seconds: SKULL_SECONDS, follow: followEntity(c.target, 1.6), fadeTail: 0.1 });
      }
    },
    area: atCaster(seq(
      (at, c) => effects.spawn('sprite', c.scene, at, { texture: TEX.swordEff2, colour: [0.8, 0.8, 0.8], size: 2, seconds: ticks(30), flat: true, spin: 2, grow: 1.5, follow: ahead(c.caster, 0.8, 0.2) }),
      streamerFan(1, 0, { velocity: perTick(30), seconds: ticks(20), maxTails: 8, width: 1.5, colour: RGBS.fire }),
      slash(RGBS.fire, TEX.jointFire)
    ), 1),
  },
  // 56 Power Slash: charge — 5× MODEL_MAGIC2 sub2 at yaw −40..+40 step 20, LT 20; each 2× SHINY+1 + LIGHT sprites.
  56: {
    area: (_at, c) => {
      for (let i = -2; i <= 2; i++) {
        const turn = (i * 20 * Math.PI) / 180;
        const p = flying(c, 0.8, perTick(60), turn, 0.5);
        effects.spawn('model', c.scene, entityPos(c.caster, 0.8, new Vector3()), { model: MODEL.magic2, seconds: ticks(20), scale: 1, colour: RGBS.arc, follow: p, yaw: entityYaw(c.caster) + turn });
        effects.spawn('sprite', c.scene, entityPos(c.caster, 0.8, new Vector3()), { texture: TEX.shiny2, colour: RGBS.arc, size: 0.9, seconds: ticks(20), follow: p, count: 2, spread: 0.2 });
      }
      slash(RGBS.arc, TEX.swordEff2)(_at, c);
    },
  },
  // 57 Spiral Slash: charge frame > 5 — CreateJoint(BITMAP_FLARE sub23, width 40) on the weapon.
  57: { cast: seq(slash(RGBS.wind, TEX.flareBig), (at, c) => effects.spawn('joint', c.scene, at, { head: weaponBone(c.caster), maxTails: 10, width: 0.4, colour: RGBS.wind, seconds: SLASH_SECONDS })), impact: steelHit },
  // 58 Nova (start): the charge — bones 0..38, (skillCount+1)× BITMAP_LIGHT sub6 (Light (0.3,0.3,1.0), scale
  // 1.3+count·0.08) + CreateForce: 3× JOINT_HEALING sub8 from r=500, LT 17. On the hero it runs for the hold
  // (`combat.novaCharging` / `novaStage`); on anyone else for a full charge's length.
  58: { cast: novaCharge },
  // 60 Force / 66 Force Wave: 2× MODEL_WAVES sub1 (LT 15, z+80, Scale 0.1–0.6, 2× JOINT PIERCING each) +
  // MODEL_PIERCING2 (LT 10, Scale 2.0, Dir(0,−60,0), z+130).
  60: { impact: forceHit },
  66: { impact: forceHit, area: forceHit },
  // 61 Fire Burst: 3× MODEL_PIER_PART sub0 from the caster (yaw +90/0/−90; LT 20, Vel 10, Scale 1.2) +
  // 2× MODEL_DARKLORD_SKILL sub0/1 at the target (Light (1,0.6,0.3), LT 10, Scale 0.2).
  61: {
    cast: (_at, c) => {
      for (const turn of [Math.PI / 2, 0, -Math.PI / 2]) {
        effects.spawn('model', c.scene, entityPos(c.caster, 0.5, new Vector3()), { model: MODEL.pierPart, seconds: ticks(20), scale: 1.2, colour: RGBS.fire, follow: flying(c, 0.5, perTick(26), turn, 0.4), yaw: entityYaw(c.caster) + turn });
      }
    },
    impact: seq(
      model({ model: MODEL.darkLordSkill, seconds: ticks(10), scale: 0.2, colour: [1, 0.6, 0.3], grow: 3 }),
      model({ model: MODEL.darkLordSkill, seconds: ticks(10), scale: 0.2, colour: [1, 0.6, 0.3], grow: 3, yaw: Math.PI / 4 }),
      fireHit
    ),
  },
  // 62 Earthshake: frame ≥ 5 — the EarthQuake0N companions at the caster.
  62: {
    area: atCaster(seq(
      model({ model: MODEL.earthQuake, seconds: ticks(20), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake2, seconds: ticks(35), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake3, seconds: ticks(40), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake4, seconds: ticks(50), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake5, seconds: ticks(60), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake6, seconds: ticks(60), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake7, seconds: ticks(50), colour: RGBS.gold, flat: true, scale: 1.5 }),
      model({ model: MODEL.earthQuake8, seconds: ticks(40), colour: RGBS.gold, flat: true, scale: 1.5 }),
      particles({ recipe: DUST, count: 40 }),
      stones(6, 2)
    ), 0.05),
  },
  // 63 Party Teleport (Summon): MODEL_CIRCLE sub2 + MODEL_CIRCLE_LIGHT sub3 (LT 250 in the original; held 3 s
  // here — no completion packet ends it) + BITMAP_LIGHT particles at bone 42 after frame 5.5.
  63: {
    area: atCaster(seq(
      model({ model: MODEL.circle, seconds: PARTY_TELEPORT_SECONDS, colour: RGBS.soul, flat: true, scale: 1 }),
      model({ model: MODEL.circle2, seconds: PARTY_TELEPORT_SECONDS, colour: [0.3, 0.5, 1], flat: true, scale: 1, spin: 1, alpha: 0.5 }),
      (at, c) => effects.spawn('particles', c.scene, at, { recipe: NOVA_MOTES, rate: 25, seconds: PARTY_TELEPORT_SECONDS, follow: followEntity(c.caster, 1.2) })
    ), 0.05),
  },
  // 64 Add Critical (Increase Critical Damage): MODEL_DARKLORD_SKILL at weapon bone 0 (sub0) and bone 1 (sub1), Light (1,0.6,0.3).
  64: { impact: addCritical, area: addCritical },
  // 65 Electric Spark: impact at CalcAddPosition(0,−90,−50) — BITMAP_FLARE_FORCE one-shot → 5 ribbons: sub1 (100),
  // sub0 (250), sub2/3/4 (100).
  65: {
    area: atCaster(offset(seq(
      sprite({ texture: TEX.flareForce, colour: RGBS.arc, size: 2.5, seconds: ticks(10), grow: 2, growFrom: 0.3 }),
      streamerFan(1, 0, { velocity: perTick(80), seconds: ticks(12), maxTails: 8, width: 2.5, colour: RGBS.arc }),
      streamerFan(4, Math.PI / 6, { velocity: perTick(80), seconds: ticks(12), maxTails: 8, width: 1, colour: RGBS.spark, pitch: 0.15 }),
      particles({ recipe: ARC_MOTES, count: 24 })
    ), 0.9, 0.5), 0.5),
  },
  // 67 Stun: CreateJoint(BITMAP_FLASH sub7 at the caster).
  67: { area: atCaster((at, c) => effects.spawn('joint', c.scene, at, { head: followEntity(c.caster, 1.2), maxTails: 10, width: 0.5, colour: RGBS.gold, seconds: ticks(20) }), 1.2) },
  // 68 Removal Stun / 71 Removal Invisible: BITMAP_FLASH sub0/1 at target +1200 z, width 120, MaxTails 10, LT 40,
  // Vel 70, Angle (90,0,0) — a ribbon dropping from the sky.
  68: { impact: flashDrop(RGBS.gold) },
  71: { impact: flashDrop(RGBS.soul) },
  // 69 Add Mana (Swell Mana): 36× JOINT_SPIRIT sub21 (= sub2) fan + BITMAP_MAGIC+1 sub10.
  69: { impact: atCaster(spiritBurst(RGBS.soul), 1), area: atCaster(spiritBurst(RGBS.soul), 1) },
  // 70 Cloaking / Invisible: BITMAP_MAGIC+1 sub6 at the target LT 60, Scale 2–4; BITMAP_LIGHT on random bones per frame.
  70: { impact: seq(magicGround(RGBS.soul, ticks(60), 3), particles({ recipe: SOUL_MOTES, rate: 30, seconds: ticks(60), height: 0.5 })) },
  // 72 Removal Buff (Abolish Magic): 6× MODEL_SPEARSKILL sub5/6/7 at caster+100 z, Angle(0,0,{45,135,225,90,180,270}),
  // width 170, LT 60, MaxTails 30, Light (1,1,0.8)/(1,0.8,1)/(0.8,1,1).
  72: {
    impact: atCaster((at, c) => {
      const angles = [45, 135, 225, 90, 180, 270];
      const tints: RGB[] = [[1, 1, 0.8], [1, 0.8, 1], [0.8, 1, 1]];
      for (let i = 0; i < angles.length; i++) {
        const yaw = (angles[i] * Math.PI) / 180;
        effects.spawn('joint', c.scene, at, { heading: new Vector3(Math.sin(yaw) * 0.6, 0.8, Math.cos(yaw) * 0.6), velocity: perTick(30), seconds: ticks(60), maxTails: 30, width: 1.7, colour: tints[i % 3], turn: 0.8 });
      }
      particles({ recipe: SHADE_MOTES, count: 20, height: 0.5 })(at, c);
    }, 1),
  },
  // 73 Death Cannon (Mana Rays): CreateJoint(BITMAP_JOINT_FORCE sub4 at caster+130 z, Angle(0,0,yaw), width 40).
  73: {
    impact: (at, c) => {
      const from = entityPos(c.caster, 1.3, new Vector3());
      effects.spawn('joint', c.scene, from, { heading: toward(from, at), velocity: perTick(120), seconds: ticks(20), maxTails: 12, width: 0.4, colour: RGBS.soul });
      after(0.25, seq(flash(TEX.flareBlue, RGBS.soul, 1.3, 0.4), hitSparks(ARC_MOTES)))(at, c);
    },
  },
  // 74 Space Split (Fire Blast): MODEL_PIER_PART sub2 caster→target — LT 20, Vel 50, z−20, Dir(0,−40,0).
  74: { travel: modelBolt(MODEL.pierPart, RGBS.fire, FIRE_SPARKS, perTick(40), 1), impact: fireHit },
  // 75 Brand of Skill: MODEL_DARKLORD_SKILL at the weapon bones + MODEL_MANA_RUNE sub0 (LT 50, Scale 0→, Alpha 0.3, z+300).
  75: { impact: seq(addCritical, atCaster(model({ model: MODEL.manaRune, seconds: ticks(50), scale: 0.2, grow: 5, colour: RGBS.gold, alpha: 0.3, yaw: Math.PI / 4 }), 3)) },
  // 76 Plasma Storm (Fenrir): per target 2× CreateJoint(MODEL_FENRIR_SKILL_THUNDER from (0,−140,130) → target, width
  // 100 / 80) then 6× BITMAP_FLARE_FORCE ribbons width 60.
  76: {
    area: (at, c) => {
      const from = entityPos(c.caster, 1.3, new Vector3());
      const dir = facing(c);
      from.x += dir.x * 1.4;
      from.z += dir.z * 1.4;
      effects.spawn('joint', c.scene, from, { to: at, colour: RGBS.fire, seconds: ticks(20), width: 1, forks: 2, jitter: 0.08 });
      effects.spawn('joint', c.scene, from, { to: at, colour: RGBS.gold, seconds: ticks(20), width: 0.8, forks: 1, jitter: 0.12 });
      streamerFan(6, Math.PI / 3, { velocity: perTick(60), seconds: ticks(15), maxTails: 6, width: 0.6, colour: RGBS.fire, pitch: 0.4 })(at, c);
      fireHit(at, c);
    },
  },
  // 77 Infinity Arrow: blue flash; aura persists via BUFF_VISUALS.
  77: { impact: seq(flash(TEX.flareBlue, RGBS.ice, 1.4, 0.6), particles({ recipe: ICE_MOTES, count: 16, height: 0.6 })) },
  // 78 Fire Scream (DL): 3 pairs MODEL_DARK_SCREAM + MODEL_DARK_SCREAM_FIRE at yaw, yaw+10 (+80 fwd), yaw−10 (−80).
  78: {
    area: (_at, c) => {
      const pairs: [number, number][] = [[0, 0], [(10 * Math.PI) / 180, 0.8], [(-10 * Math.PI) / 180, -0.8]];
      for (const [turn, fwd] of pairs) {
        const p = flying(c, 0.2, perTick(40), turn, 0.5 + fwd);
        effects.spawn('model', c.scene, entityPos(c.caster, 0.2, new Vector3()), { model: MODEL.darkFireScream2, seconds: ticks(20), scale: 1.2, colour: RGBS.fire, follow: p, yaw: entityYaw(c.caster) + turn });
        effects.spawn('model', c.scene, entityPos(c.caster, 0.2, new Vector3()), { model: MODEL.darkFireScream, seconds: ticks(20), scale: 1.2, colour: RGBS.ember, follow: p, yaw: entityYaw(c.caster) + turn });
      }
    },
  },
  // 79 Explosion (monster)
  79: { impact: seq(fireHit, shockRing(RGBS.fire, 3)) },
  // 200–204 potions / immunities: a soft shiny flash.
  201: { impact: flash(TEX.shiny, RGBS.soul, 1.2, 0.5) },
  202: { impact: flash(TEX.shiny, RGBS.gold, 1.2, 0.5) },
  203: { impact: seq(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), particles({ recipe: HOLY_MOTES, count: 16, height: 0.4 })) },
  204: { impact: seq(flash(TEX.shiny, RGBS.soul, 1.3, 0.6), particles({ recipe: SOUL_MOTES, count: 16, height: 0.4 })) },
  // 210–213 spells of protection/restriction/pursuit, shield-burn.
  210: { impact: flash(TEX.flareBlue, RGBS.soul, 1.4, 0.6) },
  211: { impact: flash(TEX.flare, RGBS.shade, 1.4, 0.6) },
  212: { impact: flash(TEX.eye, RGBS.shade, 1.2, 0.6) },
  213: { impact: seq(flash(TEX.flareRed, RGBS.blood, 1.4, 0.5), particles({ recipe: BLOOD_CHIPS, count: 12, height: 0.6 })) },
  // 214 Drain Life: MODEL_ALICE_DRAIN_LIFE sub0 LT 70 (no such model here) — a spirit joint target → caster for the 70 ticks.
  214: { impact: (at, c) => { effects.spawn('joint', c.scene, at, { to: followEntity(c.caster, CAST_HEIGHT), colour: RGBS.blood, seconds: ticks(70), width: 0.12, jitter: 0.06 }); particles({ recipe: SHADE_MOTES, count: 16 })(at, c); } },
  // 215 Chain Lightning: MODEL_LIGHTNING_ORB sub0 (LT 20, Dir(0,−60,0), z+100) → arrival sub1 LT 18 (the chain hops server-side).
  215: {
    travel: { ...bolt(TEX.thunder, RGBS.arc, ENERGY_CHIPS, 0.7, perTick(60)), trail: { recipe: ENERGY_CHIPS, rate: 30 } },
    impact: seq(model({ model: MODEL.lightningType, seconds: ticks(18), scale: 1, colour: RGBS.arc, grow: 1.3 }), arcHit),
  },
  // 217 Thorns (Damage Reflection) / 219 Sleep / 220 Blind: BITMAP_MAGIC+1 sub11/12 at the caster +
  // MODEL_ALICE_BUFFSKILL_EFFECT/2 at the target, Light (0.8,0.3,0.9) / (1,1,1) / (0.8,0.5,0.2).
  217: { impact: aliceBuff([0.8, 0.3, 0.9]) },
  219: { impact: aliceBuff([1, 1, 1]) },
  220: { impact: aliceBuff([0.8, 0.5, 0.2]) },
  // 218 Berserker: BITMAP_MAGIC+1 sub11 LT 20 + ALICE_BUFFSKILL_EFFECT (LT 34, z+100, Alpha 0→, Scale 0.1) +
  // …EFFECT2 (LT 35, Scale 0.15); Light (1.0, 0.1, 0.2).
  218: {
    impact: seq(
      atCaster(magicGround([1, 0.1, 0.2]), 0),
      model({ model: MODEL.elShieldRing, seconds: ticks(34), scale: 0.1, grow: 8, colour: [1, 0.1, 0.2], fadeIn: 0.4, height: 0.1 }),
      model({ model: MODEL.elShieldRing2, seconds: ticks(35), scale: 0.15, grow: 6, colour: [1, 0.1, 0.2], height: -IMPACT_HEIGHT })
    ),
  },
  // 221 Weakness / 222 Enervation (Innovation): BITMAP_MAGIC_ZIN sub1 (LT 40, scale 7.0), sub0 (LT 50, 2.0), sub2 ×3
  // (LT 30; 1.0/0.2/0.1) + SUMMONER_CASTING_EFFECT2 + SHINY+6 0.5 + PIN_LIGHT 1.0. Light (2,0.1,0.1)/(2,0.4,0.3) and (0.25,1,0.7).
  221: { impact: zinCurse([2, 0.1, 0.1], [2, 0.4, 0.3]) },
  222: { impact: zinCurse([0.25, 1, 0.7], [0.25, 1, 0.7]) },
  // 223 Explosion (curse), 224 Requiem, 225 Pollution: dark bursts on the area.
  223: { area: seq(explosion(RGBS.shade, 0.8), particles({ recipe: SHADE_MOTES, count: 30 }), shockRing(RGBS.shade, 3)) },
  224: { area: seq(scatter(sprite({ texture: TEX.skull, colour: RGBS.shade, size: 0.8, seconds: 1, rise: 1, grow: 1.5 }), 6, 2, 0.05), ring({ texture: TEX.magicGround2, colour: RGBS.shade, seconds: 1.2, scale: 4, spin: 30 })) },
  225: { area: seq(particles({ recipe: VENOM_MOTES, rate: 100, seconds: 1.2 }), ring({ texture: TEX.magicGround2, colour: RGBS.decay, seconds: 1.5, scale: 4 })) },
  // 230 Lightning Shock: MODEL_LIGHTNING_SHOCK sub0 at the caster (LT 20, z+280, falling); sub1 LT 12 →
  // 2× BITMAP_DAMAGE_01_MONO, 5× BITMAP_MAGIC sub12 on a r=150 ring (Light (1,0.2,0.05)), 3× KNIGHT_PLANCRACK_A (1.0–1.3).
  230: {
    area: atCaster(seq(
      model({ model: MODEL.lightningType, seconds: ticks(20), scale: 1, colour: RGBS.arc, height: 2.8, rise: -3.5 }),
      after(ticks(12), seq(
        sprite({ texture: TEX.damageMono, colour: [1, 0.2, 0.05], size: 2.5, seconds: ticks(12), flat: true, count: 2, spread: 0.4, grow: 1.4 }),
        ringOf(sprite({ texture: TEX.magicGround, colour: [1, 0.2, 0.05], size: 1.2, seconds: ticks(12), flat: true, grow: 1.5 }), 5, cm(150)),
        scatter(model({ model: MODEL.knightPlanCrack, seconds: ticks(20), scale: 1.15, colour: RGBS.gold, flat: true }), 3, 1),
        arcHit
      ))
    ), 0.05),
  },
  // 232 Strike of Destruction: MODEL_BLOW_OF_DESTRUCTION sub0 (LT 40, Light 1.2) chaining sub1 (LT 40, z 150, Scale 5) —
  // no such model here: an ice shockwave + shards + the sword blur stand in.
  232: { area: seq(slash(RGBS.ice, TEX.swordEff2), shockRing(RGBS.ice, 4), scatter(iceHit, 5, 1.5, 0.04), particles({ recipe: SNOWFALL, rate: 100, seconds: 0.8, height: 2 })) },
  // 233 Expansion of Wizardry
  233: { impact: seq(flash(TEX.magicCircle, RGBS.energy, 1.5, 0.7), particles({ recipe: SOUL_MOTES, count: 24, height: 0.5 })), area: atCaster(flash(TEX.magicCircle, RGBS.energy, 1.5, 0.7), 0.8) },
  // 234 Recover: cast — BITMAP_IMPACT at caster (0,−220,130), Light (0.7,0.6,0), LT 80, Scale 0→; target — 19× JOINT
  // FLARE sub47 width 40 + MODEL_SUMMON (LT 60, Scale 0.7) + BITMAP_TWLIGHT sub0/1/2 + 2× FLARE sub3 on random bones.
  234: {
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
  // 235 Multi-Shot: five arrows at ±5/10/20.
  235: { area: (at, c) => fanArrows(at, c, 5, MODEL.arrow, RGBS.steel, FIVE_SPREAD), impact: steelHit },
  // 236 Flame Strike: MODEL_EFFECT_FLAME_STRIKE sub0 at the caster — Alpha 0→, LT 35, Vel = the clip's speed.
  236: { area: atCaster(model({ model: MODEL.flameStrike, seconds: ticks(35), colour: RGBS.fire, scale: 1, fadeIn: 0.3, loop: false }), 0.05) },
  // 237 Gigantic Storm: 5× CreateEffect(BITMAP_JOINT_THUNDER) on a r=200 ring, LT 20, StartPos.z += 800.
  237: { area: seq(ringOf(seq(skyBolt(8, 0.35), arcHit), 5, 2, 0.05), particles({ recipe: WIND_STREAKS, rate: 80, seconds: 1 })) },
  // 238 Chaotic Diseier: a dark shockwave.
  238: { area: seq(shockRing(RGBS.shade, 5), scatter(flash(TEX.forcePillar, RGBS.shade, 1.2, 0.5), 6, 2, 0.04), particles({ recipe: SHADE_MOTES, count: 30 })) },
  // 239 Doppelganger self explosion
  239: { impact: seq(fireHit, shockRing(RGBS.fire, 4)) },
  // 260–270 Rage Fighter: fists and beasts.
  260: { cast: slash(RGBS.gold, TEX.motionBlur, 0.7), impact: seq(steelHit, flash(TEX.impact, RGBS.gold, 1, 0.3)) },
  261: { cast: slash(RGBS.gold, TEX.motionBlur, 0.7), impact: seq(steelHit, model({ model: MODEL.wolfHead, seconds: 0.6, colour: RGBS.gold, grow: 1.5 })) },
  262: { cast: slash(RGBS.arc, TEX.motionBlur, 0.7), impact: seq(arcHit, after(0.12, arcHit), after(0.24, arcHit)) },
  263: { cast: slash(RGBS.shade, TEX.motionBlur, 0.8), impact: seq(flash(TEX.flare, RGBS.shade, 1.3, 0.4), particles({ recipe: SHADE_MOTES, count: 20 })) },
  264: { area: seq(model({ model: MODEL.dragonHead, seconds: 1, colour: RGBS.fire, grow: 1.5, scale: 1.5 }), shockRing(RGBS.fire, 5), scatter(fireHit, 5, 2, 0.05)) },
  265: { cast: slash(RGBS.fire, TEX.motionBlur, 1), impact: seq(fireHit, model({ model: MODEL.dragonKick, seconds: 0.6, colour: RGBS.fire, grow: 1.4 })) },
  266: { impact: flash(TEX.shiny, RGBS.blood, 1.3, 0.6) },
  267: { impact: flash(TEX.shiny, RGBS.holy, 1.3, 0.6), area: atCaster(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), 0.8) },
  268: { impact: flash(TEX.shiny, RGBS.steel, 1.3, 0.6), area: atCaster(flash(TEX.shiny, RGBS.steel, 1.3, 0.6), 0.8) },
  // 269 Occupy (Charge): Rush's charge with BITMAP_FIRE sub18; impact MODEL_SWORD_FORCE sub2.
  269: {
    cast: repeat(4, ticks(2), atCaster(streamerFan(4, 0.35, { velocity: perTick(40), seconds: ticks(8), maxTails: 4, width: 0.15, colour: RGBS.fire, pitch: -0.9 }), 0.2)),
    impact: seq(
      (at, c) => effects.spawn('model', c.scene, at, { model: MODEL.swordForce, seconds: ticks(15), scale: 1, colour: RGBS.fire, grow: 3, follow: flying(c, 1, perTick(10)), yaw: entityYaw(c.caster) }),
      particles({ recipe: FIRE_PUFF, count: 8 }),
      steelHit
    ),
  },
  270: { area: (at, c) => { fanArrows(at, c, 1, MODEL.phoenixShot, RGBS.fire, 0, 1.5); }, impact: seq(fireHit, model({ model: MODEL.phoenix, seconds: 0.8, colour: RGBS.fire, grow: 1.5, scale: 1.5 })) },
  // 344/346 Blood Storm
  344: { area: seq(shockRing(RGBS.blood, 4), scatter(bloodHit, 8, 2, 0.03), particles({ recipe: BLOOD_CHIPS, count: 40 })) },
  346: { area: seq(shockRing(RGBS.blood, 4.5), scatter(bloodHit, 8, 2, 0.03), particles({ recipe: BLOOD_CHIPS, count: 40 })) },
  // 427/434 Poison Arrow
  427: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
  434: { travel: { ...arrow(MODEL.arrowNature, RGBS.venom), trail: { recipe: VENOM_MOTES, rate: 30 } }, impact: venomHit },
  // 425 Cure, 426/429 Party Healing, 430/433 Bless, 432 Summon Satyros
  425: { impact: holyCircle([0.7, 1, 0.8]) },
  426: { impact: holyCircle(), area: atCaster(holyCircle(), 0) },
  429: { impact: holyCircle(), area: atCaster(holyCircle(), 0) },
  430: { impact: holyCircle(RGBS.gold) },
  433: { impact: holyCircle(RGBS.gold) },
  432: { area: summonCircle },
  // 461/463 Blind (the master rows of 220)
  461: { impact: aliceBuff([0.8, 0.5, 0.2]) },
  463: { impact: aliceBuff([0.8, 0.5, 0.2]) },
  // 495/497 Earth Prison
  495: { impact: seq(model({ model: MODEL.groundCrystal, seconds: 1.5, colour: RGBS.gold, grow: 1.2, scale: 1.2 }), particles({ recipe: DUST, count: 20 })) },
  497: { impact: seq(model({ model: MODEL.groundCrystal, seconds: 1.5, colour: RGBS.gold, grow: 1.2, scale: 1.2 }), particles({ recipe: DUST, count: 20 })) },
  // 323/521/524 Iron Defense
  323: { impact: flash(TEX.shiny, RGBS.steel, 1.4, 0.6) },
  521: { impact: flash(TEX.shiny, RGBS.steel, 1.4, 0.6) },
  524: { impact: flash(TEX.shiny, RGBS.steel, 1.4, 0.6) },
};

/**
 * `n` arrows fanning out from the caster toward `at`: `spread` radians
 * between them, or the explicit angles (Triple Shot ±15°, the five-arrow
 * masters ±5/10/20, Javelin's three).
 */
function fanArrows(at: Vector3, c: SkillContext, n: number, m: string, colour: RGB, spread: number | readonly number[] = TRIPLE_SPREAD, scale = 1): void {
  const from = entityPos(c.caster, CAST_HEIGHT, new Vector3());
  const dx = at.x - from.x;
  const dz = at.z - from.z;
  const dist = Math.hypot(dx, dz) || 1;
  const base = Math.atan2(dx, dz);
  // Captured now: by the time an arrow lands, another skill has been dispatched.
  const skill = currentSkill;
  const impact = SKILL_VISUALS[skill]?.impact ?? steelHit;
  for (let i = 0; i < n; i++) {
    const a = base + (typeof spread === 'number' ? (i - (n - 1) / 2) * spread : spread[i] ?? 0);
    const to = new Vector3(from.x + Math.sin(a) * dist, at.y + IMPACT_HEIGHT * 0.5, from.z + Math.cos(a) * dist);
    effects.spawn('projectile', c.scene, from, {
      to,
      speed: ARROW_SPEED,
      model: { model: m, colour, scale },
      onArrive: hit => {
        currentSkill = skill;
        impact(hit, c);
      },
    });
  }
}

/** The skill being dispatched — for helpers that fire a row's impact later. */
let currentSkill = 0;

/**
 * Master-level "Strengthener / Mastery" skills reuse their base skill's
 * look: the OpenMU numbers past 300 that are cast-able map onto the base
 * row by name prefix (the original's SKILL_REPLACEMENTS collapse).
 */
const MASTER_ALIASES: Record<number, number> = {
  326: 22, 327: 23, 328: 19, 329: 20, 330: 41, 331: 42, 332: 41, 333: 42, 336: 43, 337: 232, 339: 43, 340: 232, 342: 43, 343: 232,
  356: 48, 360: 48, 363: 48,
  378: 5, 379: 3, 380: 233, 381: 14, 382: 40, 383: 233, 384: 1, 385: 9, 387: 38, 388: 10, 389: 7, 390: 2, 391: 39, 392: 40, 393: 39, 394: 2, 395: 58,
  403: 16, 404: 16, 406: 16,
  411: 235, 413: 26, 414: 24, 416: 52, 417: 27, 418: 24, 420: 28, 422: 28, 423: 27, 424: 51, 431: 235, 441: 77,
  454: 219, 455: 215, 456: 230, 458: 214, 459: 221, 460: 222, 462: 214, 469: 218, 470: 218, 472: 218,
  479: 22, 480: 3, 481: 41, 482: 56, 483: 5, 484: 40, 486: 14, 487: 9, 489: 7, 490: 344, 491: 7, 492: 236, 493: 55, 494: 236, 496: 237,
  508: 61, 509: 66, 511: 64, 512: 62, 514: 61, 515: 64, 516: 62, 517: 64, 518: 78, 519: 65, 520: 78, 522: 64, 523: 238,
  551: 260, 552: 261, 554: 260, 555: 261, 558: 262, 559: 263, 560: 264, 569: 268, 572: 268, 573: 267,
};

// ---- fallbacks by skill type -------------------------------------------------------

const FALLBACK_WIZARDRY: SkillVisual = { cast: wizardCast, travel: bolt(TEX.thunder, RGBS.arc, ARC_MOTES), impact: arcHit };
const FALLBACK_WIZARDRY_AREA: SkillVisual = { cast: wizardCast, area: seq(ring({ texture: TEX.magicGround, colour: RGBS.energy, seconds: 1, scale: 3, spin: 60 }), scatter(arcHit, 4, 1.5, 0.05)) };
const FALLBACK_CURSE: SkillVisual = { cast: wizardCast, area: seq(ring({ texture: TEX.magicGround2, colour: RGBS.shade, seconds: 1.2, scale: 3, spin: -40 }), particles({ recipe: SHADE_MOTES, count: 30 })), impact: seq(flash(TEX.flare, RGBS.shade, 1.2, 0.4), particles({ recipe: SHADE_MOTES, count: 16 })) };
const FALLBACK_PHYSICAL: SkillVisual = { cast: slash(), impact: steelHit };
const FALLBACK_PHYSICAL_AREA: SkillVisual = { cast: slash(), area: seq(shockRing(RGBS.gold, 3.5), scatter(steelHit, 4, 1.5, 0.04)) };
const FALLBACK_BUFF: SkillVisual = { impact: seq(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), particles({ recipe: HOLY_MOTES, count: 16, height: 0.4 })), area: atCaster(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), 0.8) };
const FALLBACK_HEAL: SkillVisual = { impact: holyCircle() };
const FALLBACK_SUMMON: SkillVisual = { area: summonCircle, impact: summonCircle };
const FALLBACK_FENRIR: SkillVisual = { area: seq(shockRing(RGBS.fire, 5), scatter(fireHit, 6, 2, 0.04)), impact: fireHit };
const NOTHING: SkillVisual = {};

/** The look for a skill with no row, from what the server says it is. */
export function fallbackFor(def: SkillDefinition | undefined): SkillVisual {
  if (!def) return NOTHING;
  const area = def.type === 'AreaSkillAutomaticHits' || def.type === 'AreaSkillExplicitTarget';
  switch (def.type) {
    case 'PassiveBoost':
      return NOTHING;
    case 'Buff':
      return FALLBACK_BUFF;
    case 'Regeneration':
      return FALLBACK_HEAL;
    case 'SummonMonster':
      return FALLBACK_SUMMON;
    default:
      break;
  }
  switch (def.damageType) {
    case 'Wizardry':
      return area ? FALLBACK_WIZARDRY_AREA : FALLBACK_WIZARDRY;
    case 'Curse':
      return FALLBACK_CURSE;
    case 'Physical':
      return area ? FALLBACK_PHYSICAL_AREA : FALLBACK_PHYSICAL;
    case 'Fenrir':
      return FALLBACK_FENRIR;
    default:
      // "None" damage with a target and no other type: a buff-ish flash.
      return def.type === 'DirectHit' ? FALLBACK_BUFF : NOTHING;
  }
}

/** The row for a skill, through master aliases, else its type's fallback. */
export function skillVisualFor(skill: number): SkillVisual {
  return SKILL_VISUALS[skill] ?? SKILL_VISUALS[MASTER_ALIASES[skill] ?? -1] ?? fallbackFor(skillDefinition(skill));
}

/** How many skills have their own row (aliases included). */
export function skillVisualCount(): number {
  return Object.keys(SKILL_VISUALS).length + Object.keys(MASTER_ALIASES).length;
}

// ---- dispatch ---------------------------------------------------------------------

function contextFor(scene: Scene, caster: Entity, target: Entity | null): SkillContext {
  return { scene, caster, target, yaw: entityYaw(caster) };
}

function runTravel(row: SkillVisual, ctx: SkillContext, target: Entity): void {
  const { fromSky, skyOffset, ...travel } = row.travel!;
  const from = fromSky ? entityPos(target, IMPACT_HEIGHT, new Vector3()) : entityPos(ctx.caster, CAST_HEIGHT, new Vector3());
  if (fromSky) {
    const [ox, up, oz] = skyOffset ?? [1.5, 8, 1];
    from.x += ox;
    from.y += up;
    from.z -= oz;
  } else {
    // Leave from just in front of the hands, like the original's offset along the facing.
    const to = entityPos(target, IMPACT_HEIGHT, new Vector3());
    const dir = to.subtract(from).normalize();
    from.addInPlace(dir.scaleInPlace(0.4));
  }
  const skill = currentSkill;
  effects.spawn('projectile', ctx.scene, from, {
    ...travel,
    to: followEntity(target, IMPACT_HEIGHT),
    onArrive: at => {
      if (entityGone(target)) return;
      currentSkill = skill;
      row.impact?.(at, ctx);
    },
  });
}

export function playTargetedSkillVisual(
  scene: Scene,
  skill: number,
  caster: Entity,
  target: Entity | null
): void {
  if (caster.transform) {
    currentSkill = skill;
    const row = skillVisualFor(skill);
    const ctx = contextFor(scene, caster, target);
    const at = target?.transform ? entityPos(target, IMPACT_HEIGHT, new Vector3()) : entityPos(caster, IMPACT_HEIGHT, new Vector3());
    row.cast?.(at, ctx);
    if (row.travel && target?.transform) runTravel(row, ctx, target);
    else if (row.impact) row.impact(at, ctx);
    else if (row.area) {
      at.y -= IMPACT_HEIGHT;
      row.area(at, ctx);
    }
  }

  lighting.skillTargeted(scene, skill, caster, target);
}

/**
 * `AreaSkillAnimation` carries no target, but the explicit-target area
 * skills (Chain Lightning, Drain Life, Teleport Ally) draw a bolt or a
 * ribbon to one: `target` is the object the caller found standing on the
 * cast point (the hero's own cast knows it; for others logic.ts picks the
 * nearest object to the point). Objects stand on integer tile coordinates,
 * so the point is used as is.
 */
export function playAreaSkillVisual(
  scene: Scene,
  skill: number,
  caster: Entity,
  point: { x: number; y: number } | null,
  terrainHeight: (x: number, y: number) => number,
  target: Entity | null = null
): void {
  const x = point ? point.x : caster.transform!.pos.x;
  const z = point ? point.y : caster.transform!.pos.z;
  const y = terrainHeight(x, z);

  if (caster.transform) {
    currentSkill = skill;
    const row = skillVisualFor(skill);
    const aimed = target?.transform ? target : null;
    const ctx = contextFor(scene, caster, aimed);
    const at = new Vector3(x, y, z);
    row.cast?.(at, ctx);
    if (row.travel && aimed) runTravel(row, ctx, aimed);
    else if (row.area) row.area(at, ctx);
    else if (row.impact) {
      if (aimed) entityPos(aimed, IMPACT_HEIGHT, at);
      else at.y += IMPACT_HEIGHT;
      row.impact(at, ctx);
    }
  }

  lighting.skillArea(scene, skill, caster, { x, y, z });
}

// ---- persistent buff visuals (MagicEffectStatus) ----------------------------------

type BuffAura = (follow: PointSource) => AuraOptions;

/** Keyed by OpenMU MagicEffectNumber (common/magicEffects.ts). */
export const BUFF_VISUALS: Partial<Record<number, BuffAura>> = {
  // 1 Greater Damage: red shiny orbit (the original's BITMAP_SHINY ring, warm).
  1: follow => ({ follow, orbit: { texture: TEX.shiny, colour: [1, 0.55, 0.4], count: 3, size: 0.25 } }),
  // 2 Greater Defense: 5× CreateJoint(MODEL_SPEARSKILL sub4, width 20): Light (0.4,0.8,0.2), LT 10000, MaxTails 30, Tex FLARE_BLUE.
  2: follow => ({ follow, ribbons: { count: BUFF_RIBBONS, colour: [0.4, 0.8, 0.2], width: cm(20), tails: 30 } }),
  // 3 Elf Soldier buff
  3: follow => ({ follow, stream: { recipe: HOLY_MOTES, rate: 10 } }),
  // 4 Soul Barrier: 5× CreateJoint(MODEL_SPEARSKILL sub0, width 20): Light white, LT 999999, MaxTails 30, Tex FLARE_BLUE.
  4: follow => ({ follow, ribbons: { count: BUFF_RIBBONS, colour: RGBS.white, width: cm(20), tails: 30 }, stream: { recipe: SOUL_MOTES, rate: 6 } }),
  // 5 Critical Damage Increase: gold orbit.
  5: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.gold, count: 4, size: 0.22, height: 1.1, radius: 0.35 } }),
  // 6 Infinity Arrow: ice orbit.
  6: follow => ({ follow, orbit: { texture: TEX.flareBlue, colour: RGBS.ice, count: 2, size: 0.3, height: 1.2, radius: 0.3 } }),
  // 7 AG recovery
  7: follow => ({ follow, stream: { recipe: SOUL_MOTES, rate: 8 } }),
  // 8 Greater Fortitude (Swell Life): red shimmer over the body.
  8: follow => ({ follow, stream: { recipe: { ...BLOOD_CHIPS, power: 0.3, gravity: 0.8, life: 0.9, box: [0.3, 0.5, 0.3] }, rate: 14 } }),
  // 9 Elite Mana potion, 10 Bless, 11 Soul potions
  9: follow => ({ follow, stream: { recipe: SOUL_MOTES, rate: 10 } }),
  10: follow => ({ follow, stream: { recipe: HOLY_MOTES, rate: 10 } }),
  11: follow => ({ follow, stream: { recipe: SOUL_MOTES, rate: 10 } }),
  // 129 Ignore Defense, 130 Increase Health, 131 Increase Block (Rage Fighter)
  129: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.blood, count: 3, size: 0.22 } }),
  130: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.holy, count: 3, size: 0.22 } }),
  131: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.steel, count: 3, size: 0.22 } }),
  // 138/139 Wizardry Enhance
  138: follow => ({ follow, orbit: { texture: TEX.flareBlue, colour: RGBS.energy, count: 3, size: 0.25, height: 1 } }),
  139: follow => ({ follow, orbit: { texture: TEX.flareBlue, colour: RGBS.energy, count: 4, size: 0.28, height: 1 } }),
  148: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.gold, count: 5, size: 0.24, height: 1.1, radius: 0.35 } }),
  153: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.steel, count: 4, size: 0.22 } }),
  154: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.steel, count: 5, size: 0.24 } }),
  155: follow => ({ follow, orbit: { texture: TEX.shiny, colour: RGBS.holy, count: 4, size: 0.24 } }),
  // 200 Shield skill (knight Defense)
  200: follow => ({ follow, shell: { texture: TEX.flare, colour: RGBS.steel, size: 1.6 } }),
};

const buffHandles = new Map<Entity, Map<number, EffectHandle>>();

/** Command: keep (or drop) the persistent look of `effectId` on `entity`. */
export function setBuffVisual(scene: Scene, entity: Entity, effectId: number, active: boolean): void {
  let byEffect = buffHandles.get(entity);
  const have = byEffect?.get(effectId);
  if (have && (!active || !have.alive)) {
    have.stop();
    byEffect!.delete(effectId);
  }
  if (!active) {
    if (byEffect && byEffect.size === 0) buffHandles.delete(entity);
    return;
  }
  if (have?.alive) return;
  const recipe = BUFF_VISUALS[effectId];
  if (!recipe || !entity.transform) return;
  if (!byEffect) {
    byEffect = new Map();
    buffHandles.set(entity, byEffect);
  }
  const follow: PointSource = out => entityPos(entity, 0, out);
  const handle = effects.spawn('aura', scene, entityPos(entity, 0, new Vector3()), {
    ...recipe(follow),
    until: () => entityGone(entity),
  });
  byEffect.set(effectId, handle);
}

/** Drop every buff look on an entity that left (despawn, out of scope). */
export function clearBuffVisuals(entity: Entity): void {
  const byEffect = buffHandles.get(entity);
  if (!byEffect) return;
  for (const h of byEffect.values()) h.stop();
  buffHandles.delete(entity);
}
