import { Matrix, Quaternion, Vector3 } from '../libs/babylon/exports';
import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { lighting } from '../lighting';
import { effectLight } from '../lighting/recipes';
import type { LightRecipe, LightSource } from '../lighting/lightSource';
import { combat } from '../combat';
import { weather } from '../weather';
import { effects, type EffectHandle } from '../effects';
import { boneLocalPos, bonePos, delay, effectTexture, emitBurst, entityGone, entityPos, entityYaw, fadeOut, fixedPoint, followEntity, fxNow, scaleRGB, type ParticleRecipe, type PointSource, type RGB, type SheetCells } from '../effects/core';
import type { SpriteOptions } from '../effects/sprite';
import type { ShroudOptions } from '../effects/shroud';
import type { SpiritSwarmOptions, SwarmSpirit } from '../effects/spiritSwarm';
import { spawnModel, type ModelHandle, type ModelOptions } from '../effects/model';
import type { StampsHandle } from '../effects/stamps';
import type { CardOptions } from '../effects/cards';
import type { RingOptions } from '../effects/ring';
import type { ParticlesOptions } from '../effects/particles';
import type { ProjectileOptions } from '../effects/projectile';
import type { JointOptions, TaperShape } from '../effects/joint';
import type { Ray } from '../effects/rays';
import type { AuraOptions, BoneGlow, SpearJoints } from '../effects/aura';
import type { SummonBody } from '../effects/summon';
import {
  ARC_MOTES,
  BLOOD_CHIPS,
  BLOOD_MIST,
  BOMB_SPARKS,
  DUST,
  ENERGY_CHIPS,
  FIRE_PUFF,
  FIRE_SPARKS,
  FIRE_TRAIL,
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
import { PlayerAction } from './objects/enum';
import { playCombat, playLandingSound, SKILL_SOUNDS } from '../sound/combat';
import type { Sounds } from '../sound/recipes';
import { itemObjectAttribute } from './itemObjectAttribute';
import { inHellas } from './locomotion';
import { mountKind } from './pets';
import { skillDefinition, type SkillDefinition } from './skillsDatabase';
import { storeRef } from './storeRef';
import { tierIndex } from './lightingQuality';
import { TWFlags } from './terrain/consts';
import { COMBAT_BUS, playSfx } from '../sound';
import { earthQuake } from '../camera';
import { warmGLTF } from './modelLoader';
import { ENUM_WORLD } from './types';
import { TW_NOGROUND, TW_NOMOVE, TW_WATER } from './terrain/consts';
import { DARK_LORD_MASTER_ALIASES } from './skillAliases';
import { LEFT_HAND_BONE, RIGHT_HAND_BONE } from './weaponAttachment';
import { GROUP_BOW, GROUP_SHIELD } from './weaponClass';

/**
 * Skill → visual recipe. The **consumer** of the effects layer
 * : every row in `SKILL_VISUALS` is a handful of
 * `effects.spawn(...)` calls at the four moments a skill has - `cast` at the
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
/** Degrees → radians. */
const DEG = Math.PI / 180;

// ---- heights (tiles above the feet) --------------------------------------------

/** The caster's hands. */
const CAST_HEIGHT = 1.1;
/** A target's chest, where bolts hit. */
const IMPACT_HEIGHT = 0.9;
/** The weapon hand's bone (MU index; the original's `weaponBone` on a wizard staff). */
const WEAPON_BONE = 37;
/** Arrows: `o->Direction[1] = -70` cm a tick (ZzzEffect.cpp:1795), 17.5 tiles/s. */
const ARROW_SPEED = perTick(70);
/** A slash sweep: from -60° to +60° of the caster's yaw at this reach. */
const SLASH_REACH = 0.9;
const SLASH_SECONDS = 0.35;
/** Hit particles per impact. */
const HIT_COUNT = 14;
/** Triple Shot's fan: ±15°; the five-arrow masters ±5/10/20. */
const TRIPLE_SPREAD = (15 * Math.PI) / 180;
const FIVE_SPREAD = [-20, -10, 0, 10, 20].map(d => (d * Math.PI) / 180);
/**
 * Evil Spirit's spirits: the original's JOINT_SPIRIT flights (ZzzEffectJoint.cpp:3732-3772) each
 * carrying its MODEL_LASER skull (Laser01, RENDER_DARK), eight in two waves. The original homes
 * them on the caster, which keeps the swarm on top of him; here each one chases its own point
 * circling the caster somewhere inside the skill's reach, so together they cover the whole area it
 * hits. Each skull is the sheet's own pattern over a faint silhouette, so it keeps its detail.
 */
const SPIRIT_COUNT = 8;
const SPIRIT_WAVE = 4;
/** Seconds between waves; each wave's headings sit between the previous wave's. */
const SPIRIT_WAVE_GAP = 0.1;
const SPIRIT_SPEED = perTick(36);
const SPIRIT_TURN = (16 * Math.PI) / 180;
/** Ticks of trail behind each skull: the original's 6 read as a stub once the spirits spread out. */
const SPIRIT_TAILS = 26;
/** Each trail is the shadow dragon's body: wide behind the head, held, then a tail, swaying as it flies. */
const SPIRIT_BODY_WIDTH = 0.9;
const SPIRIT_BODY_SHAPE: TaperShape = { nose: 0.9, span: 0.04, hold: 0.3, falloff: 1.2 };
const SPIRIT_SWAY = { amplitude: 0.35, cycles: 1.5, speed: 8 };
/** The darker spine down the middle of each body: the original's width-20 ribbon beside the width-80 one. */
const SPIRIT_CORE_WIDTH = 0.4;
/** The body's own coverage, lighter than the core so the spine reads through it. */
const SPIRIT_FLESH: RGB = [0.8, 0.8, 0.8];
/** The spine's coverage over JointLaser01's soft centre line (it peaks at 0.36). */
const SPIRIT_SPINE: RGB = [2.2, 2.2, 2.2];
/**
 * Caps on the body's and spine's coverage gain. Night maps lift the dark gain a long way, which
 * saturated whole bodies to black and let a few casts black out the screen.
 */
const SPIRIT_FLESH_MAX = 1;
const SPIRIT_SPINE_MAX = 2.2;
/** Two thin wisps braiding round each body, half a wave apart, swinging wider than the body sways. */
const SPIRIT_WISP_WIDTH = 0.14;
const SPIRIT_WISPS = [0, Math.PI].map(phase => ({ amplitude: 0.6, cycles: 2.2, speed: 11, phase }));
/** Dark smoke the dragons shed as they fly: a soft black haze along the path that spreads and fades. */
const SPIRIT_SMOKE: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: [0.02, 0.02, 0.03],
  size: 0.55,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.3,
  box: [0.15, 0.1, 0.15],
  dir1: [-1, 0.2, -1],
  dir2: [1, 0.8, 1],
  power: 0.25,
  gravity: 0.1,
  spin: 0.8,
  endScale: 2.6,
  blend: 'alpha',
  capacity: 384,
};
/** The skill's distance in tiles (skillsDatabase, 7): the area the spirits spread over. */
const SPIRIT_REACH = 7;
/** Innermost and outermost orbit as fractions of the reach. */
const SPIRIT_ORBIT_MIN = 0.3;
const SPIRIT_ORBIT_MAX = 0.95;
/** Tangential speed of an orbit point, tiles/s, and the most any orbit turns, rad/s. */
const SPIRIT_ORBIT_SPEED = 5;
const SPIRIT_ORBIT_TURN = 1.4;
/** Skull scale (the original's 1.3) and its coverage. Laser01's snout points down its -Z. */
const SPIRIT_SCALE = 1.1;
const SPIRIT_DARK: RGB = [1, 1, 1];
/** How far the skull's back end sits behind the ribbon's tip, as a fraction of its length. Its back third is swept horns, so the body has to start past them. */
const SPIRIT_NECK = 0.6;
/** A faint flat shadow under the skull, so its dark cells read as body; the sheet's detail stays on top. */
const SPIRIT_BODY: RGB = [0.35, 0.35, 0.35];
/**
 * The shroud on each screen. The caster's own view keeps a wide clear middle - a player must still
 * see what they are doing - and anyone else's near a cast gets thicker smoke, never a flat sheet.
 */
const SHROUD_OWN: ShroudOptions = { cover: 0.8, maxCover: 0.7, hole: 0.08, feather: 0.3, smoke: 0.7 };
const SHROUD_OTHERS: ShroudOptions = { cover: 1, maxCover: 0.82, hole: 0, feather: 0.18, smoke: 0.55 };
/** Everything a wave of spirits shares: one steer, the body with its wisps and spine, the skull (the sheet twice: one pass of it, averaging 0.34, leaves the pattern too faint to read). */
const SPIRIT_SWARM: Omit<SpiritSwarmOptions, 'spirits' | 'seconds' | 'fadeTail'> = {
  tails: SPIRIT_TAILS,
  smooth: 5,
  seekRate: SPIRIT_TURN,
  wander: { pitch: (3 * Math.PI) / 180, yaw: (8 * Math.PI) / 180 },
  band: { floor: 1, ceiling: 4 },
  body: { width: SPIRIT_BODY_WIDTH, colour: SPIRIT_FLESH, maxCover: SPIRIT_FLESH_MAX, texture: TEX.jointSpirit, taper: SPIRIT_BODY_SHAPE, wave: SPIRIT_SWAY },
  wisps: { width: SPIRIT_WISP_WIDTH, waves: SPIRIT_WISPS },
  spine: { width: SPIRIT_CORE_WIDTH, colour: SPIRIT_SPINE, maxCover: SPIRIT_SPINE_MAX, texture: TEX.jointLaser, taper: SPIRIT_BODY_SHAPE },
  skull: { model: MODEL.laser, scale: SPIRIT_SCALE, aimYaw: Math.PI, rearAt: SPIRIT_NECK, silhouette: SPIRIT_BODY, silhouetteCover: SPIRIT_BODY[0], sheet: SPIRIT_DARK, sheetCover: 1, passes: 2 },
};
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
 * `step` again after `seconds` - on the effects clock (`effects/core.ts`
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
 * - the same one deathSystem and the debris entry use.
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

// ---- impact / cast building blocks -------------------------------------------------

const hitSparks = (recipe = SPARKS, count = HIT_COUNT): Step => particles({ recipe, count });
const flash = (texture: string, colour: RGB, size = 1, seconds = 0.4): Step =>
  sprite({ texture, colour, size, seconds, grow: 1.6, growFrom: 0.4, fadeTail: 0.5 });
/**
 * `n` fire pillars (effects/pillar.ts): the first on the point, the rest scattered `radius` tiles
 * around it a third to the full way out, `every` seconds apart, each on its own ground height.
 */
const firePillars = (n: number, radius: number, every: number): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * (Math.PI / n);
    const r = i === 0 ? 0 : radius * (0.55 + Math.random() * 0.45);
    const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    if (i === 0) effects.spawn('pillar', c.scene, p, {});
    else delay(i * every, () => effects.spawn('pillar', c.scene, p, {}));
  }
};
/** MODEL_STONE1 / MODEL_STONE2 chips thrown up from a ground hit - either model, rolled per chip (ZzzEffect.cpp:280). */
const stones = (n: number, radius = 0.6): Step =>
  scatter(
    (at, c) => model({ model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, seconds: 1, colour: RGBS.gold, rise: 2.5, spin: 6, scale: 0.7 })(at, c),
    n,
    radius
  );
/**
 * `c->AttackTime >= g_iLimitAttackTime` - 15 ticks (ZzzCharacter.cpp:90). The
 * wizard's leap in `player_action_154` lands around tick 12, so the ground
 * effect follows him down rather than waiting on the clip.
 */
const HELLFIRE_TOUCHDOWN = 15;
/**
 * The caster alight: `if (o->CurrentAction == PLAYER_SKILL_HELL &&
 * rand_fps_check(1))` spawns BITMAP_FIRE off ten random bones every tick
 * (ZzzCharacter.cpp:5633-5639), so the wizard burns for the whole jump instead
 * of only where he lands. Ten cards a tick is a particle system's price, not a
 * sprite layer's; four reads the same at a quarter of the spawns.
 */
const bodyFire = (tickCount: number, perTick: number): Step =>
  repeat(tickCount, TICK, (_at, c) => {
    const bones = c.caster.modelObject?.gltf?.skeleton?.bones.length ?? 0;
    if (bones <= 1) return;

    for (let i = 0; i < perTick; i++) {
      const bone = Math.floor(Math.random() * (bones - 1));
      effects.spawn('sprite', c.scene, bonePos(c.caster, bone, new Vector3()), {
        texture: TEX.fire,
        colour: RGBS.fire,
        size: 0.5,
        seconds: ticks(8),
        fadeTail: 0.6,
      });
    }
  });
/**
 * BITMAP_EXPLOTION played through its 10 cells over 20 ticks, `Width = 256 cm × Scale`
 * (ZzzEffectParticle.cpp). Never a plain `flash`: the sheet's filler cells are white.
 */
const explosion = (colour: RGB, scale = 1, seconds = ticks(20)): Step =>
  sprite({ texture: TEX.explosion, colour, size: cm(256) * scale, seconds, cells: EXPLOSION_CELLS, fadeTail: 0.25 });
/**
 * Burn the settled snow off the ground under `at` (weather/snowMelt.ts).
 *
 * Not from the original - nothing in `ZzzEffect.cpp` has ever touched the
 * terrain - but the ground here is a simulation rather than a texture, and a
 * fireball that leaves a snowfield untouched is the one thing on screen that
 * gives that away. Radius in tiles; it takes only x/z, so a hit at a target's
 * chest still melts what is under them. Free to call anywhere: a map with no
 * snow overlay never samples the patch.
 */
const scorch = (radius: number, strength = 1): Step => at => {
  weather.meltSnow(at.x, at.z, radius, strength);
};
/**
 * The other half of what fire does to the ground: the grass goes up, and the
 * fire spreads from the hit under its own vigour until it runs out of that or
 * out of grass (`weather/grassBurn.ts`). Radius in tiles, the same one the
 * snow takes - a bigger spell lights a bigger fire and therefore burns
 * further, with no per-skill table anywhere to say so.
 */
const burn = (radius: number, strength = 1): Step => (at, c) => {
  weather.burnGrass(c.scene, at.x, at.z, radius, strength);
};
/** MODEL_FIRE's `o->BlendMesh = 1`: the fire01 tail is additive, the fire02 lava core is drawn opaque. */
const FIRE_BLEND_MESH = 1;
/** Every fire skill's landing, and so the one place the snow gets melted. */
const fireHit: Step = seq(explosion(RGBS.fire), hitSparks(FIRE_SPARKS, 16), particles({ recipe: FIRE_PUFF, count: 6 }), scorch(1.2), burn(1.2));
/** MODEL_ICE (LT 50, Scale 0.8, white) + 5× MODEL_ICE_SMALL (LT 32–47, Scale 0.8–1.1, Gravity 8–23) - the Ice hit. */
const iceHit: Step = seq(
  model({ model: MODEL.ice, seconds: ticks(50), scale: 0.8, colour: RGBS.white }),
  scatter(model({ model: MODEL.ice2, seconds: ticks(40), scale: 0.95, colour: RGBS.white, rise: 1.5, spin: 3 }), 5, 0.5),
  hitSparks(ICE_MOTES, 10)
);
const arcHit: Step = seq(flash(TEX.thunder, RGBS.arc, 1.3, 0.3), hitSparks(ARC_MOTES, 20));
const venomHit: Step = seq(flash(TEX.flare, RGBS.venom, 1.1, 0.5), particles({ recipe: VENOM_MOTES, count: 16 }));
/** BITMAP_MAGIC+1 (Magic_Ground2) at a body's feet, LT 20 - the buff-cast circle. */
const magicGround = (colour: RGB, seconds = ticks(20), scale = 2.5): Step =>
  ring({ texture: TEX.magicGround2, colour, seconds, scale, spin: 60, growFrom: 0.5 });
const holyCircle = (colour: RGB = RGBS.holy): Step =>
  seq(magicGround(colour), particles({ recipe: HOLY_MOTES, count: 24, height: 0.2 }));
const shockRing = (colour: RGB = RGBS.gold, scale = 4): Step =>
  ring({ texture: TEX.shockwave, colour, seconds: 0.6, scale, grow: 2, growFrom: 0.2, fadeTail: 0.6 });
/**
 * A bleed skill landing. No `flash`: a card is additive whatever it is
 * tinted, and a red `flare` over a bright map clipped to white and bloomed
 * into a pink cloud - BLOOD_MIST is the same spray drawn straight-alpha.
 */
const bloodHit: Step = seq(hitSparks(BLOOD_CHIPS, 18), particles({ recipe: BLOOD_MIST, count: 5 }));
const steelHit: Step = seq(hitSparks(STEEL_GLINTS, 14), flash(TEX.spark2, RGBS.steel, 0.8, 0.25));
const wizardCast: Step = atCaster(sprite({ texture: TEX.magicCircle, colour: RGBS.energy, size: 0.5, seconds: 0.4, spin: 6, grow: 1.4 }));
/** A JOINT_THUNDER bolt from the sky onto `at` (GiganticStorm, Twister's strikes). */
const skyBolt = (height: number, width = 0.3, seconds = ticks(20)): Step => (at, c) => {
  const top = at.clone();
  top.y += height;
  top.x += (Math.random() - 0.5) * 2;
  top.z += (Math.random() - 0.5) * 2;
  effects.spawn('joint', c.scene, top, { to: at, colour: RGBS.arc, seconds, width, forks: 2, jitter: 0.1, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
};
/** `n` streamers fanning around the up axis, `i*step` radians apart, from `at`. */
const streamerFan = (
  n: number,
  step: number,
  o: { velocity: number; seconds: number; maxTails: number; width: number; colour: RGB; pitch?: number; turn?: number; gravity?: number; blend?: JointOptions['blend']; texture?: string }
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
 * width 60) - Vel 50, LT 20, MaxTails 3, Light 0.5 - with BITMAP_MAGIC+1 every
 * 20th. Drawn at half the count: 18 ribbons read the same and cost half.
 */
const spiritBurst = (colour: RGB): Step =>
  seq(
    streamerFan(18, (Math.PI * 2) / 18, { velocity: perTick(50), seconds: ticks(20), maxTails: 3, width: 0.6, colour, pitch: (10 * Math.PI) / 180, texture: TEX.jointSpirit }),
    magicGround(colour, ticks(40), 3)
  );

/** CreateBomb (ZzzEffect.cpp:6394): 20 BITMAP_SPARK chips + one grey BITMAP_EXPLOTION card. */
const bomb = (colour: RGB = [0.5, 0.5, 0.5]): Step =>
  seq(explosion(colour), particles({ recipe: BOMB_SPARKS, count: 20 }));

/**
 * The MODEL_MULTI_SHOT volley (WSclient.cpp AT_SKILL_MULTI_SHOT, Dragon Kick):
 * 3× sub1 at the hands, 2× sub2 and 2× sub3 twenty cm ahead, Light (0.8,0.9,1.6),
 * fired along the facing.
 */
const multiShotVolley: Step = (_at, c) => {
  const tint: RGB = [0.8, 0.9, 1];
  const volley = (m: string, fwd: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const turn = (i - (n - 1) / 2) * 0.14;
      effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: m, seconds: ticks(20), scale: 1, colour: tint, follow: flying(c, 0.9, perTick(45), turn, fwd), yaw: entityYaw(c.caster) + turn });
    }
  };
  volley(MODEL.multishot3, cm(20), 2);
  volley(MODEL.multishot, 0, 3);
  volley(MODEL.multishot2, cm(20), 2);
};

/** Expansion of Wizardry: MODEL_SWELL_OF_MAGICPOWER on the caster, Light (0.3,0.2,0.9). */
const swellOfMagic: Step = atCaster((at, c) => {
  effects.spawn('model', c.scene, at, { model: MODEL.magicPowerUp, seconds: ticks(40), scale: 1, colour: [0.3, 0.2, 0.9], fadeIn: 0.2, fadeTail: 0.3, yaw: entityYaw(c.caster) });
  particles({ recipe: SOUL_MOTES, count: 24, height: 0.5 })(at, c);
}, 0.05);

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
  /**
   * The improved look, for the Enhanced and Ultra tiers. Classic always draws
   * the row itself, which is the original's; each moment set here replaces
   * the Classic one on the graded tiers, and a moment left out keeps it.
   */
  enhanced?: Omit<SkillVisual, 'enhanced'>;
}

/** The first lighting tier that draws a row's `enhanced` look. */
const ENHANCED_TIER = 1;

/** A row as the current tier draws it. */
function forTier(row: SkillVisual): SkillVisual {
  return row.enhanced && tierIndex() >= ENHANCED_TIER ? { ...row, ...row.enhanced } : row;
}

const bolt = (head: string, colour: RGB, trail: ParticlesOptions['recipe'], size = 0.6, speed = perTick(60)): Travel => ({
  speed,
  head: { texture: head, colour, size },
  trail: { recipe: trail, rate: 30 },
});

const modelBolt = (m: string, colour: RGB, trail: ParticlesOptions['recipe'] | null, speed = perTick(50), scale = 1, blendMesh?: number, alongPath?: boolean): Travel => ({
  speed,
  model: { model: m, colour, scale, blendMesh, alongPath },
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
const skyfall = (m: string, colour: RGB, trail: ParticlesOptions['recipe'] | null, from: readonly [number, number, number], speed: number, scale: number, hit: Step, alongPath?: boolean): Step => (at, c) => {
  const start = new Vector3(at.x + from[0], at.y + from[1], at.z - from[2]);
  effects.spawn('projectile', c.scene, start, {
    to: at,
    speed,
    model: { model: m, colour, scale, alongPath },
    ...(trail ? { trail: { recipe: trail, rate: 40 } } : {}),
    onArrive: p => hit(p, c),
  });
};

// ---- shared rows ---------------------------------------------------------------

/** Fire Slash's BITMAP_SKULL marks the target for LT 1000 (40 s) in the original; the defence debuff's length here. */
const SKULL_SECONDS = 10;

/** Summons: BITMAP_MAGIC+1 sub3 at the caster's feet + smoke at the point. */
function summonCircle(at: Vector3, c: SkillContext): void {
  atCaster(magicGround(RGBS.holy, ticks(20), 2.5), 0)(at, c);
  particles({ recipe: SMOKE, count: 12 })(at, c);
}

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
  effects.spawn('joint', c.scene, top, { heading: new Vector3(0, -1, 0), velocity: perTick(70), seconds: ticks(40), maxTails: 10, width: 1.2, colour, texture: TEX.flash });
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
      effects.spawn('joint', c.scene, at, { head, maxTails: tails, width, colour, seconds, texture: TEX.jointEnergy });
    }
  };
}

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
      effects.spawn('joint', c.scene, from, { to, colour: [0.3, 0.3, 1], seconds: ticks(17), width: 0.1, segments: 6, jitter: 0.08, until: done, texture: TEX.jointEnergy });
    }
    delay(ticks(17), force);
  };
  force();
};
/** A Nova hold tops out at 12 stages × 5 ticks; anyone else's charge is shown that long. */
const NOVA_MAX_SECONDS = ticks(60);

// ---- dl1 steps -------------------------------------------------------------------

/** The Dark Lord's strike clips; key 3 releases Force and Fire Burst (ZzzCharacter.cpp:2865-2883). */
const STRIKE_CLIPS: ReadonlySet<number> = new Set([PlayerAction.PLAYER_ATTACK_STRIKE, PlayerAction.PLAYER_ATTACK_RIDE_STRIKE, PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE]);
const STRIKE_KEY = 3;
/** AttackTime starts at 1 and fires at 15 (ZzzCharacter.cpp:4132-4140): 14 ticks at most. */
const STRIKE_MAX_TICKS = 14;
/** Moves an effect has made when drawn `t` seconds after its spawn: the first runs in the frame it is created. */
const movesAt = (t: number): number => 1 + t / TICK;
/** The caster's `Angle[2]` in degrees, for model.ts `angle`. */
const yawDegrees = (c: SkillContext): number => (entityYaw(c.caster) * 180) / Math.PI;
/** `rand() % n`. */
const randInt = (n: number): number => Math.floor(Math.random() * n);

/**
 * `step` once the caster's strike clip passes key 3, or 14 ticks after the packet, whichever comes first,
 * with `sound` as it fires. The original needs a live target for any of it (ZzzCharacter.cpp:4811-4839).
 */
const strikeKey = (step: Step, sound: Sounds): Step => (at, c) => {
  if (!c.target?.transform) return;
  const p = at.clone();
  let waited = 0;
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const struck = !!m && STRIKE_CLIPS.has(m.CurrentAction) && m.actionFrame() >= STRIKE_KEY;
    if (!struck && waited++ < STRIKE_MAX_TICKS) {
      delay(TICK, poll);
      return;
    }
    playCombat(sound, c.caster.transform!.pos);
    step(p, c);
  };
  poll();
};

/** A MODEL_WAVES scale after `n` moves: `Scale += Gravity`, `Gravity += dg`, capped (MoveHandlers.cpp:5277-5290). */
const wavesScale = (s0: number, dg: number, cap: number, n: number): number => Math.min(cap, s0 + 0.01 * n + (dg * n * (n - 1)) / 2);

/** Force's rings, streaks and lance sit 130 cm over the caster's feet (MODEL_WAVES +50 +80, PIERCING2 +130). */
const FORCE_HEIGHT = cm(130);
/** BITMAP_PIERCING sub0 lays 30 tails 20 cm apart straight ahead on its first tick (ZzzEffectJoint.cpp:6492-6505). */
const PIERCING_LENGTH = cm(29 * 20);

/** One BITMAP_PIERCING sub0: a static Piercing.jpg streak from `p` along `f`, width 70-109 cm, x1/1.4 a tick, LT 10. */
function piercingStreak(p: Vector3, f: Vector3, c: SkillContext): void {
  const far = new Vector3(p.x + f.x * PIERCING_LENGTH, p.y, p.z + f.z * PIERCING_LENGTH);
  // U runs from the caster (0) to the far end (1), the original's (NumTails - j) / (MaxTails - 1).
  effects.spawn('joint', c.scene, far, {
    to: p.clone(),
    jitter: 0,
    segments: 2,
    width: cm(70 + randInt(40)),
    colour: Math.random() < 0.5 ? [1, 0.8, 0.6] : RGBS.white,
    texture: TEX.pierce,
    seconds: ticks(10),
    intensity: t => Math.pow(1.4, -movesAt(t)),
  });
}

/**
 * Force / Force Wave at the strike (ZzzCharacter.cpp:5056-5063), all at the caster: 2x MODEL_WAVES sub1
 * (ZzzEffect.cpp:3207-3222), each laying 2 BITMAP_PIERCING streaks before its ±50 cm jitter, then
 * MODEL_PIERCING2 (:3248-3264) easing 1.2 m forward and dropping a MODEL_WAVES sub2 a tick for 5 ticks
 * (MoveHandlers.cpp:5360-5396). Vertical rings facing the heading, depth-tested, near white.
 */
const force: Step = (_at, c) => forceParts(c, 1.5);

/** Direction[1] from -60 by +12 a tick to 0: the lance is 48, 36, 24, 12 cm on after `n` moves, then held 1.2 m out. */
const forceReach = (n: number): number => (n >= 4 ? cm(120) : cm(60 * n - 6 * n * (n + 1)));

/** Force's parts; `ringFade` is the sub1 rings' per-tick BlendMeshLight divisor (1.5 in the original). */
function forceParts(c: SkillContext, ringFade: number): void {
  const yaw = yawDegrees(c);
  const f = facing(c);
  const p = entityPos(c.caster, FORCE_HEIGHT, new Vector3());
  for (let i = 0; i < 2; i++) {
    piercingStreak(p, f, c);
    piercingStreak(p, f, c);
    const s0 = 0.1 + randInt(50) / 100;
    const q = new Vector3(p.x + cm(randInt(100) - 50), p.y, p.z + cm(randInt(100) - 50));
    effects.spawn('model', c.scene, q, {
      model: MODEL.waves,
      seconds: ticks(14),
      angle: [90, 0, yaw],
      scaleAt: t => wavesScale(s0, 0.07, 2, movesAt(t)),
      intensity: t => Math.pow(ringFade, -movesAt(t)),
      fadeTail: 0,
    });
  }
  const t0 = fxNow();
  effects.spawn('model', c.scene, p, {
    model: MODEL.piercing2,
    seconds: ticks(9),
    scale: 2,
    angle: [0, 0, yaw],
    follow: out => {
      const d = forceReach(movesAt(fxNow() - t0));
      return out.set(p.x + f.x * d, p.y, p.z + f.z * d);
    },
    intensity: t => Math.pow(1.6, -Math.min(5, movesAt(t))),
    fadeTail: 0,
  });
  // While LT > 5 the lance drops one ring a tick where it stands, Scale 0.05 x LT.
  for (let m = 1; m <= 5; m++) {
    const d = forceReach(m - 1);
    const s0 = 0.05 * (11 - m);
    const ring = new Vector3(p.x + f.x * d, p.y, p.z + f.z * d);
    delay(ticks(m - 1), () =>
      effects.spawn('model', c.scene, ring, {
        model: MODEL.waves,
        seconds: ticks(14),
        angle: [90, 0, yaw],
        scaleAt: t => wavesScale(s0, 0.01, 1.5, movesAt(t)),
        intensity: t => Math.pow(1.5, -movesAt(t)),
        fadeTail: 0,
      })
    );
  }
}

/** Fire Burst's origin: bone 0 + (40, 0, 10) cm in its frame (ZzzCharacter.cpp:5071-5072). */
const FIRE_BURST_LOCAL = new Vector3(cm(40), 0, cm(10));
/** MODEL_PIER_PART sub0 LT 20: it is drawn after moves 0..18 (ZzzEffect.cpp:3384-3395). */
const DART_MOVES = 19;
/** `Direction (0, -26, 0)`: each homing step. */
const DART_STEP = cm(26);
/** TurnAngle2: `cur` toward `target` by at most `max` degrees, in [0, 360) (ZzzAI.cpp:120-127). */
const turnToward = (cur: number, target: number, max: number): number => {
  let d = (((target % 360) + 360) % 360) - (((cur % 360) + 360) % 360);
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  const next = cur + Math.max(-max, Math.min(max, d));
  return ((next % 360) + 360) % 360;
};
/**
 * MoveHumming (ZzzAI.cpp:135-146): `heading` (MU degrees) turned toward `aim` by at most `turn` in yaw,
 * then in pitch; its unit direction written into `dir` (the `Direction (0, -d, 0)` it moves along).
 */
function hummingDir(heading: [number, number, number], pos: Vector3, aim: Vector3, turn: number, dir: Vector3): Vector3 {
  const dx = aim.x - pos.x;
  const dz = aim.z - pos.z;
  heading[2] = turnToward(heading[2], (Math.atan2(dx, -dz) * 180) / Math.PI, turn);
  heading[0] = turnToward(heading[0], 360 - (Math.atan2(aim.y - pos.y, Math.hypot(dx, dz)) * 180) / Math.PI, turn);
  const pitch = (heading[0] * Math.PI) / 180;
  const yaw = (heading[2] * Math.PI) / 180;
  return dir.set(Math.cos(pitch) * Math.sin(yaw), -Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
}
/** `to->BoundingBoxMax[2]`: 120 cm on a player (ZzzCharacter.cpp:11798); a monster's from its model's bounds. */
function targetTop(e: Entity): number {
  const m = e.modelObject;
  if (e.charAppearance || !m?.gltf || !e.transform) return cm(120);
  m.UpdateBoundings();
  const top = m.BoundingBoxLocal.maximumWorld.y - e.transform.pos.y;
  return top > 0.3 ? top : cm(120);
}

/**
 * One BITMAP_FIRE+1 sub0 off a ghost (ZzzEffectParticle.cpp:571-576, :4769-4777): Fire02 at Scale 0.8
 * growing by an accumulating 0.02, rising Gravity x 20 cm, streaming along the dart's heading at
 * 9.6-11.7 cm a tick x1.05, Light LT x 0.2 (clamped at 1), LT 12.
 */
function pierFire(c: SkillContext, at: Vector3, dir: Vector3, look?: PierLook): void {
  const v0 = cm((randInt(8) + 32) * 0.3);
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, at, {
    texture: TEX.fire2,
    colour: look?.puff,
    size: cm(64) * (look?.puffSize ?? 1),
    seconds: ticks(11),
    roll: Math.random() * Math.PI * 2,
    follow: out => {
      const n = movesAt(fxNow() - t0);
      const d = (v0 * (Math.pow(1.05, n) - 1)) / 0.05;
      return out.set(at.x + dir.x * d, at.y + dir.y * d + cm(0.2 * n * (n + 1)), at.z + dir.z * d);
    },
    sizeAt: p => {
      const n = movesAt(p * ticks(11));
      return 0.8 + 0.01 * n * (n + 1);
    },
    // Light 0.2 x LT clamps at 1 until LT 5: a linear fade over the last 5 of its 11 drawn ticks.
    fadeTail: 5 / 11,
  });
}

/**
 * One MODEL_PIER_PART sub0 dart (MoveHandlers.cpp:5598-5640): per tick `Gravity - 1` steps, each a 50%
 * -20° pitch kick, MoveHumming toward the aim by up to `Velocity` degrees, 26 cm along the new heading,
 * and a sub1 ghost left there. Drawn at its tick positions, alpha-tested, only its steel spike.
 *
 * The ghosts (ZzzEffect.cpp:3397-3405, MoveHandlers.cpp:5664-5670) are the flame frame alone at Scale 0.5,
 * `Alpha = (20 - LT) / 5` so the first ticks' ones are cut away, x1/1.3 a tick over the dart's last ticks,
 * dying with it; each emits one Fire02 puff. They are stamps of one trail per dart (effects/stamps.ts).
 */
function pierDart(c: SkillContext, target: Entity, from: Vector3, yaw: number, aimHeight: number, look?: PierLook): Vector3 {
  const pos = from.clone();
  const aim = entityPos(target, aimHeight, new Vector3());
  const dir = new Vector3();
  const step = new Vector3();
  const heading: [number, number, number] = [0, 0, yaw];
  let velocity = 10;
  let gravity = 2;
  const dart = effects.spawn('model', c.scene, from, {
    model: MODEL.pierPart,
    seconds: ticks(DART_MOVES),
    scale: 1.2,
    hideMesh: 1,
    cutout: true,
    angle: heading,
    follow: out => out.copyFrom(pos),
    fadeTail: 0,
  }) as ModelHandle;
  const ghosts = effects.spawn('stamps', c.scene, from, {
    model: MODEL.pierPart,
    mesh: 1,
    scale: 0.5,
    seconds: ticks(DART_MOVES),
    intensity: t => Math.pow(1.3, -Math.max(0, t / TICK - 15)),
  }) as StampsHandle;
  let k = 0;
  const move = (): void => {
    const lifeTime = 20 - k;
    if (!entityGone(target)) entityPos(target, aimHeight, aim);
    for (let i = 1; i < gravity; i++) {
      if (Math.random() < 0.5) heading[0] += heading[0] < -90 ? 20 : -20;
      hummingDir(heading, pos, aim, velocity, dir);
      velocity += 0.4;
      if (lifeTime < 10) velocity += 0.1;
      pos.addInPlace(dir.scaleToRef(DART_STEP, step));
      pierFire(c, pos.clone(), dir.clone(), look);
      ghosts.add(pos, heading, Math.min(1, k / 5));
    }
    gravity = Math.fround(gravity + 0.1);
    dart.setAngle(heading);
    if (look) effects.spawn('particles', c.scene, pos, { recipe: DART_EMBERS, count: k === DART_MOVES - 1 ? 6 : 1 });
    if (++k < DART_MOVES) delay(TICK, move);
  };
  if (look) {
    effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: look.head, size: 0.55, seconds: ticks(DART_MOVES), follow: out => out.copyFrom(pos), fadeTail: 0.2 });
  }
  move();
  return pos;
}

/**
 * Fire Burst at the strike (ZzzCharacter.cpp:5064-5085): 3 homing darts from bone 0 + (40, 0, 10) at
 * yaw +90 / 0 / -90, the first aimed at the target's BoundingBoxMax z and the others at half of it, plus
 * 2 MODEL_DARKLORD_SKILL cards there, Light (1, 0.6, 0.3), Scale 0.2, LT 10, turned (45, ±45, 0) in the
 * world (ZzzEffect.cpp:3449-3470). Nothing lands on the target.
 */
const fireBurst: Step = (_at, c) => {
  const target = c.target!;
  const o = boneLocalPos(c.caster, 0, FIRE_BURST_LOCAL, new Vector3(), 1);
  const yaw = yawDegrees(c);
  const top = targetTop(target);
  pierDart(c, target, o, yaw + 90, top);
  pierDart(c, target, o, yaw, top / 2);
  pierDart(c, target, o, yaw - 90, top / 2);
  for (const tilt of [45, -45]) {
    effects.spawn('model', c.scene, o, { model: MODEL.darkLordSkill, seconds: ticks(9), scale: 0.2, colour: [1, 0.6, 0.3], angle: [45, tilt, 0], fadeTail: 0 });
  }
};

// Enhanced and Ultra: the same parts, with the glow, sparks, ground contact and light the graded frame needs.

/** `strikeKey` for a graded look that lights itself: the row's key is taken at the packet, before another skill is dispatched. */
const litStrike = (make: (skill: number) => Step, sound: Sounds): Step => (at, c) => strikeKey(make(baseSkill(currentSkill)), sound)(at, c);

/** Force's lavender (the Piercing streaks' violet over the cyan rings) and its sparks' hotter white. */
const FORCE_TINT: RGB = [0.72, 0.78, 1];
const FORCE_SPARK: RGB = [0.88, 0.85, 1];
/** Enhanced rings fade x1/1.65 a tick, not 1.5: at their 2x cap the slower fade reads as a milky wash on the graded frame. */
const FORCE_RING_FADE = 1.65;
/** Sparks thrown along the streaks, 6-13 tiles/s within ±14° of the facing. */
const FORCE_SPARKS = 12;

/**
 * Force on the graded tiers: the original's parts, plus a star flash where the lance leaves, a hot point
 * riding its head, sparks thrown down the streaks, a shock ring and dust at the feet, and the strike light.
 */
const forceGraded = (skill: number): Step => (_at, c) => {
  forceParts(c, FORCE_RING_FADE);
  const f = facing(c);
  const p = entityPos(c.caster, FORCE_HEIGHT, new Vector3());
  const feet = entityPos(c.caster, 0, new Vector3());
  effects.spawn('sprite', c.scene, p, { texture: TEX.impact, colour: FORCE_TINT, size: 1.7, seconds: ticks(6), growFrom: 0.5, grow: 1.2, fadeTail: 0.75 });
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, p, {
    texture: TEX.flare,
    colour: FORCE_SPARK,
    size: 0.8,
    seconds: ticks(9),
    follow: out => {
      const d = forceReach(movesAt(fxNow() - t0));
      return out.set(p.x + f.x * d, p.y, p.z + f.z * d);
    },
    fadeTail: 0.6,
  });
  for (let i = 0; i < FORCE_SPARKS; i++) {
    const a = (Math.random() - 0.5) * 0.5;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const v = 6 + Math.random() * 7;
    effects.spawn('sprite', c.scene, p, {
      texture: TEX.flare,
      colour: FORCE_SPARK,
      size: 0.1 + Math.random() * 0.08,
      seconds: 0.25 + Math.random() * 0.2,
      spread: 0.15,
      move: [(f.x * cos - f.z * sin) * v, 0.4 + Math.random() * 1.2, (f.z * cos + f.x * sin) * v],
      fadeTail: 0.6,
    });
  }
  effects.spawn('ring', c.scene, feet, { texture: TEX.shockwave, colour: [0.45, 0.45, 0.85], scale: 1.4, growFrom: 1, grow: 3.2, seconds: 0.45, fadeTail: 0.8 });
  effects.spawn('particles', c.scene, feet, { recipe: DUST, count: 5 });
  // The light stands over the middle of the art: the rings round the caster and the streaks 5.8 m ahead.
  lighting.skillStrike(c.scene, skill, { position: { x: p.x + f.x * 1.5, y: p.y, z: p.z + f.z * 1.5 } });
};

/** Fire Burst on the graded tiers: puffs, head glow and embers (`pierDart`). */
interface PierLook {
  /** The Fire02 puffs' tint and size factor. */
  puff: RGB;
  puffSize: number;
  /** A flare riding each dart's head. */
  head: RGB;
}
/**
 * The puffs keep the original's Fire02 but lean orange and a little smaller: ~48 additive puffs a dart at
 * white summed to a flat yellow-white fog over the target on the graded frame.
 */
const PIER_LOOK: PierLook = { puff: [1, 0.62, 0.34], puffSize: 0.85, head: [1, 0.7, 0.4] };
/** Hot chips shed by a dart each tick, and a handful where it burns out. */
const DART_EMBERS: ParticleRecipe = {
  texture: TEX.spark3,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.4,
  lifeJitter: 0.3,
  power: 1.4,
  gravity: -2.5,
  spin: 4,
  capacity: 256,
};
const fireBurstGraded = (skill: number): Step => (_at, c) => {
  const target = c.target!;
  const o = boneLocalPos(c.caster, 0, FIRE_BURST_LOCAL, new Vector3(), 1);
  const yaw = yawDegrees(c);
  const top = targetTop(target);
  const darts = [
    pierDart(c, target, o, yaw + 90, top, PIER_LOOK),
    pierDart(c, target, o, yaw, top / 2, PIER_LOOK),
    pierDart(c, target, o, yaw - 90, top / 2, PIER_LOOK),
  ];
  for (const tilt of [45, -45]) {
    effects.spawn('model', c.scene, o, { model: MODEL.darkLordSkill, seconds: ticks(9), scale: 0.2, colour: [1, 0.6, 0.3], angle: [45, tilt, 0], fadeTail: 0 });
  }
  effects.spawn('sprite', c.scene, o, { texture: TEX.impact, colour: [1, 0.6, 0.3], size: 1.2, seconds: ticks(5), growFrom: 0.5, fadeTail: 0.7 });
  effects.spawn('particles', c.scene, o, { recipe: DART_EMBERS, count: 10 });
  // One light carried by the three darts: it starts on the cards at the caster and whirls in with them.
  const centre = { x: o.x, y: o.y, z: o.z };
  lighting.skillStrike(c.scene, skill, {
    position: centre,
    follow: out => {
      out.x = (darts[0].x + darts[1].x + darts[2].x) / 3;
      out.y = (darts[0].y + darts[1].y + darts[2].y) / 3;
      out.z = (darts[0].z + darts[1].z + darts[2].z) / 3;
    },
  });
};

/** The caster's local X for an MU yaw in degrees: right-angled to its forward `(sin y, -cos y)`. */
const sideOf = (yaw: number, out: Vector3): Vector3 => out.set(Math.cos((yaw * Math.PI) / 180), 0, Math.sin((yaw * Math.PI) / 180));
const forwardOfDeg = (yaw: number, out: Vector3): Vector3 => out.set(Math.sin((yaw * Math.PI) / 180), 0, -Math.cos((yaw * Math.PI) / 180));
const UP = new Vector3(0, 1, 0);

/** Head rise per move of a BITMAP_JOINT_FORCE (ZzzEffectJoint.cpp:2992-3006 moves by the old velocity before :6397-6405 adds). */
function forceHeads(v: number, d: number, d0: number, firstLt: number, moves: number): number[] {
  const out: number[] = [];
  let h = 0;
  for (let k = 0; k < moves; k++) {
    h += v;
    out.push(h);
    v += d;
    d += firstLt - k < firstLt ? 0.5 : d0;
  }
  return out;
}

/** Space Split's pillar, JOINT_FORCE sub2 (else branch, ZzzEffectJoint.cpp:2361-2369): V 8, Dir (5, _, 5), LT 15, MaxTails 12. */
const SPLIT_TAILS = 12;
const SPLIT_HEADS = forceHeads(8, 5, 5, 15, SPLIT_TAILS).map(cm);
/** It moves at LT 15..0 and dies below 0 (:6954-6957): 16 drawn ticks. */
const SPLIT_PILLAR_TICKS = 16;
/** MODEL_PIER_PART sub2 (ZzzEffect.cpp:3405-3415): LT 20, turn 50° +2.4 a tick, 40 cm a tick, from the feet - 20 cm. */
const SPLIT_MOVES = 20;
const SPLIT_STEP = cm(40);

/**
 * One Space Split pillar at `base` (the carrier's point + 10 cm), facing MU yaw `yaw`: Inferno.jpg on two
 * crossed sheets 150 cm wide, one tail laid a tick up to 12 (7.8 m), bright end at the base, x1/1.3 a tick
 * over its last 5 ticks (:6395-6411). On LT 15, 10, 5 and 0 a MODEL_SKILL_INFERNO sub6 at the base (:6417-6419):
 * only its ring4 mesh, Scale 0.2 +0.01, BlendMeshLight LT/5 x 0.1, LT 5, lighting (0.8, 0.3, 0.1) range 2
 * (ZzzEffect.cpp:1430-1439, MoveHandlers.cpp:2667-2673).
 */
function splitPillar(c: SkillContext, skill: number, base: Vector3, yaw: number, graded?: boolean): void {
  const points = SPLIT_HEADS.map(h => new Vector3(base.x, base.y + h, base.z));
  effects.spawn('tails', c.scene, base, {
    points,
    laid: t => movesAt(t),
    across: sideOf(yaw, new Vector3()),
    across2: forwardOfDeg(yaw, new Vector3()),
    width: cm(150),
    texture: TEX.inferno,
    colour: graded ? SPLIT_TINT : undefined,
    maxTails: SPLIT_TAILS,
    seconds: ticks(SPLIT_PILLAR_TICKS),
    intensity: t => Math.pow(1.3, -Math.max(0, Math.floor(movesAt(t)) - 11)),
  });
  for (let i = 0; i < 4; i++) {
    delay(ticks(5 * i), () => {
      // The fourth takes the joint's Light after its five x1/1.3 steps.
      const light = i === 3 ? Math.pow(1.3, -5) : 1;
      effects.spawn('model', c.scene, base, {
        model: MODEL.inferno,
        seconds: ticks(5),
        angle: [0, 0, yaw],
        hideMesh: 0,
        colour: [light, light, light],
        scaleAt: t => 0.2 + 0.01 * (t / TICK),
        intensity: t => Math.min(0.1, (6 - t / TICK) * 0.02),
        fadeTail: 0,
      });
      // The graded look carries one light along the path (spaceSplitGraded) in place of these 24.
      if (!graded) lighting.skillStrike(c.scene, skill, { position: { x: base.x, y: base.y, z: base.z } });
    });
  }
  if (graded) splitEruption(c, base);
}

/**
 * Space Split (Fire Blast) at the strike (ZzzCharacter.cpp:2980-2988, :5027-5030): one hidden MODEL_PIER_PART
 * sub2 carrier from the caster's feet - 20 cm, homing on the target's feet (MoveHandlers.cpp:5645-5664), a
 * pillar where it stands on every LT % 3 == 0 (LT 18..3: six, 3 ticks apart). Nothing lands on the target.
 */
const spaceSplit = (skill: number): Step => (_at, c) => {
  splitCarrier(c, skill);
};

/** The carrier's path and pillars; returns its live point. */
function splitCarrier(c: SkillContext, skill: number, graded?: boolean): Vector3 {
  const target = c.target!;
  const pos = entityPos(c.caster, -cm(20), new Vector3());
  const aim = entityPos(target, 0, new Vector3());
  const dir = new Vector3();
  const heading: [number, number, number] = [0, 0, yawDegrees(c)];
  let turn = 50;
  let k = 0;
  const move = (): void => {
    if (!entityGone(target)) entityPos(target, 0, aim);
    hummingDir(heading, pos, aim, turn, dir);
    turn += 2.4;
    pos.addInPlace(dir.scaleInPlace(SPLIT_STEP));
    if ((SPLIT_MOVES - k) % 3 === 0) splitPillar(c, skill, new Vector3(pos.x, pos.y + cm(10), pos.z), heading[2], graded);
    if (++k < SPLIT_MOVES) delay(TICK, move);
  };
  move();
  return pos;
}

// Space Split on the graded tiers: the same carrier and pillars, the pillars warmer, each erupting with a
// ground glow, a hot core and rising embers, and one fire light carried along the path.

/** Inferno.jpg is a pale cream; a little warmth keeps it reading as fire, not a white shaft, on the graded frame. */
const SPLIT_TINT: RGB = [1, 0.78, 0.55];
const SPLIT_GLOW: RGB = [1, 0.42, 0.14];
/** Embers thrown up a pillar as it erupts. */
const SPLIT_EMBERS: ParticleRecipe = {
  texture: TEX.spark3,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.16,
  sizeJitter: 0.4,
  life: 0.7,
  lifeJitter: 0.3,
  box: [0.35, 0.1, 0.35],
  dir1: [-0.25, 1, -0.25],
  dir2: [0.25, 1, 0.25],
  power: 4,
  powerJitter: 0.5,
  gravity: -2,
  spin: 4,
  capacity: 256,
};

/** A pillar's ground contact: a flat glow, a hot core at the base and embers, over its 16 ticks. */
function splitEruption(c: SkillContext, base: Vector3): void {
  const floor = new Vector3(base.x, groundAt(base.x, base.z, base.y) + 0.04, base.z);
  effects.spawn('sprite', c.scene, floor, { texture: TEX.flare, colour: SPLIT_GLOW, size: 2.2, seconds: ticks(SPLIT_PILLAR_TICKS), flat: true, growFrom: 0.5, fadeTail: 0.5 });
  effects.spawn('sprite', c.scene, floor, { texture: TEX.flare, colour: [1, 0.7, 0.45], size: 1.1, seconds: ticks(8), height: 0.35, growFrom: 0.6, fadeTail: 0.6 });
  effects.spawn('particles', c.scene, floor, { recipe: SPLIT_EMBERS, count: 12, height: 0.1 });
}

const spaceSplitGraded = (skill: number): Step => (_at, c) => {
  const pos = splitCarrier(c, skill, true);
  // One light rides the carrier over the newest pillar's base, from the strike until the last pillar fades.
  lighting.skillStrike(c.scene, skill, {
    position: { x: pos.x, y: pos.y + 1, z: pos.z },
    follow: out => {
      out.x = pos.x;
      out.y = pos.y + 1;
      out.z = pos.z;
    },
  });
};

/** Fire Scream's pairs (ZzzCharacter.cpp:4499-4533): yaw, and yaw ±10° moved ±80 cm along their own X. */
const SCREAM_PAIRS: readonly (readonly [number, number])[] = [
  [0, 0],
  [10, 80],
  [-10, -80],
];
/** MODEL_DARK_SCREAM(_FIRE) (ZzzEffect.cpp:1702-1731): LT 19, `Direction (0, -35, 0)`; moved 19 times, drawn after 18. */
const SCREAM_MOVES = 19;
const SCREAM_STEP = cm(35);
/** The ground streak, JOINT_FORCE sub7 (ZzzEffectJoint.cpp:2373-2386): V 10, Dir (3.5, _, 1), LT 20, MaxTails 13. */
const SCREAM_TAILS = 13;
const SCREAM_HEADS = forceHeads(10, 1, 3.5, 20, SCREAM_TAILS).map(cm);
/** It moves at LT 20..0: 21 drawn ticks. */
const SCREAM_STREAK_TICKS = 21;
/** A model's Scale after `n` moves: `Scale -= step`, 0 below 0.1 (MoveHandlers.cpp:4630-4640). */
const screamScale = (s0: number, step: number, n: number): number => {
  const s = s0 - step * n;
  return s < 0.1 ? 0 : s;
};

/**
 * One BITMAP_FLAME sub8 card (ZzzEffectParticle.cpp:592-607, :4838-4854): Flame01 at Scale `scale` - 0..0.19,
 * rising Gravity/2 and shrinking Gravity/95 a tick (Gravity = 1.8-2.8 x Scale), turning 2° a tick, 7 in 10
 * sliding along the path at -1..0.9 x Scale cm a tick, LT 33. A card born at Scale <= 0 dies at once.
 */
function screamFlame(c: SkillContext, at: Vector3, fwd: Vector3, scale: number, look?: ScreamLook): void {
  const s0 = scale - randInt(20) / 100;
  if (s0 <= 0) return;
  const gravity = (randInt(100) / 100 + 1.8) * s0;
  // Half the cards start half a Scale off in world x and y, and those turn the other way.
  const nudge = (randInt(2) / 2) * s0;
  const slide = randInt(10) >= 3 ? (randInt(20) / 10 - 1) * s0 : 0;
  // The graded cards stand on the ground instead of being cut in half by it (a hard line along the wall).
  const lift = look ? cm(64) * look.flameSize * s0 * look.flameLift : 0;
  const p0 = new Vector3(at.x + cm(nudge), at.y + lift, at.z + cm(nudge));
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, p0, {
    texture: TEX.flame,
    colour: look?.flame,
    softEdge: !!look,
    size: cm(64) * (look?.flameSize ?? 1),
    seconds: ticks(32),
    spin: (nudge > 0 ? 2 : -2) * ((25 * Math.PI) / 180),
    follow: out => {
      const n = movesAt(fxNow() - t0);
      return out.set(p0.x - fwd.x * cm(slide * n), p0.y + cm((gravity / 2) * n), p0.z - fwd.z * cm(slide * n));
    },
    sizeAt: p => Math.max(0, s0 - (movesAt(p * ticks(32)) * gravity) / 95),
    fadeTail: look?.flameFade ?? 0,
  });
}

/** Any character but the caster and the hero within 1 m of `p`: CheckClientArrow's contact (ZzzEffect.cpp:6500-6503, :38-58). */
function screamContact(caster: Entity, p: Vector3): boolean {
  const world = storeRef().world;
  if (!world) return false;
  for (const e of world.netObjsQuery.entities) {
    if (e === caster || e.localPlayer || e.dying || !e.transform) continue;
    const dx = e.transform.pos.x - p.x;
    const dz = e.transform.pos.z - p.z;
    if (dx * dx + dz * dz <= 1) return true;
  }
  return false;
}

/**
 * One Fire Scream pair from `origin` along MU yaw `yaw`: after the arrow offset rotate(-10, -60, 135)
 * (ZzzEffect.cpp:1664-1667) MODEL_DARK_SCREAM_FIRE (motion blur streak + burst, additive, Scale 2.3 -0.14)
 * and, 20 cm ahead, MODEL_DARK_SCREAM (the claw sheet, alpha-tested, Scale 0.9 -0.04), both 35 cm a tick at
 * terrain + 3 and each dropping a flame card a tick; the claw dies on contact. At the start: the ground streak
 * and one BITMAP_BLUE_BLUR sub1 puff (PoundingBall, 20 cm on, 45 cm under the lifted claw, LT 30, Scale
 * 0.64-1.27 +0.19, rising 5 cm, Light LT/20; ZzzEffectParticle.cpp:943-950, :3988-3996).
 */
function screamPair(c: SkillContext, origin: Vector3, yaw: number, side: number, look?: ScreamLook): PointSource {
  const f = forwardOfDeg(yaw, new Vector3());
  const s = sideOf(yaw, new Vector3());
  const x0 = origin.x + s.x * cm(side - 10) + f.x * cm(60);
  const z0 = origin.z + s.z * cm(side - 10) + f.z * cm(60);
  const y0 = groundAt(x0, z0, origin.y);
  /** `d` tiles along the path, 3 cm over the ground there (re-pinned every tick). */
  const onGround = (d: number, out: Vector3): Vector3 => {
    out.set(x0 + f.x * d, 0, z0 + f.z * d);
    out.y = groundAt(out.x, out.z, y0) + cm(3);
    return out;
  };
  const t0 = fxNow();
  effects.spawn('model', c.scene, origin, {
    model: MODEL.darkScreamFire,
    seconds: ticks(SCREAM_MOVES - 1),
    angle: [0, 0, yaw],
    follow: out => onGround(SCREAM_STEP * movesAt(fxNow() - t0), out),
    scaleAt: t => screamScale(2.3, 0.14, movesAt(t)),
    fadeTail: 0,
  });
  const claw = effects.spawn('model', c.scene, origin, {
    model: MODEL.darkScream,
    seconds: ticks(SCREAM_MOVES - 1),
    angle: [0, 0, yaw],
    cutout: true,
    follow: out => onGround(cm(20) + SCREAM_STEP * movesAt(fxNow() - t0), out),
    scaleAt: t => screamScale(0.9, 0.04, movesAt(t)),
    fadeTail: 0,
  });

  // The streak: its tails where the head stood after moves 1..13, each on the ground there.
  const streak = SCREAM_HEADS.map(d => onGround(d, new Vector3()));
  effects.spawn('tails', c.scene, origin, {
    points: streak,
    laid: t => movesAt(t),
    across: s,
    across2: UP,
    width: cm(150),
    texture: TEX.inferno,
    maxTails: SCREAM_TAILS,
    seconds: ticks(SCREAM_STREAK_TICKS),
    intensity: t => Math.pow(1.3, -Math.max(0, Math.floor(movesAt(t)) - 16)),
  });
  const puff = new Vector3(x0 + f.x * cm(20), y0 + cm(3 + 20 - 45), z0 + f.z * cm(20));
  const s0 = (randInt(64) + 64) / 100;
  effects.spawn('sprite', c.scene, puff, {
    texture: TEX.powerWave,
    size: cm(64),
    seconds: ticks(29),
    roll: Math.random() * Math.PI * 2,
    follow: out => out.set(puff.x, puff.y + cm(5) * movesAt(fxNow() - t0), puff.z),
    sizeAt: p => s0 + 0.19 * movesAt(p * ticks(29)),
    // Light (30 - n) / 20 clamps at 1 until its last 20 ticks.
    fadeTail: 20 / 29,
  });

  // Per move: each live model drops a flame at its point before stepping on, at (Scale - 0.4) x 3.5,
  // and the claw then checks for contact (MoveHandlers.cpp:4642-4649).
  const at = new Vector3();
  let n = 0;
  let clawLive = true;
  const move = (): void => {
    n++;
    const before = SCREAM_STEP * (n - 1);
    if (clawLive) {
      screamFlame(c, onGround(cm(20) + before, at), f, (screamScale(0.9, 0.04, n) - 0.4) * 3.5, look);
      if (screamContact(c.caster, at)) {
        clawLive = false;
        claw.stop();
      }
    }
    screamFlame(c, onGround(before, at), f, (screamScale(2.3, 0.14, n) - 0.4) * 3.5, look);
    if (look && screamScale(2.3, 0.14, n) > 0) effects.spawn('particles', c.scene, at, { recipe: SCREAM_EMBERS, count: 2, height: 0.2 });
    if (n < SCREAM_MOVES) delay(TICK, move);
  };
  move();
  if (look) {
    // Ground contact: a flat fire glow under the fire model's burst, shrinking with it.
    effects.spawn('sprite', c.scene, origin, {
      texture: TEX.flare,
      colour: look.glow,
      size: 2.4,
      seconds: ticks(SCREAM_MOVES - 1),
      flat: true,
      height: 0.04,
      follow: out => onGround(SCREAM_STEP * movesAt(fxNow() - t0), out),
      sizeAt: p => 0.35 + screamScale(2.3, 0.14, movesAt(p * ticks(SCREAM_MOVES - 1))) / 2.3,
      fadeTail: 0.3,
    });
  }
  // The fire model's point, held where it stops.
  return out => onGround(SCREAM_STEP * Math.min(SCREAM_MOVES, movesAt(fxNow() - t0)), out);
}

/**
 * Fire Scream, 14 ticks after the packet (AttackTime 1 -> 15, ZzzCharacter.cpp:4132-4140), from where the
 * caster then stands: three pairs, and Darklord_firescream for everyone (:4547).
 */
const fireScream: Step = (_at, c) => {
  if (entityGone(c.caster)) return;
  const origin = entityPos(c.caster, 0, new Vector3());
  const yaw = yawDegrees(c);
  playCombat('Sound/Darklord_firescream', origin);
  for (const [turn, side] of SCREAM_PAIRS) screamPair(c, origin, yaw + turn, side);
};

// Fire Scream on the graded tiers: the same pairs, streaks and puffs; the flame cards lean orange, a little
// smaller and fade out instead of popping, embers rise off the fire, a glow rides under each burst, and one
// fire light follows the wall.

interface ScreamLook {
  flame: RGB;
  flameSize: number;
  flameFade: number;
  /** How far up a card is lifted, as a fraction of its edge at birth. */
  flameLift: number;
  glow: RGB;
}
/**
 * ~75 additive white Flame01 cards up to 3.9 m summed to a flat yellow-white wall on the graded frame
 * (78_port_enhanced); orange at 0.8 size they keep their shapes. Flame01 runs to its border, so the cards are
 * soft-edged and stand on the ground; the fade stands in for the x1/1.007 dimming.
 */
const SCREAM_LOOK: ScreamLook = { flame: [0.9, 0.44, 0.2], flameSize: 0.8, flameFade: 0.45, flameLift: 0.35, glow: [1, 0.4, 0.12] };
const SCREAM_EMBERS: ParticleRecipe = { ...SPLIT_EMBERS, box: [0.4, 0.15, 0.4], power: 2.5, life: 0.8 };

const fireScreamGraded = (skill: number): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const origin = entityPos(c.caster, 0, new Vector3());
  const yaw = yawDegrees(c);
  playCombat('Sound/Darklord_firescream', origin);
  const heads = SCREAM_PAIRS.map(([turn, side]) => screamPair(c, origin, yaw + turn, side, SCREAM_LOOK));
  // The wall's light rides the centre fire a tile back over the burning flames, a tile up.
  const f = forwardOfDeg(yaw, new Vector3());
  const head = heads[0];
  lighting.skillStrike(c.scene, skill, {
    position: { x: origin.x, y: origin.y + 1, z: origin.z },
    follow: out => {
      const p = head(SCRATCH);
      out.x = p.x - f.x;
      out.y = p.y + 1;
      out.z = p.z - f.z;
    },
  });
};
const SCRATCH = new Vector3();

// ---- dl2 steps -------------------------------------------------------------------

/** A sound where the step lands, timed with the effect that plays it (a move handler's `PlayBuffer`). */
const sfx =
  (key: Sounds): Step =>
  at => {
    playSfx(key, at, { bus: COMBAT_BUS });
  };

/** `fn(i)` once a tick for `n` ticks on the effects clock, the first now. */
function everyTick(n: number, fn: (i: number) => void): void {
  let i = 0;
  const tick = (): void => {
    fn(i);
    if (++i < n) delay(TICK, tick);
  };
  tick();
}

/** Terrain height under (x, z), or `fallback` before the map's heights are in. */
function groundAt(x: number, z: number, fallback: number): number {
  const h = storeRef().world?.getTerrainHeight(x, z);
  return h === undefined || h < -9000 ? fallback : h;
}

/** Not a NOMOVE, NOGROUND or WATER tile: where the original lets a ground effect stand. */
function openGround(x: number, z: number): boolean {
  const flag = storeRef().world?.getTerrainFlag(Math.floor(x), Math.floor(z)) ?? 0;
  return (flag & (TWFlags.NoMove | TWFlags.NoGround | TWFlags.Water)) === 0;
}

/** An `Angle[2]` in MU degrees as a model node's yaw: the conversion mirrors, so the sign flips (common/renderAngles.ts). */
const muYaw = (deg: number): number => (-deg * Math.PI) / 180;

/** `at` + `AngleMatrix((0, 0, deg))` applied to `(0, r, 0)`, flat - the original's offset on a turned axis. */
function muRotated(at: Vector3, deg: number, r: number): Vector3 {
  const a = (deg * Math.PI) / 180;
  return new Vector3(at.x - Math.sin(a) * r, at.y, at.z + Math.cos(a) * r);
}

/** Ticks of a `life`-tick effect still to run at progress `p`. */
const ticksLeft = (p: number, life: number): number => life * (1 - p);

/** `step` once the caster's clip, one of `clips`, reaches key `frame` (an `AnimationFrame` gate); after `fallback` seconds if it never does. */
const atFrame = (clips: ReadonlySet<number>, frame: number, fallback: number, step: Step): Step => (at, c) => {
  const t0 = fxNow();
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    if ((m && clips.has(m.CurrentAction) && m.actionFrame() >= frame) || fxNow() - t0 >= fallback) step(at, c);
    else delay(TICK, poll);
  };
  poll();
};

/** A point that sinks 0.5 cm a tick once fewer than `below` of its `life` ticks are left (the EarthQuake models' `Position[2] -= 0.5`). */
function sinking(p: Vector3, life: number, below: number): PointSource {
  const t0 = fxNow();
  return out => {
    const left = life - (fxNow() - t0) / TICK;
    return out.set(p.x, p.y - (left < below ? cm(0.5) * (below - left) : 0), p.z);
  };
}

/**
 * Earthshake runs off the Dark Horse's action 3 (GOBoid.cpp:337-341, RenderDarkHorseSkill :727-769),
 * in ticks from its start: a BITMAP_SHOCK_WAVE every 400 ms, the ground stones on horse keys 8-9.5,
 * and MODEL_SKILL_FURY_STRIKE (Kind 2) on render 19, which bursts at its LifeTime 11 and cracks the
 * ground at 10 (MoveHandlers.cpp:2955-3065).
 */
const QUAKE_WAVES = [0, 10, 20, 30] as const;
/** The stone ticks and each ring's radius, `150 cm x (WeaponLevel / 2)` with WeaponLevel wrapped to 253 on render 19. */
const QUAKE_STONES: readonly (readonly [number, number])[] = [[24, 1.5], [25, 1.5], [26, 3], [27, 3]];
const QUAKE_BURST = 19 + 9;
/** The burst point: `(-25, -80)` off the fury's position, which its swing already put `sin 135 deg x 260 x cos 80 deg` = 32 cm ahead. */
const QUAKE_AHEAD = 0.8 + 0.32;
const QUAKE_SIDE = -0.25;
/** MODEL_GROUND_STONE's smoke, BITMAP_SMOKE sub11 at Scale 2: 128 cm growing 5 % a tick, fading over 50 ticks, sinking 1 cm a tick. */
const QUAKE_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [1, 0.8, 0.6],
  size: cm(128),
  sizeJitter: 0,
  life: ticks(50),
  lifeJitter: 0,
  box: [0.32, 0.32, 0.32],
  dir1: [-1, -0.4, -1],
  dir2: [1, -0.4, 1],
  power: 0.4,
  powerJitter: 0.5,
  endScale: 2.25,
  capacity: 128,
};
/** Graded tiers: the stones' sub11 smoke at a dust brown; at the original's (1, 0.8, 0.6) the graded buffer washed the stones out under it. */
const QUAKE_DUST: ParticleRecipe = { ...QUAKE_SMOKE, colour: [0.24, 0.21, 0.18], spin: 0.6, capacity: 192 };
/** Graded tiers: the stones' DhorSS_R pulled toward orange; the tone curve took the original's white glow to a pale beige. */
const QUAKE_STONE_HOT: RGB = [1, 0.5, 0.28];
/** Graded tiers: the burst's dust skirt, thrown flat and out along the ground. */
const QUAKE_DUST_SKIRT: ParticleRecipe = {
  ...QUAKE_DUST,
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.1,
  lifeJitter: 0.3,
  box: [0.2, 0, 0.2],
  dir1: [-1, 0.15, -1],
  dir2: [1, 0.35, 1],
  power: 1.4,
  powerJitter: 0.4,
  endScale: 2.6,
};
/** Graded tiers: stone chips drawn opaque in rock colour; additive, as the original draws them, they read as white paper on the graded ground. */
const QUAKE_ROCK: RGB = [0.62, 0.56, 0.5];
/** Graded tiers: embers lifting off the glowing cracks and fins. */
const QUAKE_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.6, 0.25],
  colourEnd: [0.7, 0.15, 0.03],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.3, 0.02, 0.3],
  dir1: [-0.3, 1, -0.3],
  dir2: [0.3, 1, 0.3],
  power: 1.1,
  powerJitter: 0.5,
  gravity: -0.5,
  capacity: 256,
};
/** Graded tiers: the hot chips the burst throws. */
const QUAKE_BURST_SPARKS: ParticleRecipe = {
  ...QUAKE_EMBERS,
  size: 0.16,
  life: 0.7,
  box: [0.2, 0.1, 0.2],
  dir1: [-1, 0.6, -1],
  dir2: [1, 1.4, 1],
  power: 4,
  gravity: -7,
  capacity: 128,
};
/** `BlendMeshLight = LifeTime / 30` (EarthQuake01/04/07); the GL clamps the colour at 1. */
const quakeFade = (life: number) => (p: number): number => Math.min(1, ticksLeft(p, life) / 30);
/** 02 / 05 / 08: `(life - LifeTime) * 0.1` over the first 10 ticks, then `LifeTime * 0.1`, clamped at 1 by the GL. */
const quakeGlow = (life: number) => (p: number): number => {
  const left = ticksLeft(p, life);
  return Math.min(1, left >= life - 10 ? (life - left) * 0.1 : left * 0.1);
};
/** `BlendMeshTexCoordU = -LifeTime * 0.01`: a quarter of the sheet a second. */
const QUAKE_SCROLL = 0.25;

/** MODEL_STONE1/2 chips (sub0, debris.ts) thrown `1 in n` a tick for `span` ticks from `from`, within 150 cm of `at` (EarthQuake02/05). */
const quakeChips = (at: Vector3, from: number, span: number, n: number, hd = false): Step => (_p, c) =>
  delay(ticks(from), () =>
    everyTick(span, () => {
      if (Math.random() * n >= 1) return;
      const p = muRotated(at, Math.random() * 360, cm(Math.random() * 150));
      const m = Math.random() < 0.5 ? MODEL.stone : MODEL.stone2;
      effects.spawn('debris', c.scene, p, hd ? { model: m, colour: QUAKE_ROCK, blendMesh: -1 } : { model: m });
    })
  );

/** MODEL_GROUND_STONE / 2 (ZzzEffect.cpp:3480-3516, MoveHandlers.cpp:5688-5712); `hd` is the graded tiers' dust and rock chips. */
function groundStone(at: Vector3, c: SkillContext, hd = false): void {
  if (!openGround(at.x, at.z)) return;
  const second = Math.random() < 0.5;
  model({
    model: second ? MODEL.groundStone2 : MODEL.groundStone,
    scale: (second ? 1 : 1.2) + Math.floor(Math.random() * 30) / 100,
    yaw: Math.random() * Math.PI * 2,
    seconds: ticks(40),
    holdLast: true,
    blendMesh: 1,
    // Alpha x 1/1.3 a tick over the last 8.
    life: p => Math.min(1, Math.pow(1.3, ticksLeft(p, 40) - 8)),
    ...(hd ? { colour: QUAKE_STONE_HOT } : {}),
  })(at, c);
  if (hd) particles({ recipe: QUAKE_DUST_SKIRT, count: 2 })(at, c);
  // LifeTime 36..33: a smoke puff and a MODEL_STONE sub10 chip a tick at +(60, -60, 50) cm.
  const chip = new Vector3(at.x + 0.6, at.y + 0.5, at.z - 0.6);
  delay(ticks(4), () =>
    everyTick(4, () => {
      particles({ recipe: hd ? QUAKE_DUST : QUAKE_SMOKE, count: 1, height: 0.63 })(chip, c);
      const m = Math.random() < 0.5 ? MODEL.stone : MODEL.stone2;
      effects.spawn('debris', c.scene, chip, { model: m, speedScale: 2, riseCm: [28, 16], scale: 0.87, ...(hd ? { colour: QUAKE_ROCK, blendMesh: -1 } : {}) });
    })
  );
}

/** Six stones 60 degrees apart from a random start, `radius` tiles out. */
const stoneRing = (radius: number, hd = false): Step => (at, c) => {
  let a = Math.random() * 360;
  for (let i = 0; i < 6; i++) {
    a += 60;
    groundStone(muRotated(at, a, radius), c, hd);
  }
};

/** BITMAP_SHOCK_WAVE sub0: a 20-tile terrain decal shrinking a tile a tick (ZzzEffect.cpp:3538-3545, MoveHandlers.cpp:5764-5769). */
const quakeWave: Step = ring({ texture: TEX.shockwave, colour: RGBS.white, seconds: ticks(20), scale: 20, grow: 0, maxScale: 20, fadeTail: 0.001 });

/** The crack chains at the fury's LifeTime 10: 5 chains, 4 rounds of 85-99 cm (MoveHandlers.cpp:3018-3064). */
const quakeCracks = (b: Vector3, hd = false): Step => (_at, c) => {
  const pos = [0, 1, 2, 3, 4].map(() => b.clone());
  const ang = [0, 0, 0, 0, 0];
  let count = 0;
  for (let j = 0; j < 4; j++) {
    const step = cm(85 + Math.floor(Math.random() * 15));
    if (j >= 3) count = Math.floor(Math.random() * 32768);
    for (let i = 0; i < 5; i++) {
      const turn = 50 + Math.floor(Math.random() * 30);
      ang[i] += count % 2 === 0 ? turn : -turn;
      const heading = ang[i] + i * (62 + Math.floor(Math.random() * 10));
      const p = muRotated(pos[i], heading, step);
      p.y = groundAt(p.x, p.z, b.y) + cm(3);
      pos[i] = p;
      const yaw = muYaw(heading + 270);
      model({ model: MODEL.earthQuake7, seconds: ticks(40), yaw, life: quakeFade(40), follow: sinking(p, 40, 10) })(p, c);
      model({ model: MODEL.earthQuake8, seconds: ticks(40), yaw, life: quakeGlow(40), scrollU: QUAKE_SCROLL, follow: sinking(p, 40, 15) })(p, c);
      // Graded tiers: embers off each glowing step while its glow is up.
      if (hd) after(ticks(4), particles({ recipe: QUAKE_EMBERS, rate: 4, seconds: ticks(26) }))(p, c);
    }
    count++;
  }
  sfx('Sound/eRageBlow_3')(b, c);
};

/** The fury's burst at its LifeTime 11 (MoveHandlers.cpp:2955-3016), `QUAKE_AHEAD` in front of the horse. */
const quakeBurstOf = (hd: boolean): Step => (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const x = feet.x + f.x * QUAKE_AHEAD - f.z * QUAKE_SIDE;
  const z = feet.z + f.z * QUAKE_AHEAD + f.x * QUAKE_SIDE;
  const ground = groundAt(x, z, feet.y);
  explosion(RGBS.white, 0.5)(new Vector3(x, ground + cm(25), z), c);
  if (hd) {
    // Graded tiers: a hot core under the white card, thrown chips and a dust skirt.
    const core = new Vector3(x, ground + 0.3, z);
    sprite({ texture: TEX.flare, colour: [1, 0.6, 0.3], size: 3.2, seconds: ticks(14), grow: 1.3, growFrom: 0.5, fadeTail: 0.7 })(core, c);
    particles({ recipe: QUAKE_BURST_SPARKS, count: 26 })(core, c);
    ringOf(particles({ recipe: QUAKE_DUST_SKIRT, count: 1 }), 10, 1.2)(new Vector3(x, ground, z), c);
  }
  // Terrain + 25 - 27: the three centre pieces sit 2 cm into the ground.
  const b = new Vector3(x, ground - cm(2), z);
  model({ model: MODEL.earthQuake3, scale: 1.5, seconds: ticks(35), blendMesh: -1, alphaTest: true, life: () => 1, follow: sinking(b, 35, 13) })(b, c);
  model({ model: MODEL.earthQuake, scale: 1.5, seconds: ticks(35), life: quakeFade(35), follow: sinking(b, 35, 10) })(b, c);
  model({ model: MODEL.earthQuake2, scale: 1.5, seconds: ticks(20), life: quakeGlow(20), scrollU: QUAKE_SCROLL, follow: sinking(b, 20, 5) })(b, c);
  quakeChips(b, 11, 5, 10, hd)(b, c);
  // EarthQuake01 while LifeTime > 15 and a multiple of 3 (ZzzEffect.cpp:7109-7112).
  for (let lt = 33; lt > 15; lt -= 3) delay(ticks(35 - lt), () => earthQuake((Math.floor(Math.random() * 8) - 4) * 0.1));
  const sub = Math.floor(Math.random() * 100);
  for (let i = 0; i < 5; i++) {
    const p = muRotated(b, sub + i * 72, cm(100 + Math.floor(Math.random() * 150)));
    if (!openGround(p.x, p.z)) continue;
    p.y = groundAt(p.x, p.z, b.y) + cm(3);
    const scale = (40 + Math.floor(Math.random() * 50)) / 100;
    const yaw = muYaw(45 + Math.floor(Math.random() * 30) - 15);
    model({ model: MODEL.earthQuake4, scale, yaw, seconds: ticks(35), life: quakeFade(35), follow: sinking(p, 35, 10) })(p, c);
    model({ model: MODEL.earthQuake5, scale, yaw, seconds: ticks(40), life: quakeGlow(40), scrollU: QUAKE_SCROLL, follow: sinking(p, 40, 15) })(p, c);
    quakeChips(p, 11, 25, 15, hd)(p, c);
    if (hd) after(ticks(3), particles({ recipe: QUAKE_EMBERS, rate: 5, seconds: ticks(30) }))(p, c);
  }
  after(TICK, quakeCracks(b, hd))(b, c);
};

/** Earthshake's whole run, at the horse (the rider's feet). `hd`: the graded tiers' look, whose stone light waits on the first ring. */
const earthshakeOf = (hd: boolean): Step => (at, c) => {
  let lit = false;
  for (const k of QUAKE_WAVES) after(ticks(k), quakeWave)(at, c);
  for (const [k, radius] of QUAKE_STONES) {
    after(ticks(k), (p, cc) => {
      if (Math.random() < 0.5) {
        stoneRing(radius, hd)(p, cc);
        if (hd && !lit) lighting.skillCue(cc.scene, 62, 'stones', cc.caster);
        lit = true;
      }
      // Horse keys 8-9.5 jolt the camera every frame (GOBoid.cpp:762).
      earthQuake((Math.floor(Math.random() * 3) - 3) * 0.7);
    })(at, c);
  }
  after(ticks(QUAKE_BURST), quakeBurstOf(hd))(at, c);
};
const earthshake = earthshakeOf(false);

/** MODEL_CIRCLE sub2's `BlendMeshLight` at `left` ticks (MoveHandlers.cpp:3786-3796). */
const circleLight = (left: number): number => (left > 240 ? (250 - left) * 0.1 : left * 0.1);
/**
 * The emblem is `(0.5, 0.5, 1) x BlendMeshLight` clamped by the GL: white while that is 2 or more,
 * blue as it falls. Drawn as a white and a blue layer whose sum is exactly the clamped colour.
 */
const emblemWhite = (p: number): number => Math.min(1, Math.max(0, circleLight(ticksLeft(p, 250)) - 1));
const emblemBlue = (p: number): number => {
  const l = circleLight(ticksLeft(p, 250));
  return l >= 2 ? 0 : l >= 1 ? 2 - l : l;
};
/** MODEL_CIRCLE_LIGHT sub3: `(0.1, 0.1, 10) x min(0.5, BlendMeshLight)`, the blue clamped at 1 (MoveHandlers.cpp:3864-3872, ZzzObject.cpp:1490). */
const curtainLife = (p: number): number => Math.min(1, 10 * Math.min(0.5, circleLight(ticksLeft(p, 250))));
/** BITMAP_FLARE_BLUE sub0 (ZzzEffectParticle.cpp:167-172, :3951-3960): 13 cm, rising from 0-2 cm a tick by 0.4 a tick up to 8. */
const FLARE_BLUE_RISE: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: RGBS.white,
  size: cm(12.8),
  sizeJitter: 0,
  life: ticks(39),
  lifeJitter: 0.23,
  box: [1.4, 0, 1.4],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(2),
  powerJitter: 1,
  gravity: 1.8,
  capacity: 128,
};
/** BITMAP_LIGHT sub0 at bone 42 (ZzzEffectParticle.cpp:3161-3166, :7943-7966): flare01 32-64 cm, Light (0.3, 0.5, 1), rising 2.5 cm a tick, shrinking out. */
const TELEPORT_HAND: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.5, 1],
  size: cm(48),
  sizeJitter: 0.33,
  life: ticks(19),
  lifeJitter: 0.47,
  box: [0.02, 0.02, 0.02],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  power: perTick(2.5),
  powerJitter: 0,
  endScale: 0.1,
  capacity: 64,
};
/** Graded tiers: the motes at a size that reads at our camera (the original's 13 cm is a pixel), rising more gently. */
const FLARE_BLUE_RISE_HD: ParticleRecipe = { ...FLARE_BLUE_RISE, size: cm(26), sizeJitter: 0.4, gravity: 1.1, spin: 1.5 };
/** Graded tiers: a soft halo round the raised hand's glow. */
const TELEPORT_HALO: ParticleRecipe = { ...TELEPORT_HAND, colour: [0.12, 0.22, 0.5], size: 1.1, sizeJitter: 0.2, endScale: 0.6 };
/** Graded tiers: the blue chips a streak throws where it lands. */
const STREAK_SPLASH: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: RGBS.white,
  size: cm(22),
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.3,
  box: [0.05, 0, 0.05],
  dir1: [-1, 0.8, -1],
  dir2: [1, 1.6, 1],
  power: 1.6,
  powerJitter: 0.4,
  gravity: -4,
  capacity: 128,
};
const TELEPORT_CLIPS: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_ATTACK_TELEPORT,
  PlayerAction.PLAYER_ATTACK_RIDE_TELEPORT,
  PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_TELEPORT,
]);
/** The held pose after key 5.5 runs at a tenth, about 3.6 s; the glow stops with the clip or here. */
const TELEPORT_HOLD_MAX = 6;

/** Every tick the teleport clip is past key 5.5, a blue BITMAP_LIGHT at bone 42 (ZzzCharacter.cpp:4121-4129). `hd`: a halo, and the hand's light cued. */
const teleportHandOf = (hd: boolean): Step => (_at, c) => {
  const t0 = fxNow();
  let seen = false;
  let lit = false;
  let i = 0;
  const tick = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const on = !!m && TELEPORT_CLIPS.has(m.CurrentAction);
    if (on) seen = true;
    else if (seen || fxNow() - t0 > 1) return;
    if (on && m && m.actionFrame() > 5.5) {
      const hand = bonePos(c.caster, 42, new Vector3());
      particles({ recipe: TELEPORT_HAND, count: 1 })(hand, c);
      if (hd && i++ % 3 === 0) particles({ recipe: TELEPORT_HALO, count: 1 })(hand, c);
      if (hd && !lit) lighting.skillCue(c.scene, 63, 'hand', c.caster);
      lit = true;
    }
    if (fxNow() - t0 < TELEPORT_HOLD_MAX) delay(TICK, tick);
  };
  tick();
};
const teleportHand = teleportHandOf(false);

/**
 * BITMAP_FLARE_BLUE joint sub19 (ZzzEffectJoint.cpp:1854-1860, :5525-5533): it waits LifeTime - 25
 * ticks 6 m up, then falls 35-54 cm a tick, 5 more every tick, for its last 25. Spawned when the
 * fall starts: a waiting joint draws nothing.
 */
function blueStreak(at: Vector3, c: SkillContext, hd = false): void {
  const p = muRotated(at, Math.random() * 360, cm(Math.random() * 200));
  const wait = Math.floor(Math.random() * 50);
  const d0 = 35 + Math.floor(Math.random() * 20);
  delay(ticks(wait), () => {
    const t0 = fxNow();
    const top = p.y + 6;
    // Graded tiers: the streak stops on the ground (the original's runs on under it) and splashes there.
    const floor = hd ? groundAt(p.x, p.z, p.y) : -Infinity;
    if (hd) {
      let k = 0;
      while (cm(k * d0 + 2.5 * k * (k + 1)) < top - floor) k++;
      delay(ticks(k), () => {
        const hit = new Vector3(p.x, floor + 0.05, p.z);
        sprite({ texture: TEX.flareBlue, colour: RGBS.white, size: 0.9, seconds: ticks(7), grow: 1.8, growFrom: 0.4, fadeTail: 0.6 })(hit, c);
        particles({ recipe: STREAK_SPLASH, count: 4 })(hit, c);
      });
    }
    effects.spawn('joint', c.scene, p, {
      head: out => {
        const k = (fxNow() - t0) / TICK;
        return out.set(p.x, Math.max(floor, top - cm(k * d0 + 2.5 * k * (k + 1))), p.z);
      },
      maxTails: 20,
      width: cm(40),
      seconds: ticks(25),
      colour: RGBS.white,
      texture: TEX.flareBlue,
      fadeTail: 0.04,
    });
  });
}

/** Party Teleport at AttackTime 6 (ZzzCharacter.cpp:4384-4389, ZzzEffect.cpp:2137-2185): the emblem, the blue curtain, the motes and the falling streaks, 10 s. */
const partyCircleOf = (hd: boolean): Step => (at, c) => {
  // Both circles take the caster's o->Angle, so the emblem turns with his facing.
  const yaw = -entityYaw(c.caster);
  seq(
    model({ model: MODEL.circle, texture: TEX.magicEmblem, yaw, seconds: ticks(250), life: emblemWhite }),
    model({ model: MODEL.circle, texture: TEX.magicEmblem, yaw, colour: [0.5, 0.5, 1], seconds: ticks(250), life: emblemBlue }),
    model({ model: MODEL.circle2, yaw, colour: [0.05, 0.05, 1], seconds: ticks(250), life: curtainLife, scrollU: QUAKE_SCROLL }),
    particles({ recipe: hd ? FLARE_BLUE_RISE_HD : FLARE_BLUE_RISE, rate: 12.5, seconds: ticks(220) }),
    (p, cc) => everyTick(210, () => {
      if (Math.random() < 0.5) blueStreak(p, cc, hd);
    }),
    sfx('Sound/eSummon')
  )(at, c);
  // Graded tiers: the emblem's blue pooled on the ground under it.
  if (hd) ring({ texture: TEX.flare, colour: [0.1, 0.16, 0.42], scale: 9, seconds: ticks(250), growFrom: 0.5, fadeTail: 0.08 })(at, c);
};
const partyCircle = partyCircleOf(false);

/** Party Teleport's sheets and meshes, fetched at the packet so the circle is not late on a first cast. */
const partyCircleWarm: Step = (_at, c) => {
  for (const t of [TEX.magicEmblem, TEX.flareBlue, TEX.flare]) void effectTexture(c.scene, t);
  const world = storeRef().world;
  if (world) for (const m of [MODEL.circle, MODEL.circle2]) void warmGLTF(m, world);
};

const DL_FLASH: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_SKILL_FLASH,
  PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH,
  PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH,
]);
/** BITMAP_GATHERING sub2 rides bone 33 + 10 cm (MoveHandlers.cpp:1611-1617). */
const GATHER_LOCAL = new Vector3(0, 0, cm(10));

/**
 * Electric Spike's charge, BITMAP_GATHERING sub2 (ZzzCharacter.cpp:10514-10520, MoveHandlers.cpp:1604-1658):
 * for 20 ticks, three one-frame Shiny02 cards at the hand a tick and, every other tick, three blue
 * JOINT_THUNDER sub3 arcs from a 120 cm sphere into it (ZzzEffectJoint.cpp:1123-1129).
 */
const sparkChargeOf = (hd: boolean): Step => (_at, c) => {
  const hand: PointSource = out => boneLocalPos(c.caster, 33, GATHER_LOCAL, out, CAST_HEIGHT);
  // Graded tiers: a violet core swelling in the hand under the cards, and chips thrown off it.
  if (hd) sprite({ texture: TEX.flare, colour: [0.3, 0.28, 0.75], size: 1, seconds: ticks(20), growFrom: 0.3, grow: 1.4, fadeTail: 0.35, follow: hand })(hand(new Vector3()), c);
  everyTick(20, i => {
    if (entityGone(c.caster)) return;
    const h = hand(new Vector3());
    for (let j = 0; j < 3; j++) {
      if (i % 2 === 0) {
        const pitch = Math.random() * Math.PI * 2;
        const yaw = Math.random() * Math.PI * 2;
        const from = new Vector3(h.x - Math.sin(yaw) * Math.cos(pitch) * 1.2, h.y + Math.sin(pitch) * 1.2, h.z + Math.cos(yaw) * Math.cos(pitch) * 1.2);
        // JOINT_THUNDER sub3 ends where the hand is at its creation (MoveHandlers.cpp:1639).
        effects.spawn('joint', c.scene, from, { to: h, colour: [0.5, 0.5, 1], width: cm(10), seconds: ticks(10), segments: 10, jitter: 0.15, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      }
      if (hd && j === 0 && i % 2 === 0) particles({ recipe: SPIKE_CHIPS, count: 2 })(h, c);
      effects.spawn('sprite', c.scene, h, {
        texture: TEX.shiny2,
        size: cm(32) * (8 + Math.floor(Math.random() * 8)) * 0.2,
        aspect: 2,
        seconds: TICK,
        rotation: Math.random() * Math.PI * 2,
        fadeTail: 0.001,
      });
    }
  });
};

const sparkCharge = sparkChargeOf(false);

/** Graded tiers: blue-white chips the charge and the bolt's tip throw. */
const SPIKE_CHIPS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.7, 1],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.35,
  lifeJitter: 0.4,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1, 1],
  power: 3,
  powerJitter: 0.5,
  gravity: -3,
  capacity: 128,
};

/** Charge ticks for a caster with no flash clip: keys 1.3 and 1.5, at 0.4 a tick halved past key 1. */
const SPARK_CHARGE_FALLBACK: readonly number[] = [3, 4];
/** Ticks the poll waits on a clip that never leaves the window. */
const SPARK_CHARGE_MAX = 40;

/**
 * A charge on every tick the flash clip's key is in [1.2, 1.6) (ZzzCharacter.cpp:10514-10520): at the
 * Dark Lord's half rate over keys 1-3, two overlapping gatherings a tick apart. The Ready sound is one
 * channel (ZzzOpenData.cpp:4885), so the second PlayBuffer only restarts it: played once here.
 */
const sparkChargesOf = (hd: boolean): Step => (at, c) => {
  const t0 = fxNow();
  let seen = false;
  let fired = 0;
  const charge = hd ? sparkChargeOf(true) : sparkCharge;
  const fire = (): void => {
    charge(at, c);
    if (fired === 0 && hd) lighting.skillCue(c.scene, 65, 'charge', c.caster);
    if (fired++ === 0) atCaster(sfx('Sound/sDarkElecSpikeReady'), CAST_HEIGHT)(at, c);
  };
  const tick = (): void => {
    if (entityGone(c.caster)) return;
    const k = Math.round((fxNow() - t0) / TICK);
    const m = c.caster.modelObject;
    if (m && DL_FLASH.has(m.CurrentAction)) {
      seen = true;
      const f = m.actionFrame();
      if (f >= 1.6) return;
      if (f >= 1.2) fire();
    } else if (seen || k > SPARK_CHARGE_FALLBACK[SPARK_CHARGE_FALLBACK.length - 1]) {
      return;
    } else if (SPARK_CHARGE_FALLBACK.includes(k)) {
      fire();
    }
    if (k < SPARK_CHARGE_MAX) delay(TICK, tick);
  };
  tick();
};
const sparkCharges = sparkChargesOf(false);

/** BITMAP_FLARE_FORCE joints: 30 tails (ZzzEffectJoint.cpp:2496-2549). */
const FORCE_TAILS = 30;
/** Tails after `k` ticks of growth: 0, 2, 4... are added a tick (`MultiUse += 2`, :6608-6624). */
const forceReveal = (k: number): number => Math.min(FORCE_TAILS, k * (k - 1));
/** `Light x 1/1.3` a tick over the last 10. */
const forceLife = (life: number) => (p: number): number => Math.min(1, Math.pow(1.3, ticksLeft(p, life) - 10));
/** `Luminosity = (NumTails - 1 - j) / MaxTails * 2` per quad (:7251-7257): bright at the tip, black at the hand. */
const forceShade = (i: number): number => (2 * i) / FORCE_TAILS;

/**
 * The bolt at key 5.5 (ZzzCharacter.cpp:4390-4404, ZzzEffect.cpp:3418-3426): five FLARE_FORCE joints
 * from 90 cm ahead and 100 cm up. Tail n sits `n^2 + 2n` cm down the facing (steps 3, 5, 7... cm);
 * sub0 is the 250 cm straight ribbon, sub1-4 corkscrew round it at `80 - 2.5n` cm, turning -20 deg a
 * tail from below (sub1/2, after a 2-4 tick wait) and above (sub3/4, which overlap) (:6625-6668).
 */
const sparkBoltOf = (hd: boolean): Step => (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const fwd = new Vector3(f.x, 0, f.z);
  const right = new Vector3(-f.z, 0, f.x);
  const act = c.caster.modelObject?.CurrentAction;
  const lift = act === PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH ? cm(80) : act === PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH ? cm(40) : 0;
  const s = entityPos(c.caster, 1 + lift, new Vector3()).addInPlace(fwd.scale(0.9));
  const axis = (n: number): Vector3 => s.add(fwd.scale(cm(n * n + 2 * n)));
  const base = { texture: TEX.jointThunder, colour: [1, 0.8, 1] as RGB, reveal: forceReveal, uPerPoint: 1 / 14, scroll: 1, shade: forceShade, side: right };
  const main: Vector3[] = [];
  for (let n = 0; n < FORCE_TAILS; n++) main.push(axis(n));
  effects.spawn('path', c.scene, s, { ...base, points: main, width: cm(250), seconds: ticks(20), life: forceLife(20) });
  for (const sign of [1, 1, -1, -1]) {
    const wait = sign > 0 ? 2 + Math.floor(Math.random() * 3) : 0;
    const points: Vector3[] = [];
    for (let n = 0; n < FORCE_TAILS; n++) {
      const r = cm(80 - 2.5 * n) * sign;
      const t = ((180 - 20 * n) * Math.PI) / 180;
      points.push(axis(n).addInPlace(right.scale(Math.sin(t) * r)).addInPlaceFromFloats(0, Math.cos(t) * r, 0));
    }
    effects.spawn('path', c.scene, s, { ...base, points, width: 1, wait: ticks(wait), seconds: ticks(20 + wait), life: forceLife(20 + wait) });
  }
  sfx('Sound/sDarkElecSpike')(s, c);
  if (hd) sparkBoltHead(main, c);
};
const sparkBolt = sparkBoltOf(false);

/**
 * Graded tiers: the bolt's growing tip carries a white-violet head that rides the reveal out, sheds
 * chips as each run of tails appears, and flares where the bolt stops; its light is cued here.
 */
function sparkBoltHead(main: readonly Vector3[], c: SkillContext): void {
  lighting.skillCue(c.scene, 65, 'bolt', c.caster);
  const t0 = fxNow();
  const tip: PointSource = out => out.copyFrom(main[Math.max(0, forceReveal(Math.floor((fxNow() - t0) / TICK)) - 1)]);
  sprite({ texture: TEX.flare, colour: [0.8, 0.65, 1], size: 1.6, seconds: ticks(16), fadeTail: 0.5, follow: tip })(main[0], c);
  let shown = 0;
  everyTick(7, k => {
    const n = forceReveal(k);
    if (n > shown) particles({ recipe: SPIKE_CHIPS, count: 3 })(main[n - 1], c);
    if (n >= FORCE_TAILS && shown < FORCE_TAILS) {
      sprite({ texture: TEX.flare, colour: [0.9, 0.8, 1], size: 2.6, seconds: ticks(10), grow: 1.5, growFrom: 0.5, fadeTail: 0.7 })(main[n - 1], c);
      particles({ recipe: SPIKE_CHIPS, count: 14 })(main[n - 1], c);
    }
    shown = n;
  });
}

/** Keys 7-8, a tick each: two MODEL_DARKLORD_SKILL sub2 at the weapon's link bone, Light (0.8, 0.5, 1), angles (180, 45, 0) and (0, 0, yaw) (ZzzCharacter.cpp:10541-10551). */
const sparkAfterglow: Step = (_at, c) =>
  everyTick(3, i => {
    const m = c.caster.modelObject;
    const frame = m && DL_FLASH.has(m.CurrentAction) ? m.actionFrame() : 7 + i * 0.4;
    if (frame >= 8 || entityGone(c.caster)) return;
    const p = bonePos(c.caster, 33, new Vector3(), CAST_HEIGHT);
    const glow = { model: MODEL.darkLordSkill, colour: [0.8, 0.5, 1] as RGB, scale: 0.2, seconds: ticks(12), fadeTail: 0.001 };
    // The (180, ...) pitch only mirrors the flat card; its 45 degree tilt is the roll.
    model({ ...glow, roll: muYaw(45) })(p, c);
    model({ ...glow, yaw: -entityYaw(c.caster) })(p, c);
  });
// Add Critical (64), Removal Buff (72), Chaotic Diseier (238).

/**
 * An MU `o->Angle` in degrees as a model node's `pitch` / `yaw` / `roll`. `AngleMatrix` is
 * Rz.Ry.Rx; the model conversion swaps y and z, which turns it into Ry(-a2).Rz(-a1).Rx(-a0).
 */
function muAngle(a0: number, a1: number, a2: number): { pitch: number; yaw: number; roll: number } {
  const m = Matrix.RotationX(-a0 * DEG).multiply(Matrix.RotationZ(-a1 * DEG)).multiply(Matrix.RotationY(-a2 * DEG));
  const e = Quaternion.FromRotationMatrix(m).toEulerAngles();
  return { pitch: e.x, yaw: e.y, roll: e.z };
}

/** MODEL_DARKLORD_SKILL sub0 / sub1: `Angle (45, 45 - 90 x SubType, 0)` (ZzzEffect.cpp:3449-3470). */
const CRIT_ANGLES = [muAngle(45, 45, 0), muAngle(45, -45, 0)] as const;
const CRIT_TINT: RGB = [1, 0.6, 0.3];
const ARROWS = 15;
const BOLT = 7;
/** eBuff_Cloaking: the buff pulse skips a cloaked body (ZzzCharacter.cpp:10030). */
const CLOAKING = 18;

interface CritHand {
  bone: number;
  sub: 0 | 1;
  bow: boolean;
}

/**
 * Weapon[0] (right, link bone 33) and Weapon[1] (left, 42) with Add Critical's skips: no card at a
 * right hand holding arrows, or a left hand holding bolts or a shield (ZzzCharacter.cpp:4370-4381).
 * `held`: the buff pulse also skips an empty hand (:10039, :10052).
 */
function critHands(e: Entity, held: boolean): CritHand[] {
  const right = e.charAppearance?.rightHand ?? null;
  const left = e.charAppearance?.leftHand ?? null;
  const out: CritHand[] = [];
  if ((!held || right) && !(right?.group === GROUP_BOW && right.num === ARROWS)) out.push({ bone: RIGHT_HAND_BONE, sub: 0, bow: right?.group === GROUP_BOW });
  if ((!held || left) && !(left?.group === GROUP_BOW && left.num === BOLT) && left?.group !== GROUP_SHIELD) out.push({ bone: LEFT_HAND_BONE, sub: 1, bow: left?.group === GROUP_BOW });
  return out;
}

/** MODEL_DARKLORD_SKILL: KingS_R at Scale 0.2 in the Light (1, 0.6, 0.3), 10 ticks, left where it was made (ZzzObject.cpp:948-953). */
function critCard(scene: Scene, e: Entity, hand: CritHand): void {
  effects.spawn('model', scene, bonePos(e, hand.bone, new Vector3(), CAST_HEIGHT), {
    model: MODEL.darkLordSkill,
    colour: CRIT_TINT,
    scale: 0.2,
    seconds: ticks(10),
    fadeTail: 0.001,
    ...CRIT_ANGLES[hand.sub],
  });
}

/** Graded tiers: hot chips the critical card throws off the hand. */
const CRIT_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.72, 0.38],
  colourEnd: [0.8, 0.25, 0.05],
  size: 0.1,
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.4,
  box: [0.04, 0.04, 0.04],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1.2, 1],
  power: 2.2,
  powerJitter: 0.5,
  gravity: -3,
  capacity: 128,
};
/** Graded tiers: embers lifting off the buff's burning helices. */
const CRIT_EMBERS: ParticleRecipe = { ...CRIT_SPARKS, size: 0.08, life: 0.6, box: [0.15, 0.1, 0.15], dir1: [-0.3, 1, -0.3], dir2: [0.3, 1, 0.3], power: 0.6, gravity: 0.4, capacity: 256 };

/** Graded tiers: a hot core under the card at the hand and a spray of chips. */
function critHandFlare(scene: Scene, e: Entity, hand: CritHand): void {
  const follow: PointSource = out => bonePos(e, hand.bone, out, CAST_HEIGHT);
  const p = follow(new Vector3());
  effects.spawn('sprite', scene, p, { texture: TEX.flare, colour: [1, 0.55, 0.25], size: 0.9, seconds: ticks(10), growFrom: 0.4, grow: 1.3, fadeTail: 0.6, follow });
  effects.spawn('particles', scene, p, { recipe: CRIT_SPARKS, count: 10 });
}

/** Graded tiers: a warm glow in the hand under each pulse's helices, and embers lifting off them. */
function critPulseGlow(scene: Scene, e: Entity, hand: CritHand): void {
  const follow: PointSource = out => bonePos(e, hand.bone, out, CAST_HEIGHT);
  const p = follow(new Vector3());
  effects.spawn('sprite', scene, p, { texture: TEX.flare, colour: [0.55, 0.3, 0.12], size: 0.75, seconds: ticks(HELIX_MOVES), growFrom: 0.6, fadeTail: 0.45, follow });
  effects.spawn('particles', scene, p, { recipe: CRIT_EMBERS, rate: 14, seconds: ticks(HELIX_MOVES - 2), follow });
}

/** The skill at AttackTime 15, 14 ticks after the packet: a card at each hand and SOUND_CRITICAL (ZzzCharacter.cpp:4366-4383). `hd`: a hot core and sparks at each card. */
const critCastOf = (hd: boolean): Step => after(ticks(14), (at, c) => {
  if (entityGone(c.caster)) return;
  for (const hand of critHands(c.caster, false)) {
    critCard(c.scene, c.caster, hand);
    if (hd) critHandFlare(c.scene, c.caster, hand);
  }
  atCaster(sfx('Sound/sDarkCritical'))(at, c);
});
const critCast = critCastOf(false);

/** FLARE_FORCE sub5-7 move 16 times, one tail more each (ZzzEffectJoint.cpp:2551-2573, :6532-6592). */
const HELIX_MOVES = 16;
/** `Light x 1/1.5` a move once LifeTime is under 7. */
const helixLight = (k: number): number => (k >= 9 ? Math.pow(1.5, 8 - k) : 1);
/** Centimetres along the link bone's Y of axis point `i`: from +20, stepping back 4 cm growing 0.1 a point; a bow takes no step. */
const helixAlong = (i: number, bow: boolean): number => (bow ? 20 : 20 - 4 * (i + 1) - 0.05 * i * (i + 1));

const helixLocal = new Vector3();
const helixAxis = new Vector3();

/** A bone's frame axis `local` in the world, unit (the tail matrix `BoneTransform[0]`). */
function boneAxis(e: Entity, bone: number, local: Vector3, out: Vector3): boolean {
  const node = e.modelObject?.gltf?.skeleton?.bones[bone + 1]?.getTransformNode();
  if (!node) return false;
  Vector3.TransformNormalToRef(local, node.getWorldMatrix(), out);
  out.normalize();
  return true;
}

/**
 * One FLARE_FORCE sub5/6/7 on a hand, laid anew every move: point i steps down the link bone and
 * sits 30 cm out, the radius shrinking 0.15 cm a point over the whole joint's life, turned about the
 * world X axis from SubType x 90 deg by +-40 deg a point. Fire04, 20 cm wide, Light (1, 0.8, 1).
 */
function critHelix(scene: Scene, e: Entity, hand: CritHand, sub: 5 | 6 | 7): void {
  const points = Array.from({ length: HELIX_MOVES }, () => new Vector3());
  const turn = sub % 2 ? 40 : -40;
  effects.spawn('path', scene, bonePos(e, hand.bone, new Vector3(), CAST_HEIGHT), {
    points,
    texture: TEX.fire4,
    colour: [1, 0.8, 1],
    width: cm(20),
    seconds: ticks(HELIX_MOVES),
    life: p => helixLight(Math.floor(p * HELIX_MOVES)),
    rebuild: (t, pts, _widths, axes) => {
      if (entityGone(e)) return 0;
      const k = Math.min(HELIX_MOVES - 1, Math.floor(t / TICK));
      let r = 30 - (0.15 * k * (k + 1)) / 2;
      let a = sub * 90;
      for (let i = 0; i <= k; i++) {
        a += turn;
        const p = boneLocalPos(e, hand.bone, helixLocal.set(0, cm(helixAlong(i, hand.bow)), 0), pts[i], CAST_HEIGHT);
        // Rx(a) applied to (0, 0, r): MU (0, -r sin a, r cos a), MU y being this client's z.
        p.y += cm(r * Math.cos(a * DEG));
        p.z -= cm(r * Math.sin(a * DEG));
        r -= 0.15;
      }
      if (boneAxis(e, 0, helixAxis.set(1, 0, 0), axes.side)) boneAxis(e, 0, helixAxis.set(0, 0, 1), axes.up);
      return k + 1;
    },
  });
}

/** The BITMAP_FLARE (Flare.jpg, 64 px x `Light / 2`) each helix leaves on every second axis point, one per helix, stacked. */
function critFlares(scene: Scene, e: Entity, hand: CritHand): void {
  for (let i = 0; i < HELIX_MOVES; i += 2) {
    const along = cm(helixAlong(i, hand.bow));
    const follow: PointSource = out => boneLocalPos(e, hand.bone, helixLocal.set(0, along, 0), out, CAST_HEIGHT);
    const life = HELIX_MOVES - i;
    delay(ticks(i), () => {
      if (entityGone(e)) return;
      effects.spawn('sprite', scene, follow(new Vector3()), { texture: TEX.flareBig, colour: [1, 0.8, 1], size: cm(32), count: 3, seconds: ticks(life), fadeTail: Math.min(1, 7 / life), follow });
    });
  }
}

/**
 * Critical Damage's body look, every 1.2 s while it holds and the body is not cloaked
 * (ZzzCharacter.cpp:10029-10066): at each hand holding an item, BITMAP_FLARE_FORCE sub1 (three
 * helices, ZzzEffect.cpp:3431-3436) and, 1 time in 20, the MODEL_DARKLORD_SKILL card; SOUND_CRITICAL.
 */
function critPulse(scene: Scene, e: Entity): void {
  if (!e.charAppearance || e.buffs?.has(CLOAKING) || entityGone(e)) return;
  const card = Math.floor(Math.random() * 20) === 0;
  // PKKey is the weapon type, and it stays set once a bow was seen (right hand first).
  let bow = false;
  const hd = tierIndex() >= ENHANCED_TIER;
  for (const hand of critHands(e, true)) {
    bow = bow || hand.bow;
    const h = { ...hand, bow };
    for (const sub of [5, 6, 7] as const) critHelix(scene, e, h, sub);
    critFlares(scene, e, h);
    if (card) critCard(scene, e, h);
    if (hd) critPulseGlow(scene, e, h);
  }
  if (hd) lighting.skillCue(scene, 64, 'pulse', e);
  playSfx('Sound/sDarkCritical', entityPos(e, CAST_HEIGHT, new Vector3()), { bus: COMBAT_BUS });
}

/** Removal Buff fires once the caster's clip passes key 3.5, or at AttackTime 15 (ZzzCharacter.cpp:2927-2931). */
const REMOVAL_CLIPS: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_SKILL_VITALITY,
  PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  PlayerAction.PLAYER_SKILL_RIDER,
  PlayerAction.PLAYER_SKILL_RIDER_FLY,
  PlayerAction.PLAYER_FENRIR_ATTACK_MAGIC,
]);
/** The six MODEL_SPEARSKILL joints: Angle[2], height over the feet in cm, SubType (ZzzCharacter.cpp:4323-4338). */
const REMOVAL_BANDS = [
  [45, 100, 5],
  [135, 90, 6],
  [225, 80, 7],
  [90, 80, 5],
  [180, 70, 6],
  [270, 60, 7],
] as const;
const REMOVAL_TINTS: Record<5 | 6 | 7, RGB> = { 5: [1, 1, 0.8], 6: [1, 0.8, 1], 7: [0.8, 1, 1] };
/** LifeTime 60: 61 moves of three tails; 30 tails kept. */
const REMOVAL_MOVES = 61;
const REMOVAL_TAILS = 30;
/** `Light x 1/1.2` a move once LifeTime is under 10. */
const removalLight = (k: number): number => (k > 50 ? Math.pow(1.2, 50 - k) : 1);

interface RemovalPath {
  /** Every tail the joint lays, in cm off its start: x, z, climb, width. */
  x: Float32Array;
  z: Float32Array;
  y: Float32Array;
  w: Float32Array;
  /** The tail on which Weapon reaches 40 (the shock wave), and Angle[2] then. */
  ring: number;
  /** The tail on which the band first swings through the caster (Weapon 0 to 1). */
  flip: number;
  ringYaw: number;
}

/**
 * MODEL_SPEARSKILL sub5-7's path (ZzzEffectJoint.cpp:1597-1630, :4344-4391), three substeps a move:
 * yaw +10, radius x0.95 from 800 cm until it flips to -30 (Weapon 1-19, width held at 40), then the
 * start climbs 5 cm a substep, and past Weapon 40 the radius runs out 20 cm and the width grows 15
 * a substep while the yaw falls back 5. The width loses 5 a move throughout.
 */
function removalPath(yaw0: number): RemovalPath {
  const n = 1 + REMOVAL_MOVES * 3;
  const path: RemovalPath = { x: new Float32Array(n), z: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n), ring: -1, ringYaw: 0, flip: -1 };
  let a = yaw0;
  let d = 800;
  let weapon = 0;
  let s = 170;
  let climb = 0;
  let i = 0;
  const put = (): void => {
    path.x[i] = -Math.sin(a * DEG) * d;
    path.z[i] = Math.cos(a * DEG) * d;
    path.y[i] = climb;
    path.w[i] = Math.abs(s);
    i++;
  };
  put();
  for (let k = 0; k < REMOVAL_MOVES; k++) {
    for (let j = 0; j < 3; j++) {
      a += 10;
      put();
      if (weapon === 0) {
        d *= 0.95;
        if (d < 10) d = -10;
      }
      if (weapon > 40) {
        d -= 20;
        a -= 5;
        s += 15;
      }
      if (d < 0) {
        if (weapon === 0) path.flip = i - 1;
        if (weapon === 40) {
          path.ring = i - 1;
          path.ringYaw = a;
        }
        weapon++;
        if (weapon < 20) {
          d = -30;
          s = 40;
        } else climb += 5;
      }
    }
    s -= 5;
  }
  return path;
}

const REMOVAL_PATHS = REMOVAL_BANDS.map(([yaw]) => removalPath(yaw));

/**
 * Graded tiers: the widest a band grows, in cm. The original's run out to 7 m, and Flare02's haze
 * over that height washed the graded view into flat grey sheets with straight ends.
 */
const REMOVAL_WIDTH_HD = 160;
/** Graded tiers: tails over which a band's ends fade, so it tapers instead of ending on the sheet's straight edge. */
const REMOVAL_ROOT_FADE = 9;
const REMOVAL_HEAD_FADE = 4;
const removalEndFade = (i: number): number => Math.min(1, (i + 1) / REMOVAL_ROOT_FADE, (REMOVAL_TAILS - i) / REMOVAL_HEAD_FADE);
/** Graded tiers: glints the band heads shed. */
const REMOVAL_GLINTS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.95, 0.92, 1],
  colourEnd: [0.5, 0.45, 0.7],
  size: 0.16,
  sizeJitter: 0.5,
  life: 0.55,
  lifeJitter: 0.4,
  box: [0.1, 0.15, 0.1],
  dir1: [-0.3, 0.2, -0.3],
  dir2: [0.3, 0.8, 0.3],
  power: 0.5,
  powerJitter: 0.5,
  gravity: 0.3,
  capacity: 384,
};
/** Graded tiers: the glints the shock rings throw out flat as they leave. */
const REMOVAL_RING_GLINTS: ParticleRecipe = { ...REMOVAL_GLINTS, size: 0.2, life: 0.7, box: [0.2, 0.05, 0.2], dir1: [-1, 0.05, -1], dir2: [1, 0.35, 1], power: 5, gravity: -1, capacity: 128 };

/**
 * Removal Buff's six bands round where the caster stands: Flare02 (REPEAT) additive, a single
 * vertical face (RENDER_FACE_ONE is the tail's Z pair), the last 30 tails. Sub5 / sub6 each drop a
 * BITMAP_SHOCK_WAVE sub3 when Weapon reaches 40: 1 to 31 tiles over 15 ticks, the band's Light.
 * `hd`: the graded tiers' tapered, width-capped bands with a glint at each head, the flash where they
 * swing through the caster, the rings' glints, and the light cues.
 */
const removalBandsOf = (hd: boolean): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  if (hd) lighting.skillCue(c.scene, 72, 'bands', c.caster);
  REMOVAL_BANDS.forEach(([, height, sub], b) => {
    const path = REMOVAL_PATHS[b];
    const tint = REMOVAL_TINTS[sub];
    const n = path.x.length;
    const head = new Vector3(feet.x + cm(path.x[0]), feet.y + cm(height), feet.z + cm(path.z[0]));
    effects.spawn('path', c.scene, feet, {
      points: Array.from({ length: REMOVAL_TAILS }, () => new Vector3()),
      texture: TEX.flare2,
      colour: tint,
      uPerPoint: 1 / (REMOVAL_TAILS - 1),
      faces: 'vertical',
      seconds: ticks(REMOVAL_MOVES),
      life: p => removalLight(Math.floor(p * REMOVAL_MOVES)),
      ...(hd ? { shade: removalEndFade } : {}),
      rebuild: (t, pts, widths) => {
        // The first move runs as the joint is made; its substeps are spread over each tick.
        const made = Math.min(n, 4 + Math.floor((3 * t) / TICK));
        const count = Math.min(REMOVAL_TAILS, made);
        for (let j = 0; j < count; j++) {
          const i = made - count + j;
          pts[j].set(feet.x + cm(path.x[i]), feet.y + cm(height + path.y[i]), feet.z + cm(path.z[i]));
          widths[j] = cm(hd ? Math.min(path.w[i], REMOVAL_WIDTH_HD) : path.w[i]);
        }
        if (hd) head.copyFrom(pts[count - 1]);
        return count;
      },
    });
    if (hd) {
      const follow: PointSource = out => out.copyFrom(head);
      effects.spawn('sprite', c.scene, head, { texture: TEX.flare, colour: [tint[0] * 0.55, tint[1] * 0.55, tint[2] * 0.55], size: 0.8, seconds: ticks(REMOVAL_MOVES - 6), fadeTail: 0.25, follow });
      effects.spawn('particles', c.scene, head, { recipe: REMOVAL_GLINTS, rate: 18, seconds: ticks(REMOVAL_MOVES - 8), follow });
    }
    if (sub !== 7) {
      after(ticks(Math.floor((path.ring - 1) / 3)), ring({ texture: TEX.shockwave, colour: tint, scale: 1, grow: 31, maxScale: 31, seconds: ticks(15), spinFrom: -path.ringYaw, fadeTail: 0.001 }))(feet, c);
    }
  });
  if (hd) {
    // The bands swing through the caster: a pale flash at his chest and a soft pool under him.
    const chest = new Vector3(feet.x, feet.y + 1, feet.z);
    after(ticks(Math.floor((REMOVAL_PATHS[0].flip - 4) / 3)), sprite({ texture: TEX.flare, colour: [0.8, 0.76, 0.9], size: 2.2, seconds: ticks(14), growFrom: 0.3, grow: 1.2, fadeTail: 0.7 }))(chest, c);
    ring({ texture: TEX.flare, colour: [0.22, 0.2, 0.28], scale: 5, seconds: ticks(REMOVAL_MOVES), growFrom: 0.4, fadeTail: 0.3 })(feet, c);
    // The first shock ring: its glints thrown out flat, and the light's wide flash.
    after(ticks(Math.floor((REMOVAL_PATHS[0].ring - 1) / 3)), (p, cc) => {
      lighting.skillCue(cc.scene, 72, 'ring', cc.caster);
      sprite({ texture: TEX.flare, colour: [0.9, 0.86, 1], size: 3, seconds: ticks(10), growFrom: 0.4, grow: 1.6, fadeTail: 0.7, height: 0.4 })(p, cc);
      particles({ recipe: REMOVAL_RING_GLINTS, count: 36, height: 0.3 })(p, cc);
    })(feet, c);
  }
  // SOUND_BMS_MAGIC_REMOVAL is loaded on the Battle Castle map only (MapManager.cpp:251-276).
  if (storeRef().world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) sfx('Sound/battlecastle/sDMagicCancel')(feet, c);
};

const removalBuff: Step = atFrame(REMOVAL_CLIPS, 3.5, ticks(14), removalBandsOf(false));
const removalBuffHd: Step = atFrame(REMOVAL_CLIPS, 3.5, ticks(14), removalBandsOf(true));

/**
 * Chaotic Diseier's body: 5 BITMAP_SHINY+6 sub3 for 24 ticks, each drawing a one-frame dark shiny05
 * (64 px x 2, Light 0.5) at a random bone 20 cm along the facing every tick (ZzzEffect.cpp:1251-1260,
 * :6825-6832). One card per emitter that jumps to a new bone each tick.
 */
const chaoticStars: Step = (_at, c) => {
  const t0 = fxNow();
  for (let s = 0; s < 5; s++) {
    let tick = -1;
    let bone = 0;
    const follow: PointSource = out => {
      const k = Math.floor((fxNow() - t0) / TICK);
      if (k !== tick) {
        tick = k;
        const n = (c.caster.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1;
        bone = n > 0 ? Math.floor(Math.random() * n) : 0;
      }
      bonePos(c.caster, bone, out, CAST_HEIGHT);
      const f = forwardOf(entityYaw(c.caster));
      out.x += f.x * cm(20);
      out.z += f.z * cm(20);
      return out;
    };
    effects.spawn('sprite', c.scene, follow(new Vector3()), { texture: TEX.shiny5, blend: 'subtract', colour: [0.5, 0.5, 0.5], size: cm(128), seconds: ticks(24), fadeTail: 0.001, follow });
  }
};

/**
 * BITMAP_SMOKE sub59 off each ribbon head every move: 41-81 cm, +0.09 scale a tick, LT 40, rising 6-9 cm a
 * tick, subtracting smoke01 x `LT / 40 x 0.9` (ZzzEffectParticle.cpp:1481-1486, :5646-5649). Drawn as black
 * over smoke02's alpha, held to 0.2: smoke01 peaks at 0.28 luminance where smoke02's alpha reaches 0.89.
 */
const CHAOS_SMOKE: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: [0, 0, 0],
  size: cm(61),
  sizeJitter: 0.33,
  life: ticks(40),
  lifeJitter: 0,
  box: [0, 0, 0],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(7.6),
  powerJitter: 0.2,
  gravity: 0,
  endScale: 4.8,
  blend: 'alpha',
  alpha: 0.2,
  capacity: 384,
};
/** Graded tiers: black ash flecks the ribbon heads shed, drifting down. */
const CHAOS_ASH: ParticleRecipe = {
  ...CHAOS_SMOKE,
  size: 0.14,
  sizeJitter: 0.5,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.15, 0.2, 0.15],
  dir1: [-0.4, -0.2, -0.4],
  dir2: [0.4, 0.3, 0.4],
  power: 0.4,
  powerJitter: 0.5,
  gravity: -0.6,
  spin: 3,
  endScale: 0.6,
  alpha: 0.8,
  capacity: 256,
};
/** Graded tiers: the dark wake each MODEL_DESAIR drags. */
const CHAOS_WAKE: ParticleRecipe = { ...CHAOS_SMOKE, size: 0.4, sizeJitter: 0.3, life: 0.5, lifeJitter: 0.3, power: 0.15, endScale: 2.2, spin: 1, alpha: 0.3, capacity: 256 };
/** Graded tiers: the bomb's dark smoke thrown out low along the ground. */
const CHAOS_BURST: ParticleRecipe = {
  ...CHAOS_SMOKE,
  size: 0.6,
  sizeJitter: 0.35,
  life: 0.9,
  lifeJitter: 0.3,
  box: [0.1, 0.05, 0.1],
  dir1: [-1, 0.05, -1],
  dir2: [1, 0.3, 1],
  power: 2.2,
  powerJitter: 0.4,
  gravity: 0,
  spin: 1.2,
  endScale: 3,
  alpha: 0.35,
  capacity: 128,
};
/** Graded tiers: black chips the bomb throws up. */
const CHAOS_BURST_ASH: ParticleRecipe = { ...CHAOS_ASH, size: 0.12, life: 0.8, box: [0.1, 0.1, 0.1], dir1: [-1, 0.8, -1], dir2: [1, 1.8, 1], power: 3, gravity: -5, capacity: 128 };
/** BITMAP_2LINE_GHOST sub0 keeps 26 tails (ZzzEffectJoint.cpp:602-622). */
const GHOST_TAILS = 26;
/** MODEL_DESAIR sheds its two feathers on LifeTime 50, 40 ... 10 (EffectBehaviors.cpp:31-46). */
const DESAIR_DROPS = [2, 12, 22, 32, 42] as const;

/** MODEL_FEATHER sub2/3 (ZzzEffect.cpp:4692-4730, :8350-8395): dark, +-40 cm off the bird, any angle, 100 ticks, alpha, light and size x0.97 a tick. */
function chaoticFeather(c: SkillContext, at: Vector3): void {
  const jitter = (): number => cm((Math.floor(Math.random() * 20) - 10) * 4);
  const angle = (): number => Math.floor(Math.random() * 360);
  model({
    model: MODEL.feather,
    blend: 'subtract',
    colour: RGBS.white,
    scale: 1.4 * (1 + (Math.floor(Math.random() * 20) - 10) * 0.03),
    grow: Math.pow(0.97, 100),
    alpha: 0.6 + Math.floor(Math.random() * 10) * 0.02,
    seconds: ticks(100),
    life: p => Math.pow(0.97, 200 * p),
    spin: (Math.floor(Math.random() * 10) - 5) * 25 * DEG,
    ...muAngle(angle(), angle(), angle()),
  })(new Vector3(at.x + jitter(), at.y + jitter(), at.z + jitter()), c);
}

/**
 * One BITMAP_2LINE_GHOST sub0 (ZzzEffectJoint.cpp:602-622, :3707-3719): from the caster +-119 cm
 * along the world X and 49-108 cm up, it flies the caster's facing at 40-59 cm a tick for 67 or 75
 * ticks, weaving +10 deg a tick while `LifeTime % 16 <= 7` and -10 after; 2line_gost, dark,
 * 21-220 cm wide. Two in three carry a MODEL_DESAIR (Light 0.5 on the ribbon).
 */
function chaoticGhost(c: SkillContext, feet: Vector3, yaw: number, hd = false): void {
  const life = Math.random() < 0.5 ? 67 : 75;
  const moves = life + 1;
  const v = cm(40 + Math.floor(Math.random() * 20));
  const width = cm(20 + Math.floor(Math.random() * 200) + 1);
  const carrier = Math.floor(Math.random() * 3) < 2;
  const xs = new Float32Array(moves + 1);
  const zs = new Float32Array(moves + 1);
  xs[0] = feet.x + cm(-119 + Math.floor(Math.random() * 240));
  zs[0] = feet.z;
  const y = feet.y + cm(49 + Math.floor(Math.random() * 60));
  let a = yaw;
  for (let k = 0; k < moves; k++) {
    xs[k + 1] = xs[k] + Math.sin(a) * v;
    zs[k + 1] = zs[k] - Math.cos(a) * v;
    a += ((life - k) % 16 <= 7 ? 10 : -10) * DEG;
  }
  const t0 = fxNow();
  // The first move runs as the joint is made.
  const head: PointSource = out => {
    const f = Math.min(moves, 1 + (fxNow() - t0) / TICK);
    const k = Math.min(moves - 1, Math.floor(f));
    const u = f - k;
    return out.set(xs[k] + (xs[k + 1] - xs[k]) * u, y, zs[k] + (zs[k + 1] - zs[k]) * u);
  };
  const at = head(new Vector3());
  const shade = carrier ? 0.5 : 1;
  effects.spawn('joint', c.scene, at, { head, maxTails: GHOST_TAILS, width, colour: [shade, shade, shade], blend: 'subtract', texture: TEX.twoLineGhost, seconds: ticks(moves), fadeTail: 0.01 });
  effects.spawn('particles', c.scene, at, { recipe: CHAOS_SMOKE, rate: 25, seconds: ticks(moves), follow: head });
  if (hd) effects.spawn('particles', c.scene, at, { recipe: CHAOS_ASH, rate: 8, seconds: ticks(moves - 6), follow: head });
  if (!carrier) return;
  if (hd) effects.spawn('particles', c.scene, at, { recipe: CHAOS_WAKE, rate: 22, seconds: ticks(50), follow: head });
  // MODEL_DESAIR: LT 52, Scale 1.4, RENDER_DARK at Light 1, on the ribbon's head and heading (EffectRegistry.cpp:48-53, ZzzObject.cpp:1507-1511).
  model({ model: MODEL.desair, scale: 1.4, seconds: ticks(52), blend: 'subtract', colour: RGBS.white, follow: head, yaw: -yaw, aim: true, aimYaw: Math.PI, fadeTail: 0.001 })(at, c);
  for (const k of DESAIR_DROPS) {
    delay(ticks(k), () => {
      const p = head(new Vector3());
      chaoticFeather(c, p);
      chaoticFeather(c, p);
    });
  }
}

/** The eight ribbons, heading where the caster faces. `hd`: ash off each head and a wake behind each bird. */
const chaoticGhostsOf = (hd: boolean): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < 8; i++) chaoticGhost(c, feet, yaw, hd);
};
const chaoticGhosts = chaoticGhostsOf(false);

/**
 * CreateBomb sub6's BITMAP_SPARK sub10 (ZzzEffectParticle.cpp:2060-2079, :6558-6600, :9283-9285): a dark
 * Clud64 puff 38-67 cm, thrown 6-21 cm a tick up and up to 9 sideways, falling 2 cm a tick faster
 * each tick and bouncing at 0.6, at a coverage of `LifeTime / 16 / 1.02`. The bounce's
 * `LifeTime -= 4` is not ported.
 */
function cludPuff(c: SkillContext, at: Vector3): void {
  const life = 24 + Math.floor(Math.random() * 16);
  const turn = Math.floor(Math.random() * 360) * DEG;
  const side = (Math.floor(Math.random() * 60) - 30) * 0.1 * 3;
  const vx = cm(-Math.sin(turn) * side);
  const vz = cm(Math.cos(turn) * side);
  let g = 6 + Math.floor(Math.random() * 16);
  const xs = new Float32Array(life + 1);
  const ys = new Float32Array(life + 1);
  const zs = new Float32Array(life + 1);
  xs[0] = at.x;
  ys[0] = at.y;
  zs[0] = at.z;
  for (let k = 0; k < life; k++) {
    let y = ys[k] + cm(g);
    g -= 2;
    const ground = groundAt(xs[k], zs[k], -Infinity);
    if (y < ground) {
      y = ground;
      g = -g * 0.6;
    }
    xs[k + 1] = xs[k] + vx;
    ys[k + 1] = y;
    zs[k + 1] = zs[k] + vz;
  }
  const t0 = fxNow();
  const follow: PointSource = out => {
    const f = Math.min(life, (fxNow() - t0) / TICK);
    const k = Math.min(life - 1, Math.floor(f));
    const u = f - k;
    return out.set(xs[k] + (xs[k + 1] - xs[k]) * u, ys[k] + (ys[k + 1] - ys[k]) * u, zs[k] + (zs[k + 1] - zs[k]) * u);
  };
  const size = cm(64 * (4 + Math.floor(Math.random() * 4)) * 0.1 * 1.5);
  // glColor clamps the coverage at 1, so it only fades over the last 16 ticks.
  effects.spawn('sprite', c.scene, at, { texture: TEX.clud, blend: 'subtract', cover: 1, size, seconds: ticks(life), fadeTail: Math.min(1, (16 * 1.02) / life), follow });
}

/**
 * CreateBomb(target, true, 6), made only by the caster's own client at his selected target
 * (ClassAttack.cpp:762; the WSclient copies are subtype 0 and never reached): 20 dark Clud64 puffs and
 * a grey (0.3) BITMAP_EXPLOTION_MONO, 80 cm up, which plays SOUND_EXPLOTION01 (ZzzEffect.cpp:6275-6346).
 */
const chaoticBombOf = (hd: boolean): Step => (_at, c) => {
  if (!c.caster.localPlayer || !c.target || entityGone(c.target)) return;
  const p = entityPos(c.target, cm(80), new Vector3());
  // Graded tiers: the grey card at 0.16; at the original's 0.3 the tone curve lifted it into a white fog ball over the dark puffs.
  const grey = hd ? 0.16 : 0.3;
  sprite({ texture: TEX.explosionMono, colour: [grey, grey, grey], size: cm(256), seconds: ticks(20), cells: EXPLOSION_CELLS, fadeTail: 0.25 })(p, c);
  for (let j = 0; j < 20; j++) cludPuff(c, p);
  if (hd) {
    const ground = new Vector3(p.x, groundAt(p.x, p.z, p.y - cm(80)) + 0.15, p.z);
    particles({ recipe: CHAOS_BURST, count: 14 })(ground, c);
    particles({ recipe: CHAOS_BURST_ASH, count: 22 })(p, c);
  }
  sfx('Sound/eExplosion')(p, c);
};
const chaoticBomb = chaoticBombOf(false);

/**
 * Iron Defense (323 / 521 / 524): nothing in Classic, the original predates it. The graded tiers keep
 * the old stand-in steel flash at the chest (smaller), with a soft steel halo behind it, glints thrown off the
 * body and a steel ring running out along the ground from the feet.
 */
const IRON_DEFENSE: SkillVisual = {
  enhanced: {
    impact: seq(
      // Shiny01's bars run to its border, so at the stand-in's 1.4 they read as a cut-off cross; 0.9 keeps them short.
      flash(TEX.shiny, RGBS.steel, 0.9, 0.5),
      sprite({ texture: TEX.flare, colour: [0.5, 0.53, 0.65], size: 2, seconds: 0.7, growFrom: 0.5, grow: 1.2, fadeTail: 0.6 }),
      particles({ recipe: STEEL_GLINTS, count: 22 }),
      ring({ texture: TEX.shockwave, colour: [0.8, 0.84, 1], scale: 0.8, grow: 4, seconds: 0.6, fadeTail: 0.6 })
    ),
  },
};

// ---- sum2 steps ------------------------------------------------------------------

/**
 * `c->AttackTime >= g_iLimitAttackTime` (15): the Summoner curses land 14 ticks after the reply
 * set AttackTime to 1 (WSclient.cpp:4899, ZzzCharacter.cpp:171, :4724-4754, :5158-5198).
 */
const CURSE_DELAY = ticks(14);

/** Degrees a tick -> radians a second. */
const degPerTick = (d: number): number => (d * 25 * Math.PI) / 180;

/** `step` once the curse lands, with the skill being dispatched now (the landing sound reads it). */
const onCurseLanding = (step: Step): Step => (at, c) => {
  const skill = currentSkill;
  after(CURSE_DELAY, (p, cc) => {
    currentSkill = skill;
    step(p, cc);
  })(at, c);
};

/** A body's point that keeps its last place once the body has gone. */
const holding = (e: Entity, height: number): PointSource => {
  const last = entityPos(e, height, new Vector3());
  return out => (entityGone(e) ? out.copyFrom(last) : last.copyFrom(entityPos(e, height, out)));
};

/**
 * An effect model's `BodyLight`: the terrain light under it plus its `Light`, clamped by the colour
 * write (ZzzObject.cpp:226-232, `LightEnable` from CreateEffect :349). A tinted model reads as lit
 * white with the tint on it, not as the pure tint.
 */
function bodyLight(at: Vector3, tint: RGB): RGB {
  const l = storeRef().world?.getTerrainLight(at.x, at.z);
  const lx = l?.x ?? 1;
  const ly = l?.y ?? 1;
  const lz = l?.z ?? 1;
  return [Math.min(1, lx + tint[0]), Math.min(1, ly + tint[1]), Math.min(1, lz + tint[2])];
}

/** Hand FX tints, the three `vLight` blocks of the PLAYER_SKILL_SLEEP hand code (ZzzCharacter.cpp:10591-10740). */
interface CurseHand {
  shiny: RGB;
  pin: RGB;
  puff: RGB;
  /** Blind: every layer drawn with EnableAlphaBlendMinus (sprite SubType 1, LIGHT+2 sub4, CLUD64 sub5). */
  dark: boolean;
}

/** The hand bone the curse FX ride: "Bip01 L Hand". */
const CURSE_HAND_BONE = 37;
/** Longest the hand FX run if the clip never ends (a body out of view keeps its action). */
const CURSE_HAND_MAX = 3;

/** CLUD64 sub3/5 dies once `Light[0]` falls under 0.05 at x 1/1.1 a tick (ZzzEffectParticle.cpp:5120-5150). */
const cludTicks = (red: number): number => Math.max(1, Math.ceil(Math.log(red / 0.05) / Math.log(1.1)));

const curseHandRecipes = new Map<string, { cra: ParticleRecipe; clud: ParticleRecipe; smoke: ParticleRecipe }>();

/**
 * The per-tick hand particles: BITMAP_LIGHT+2 sub0/4 (cra_04, LT 16, Scale 1.48..1.79, held at full
 * light) and BITMAP_CLUD64 sub3/5 (clud64 or smoke01, Scale 0.6..0.69 growing 0.08 a tick, 20 cm under
 * the hand +-10, light x 1/1.1 a tick) (ZzzEffectParticle.cpp:816-823, :851-856, :975-1009, :5120-5150).
 */
function curseHandRecipesFor(h: CurseHand): { cra: ParticleRecipe; clud: ParticleRecipe; smoke: ParticleRecipe } {
  const key = `${h.puff.join(',')}|${h.dark}`;
  let r = curseHandRecipes.get(key);
  if (r) return r;
  const n = cludTicks(h.puff[0]);
  const blend = h.dark ? 'dark' : 'add';
  const size = (64 * 0.645) / 100;
  const puff = (texture: string): ParticleRecipe => ({
    texture,
    colour: h.puff,
    size,
    sizeJitter: 0.07,
    life: ticks(n),
    lifeJitter: 0,
    box: [0.1, 0, 0.1],
    power: 0,
    endScale: (0.645 + 0.08 * n) / 0.645,
    fade: [0, 0.25, 0.5, 0.75, 1].map(p => [p, 1.1 ** (-p * n)] as const),
    blend,
    capacity: 96,
  });
  r = {
    cra: {
      texture: TEX.cra04,
      colour: h.puff,
      size: (64 * 1.635) / 100,
      sizeJitter: 0.095,
      life: ticks(16),
      lifeJitter: 0,
      box: [0.001, 0.001, 0.001],
      power: 0,
      fade: [
        [0, 1],
        [0.97, 1],
        [1, 0],
      ],
      blend,
      capacity: 64,
    },
    clud: puff(TEX.clud),
    smoke: puff(TEX.smoke),
  };
  curseHandRecipes.set(key, r);
  return r;
}

const CURSE_HAND_SLEEP: CurseHand = { shiny: [0.5, 0.2, 0.8], pin: [0.7, 0, 0.8], puff: [0.6, 0.1, 0.8], dark: false };
const CURSE_HAND_BLIND: CurseHand = { shiny: [1, 1, 1], pin: [1, 1, 1], puff: [1, 1, 1], dark: true };
/** Weakness: the pin and puff branches test THORNS twice, so they keep the shiny's (0.8,0.1,0.1). */
const CURSE_HAND_WEAKNESS: CurseHand = { shiny: [0.8, 0.1, 0.1], pin: [0.8, 0.1, 0.1], puff: [0.8, 0.1, 0.1], dark: false };
/** Enervation: the shiny branch writes `Light`, not `vLight`, so its pair stays white (:10628). */
const CURSE_HAND_ENERVATION: CurseHand = { shiny: [1, 1, 1], pin: [0.25, 1, 0.7], puff: [0.25, 1, 0.7], dark: false };
/** Thorns (0.8, 0.5, 0.2) and Berserker (1, 0.1, 0.2): the one Light on every layer. */
const THORNS: RGB = [0.8, 0.5, 0.2];
const BERSERKER: RGB = [1, 0.1, 0.2];
const CURSE_HAND_THORNS: CurseHand = { shiny: THORNS, pin: THORNS, puff: THORNS, dark: false };
const CURSE_HAND_BERSERKER: CurseHand = { shiny: BERSERKER, pin: BERSERKER, puff: BERSERKER, dark: false };

/**
 * The left-hand FX while a PLAYER_SKILL_SLEEP clip plays (ZzzCharacter.cpp:10591-10740): two shiny05
 * cards (Scale 1.0 / 0.7) turning +-216 deg/s, two pin_lights (16x128, Scale 1.7 / 1.5) at a new roll
 * every frame, and a cra_04 flash and a clud puff every tick. The original keys the colours on the
 * local hero's current skill, so another Summoner's cast shows the wrong colours or none; here they
 * are the caster's own skill's.
 */
const summonerHand = (h: CurseHand): Step => (_at, c) => {
  const caster = c.caster;
  const anim = caster.playerAnimation;
  if (!anim || entityGone(caster)) return;
  const inClip = (): boolean => anim.action >= PlayerAction.PLAYER_SKILL_SLEEP && anim.action <= PlayerAction.PLAYER_SKILL_SLEEP_FENRIR;
  if (!inClip()) return;
  const done = (): boolean => entityGone(caster) || !inClip();
  const hand: PointSource = out => bonePos(caster, CURSE_HAND_BONE, out, CAST_HEIGHT);
  const at = hand(new Vector3());
  const blend = h.dark ? 'subtract' : 'add';
  const card = (texture: string, colour: RGB, scale: number, px: number, extra: Partial<SpriteOptions>): void => {
    effects.spawn('sprite', c.scene, at, { texture, colour, size: (px * scale) / 100, seconds: CURSE_HAND_MAX, follow: hand, until: done, fadeTail: 0, blend, ...extra });
  };
  // fRot = WorldTime * 0.0006 * 360 deg: 216 deg/s.
  card(TEX.shiny5, h.shiny, 1, 64, { spin: 3.77 });
  card(TEX.shiny5, h.shiny, 0.7, 64, { spin: -3.77 });
  card(TEX.pinLights, h.pin, 1.7, 16, { stretch: 8, randomRoll: true });
  card(TEX.pinLights, h.pin, 1.5, 16, { stretch: 8, randomRoll: true });
  const r = curseHandRecipesFor(h);
  effects.spawn('particles', c.scene, at, { recipe: r.cra, rate: 25, seconds: CURSE_HAND_MAX, follow: hand, until: done });
  effects.spawn('particles', c.scene, at, { recipe: r.clud, rate: 12.5, seconds: CURSE_HAND_MAX, follow: hand, until: done, height: -0.2 });
  effects.spawn('particles', c.scene, at, { recipe: r.smoke, rate: 12.5, seconds: CURSE_HAND_MAX, follow: hand, until: done, height: -0.2 });
};

/** The Sleep / Blind colours: the circle's Light, the model tint, then the model's flare01, shiny05 and joint Light. */
interface AliceCurse {
  circle: RGB;
  models: RGB;
  flare: RGB;
  shiny: RGB;
  streak: RGB;
  /** Blind: MAGIC+1 sub12, ALICE sub1 RENDER_DARK, sprite SubType 1, JOINT_HEALING sub16 - all subtractive. */
  dark: boolean;
  /**
   * Who wears the rings: the target (the curses, nothing on a cast at oneself), the target or else the
   * caster (Thorns), or the caster (Berserker, ZzzCharacter.cpp:4716-4723).
   */
  on?: 'target' | 'targetOrSelf' | 'self';
  /** The graded tiers' light over the rings and the embers rising round the body, in place of the settling motes. */
  grace?: { light: RGB; ember: RGB };
}

const ALICE_SLEEP: AliceCurse = { circle: [0.7, 0.3, 0.8], models: [0.8, 0.3, 0.9], flare: [0.8, 0.1, 0.9], shiny: [0.7, 0.6, 0.9], streak: [0.7, 0.5, 0.7], dark: false };
const ALICE_BLIND: AliceCurse = { circle: [1, 1, 1], models: [1, 1, 1], flare: [1, 1, 1], shiny: [1, 1, 1], streak: [1, 1, 1], dark: true };
/** Thorns: the circle at the caster and everything on the target in (0.8, 0.5, 0.2) (ZzzCharacter.cpp:5158-5206). */
const ALICE_THORNS: AliceCurse = { circle: THORNS, models: THORNS, flare: THORNS, shiny: THORNS, streak: THORNS, dark: false, on: 'targetOrSelf', grace: { light: THORNS, ember: [1, 0.6, 0.25] } };
/**
 * Berserker: everything on the caster. The models take the red Light; subtype 0 hard-codes Sleep's violet
 * accents (MoveHandlers.cpp:2256-2336), so the red rings sit in a violet glow.
 */
const ALICE_BERSERKER: AliceCurse = { ...ALICE_SLEEP, circle: BERSERKER, models: BERSERKER, on: 'self', grace: { light: [0.9, 0.12, 0.6], ember: [1, 0.15, 0.25] } };

/** Berserker.wav again as the rings land (ZzzCharacter.cpp:4716-4723). */
const berserkerWav: Step = (_at, c) => {
  if (!entityGone(c.caster)) playCombat('Sound/Berserker', entityPos(c.caster, 0, new Vector3()));
};

/** The body an ALICE_BUFFSKILL cast lands on, or null when it draws nothing. */
function aliceBody(k: AliceCurse, c: SkillContext): Entity | null {
  if (entityGone(c.caster)) return null;
  const target = c.target && c.target !== c.caster && !entityGone(c.target) ? c.target : null;
  const on = k.on ?? 'target';
  return on === 'self' ? c.caster : on === 'targetOrSelf' ? (target ?? c.caster) : target;
}

/** The accent flares at full Alpha sum to a white ball over the body on the graded buffer. */
const ALICE_FLARE_DIM = 0.6;

/**
 * The rings on the graded tiers: BodyLight clamps near white on any lit field, so every tint drew the same
 * white rings; this keeps them bright but lets the tint through.
 */
function aliceRingTint(body: RGB, tint: RGB): RGB {
  return [Math.min(1, tint[0] * 1.1 + body[0] * 0.15), Math.min(1, tint[1] * 1.1 + body[1] * 0.15), Math.min(1, tint[2] * 1.1 + body[2] * 0.15)];
}

/**
 * Sleep / Blind landing (ZzzCharacter.cpp:5158-5198). At the caster: BITMAP_MAGIC+1 sub11 (sub12 minus
 * for Blind), Magic_Ground2 growing `(20 - LT) * 0.15` to 3 tiles over 20 ticks at the caster's yaw,
 * its Luminosity dropping over the last 5 (ZzzEffect.cpp:9787-9882). On the target, following it one
 * tile up: MODEL_ALICE_BUFFSKILL_EFFECT (LT 34, Scale 0.1 + 0.035 a tick, +8 deg a tick) and ..EFFECT2
 * (LT 35, Scale 0.15, -8 deg), Alpha +0.05 a tick while LT > 20 then -0.05: up to 0.7 / 0.75 and gone
 * by tick 28 / 30 (ZzzEffect.cpp:875-915, MoveHandlers.cpp:2213-2338). Each model draws, every tick,
 * two flare01 at Scale 5 and shiny05 at 2.0 / 1.0 in its colour x Alpha, and starts three
 * JOINT_HEALING sub15/16 homing on it from 200 cm, each stamping Shiny02 on the centre. The original
 * skips all of it when the caster has lost its target (:4811, :4836). Thorns and Berserker draw the same
 * cast on the body `k.on` names; `graded` tints their rings and dims the flares (`aliceRingTint`).
 */
const aliceCurse = (k: AliceCurse, graded = false): Step => (_at, c) => {
  // The original never sends the curses without a selection (castTargets.ts), so a curse on oneself draws nothing.
  const target = aliceBody(k, c);
  if (!target) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const yawDeg = (entityYaw(c.caster) * 180) / Math.PI;
  ring({ texture: TEX.magicGround2, colour: k.circle, seconds: ticks(20), scale: 3, growFrom: 0, grow: 1, spinFrom: -yawDeg, blend: k.dark ? 'subtract' : 'additive', alphaAt: p => fadeOut(p, 0.25) })(feet, c);

  const centre = holding(target, 1);
  const at = centre(new Vector3());
  const gone = (): boolean => entityGone(target);
  const blend = k.dark ? 'subtract' : 'add';
  const tint = k.dark ? k.models : graded ? aliceRingTint(bodyLight(at, k.models), k.models) : bodyLight(at, k.models);
  const dim = graded ? ALICE_FLARE_DIM : 1;
  const bodies = [
    { model: MODEL.elShieldRing, life: 28, scale: 0.1, spin: 1, peak: 0.7 },
    { model: MODEL.elShieldRing2, life: 30, scale: 0.15, spin: -1, peak: 0.75 },
  ];
  for (const b of bodies) {
    const seconds = ticks(b.life);
    // 0.035 a tick over the life, and 8 deg a tick.
    const grow = (b.scale + 0.035 * b.life) / b.scale;
    effects.spawn('model', c.scene, at, { model: b.model, seconds, scale: b.scale, grow, spin: b.spin * degPerTick(8), colour: tint, alpha: b.peak, fadeIn: 0.5, fadeTail: 0.5, follow: centre, until: gone, blend, maxCover: 1 });
    const glow = (texture: string, colour: RGB, scale: number, extra: Partial<SpriteOptions>): void => {
      effects.spawn('sprite', c.scene, at, { texture, colour: scaleRGB(colour, b.peak), size: (64 * scale) / 100, seconds, follow: centre, until: gone, fadeIn: 0.5, fadeTail: 0.5, blend, ...extra });
    };
    glow(TEX.flare, scaleRGB(k.flare, dim), 5, { count: 2 });
    glow(TEX.shiny5, k.shiny, 2, { spin: 3.77 });
    glow(TEX.shiny5, k.shiny, 1, { spin: -3.77 });
  }
  // Both models' joints in one shower: six a tick while the models live.
  effects.spawn('homing', c.scene, at, {
    centre,
    seconds: ticks(29),
    perTick: 6,
    radius: 2,
    accel: cm(4),
    life: 10,
    tails: 2,
    width: cm(5),
    texture: TEX.jointEnergy,
    colour: k.streak,
    decay: 1 / 1.08,
    blend,
    stamp: { texture: TEX.shiny2, w: cm(32), h: cm(64), scale: [0.8, 1.4] },
    until: gone,
  });
};

/** Weakness / Enervation colours: MAGIC_ZIN sub1's Light, the rest of the circles and models, the rain. */
interface ZinCurse {
  wide: RGB;
  core: RGB;
  rain: RGB;
}

const ZIN_WEAKNESS: ZinCurse = { wide: [2, 0.1, 0.1], core: [2, 0.4, 0.3], rain: [1.4, 0.2, 0.2] };
const ZIN_ENERVATION: ZinCurse = { wide: [0.25, 1, 0.7], core: [0.25, 1, 0.7], rain: [0.25, 1, 0.7] };

/** BITMAP_MAGIC_ZIN's Alpha a tick (MoveHandlers.cpp:1486-1512): sub1 climbs 0.06 to 0.72 and falls 0.03 from LT 20. */
const zinWideAlpha = (p: number): number => {
  const n = p * 40;
  return n < 20 ? Math.min(0.72, 0.06 * n) : 0.72 - 0.03 * (n - 20);
};

/**
 * Weakness / Enervation, at the caster's feet (ZzzCharacter.cpp:4724-4754): BITMAP_MAGIC_ZIN sub1
 * (7 tiles, LT 40, `Light x Alpha / 2.5`), sub0 (2 tiles, LT 50, `Light x Alpha x 2`, fading from LT
 * 20) and three sub2 ripples from 1.0 / 0.2 / 0.1 tiles growing 0.1 a tick to 3.5 (LT 30); none of
 * them turns (`HeadAngle[1]`, ZzzEffect.cpp:9960-9977). MODEL_SUMMONER_CASTING_EFFECT2 / 22 / 222 at
 * Scale 0.6 (the `if (o->SubType = 0)` typo keeps the passed scale), BlendMeshLight 0 -> 0.5 over 10
 * ticks, falling 0.03 a tick from LT 20, turning +3 / -3 / +3 deg a tick (ZzzEffect.cpp:759-773,
 * MoveHandlers.cpp:1133-1165). The rain: BITMAP_SHINY+6 makes a shiny05 particle a tick for 24 ticks
 * and BITMAP_PIN_LIGHT a pin_lights one every other tick for 40, anywhere within 2.5 tiles and 0.5-1.5
 * up (ZzzEffect.cpp:6790-6797, MoveHandlers.cpp:1519-1532). The sound plays now, not at the cast.
 */
const zinCurse = (k: ZinCurse): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  playLandingSound(currentSkill, feet);
  ring({ texture: TEX.magicZin, colour: scaleRGB(k.wide, 1 / 2.5), seconds: ticks(40), scale: 7, alphaAt: zinWideAlpha })(feet, c);
  ring({ texture: TEX.magicZin, colour: scaleRGB(k.core, 2), seconds: ticks(50), scale: 2, alphaAt: p => Math.min(1, (1 - p) * 2.5) })(feet, c);
  for (const s of [1, 0.2, 0.1]) {
    ring({ texture: TEX.magicZin, colour: k.core, seconds: ticks(30), scale: s, grow: (s + 0.1 * 30) / s, cap: 3.5, alphaAt: p => Math.min(1, (1 - p) * 1.5) })(feet, c);
  }
  const lit = bodyLight(feet, k.core);
  [MODEL.suhwanzin2, MODEL.suhwanzin22, MODEL.suhwanzin222].forEach((m, i) => {
    effects.spawn('model', c.scene, feet, { model: m, seconds: ticks(37), scale: 0.6, colour: lit, alpha: 0.5, fadeIn: 10 / 37, fadeTail: 17 / 37, spin: (i % 2 ? -1 : 1) * degPerTick(3) });
  });
  const origin = feet.clone();
  const drop = (): Vector3 => new Vector3(origin.x + (Math.random() - 0.5) * 5, origin.y + 1.5 - Math.random(), origin.z + (Math.random() - 0.5) * 5);
  // SHINY+6 particle: LT 30, Scale 0.5 + 0/0.1/0.2 shrinking 0.02 a tick, falling 1.3 cm and turning 5 deg a tick, drawn as shiny05 and again as flare01.
  repeat(24, TICK, (_p, cc) => {
    const p = drop();
    const scale = 0.5 + Math.floor(Math.random() * 3) * 0.1;
    for (const texture of [TEX.shiny5, TEX.flare]) {
      effects.spawn('sprite', cc.scene, p, { texture, colour: k.rain, size: (64 * scale) / 100, scaleRate: -perTick(64 * 0.02), rise: -perTick(1.3), spin: degPerTick(5), seconds: ticks(30), fadeTail: 0 });
    }
  })(feet, c);
  // PIN_LIGHT particle: LT 30, Scale 1.0 + 0..0.4 shrinking 0.02 a tick, falling 10 cm a tick.
  repeat(40, TICK, (_p, cc) => {
    if (Math.random() < 0.5) return;
    const scale = 1 + Math.floor(Math.random() * 5) * 0.1;
    effects.spawn('sprite', cc.scene, drop(), { texture: TEX.pinLights, colour: k.rain, size: (16 * scale) / 100, stretch: 8, scaleRate: -perTick(16 * 0.02), rise: -perTick(10), seconds: ticks(30), fadeTail: 0 });
  })(feet, c);
};

// Enhanced and Ultra: the same curses with a light that follows their art, ground contact and a
// little secondary motion. Classic draws none of this.

/** An `effectLight` at `at`, riding `follow` when given. */
function curseLight(scene: Scene, colour: RGB, extent: number, seconds: number, at: Vector3, follow?: PointSource, extra?: Partial<LightRecipe>): LightSource {
  const position = { x: at.x, y: at.y, z: at.z };
  const scratch = at.clone();
  const ride = follow
    ? (out: { x: number; y: number; z: number }): void => {
        follow(scratch);
        out.x = scratch.x;
        out.y = scratch.y;
        out.z = scratch.z;
      }
    : undefined;
  return lighting.flash(scene, effectLight(colour, extent, seconds, extra), { position, follow: ride });
}

/** The hand light: the pins' tint, as long as the hand FX run (Blind's hand is dark and has none). */
const curseHandLight = (h: CurseHand): Step => (_at, c) => {
  const caster = c.caster;
  const anim = caster.playerAnimation;
  if (!anim || entityGone(caster)) return;
  const inClip = (): boolean => anim.action >= PlayerAction.PLAYER_SKILL_SLEEP && anim.action <= PlayerAction.PLAYER_SKILL_SLEEP_FENRIR;
  if (!inClip()) return;
  const hand: PointSource = out => bonePos(caster, CURSE_HAND_BONE, out, CAST_HEIGHT);
  let light: LightSource | null = null;
  const ride: PointSource = out => {
    if (light && (entityGone(caster) || !inClip())) light.stop();
    return hand(out);
  };
  light = curseLight(c.scene, h.pin, 0.6, CURSE_HAND_MAX, hand(new Vector3()), ride, { attack: 0.1, release: 0.25, floorGain: 0.15, flicker: { min: 0.8, max: 1, steps: 3 } });
};

const curseDust = new Map<string, ParticleRecipe>();

/** Slow motes settling round a cursed body: Sleep's violet dust, Blind's dark smoke. */
function curseDustFor(colour: RGB, dark: boolean): ParticleRecipe {
  const key = `${colour.join(',')}|${dark}`;
  let r = curseDust.get(key);
  if (r) return r;
  r = dark
    ? { texture: TEX.smoke, colour, size: 0.9, sizeJitter: 0.3, life: 0.9, lifeJitter: 0.3, box: [0.7, 0.5, 0.7], dir1: [-0.3, 0.2, -0.3], dir2: [0.3, 0.6, 0.3], power: 0.3, spin: 1.2, endScale: 1.8, fade: [[0, 0], [0.3, 1], [1, 0]], blend: 'dark', capacity: 64 }
    : { texture: TEX.flare, colour, size: 0.3, sizeJitter: 0.4, life: 1.2, lifeJitter: 0.4, box: [0.9, 0.4, 0.9], dir1: [-0.2, -1, -0.2], dir2: [0.2, -0.3, 0.2], power: 0.35, gravity: -0.15, endScale: 0.3, fade: [[0, 0], [0.2, 1], [0.7, 0.7], [1, 0]], capacity: 96 };
  curseDust.set(key, r);
  return r;
}

/**
 * Sleep / Blind (and Thorns / Berserker) on the graded tiers: the Classic landing plus a glow on the
 * ground under the vortex, a ring pulse where it lands, motes settling on the body (embers rising round
 * it where `k.grace` says), and the light it throws (Blind is subtractive art and stays unlit).
 */
const aliceGrace = (k: AliceCurse): Step => (_at, c) => {
  const target = aliceBody(k, c);
  if (!target) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const ground = holding(target, 0.05);
  const centre = holding(target, 1);
  const gone = (): boolean => entityGone(target);
  const blend = k.dark ? 'subtract' : 'add';
  const at = ground(new Vector3());
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: scaleRGB(k.flare, 0.22), size: 2.4, seconds: ticks(30), fadeIn: 0.3, fadeTail: 0.5, flat: true, follow: ground, until: gone, blend });
  effects.spawn('sprite', c.scene, at, { texture: TEX.ring, colour: scaleRGB(k.circle, 0.8), size: 0.8, grow: 3.2, growFrom: 1, seconds: ticks(12), fadeTail: 0.7, flat: true, follow: ground, blend });
  if (k.grace) effects.spawn('particles', c.scene, at, { recipe: risingEmbersFor(k.grace.ember, 0.9), rate: 25, seconds: ticks(20), follow: ground, until: gone, height: 0.1 });
  else effects.spawn('particles', c.scene, at, { recipe: curseDustFor(k.dark ? [0.6, 0.6, 0.6] : k.flare, k.dark), rate: 26, seconds: ticks(26), follow: centre, until: gone, height: 0.4 });
  if (k.dark) return;
  // The caster's Magic_Ground2 (3 tiles, 20 ticks), unless the rings stand on the caster too, and the vortex's flare pair (3.2 tiles, about 30 ticks).
  if (target !== c.caster) curseLight(c.scene, k.flare, 1.5, ticks(20), feet, undefined, { attack: ticks(4), release: ticks(8), heightOffset: 0.4, floorGain: 0.35 });
  curseLight(c.scene, k.grace?.light ?? k.flare, 1.6, ticks(30), centre(new Vector3()), centre, { attack: ticks(6), release: ticks(12), floorGain: 0.4 });
};

const risingEmbers = new Map<string, ParticleRecipe>();

/** Sparks lifting off the ground within `spread` tiles: off the ZIN circle in the rain's colour, round a buffed body. */
function risingEmbersFor(colour: RGB, spread: number): ParticleRecipe {
  const key = `${colour.join(',')}|${spread}`;
  let r = risingEmbers.get(key);
  if (r) return r;
  r = { texture: TEX.flare, colour: scaleRGB(colour, 1 / Math.max(colour[0], colour[1], colour[2])), size: 0.24, sizeJitter: 0.4, life: 1.0, lifeJitter: 0.4, box: [spread, 0.05, spread], dir1: [-0.15, 1, -0.15], dir2: [0.15, 1, 0.15], power: 1.1, powerJitter: 0.5, gravity: -0.4, endScale: 0.4, fade: [[0, 0], [0.15, 1], [0.6, 0.8], [1, 0]], capacity: 96 };
  risingEmbers.set(key, r);
  return r;
}

/**
 * Weakness / Enervation on the graded tiers: the Classic circles plus a glow pooled in the core circle,
 * sparks lifting off it while the circles are bright, and the light the circles throw, climbing with
 * the sub1 Alpha ramp (12 ticks) and falling with it.
 */
const zinGrace = (k: ZinCurse): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0.05, new Vector3());
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: scaleRGB(k.core, 0.12), size: 2.4, seconds: ticks(40), fadeIn: 0.3, fadeTail: 0.5, flat: true });
  effects.spawn('particles', c.scene, feet, { recipe: risingEmbersFor(k.rain, 1.3), rate: 32, seconds: ticks(32), height: 0.1 });
  curseLight(c.scene, k.core, 2.5, ticks(44), feet, undefined, { attack: ticks(12), release: ticks(20), heightOffset: 0.5, floorGain: 0.35 });
};

// ---- sum1 steps ------------------------------------------------------------------

/**
 * `c->AttackTime >= g_iLimitAttackTime`: Drain Life and Lightning Orb start 14 ticks after the
 * reply set AttackTime to 1 (ZzzCharacter.cpp:4132-4145, :5147-5156, :5213-5223).
 */
const SUM1_DELAY = ticks(14);

/** Degrees -> radians, and back. */
const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;
/** `rand() % (2n) - n` in cm, as tiles. */
const jitterCm = (n: number): number => cm(randInt(2 * n) - n);

/** A card of the cards layer: one original particle or per-frame sprite. */
const spawnCard = (scene: Scene, at: Vector3, o: CardOptions): void => {
  effects.spawn('cards', scene, at, o);
};

/**
 * `fn(tick)` once for each of the next `n` original ticks on the effects clock, catching up after
 * a slow frame (MoveEffect runs once a tick). Returning false ends it, like `o->Live = false`.
 */
function tickLoop(n: number, fn: (tick: number) => boolean | void): void {
  const t0 = fxNow();
  let i = 0;
  const run = (): void => {
    const due = Math.min(n, Math.floor((fxNow() - t0) / TICK + 1e-6) + 1);
    while (i < due) if (fn(i++) === false) return;
    if (i < n) delay(t0 + i * TICK - fxNow(), run);
  };
  run();
}

/** An invisible carrier the original moves once a tick (the orb, a siphon's head), drawn between its last two ticks. */
class TickPoint {
  readonly prev = new Vector3();
  readonly cur = new Vector3();
  #stamp = fxNow();
  constructor(start: Vector3) {
    this.prev.copyFrom(start);
    this.cur.copyFrom(start);
  }
  /** Start a new tick: the point to move. */
  tick(): Vector3 {
    this.prev.copyFrom(this.cur);
    this.#stamp = fxNow();
    return this.cur;
  }
  readonly at: PointSource = out => Vector3.LerpToRef(this.prev, this.cur, Math.min(1, (fxNow() - this.#stamp) / TICK), out);
}

/**
 * `VectorRotate((0, -v, 0), AngleMatrix(a))` for `a` = [pitch, roll, yaw] in degrees: the original's
 * forward step (ZzzMathLib.cpp:185-212). MU x / y are x / z here, and MU forward is -Y.
 */
function muForward(a: readonly number[], v: number, out: Vector3): Vector3 {
  const sr = Math.sin(rad(a[0]));
  const cr = Math.cos(rad(a[0]));
  const sp = Math.sin(rad(a[1]));
  const cp = Math.cos(rad(a[1]));
  const sy = Math.sin(rad(a[2]));
  const cy = Math.cos(rad(a[2]));
  return out.set(-(sr * sp * cy - cr * sy) * v, -(sr * cp) * v, -(sr * sp * sy + cr * cy) * v);
}

/** A local offset turned by a yaw in degrees (`VectorRotate` with `Angle (0, 0, yaw)`), x / y / up in cm, as tiles. */
function muTurn(x: number, y: number, up: number, yaw: number, out: Vector3): Vector3 {
  const s = Math.sin(rad(yaw));
  const c = Math.cos(rad(yaw));
  return out.set(cm(c * x - s * y), cm(up), cm(s * x + c * y));
}

/** TurnAngle2: step `a` toward `to` the short way by at most `d` degrees (ZzzAI.cpp:113). */
function humTurn(a: number, to: number, d: number): number {
  const diff = ((((to - a) % 360) + 540) % 360) - 180;
  return Math.abs(diff) <= d ? a + diff : a + Math.sign(diff) * d;
}

/** MoveHumming (ZzzAI.cpp:135): turn `a` ([pitch, roll, yaw] degrees) at `to` by up to `turn` degrees; the distance. */
function humming(p: Vector3, a: number[], to: Vector3, turn: number): number {
  const dx = to.x - p.x;
  const dy = to.y - p.y;
  const dz = to.z - p.z;
  a[2] = humTurn(a[2], deg(Math.atan2(dx, -dz)), turn);
  a[0] = humTurn(a[0], -deg(Math.atan2(dy, Math.hypot(dx, dz))), turn);
  return Math.hypot(dx, dy, dz);
}

/** A point source as the lighting layer's follow callback. */
const lightFollow = (src: PointSource): ((out: { x: number; y: number; z: number }) => void) => {
  const p = new Vector3();
  return out => {
    src(p);
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  };
};

const groundY = (x: number, z: number): number => storeRef().world?.getTerrainHeight(x, z) ?? 0;

/** The bones a body's skeleton carries (the original's `NumBones`); 0 without one. */
const boneCount = (e: Entity): number => Math.max(0, (e.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1);

/** Sheet widths in px, for `Width = bitmap width x Scale` (ZzzEffectParticle.cpp:8996). */
const PX_FLARE = 64;
const PX_SHINY2 = 32;
const PX_MAGIC = 128;
const PX_PIN = 16;
const PX_SPARK3 = 32;
const PX_SMOKE = 64;
const PX_THUNDER = 64;
const PX_SHINY5 = 64;
const PX_SHOCKWAVE = 128;
const PX_MEGA = 128;
const PX_RED_FLARE = 64;
/** A sprite turning by `fRot = WorldTime * 0.0006 * 360`: 216 degrees a second. */
const SPRITE_TURN = rad(216 * TICK);

/**
 * MODEL_FENRIR_THUNDER sub2 (`wide` false) / sub3 (ZzzEffect.cpp:4337-4381): lightning_type01 at a
 * random orientation, LT 4 at full alpha, with the flare01 halo at Scale 2 in `Light - 0.3` that
 * CreateSprite draws the one frame it is made.
 */
function fenrirThunder(scene: Scene, at: Vector3, colour: RGB, wide: boolean): void {
  const j = wide ? 80 : 20;
  const p = new Vector3(at.x + jitterCm(j), at.y + jitterCm(j), at.z + jitterCm(j));
  const scale = (wide ? 0.5 : 0.1) + randInt(100) * 0.002;
  spawnModel(scene, p, { model: MODEL.lightningType, seconds: ticks(4), scale, colour, yaw: Math.random() * Math.PI * 2, fadeTail: 0.01 }).pitchTo(Math.random() * Math.PI * 2);
  const halo: RGB = [Math.max(0, colour[0] - 0.3), Math.max(0, colour[1] - 0.3), Math.max(0, colour[2] - 0.3)];
  spawnCard(scene, p, { texture: TEX.flare, colour: halo, size: cm(PX_FLARE * 2), ticks: 1 });
}

/**
 * A crackle on a hand while the cast clip plays: per tick two MODEL_FENRIR_THUNDER sub2 on each
 * bone, and a flare01 sprite on it every frame (Scale `flare`, 0 for none). Chain Lightning's
 * hands (ZzzCharacter.cpp:10743-10768), Lightning Orb's forearm (:10574-10590).
 */
const HAND_CRACKLE_MAX = 60;
const handCrackle = (bones: readonly number[], colour: RGB, flare: number, clips: readonly PlayerAction[], light = 0): Step => (_at, c) => {
  const caster = c.caster;
  const playing = (): boolean => !entityGone(caster) && clips.includes(caster.playerAnimation?.action as PlayerAction);
  if (!playing()) return;
  const until = (): boolean => !playing();
  for (const bone of bones) {
    const hand: PointSource = out => bonePos(caster, bone, out, CAST_HEIGHT);
    if (flare > 0) spawnCard(c.scene, hand(new Vector3()), { texture: TEX.flare, colour, size: cm(PX_FLARE * flare), ticks: HAND_CRACKLE_MAX, follow: hand, until });
    // Enhanced rows only: the crackle's light on the hand for as long as it sparks.
    if (light > 0) sum1Light(c.scene, colour, light, ticks(HAND_CRACKLE_MAX), hand, playing, { flicker: CRACKLE_FLICKER, release: ticks(4) });
  }
  const p = new Vector3();
  tickLoop(HAND_CRACKLE_MAX, () => {
    if (!playing()) return false;
    for (const bone of bones) {
      bonePos(caster, bone, p, CAST_HEIGHT);
      fenrirThunder(c.scene, p, colour, false);
      fenrirThunder(c.scene, p, colour, false);
    }
  });
};

/** `step` at AttackTime 15, handed the skill being dispatched now (its sound and light read it). */
const atAttackTime = (step: (at: Vector3, c: SkillContext, skill: number) => void): Step => (at, c) => {
  const skill = currentSkill;
  const p = at.clone();
  delay(SUM1_DELAY, () => step(p, c, skill));
};

// Drain Life (MoveHandlers.cpp:2067-2210).

/** BITMAP_LIGHT+2 sub7's light per tick: full, then `Light *= Alpha` with Alpha 0.9, 0.8, ... from LifeTime 9 (ZzzEffectParticle.cpp:4081-4118). */
const DRAIN_GLOW_LEVELS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.72, 0.504, 0.302, 0.151, 0.06, 0.018, 0.004, 0, 0];
const drainGlowLevel = (age: number): number => {
  const i = Math.min(DRAIN_GLOW_LEVELS.length - 2, Math.floor(age));
  return DRAIN_GLOW_LEVELS[i] + (DRAIN_GLOW_LEVELS[i + 1] - DRAIN_GLOW_LEVELS[i]) * (age - i);
};
/** Its `Light` (1, 0.2, 0.2) brightens by `LifeTime / 8 * 0.02` a tick until the fade starts. */
const DRAIN_GLOW_FROM: RGB = [1, 0.2, 0.2];
const DRAIN_GLOW_TO: RGB = [1.27, 0.47, 0.47];

/** One BITMAP_LIGHT+2 sub7 glow (ZzzEffectParticle.cpp:907-926): flare01, pushed 6 cm a tick out and 2 up, braked x0.6. */
function drainGlow(scene: Scene, body: Entity): void {
  const at = entityPos(body, 0, new Vector3());
  at.x += jitterCm(40);
  at.z += jitterCm(30);
  at.y += cm(80 + randInt(180) - 100);
  const a = Math.random() * Math.PI * 2;
  const push = cm((randInt(2) + 60) * 0.1);
  spawnCard(scene, at, {
    texture: TEX.flare,
    colour: DRAIN_GLOW_FROM,
    colourEnd: DRAIN_GLOW_TO,
    colourTicks: 9,
    size: cm(PX_FLARE * (1.8 + (randInt(4) + 8) * 0.01)),
    grow: cm(PX_FLARE * 0.04),
    ticks: 18,
    brightness: drainGlowLevel,
    velocity: [Math.sin(a) * push, cm(2), Math.cos(a) * push],
    drag: 0.6,
    dragY: 1,
    gravity: cm(0.1),
  });
}

/** 0 (10%), 1 (70%) or 2 (20%) glows a tick (MoveHandlers.cpp:2085-2103). */
const drainGlowCount = (): number => {
  const r = randInt(10);
  return r === 0 ? 0 : r <= 7 ? 1 : 2;
};
/** 0 (10%), 1 (30%), 3 (50%, the 2 case falls through) or 4 (10%) ghosts a tick (:2126-2150). */
const drainGhostCount = (): number => {
  const r = randInt(10);
  return r === 0 ? 0 : r <= 3 ? 1 : r <= 8 ? 3 : 4;
};

/** The ghost streaks' Light and the siphons' (:2176, :2201). */
const DRAIN_GHOST_LIGHT: RGB = [0.8, 0.1, 0.2];
const DRAIN_SIPHON_LIGHT: RGB = [1, 0, 0.1];
const DRAIN_SIPHON_MAX = 24;

/**
 * One BITMAP_DRAIN_LIFE_GHOST (ZzzEffectJoint.cpp:2670-2699, :6837-6867): from 100 cm behind the
 * caster's bone 18, sideways (+-90) and +-50 on every axis, speeding up 2 cm a tick and homing
 * the target's live xy at a height fixed at birth, turning as many degrees a tick as it moves cm.
 */
function drainGhost(scene: Scene, caster: Entity, target: Entity): Carrier {
  const yaw = deg(entityYaw(caster));
  const start = bonePos(caster, 18, new Vector3(), CAST_HEIGHT);
  // vDir = the matrix's +Y column: behind the caster.
  const ahead = forwardOf(entityYaw(caster));
  start.x += -ahead.x + cm(randInt(10) * 5);
  start.z += -ahead.z + cm(randInt(10) * 5);
  start.y += cm(randInt(10) * 5);
  const aimY = entityPos(target, 0, new Vector3()).y + cm(100 + (randInt(10) - 5) * 4);
  const a = [randInt(100) - 50, randInt(100) - 50, yaw + (Math.random() < 0.5 ? 90 : -90) + randInt(100) - 50];
  let v = 1 + randInt(10) * 0.2;
  const lt = 30 + randInt(20) - 10;
  const head = new TickPoint(start);
  const aim = new Vector3();
  const step = new Vector3();
  let done = false;
  effects.spawn('joint', scene, start, {
    head: head.at,
    seconds: ticks(lt),
    maxTails: 20 + randInt(10) - 5,
    width: cm(40 + randInt(60) - 30),
    colour: DRAIN_GHOST_LIGHT,
    texture: TEX.drainGhost,
    fadeTail: 10 / lt,
    until: () => done,
  });
  tickLoop(lt, () => {
    if (entityGone(target)) {
      done = true;
      return false;
    }
    const p = head.tick();
    p.addInPlace(muForward(a, cm(v), step));
    entityPos(target, 0, aim).y = aimY;
    humming(p, a, aim, v);
    v += 2;
  });
  const end = fxNow() + ticks(lt);
  return { at: head.at, done: () => done || fxNow() >= end };
}

/**
 * One BITMAP_JOINT_ENERGY sub45 siphon off a target bone (ZzzEffectJoint.cpp:213-247, :3235-3414):
 * a rising helix for 20 ticks (3 cm on, 10 degrees round, 6 cm up a tick), then homing the
 * caster 120 cm up at up to 30 cm a tick; flareRed at its head. Within 35 cm it is gone, into
 * pEnergy and the arrival light.
 */
function drainSiphon(scene: Scene, caster: Entity, target: Entity, bone: number, skill: number, arrive: (at: Vector3) => void, enh = false): Carrier {
  const start = bonePos(target, bone, new Vector3());
  const head = new TickPoint(start);
  const a = [0, 0, deg(entityYaw(target))];
  const aim = new Vector3();
  const step = new Vector3();
  let v = 3;
  let done = false;
  const until = (): boolean => done;
  effects.spawn('joint', scene, start, { head: head.at, seconds: ticks(120), maxTails: 8, width: cm(10), colour: DRAIN_SIPHON_LIGHT, texture: TEX.jointLaser, fadeTail: 0.01, until });
  spawnCard(scene, start, { texture: TEX.redFlare, colour: RGBS.white, size: cm(PX_RED_FLARE * 0.3), ticks: 120, follow: head.at, until });
  // Enhanced: a soft red halo round the head instead of a light on every siphon (the cast carries one for the bundle).
  if (enh) spawnCard(scene, start, { texture: TEX.flare, colour: DRAIN_HEAD_HALO, size: cm(PX_FLARE * 0.9), ticks: 120, follow: head.at, until });
  const light = enh ? null : lighting.skillTrail(scene, skill, lightFollow(head.at));
  tickLoop(120, i => {
    if (entityGone(caster)) done = true;
    if (done) {
      light?.stop();
      return false;
    }
    const p = head.tick();
    p.addInPlace(muForward(a, cm(v), step));
    if (120 - i > 100) {
      a[2] += 10;
      p.y += cm(6);
      return;
    }
    v = Math.min(30, v + 5);
    const was = a[2];
    const dist = humming(p, a, entityPos(caster, cm(120), aim), v);
    if (dist <= cm(35)) {
      done = true;
      light?.stop();
      arrive(p);
      return false;
    }
    if (dist <= cm(70) && Math.abs(was - a[2]) > 20 && v >= 20) v -= 10;
  });
  delay(ticks(120), () => light?.stop());
  return { at: head.at, done: until };
}

/**
 * Drain Life at AttackTime 15: the invisible MODEL_ALICE_DRAIN_LIFE (LT 70) on the caster
 * (ZzzEffect.cpp:867-874) - red glows round the caster for its life and round the target from
 * tick 10, ghost streaks for the first 5 ticks, and at LifeTime 64 a siphon off every other
 * target bone.
 */
const drainLifeStep = (enh: boolean): Step => atAttackTime((_at, c, skill) => {
  const { caster, target, scene } = c;
  if (!target || entityGone(caster) || entityGone(target)) return;
  playLandingSound(skill, entityPos(caster, 0, new Vector3()));
  let lastArrival = -1;
  const arrive = (p: Vector3): void => {
    // One pEnergy and one arrival light a tick: the original replays the same buffer per siphon.
    const now = Math.floor(fxNow() / TICK);
    if (now === lastArrival) return;
    lastArrival = now;
    playCombat('Sound/pEnergy', p);
    lighting.skillLand(scene, skill, p);
    if (enh) drainArrival(scene, caster);
  };
  if (enh) drainAuras(scene, caster, target);
  let ghostLit = !enh;
  tickLoop(70, i => {
    if (entityGone(caster) || entityGone(target)) return;
    const lt = 70 - i;
    const n = drainGlowCount();
    for (let k = 0; k < n; k++) drainGlow(scene, caster);
    if (lt <= 60) for (let k = 0; k < n; k++) drainGlow(scene, target);
    if (lt >= 66) {
      for (let k = drainGhostCount(); k > 0; k--) {
        const ghost = drainGhost(scene, caster, target);
        if (!ghostLit) {
          ghostLit = true;
          carrierLight(scene, DRAIN_GHOST_LIGHT, 0.8, ticks(40), ghost);
        }
      }
    }
    if (enh && lt < 64 && lt >= 34) drainMote(scene, target);
    if (lt === 64) {
      // Capped at DRAIN_SIPHON_MAX ribbons: a many-boned body would otherwise put 40+ lines up.
      const bones = boneCount(target);
      for (let b = 0, n = 0; b < bones && n < DRAIN_SIPHON_MAX; b++) {
        if (Math.random() >= 0.5) continue;
        const siphon = drainSiphon(scene, caster, target, b, skill, arrive, enh);
        if (enh && n === 0) carrierLight(scene, DRAIN_SIPHON_LIGHT, 0.8, ticks(120), siphon);
        n++;
      }
    }
  });
});
const drainLife = drainLifeStep(false);

// Chain Lightning (MoveHandlers.cpp:1978-2064, WSclient.cpp:5577-5629).

/** The hops' JOINT_THUNDER Light (0.4, 0.4, 1.0); hops 1-2 pass an unset vLight and are drawn in the same blue. */
const CHAIN_LIGHT: RGB = [0.4, 0.4, 1];
/** MODEL_CHAIN_LIGHTNING LT 20 (ZzzEffect.cpp:852-865). */
const CHAIN_TICKS = 20;
/** JOINT_THUNDER: MaxTails 50 steps of Velocity 50 cm, LT 2 (ZzzEffectJoint.cpp:1100-1110). */
const THUNDER_STEPS = 50;
const THUNDER_STEP = cm(50);

/**
 * A JOINT_THUNDER walk (ZzzEffectJoint.cpp:4767-5020): from `from`, each 50 cm step MoveHumming
 * turns the heading up to 50 degrees at the target and a fresh deviation (`deviate()` degrees on
 * pitch and yaw) bends that step alone; it ends within 1.5 steps of the target. The points the
 * walk does not use are laid along its last step. `end` gets where it stopped.
 */
function thunderPath(start: () => readonly [number, number], deviate: () => number, end?: (p: Vector3) => void): NonNullable<JointOptions['path']> {
  const a = [0, 0, 0];
  const p = new Vector3();
  const step = new Vector3();
  const d = [0, 0, 0];
  return (from, to, out, segments) => {
    const [pitch, yaw] = start();
    a[0] = pitch;
    a[1] = 0;
    a[2] = yaw;
    p.copyFrom(from);
    let k = 0;
    for (let j = 0; j < THUNDER_STEPS && k <= segments; j++) {
      const dist = humming(p, a, to, 50);
      out[k * 3] = p.x;
      out[k * 3 + 1] = p.y;
      out[k * 3 + 2] = p.z;
      k++;
      if (dist < THUNDER_STEP * 1.5) break;
      d[0] = a[0] + deviate();
      d[2] = a[2] + deviate();
      p.addInPlace(muForward(d, THUNDER_STEP, step));
    }
    end?.(p);
    if (k < 2) {
      // Born on the target: a straight stub.
      out[0] = from.x;
      out[1] = from.y;
      out[2] = from.z;
      out[3] = to.x;
      out[4] = to.y;
      out[5] = to.z;
      k = 2;
    }
    const b = (k - 2) * 3;
    const e = (k - 1) * 3;
    const n = segments + 1 - (k - 1);
    const ex = out[e];
    const ey = out[e + 1];
    const ez = out[e + 2];
    const bx = out[b];
    const by = out[b + 1];
    const bz = out[b + 2];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      const o = b + 3 + i * 3;
      out[o] = bx + (ex - bx) * t;
      out[o + 1] = by + (ey - by) * t;
      out[o + 2] = bz + (ez - bz) * t;
    }
  };
}

/** `(rand() % 1024 - 512) / Scale` degrees. */
const thunderDeviation = (widthCm: number) => (): number => (randInt(1024) - 512) / widthCm;

/**
 * What a width-50 JOINT_THUNDER leaves where it ends, each of its two ticks (:4981-5003): a
 * Thunder01 chip (BITMAP_ENERGY, LT 2, turning 20 degrees a tick), a white smoke puff one tick in
 * eight, and in the first half of each second one in sixteen a small sub28 fork into the target.
 */
function thunderEnd(scene: Scene, target: PointSource, at: Vector3): void {
  spawnCard(scene, at, { texture: TEX.thunder, colour: CHAIN_LIGHT, size: cm(PX_THUNDER * (randInt(8) + 6) * 0.1), ticks: 2, roll: Math.random() * Math.PI * 2, spin: rad(20) });
  if (randInt(8) === 0) {
    // BITMAP_SMOKE sub0: LT 16, Light = LifeTime / 8 white, rising +0.2 cm a tick faster, Scale +0.05.
    spawnCard(scene, at, { texture: TEX.smoke, colour: RGBS.white, size: cm(PX_SMOKE * (randInt(32) + 48) * 0.01), grow: cm(PX_SMOKE * 0.05), ticks: 16, brightness: age => Math.min(1, (16 - age) / 8), gravity: -cm(0.2), roll: Math.random() * Math.PI * 2 });
  }
  if (fxNow() % 1 < 0.5 && randInt(16) === 0) {
    const t = target(new Vector3());
    const from = new Vector3(t.x + jitterCm(50), t.y + jitterCm(60), t.z + jitterCm(50));
    effects.spawn('joint', scene, from, {
      to: target,
      colour: CHAIN_LIGHT,
      seconds: ticks(2),
      width: cm(6 + randInt(8)),
      segments: THUNDER_STEPS,
      path: thunderPath(() => [0, randInt(360)], () => randInt(256) - 128),
      reroll: 1,
      steady: true,
      fadeTail: 0.01,
      texture: TEX.jointThunder,
      textureScroll: 1,
    });
  }
}

/**
 * One Chain Lightning hop, MODEL_CHAIN_LIGHTNING sub `hop` (MoveHandlers.cpp:1978-2064): for 20
 * ticks a new pair of JOINT_THUNDER (Scale 50 and 10) every tick on each arc - hop 0 four arcs
 * off the two hands, pitched 60 up and turned 60 aside; hops 1-2 one arc from body to body, 80
 * cm up. Each joint lives 2 ticks, so two walks overlap on every arc. At LifeTime 15 each bone of
 * the target flares blue. Only subtypes 0-2 exist.
 */
export function playChainLightningHop(scene: Scene, skill: number, from: Entity, to: Entity, hop: number): void {
  if (hop > 2 || from === to || !from.transform || !to.transform) return;
  let done = false;
  const dead = (): boolean => done || entityGone(from) || entityGone(to) || !!to.dying;
  const aim = followEntity(to, cm(80));
  const arc = (source: PointSource, start: () => readonly [number, number]): void => {
    for (const width of [50, 10]) {
      for (const gen of [0, 1]) {
        const end = width === 50 ? (p: Vector3) => thunderEnd(scene, aim, p) : undefined;
        const bolt = (): void => {
          if (dead()) return;
          effects.spawn('joint', scene, source(new Vector3()), {
            from: source,
            to: aim,
            colour: CHAIN_LIGHT,
            seconds: ticks(CHAIN_TICKS),
            width: cm(width),
            segments: THUNDER_STEPS,
            path: thunderPath(start, thunderDeviation(width), end),
            reroll: ticks(2),
            steady: true,
            fadeTail: 0.01,
            texture: TEX.jointThunder,
            textureScroll: 1,
            until: dead,
          });
        };
        if (gen === 0) bolt();
        else delay(TICK, bolt);
      }
    }
  };
  if (hop === 0) {
    const yaw = (): number => deg(entityYaw(from));
    for (const [bone, side] of [[37, 60], [28, -60]] as const) {
      const hand: PointSource = out => bonePos(from, bone, out, CAST_HEIGHT);
      arc(hand, () => [-60, yaw()]);
      arc(hand, () => [0, yaw() + side]);
    }
  } else {
    arc(followEntity(from, cm(80)), () => [0, deg(entityYaw(to))]);
  }
  delay(ticks(CHAIN_TICKS + 1), () => (done = true));
  // `(int)LifeTime == 15`: BITMAP_LIGHT sub5 on every target bone, x0.9 light and x0.95 size a tick (ZzzEffectParticle.cpp:8041);
  // dropped once under 5% light instead of drawn unseen for the rest of its 50 ticks.
  const enh = tierIndex() >= ENHANCED_TIER;
  delay(ticks(5), () => {
    if (dead()) return;
    const bones = boneCount(to);
    const p = new Vector3();
    for (let b = 0; b < bones; b++) {
      spawnCard(scene, bonePos(to, b, p), { texture: TEX.flare, colour: [0.2, 0.2, 0.8], size: cm(PX_FLARE * (3 + (randInt(20) - 10) * 0.1)), ticks: 50, decay: 0.9, growMul: 0.95, minLight: 0.05 });
    }
    if (enh) chainStrike(scene, to, CHAIN_TICKS - 5);
  });
  // The width-50 walks light the ground under them every step: lights spaced along the hop.
  const a = entityPos(from, IMPACT_HEIGHT, new Vector3());
  const b = entityPos(to, IMPACT_HEIGHT, new Vector3());
  const n = Math.max(1, Math.round(Vector3.Distance(a, b) / 2));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const at: PointSource = out => {
      entityPos(from, IMPACT_HEIGHT, a);
      entityPos(to, IMPACT_HEIGHT, b);
      return Vector3.LerpToRef(a, b, t, out);
    };
    lighting.skillLand(scene, skill, at(new Vector3()), lightFollow(at));
  }
}

/** Chain Lightning's hands on the ground clip only (ZzzCharacter.cpp:10743-10768), Light (0.4, 0.4, 0.8). */
const chainHands = handCrackle([37, 28], [0.4, 0.4, 0.8], 1.5, [PlayerAction.PLAYER_SKILL_CHAIN_LIGHTNING]);
const chainHandsLit = handCrackle([37, 28], [0.4, 0.4, 0.8], 1.5, [PlayerAction.PLAYER_SKILL_CHAIN_LIGHTNING], 0.7);

/** The chain wav again at AttackTime 15 (ZzzCharacter.cpp:5207-5212); the reply played it once already. */
const chainSoundAgain = atAttackTime((_at, c, skill) => {
  if (!entityGone(c.caster)) playCombat(SKILL_SOUNDS[skill] ?? null, entityPos(c.caster, 0, new Vector3()));
});

// Lightning Orb (ZzzEffect.cpp:6886-6965).

const ORB_CLIPS = [
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_UNI,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_DINO,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_FENRIR,
] as const;

/** Lightning Orb's forearm, bone 27, Light (0.2, 0.2, 1.0), on all four clips (ZzzCharacter.cpp:10574-10590). */
const orbArm = handCrackle([27], [0.2, 0.2, 1], 0, ORB_CLIPS);
const orbArmLit = handCrackle([27], [0.2, 0.2, 1], 0, ORB_CLIPS, 0.7);

/** BITMAP_MAGIC sub0 (ZzzEffectParticle.cpp:756-763, :4987-4995): Magic_Ground1, LT 10, Scale -0.05 and Light -0.01 a tick. */
function magicParticle(scene: Scene, at: Vector3, colour: RGB, scale: number): void {
  spawnCard(scene, at, { texture: TEX.magicGround, colour, size: cm(PX_MAGIC * scale), grow: -cm(PX_MAGIC * 0.05), ticks: 10, brightness: age => 1 - 0.01 * age });
}

/** The sprites the orb and the falling shock draw at their position every frame: two Shiny02, two Magic_Ground1, two pin_lights. */
function carrierSprites(scene: Scene, at: PointSource, until: () => boolean, life: number, scale: number, shiny: RGB, magic: RGB, pin: RGB): void {
  const p = at(new Vector3());
  const roll = rad(fxNow() * 216);
  for (const [s, dir] of [[4, 1], [3, -1]] as const) spawnCard(scene, p, { texture: TEX.shiny2, colour: shiny, size: cm(PX_SHINY2 * s * scale), aspect: 2, ticks: life, follow: at, until, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (const [s, dir] of [[1, 1], [0.5, -1]] as const) spawnCard(scene, p, { texture: TEX.magicGround, colour: magic, size: cm(PX_MAGIC * s * scale), ticks: life, follow: at, until, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (let i = 0; i < 2; i++) spawnCard(scene, p, { texture: TEX.pinLights, colour: pin, size: cm(PX_PIN * 2 * scale), aspect: 8, ticks: life, follow: at, until, rerollEachTick: true });
}

/** SPARK+1 sub13 (ZzzEffectParticle.cpp:2198-2206, :6706-6715): Spark03, LT 30, drifting, light /1.05 and Scale -0.04 a tick. */
function orbSpark(scene: Scene, at: Vector3, yaw: number): void {
  const v = muTurn(randInt(8) - 4, randInt(4), randInt(4), yaw, new Vector3());
  spawnCard(scene, at, { texture: TEX.spark3, colour: RGBS.white, size: cm(PX_SPARK3 * (randInt(5) / 10 + 1)), grow: -cm(PX_SPARK3 * 0.04), ticks: 30, decay: 1 / 1.05, velocity: [v.x, v.y, v.z] });
}

/**
 * SMOKE sub40 / sub58 (ZzzEffectParticle.cpp:1408-1419, :1548-1558, :5560-5566, :5760-5766): smoke01
 * thrown 40-47 cm on a random heading pitched +-45, x0.4 a tick, LT 50, Scale 0.8-1.1 growing 0.05
 * a tick, `Light = colour x LifeTime / 50`.
 */
function throwSmoke(scene: Scene, at: Vector3, colour: RGB): void {
  const v = muForward([randInt(90) - 45, 0, randInt(360)], cm(randInt(8) + 40), new Vector3());
  spawnCard(scene, at, {
    texture: TEX.smoke,
    colour,
    size: cm(PX_SMOKE * (randInt(32) + 80) * 0.01),
    grow: cm(PX_SMOKE * 0.05),
    ticks: 50,
    lifeFade: true,
    offset: [jitterCm(32), cm(randInt(64) + 32), jitterCm(32)],
    velocity: [v.x, v.y, v.z],
    drag: 0.4,
    roll: Math.random() * Math.PI * 2,
  });
}

/**
 * MODEL_LIGHTNING_ORB sub1 where the orb met its target (LT 18, Light /1.08 a tick): shiny05,
 * pin_lights and a Thunder01 star while LifeTime >= 5, bouncing sparks for 4 ticks, shock waves
 * for 5, two wide MODEL_FENRIR_THUNDER every tick and blue smoke in the last 5.
 */
function orbBurst(scene: Scene, p: Vector3, enh = false): void {
  const at = p.clone();
  if (enh) orbBurstGrace(scene, at);
  const roll = rad(fxNow() * 216);
  const decay = 1 / 1.08;
  for (const [s, dir] of [[3, 1], [2, -1]] as const) spawnCard(scene, at, { texture: TEX.shiny5, colour: [0.1, 0.5, 1.5], size: cm(PX_SHINY5 * s), ticks: 14, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (let i = 0; i < 2; i++) spawnCard(scene, at, { texture: TEX.pinLights, colour: [0.3, 0.3, 1], size: cm(PX_PIN * 4), aspect: 8, ticks: 14, decay, rerollEachTick: true });
  spawnCard(scene, at, { texture: TEX.thunder, colour: RGBS.white, size: cm(PX_THUNDER * 4), ticks: 14, decay, roll, spin: SPRITE_TURN });
  tickLoop(18, i => {
    const lt = 18 - i;
    const light = decay ** i;
    if (lt >= 15) {
      for (let k = 0; k < 5; k++) {
        // SPARK+1 sub20 (:2294-2305, :6810-6829): +-5 cm a tick, kicked 7.5-12 cm up and falling, bouncing at 0.3.
        const v = muTurn((randInt(40) - 20) * 0.25, (randInt(40) - 20) * 0.25, (randInt(10) + 15) * 0.5, randInt(360), new Vector3());
        spawnCard(scene, at, { texture: TEX.spark3, colour: RGBS.white, size: cm(PX_SPARK3 * (1 + randInt(10) * 0.02)), ticks: 60 + randInt(10), light, decay: 1 / 1.02, minLight: 0.05, velocity: [v.x, v.y, v.z], gravity: cm(0.75), bounce: [cm(3), 0.3, 2] });
      }
    }
    if (lt >= 14) {
      // BITMAP_SHOCK_WAVE sub0 (:3731-3741, :8694-8710): Scale 0.3 growing 0.8 a tick, LT 7, light /1.5.
      for (let k = 0; k < 2; k++) spawnCard(scene, at, { texture: TEX.shockwave, colour: [0.4, 0.3, 1], size: cm(PX_SHOCKWAVE * 0.3), grow: cm(PX_SHOCKWAVE * 0.8), ticks: 7, decay: 1 / 1.5 });
    }
    for (let k = 0; k < 2; k++) fenrirThunder(scene, at, [0.2, 0.2, 1], true);
    if (lt <= 5) for (let k = 0; k < 2; k++) throwSmoke(scene, at, [0.5, 0.5, 1]);
  });
}

/** The orb's tints; enhanced brings the rings and the trail under 1, where the graded buffer bleached them white. */
const ORB_CLASSIC: Record<'shiny' | 'magic' | 'pin' | 'trail', RGB> = { shiny: [0.1, 0.7, 1.5], magic: [0.1, 0.1, 1.5], pin: [0.5, 0.5, 1.5], trail: [0.4, 0.4, 1.5] };
const ORB_ENHANCED: typeof ORB_CLASSIC = { shiny: [0.1, 0.7, 1.5], magic: [0.1, 0.2, 1], pin: [0.4, 0.45, 1.2], trail: [0.18, 0.24, 1] };

/**
 * MODEL_LIGHTNING_ORB sub0 at AttackTime 15 (ZzzEffect.cpp:837-850): 100 cm up, 60 cm a tick
 * straight along the caster's facing for LT 20, drawing its sprites, a BITMAP_MAGIC and three
 * sparks a tick. Within 100 cm (xy) of the live target it bursts where it is (CheckTargetRange).
 */
const lightningOrbStep = (enh: boolean): Step => atAttackTime((_at, c, skill) => {
  const { caster, target, scene } = c;
  if (entityGone(caster)) return;
  playLandingSound(skill, entityPos(caster, 0, new Vector3()));
  const yaw = deg(entityYaw(caster));
  const orb = new TickPoint(entityPos(caster, cm(100), new Vector3()));
  const step = muForward([0, 0, yaw], cm(60), new Vector3());
  let alive = true;
  const until = (): boolean => !alive;
  const look = enh ? ORB_ENHANCED : ORB_CLASSIC;
  carrierSprites(scene, orb.at, until, 20, 1, look.shiny, look.magic, look.pin);
  if (enh) orbGrace(scene, orb.at, until);
  tickLoop(20, i => {
    const p = orb.tick().addInPlace(step);
    magicParticle(scene, p, look.trail, 1);
    for (let k = 0; k < 3; k++) orbSpark(scene, p, yaw);
    if (enh && i % 2 === 0) fenrirThunder(scene, p, look.magic, false);
    const t = target && !entityGone(target) && !target.dying ? target.transform : undefined;
    if (t) {
      if (Math.hypot(p.x - t.pos.x, p.z - t.pos.z) <= 1) {
        alive = false;
        orbBurst(scene, p, enh);
        return false;
      }
    }
    if (i === 19) alive = false;
  });
});
const lightningOrb = lightningOrbStep(false);

// Lightning Shock (MoveHandlers.cpp:2385-2543).

/** LIGHTNING_MEGA sub0 (ZzzEffectParticle.cpp:1826-1841, :6071-6088): LT 5, `Light = colour x Alpha`, Alpha 1 - 0.15 a tick from before its first frame. */
const megaLevel = (age: number): number => Math.max(0, 0.85 - 0.15 * age);
const MEGA_SHEETS = [TEX.lightningMega1, TEX.lightningMega2, TEX.lightningMega3];
function mega(scene: Scene, at: Vector3, colour: RGB, scale: number): void {
  spawnCard(scene, at, { texture: MEGA_SHEETS[randInt(3)], colour, size: cm(PX_MEGA * scale), ticks: 5, brightness: megaLevel, roll: Math.random() * Math.PI * 2 });
}

/**
 * The shock's ground, sub1 (ZzzEffect.cpp:916-971, MoveHandlers.cpp:2461-2508): two damage01mono
 * decals growing 0.1 -> 5.1 tiles in 10 ticks at the caster's yaw, three plancracks 20 cm up, and
 * for 12 ticks the crackle round the impact and out to 4 m, red smoke thrown and rising.
 */
function shockGround(scene: Scene, p: Vector3, yaw: number, enh = false): void {
  const at = p.clone();
  const ground = groundY(at.x, at.z);
  if (enh) shockGrace(scene, at, ground, yaw);
  for (const colour of [[1, 0.8, 0.5], [1, 0, 0]] as const) {
    effects.spawn('ring', scene, at, { texture: TEX.damageMono, colour, seconds: ticks(10), scale: 5.1, growFrom: 0.1 / 5.1, grow: 1, spinFrom: -yaw, fadeTail: 0.3 });
  }
  // MODEL_KNIGHT_PLANCRACK_A sub1 (ZzzEffect.cpp:4826-4833): Scale 1.0-1.3 + 0-0.45, LT 20, Alpha x0.9 a tick.
  const crack = new Vector3(at.x, ground + cm(20), at.z);
  for (let i = 0; i < 3; i++) {
    effects.spawn('model', scene, crack, { model: MODEL.knightPlanCrack, seconds: ticks(20), scale: randInt(4) * 0.1 + 1 + randInt(10) * 0.05, colour: [1, 0.4, 0.2], yaw: Math.random() * Math.PI * 2, flat: true, fadeTail: 1 });
  }
  const floor = new Vector3(at.x, ground + cm(10), at.z);
  const q = new Vector3();
  tickLoop(12, () => {
    for (let i = 0; i < 11; i++) mega(scene, q.set(at.x + jitterCm(35), at.y + jitterCm(35), at.z + jitterCm(35)), [1, 0.7, 0.4], (randInt(80) + 32) * 0.01);
    for (let i = 0; i < 6; i++) {
      muTurn(0, randInt(400), 0, yaw + randInt(360), q).addInPlace(at);
      q.y = groundY(q.x, q.z) + cm(20);
      mega(scene, q, [1, 0, 0], (randInt(60) + 22) * 0.01);
    }
    for (let i = 0; i < 2; i++) throwSmoke(scene, floor, [1, 0, 0]);
    if (randInt(2) === 0) {
      // SMOKE sub54 (:1528-1535, :5722-5734): LT = Scale x 8, rising (Scale + Gravity) x 1.5 a tick, light /1.02.
      const s = 2.8 + randInt(50) * 0.01;
      const g = (randInt(30) + 50) * 0.05;
      spawnCard(scene, floor, { texture: TEX.smoke, colour: [1, 0, 0], size: cm(PX_SMOKE * s), growMul: 1.01, ticks: Math.floor(2.8 * 8), decay: 1 / 1.02, minLight: 0.05, velocity: [0, cm((s + g) * 1.5), 0], gravity: cm(1.5 * (0.05 - 0.01 * s)), roll: Math.random() * Math.PI * 2 });
    }
  });
}

/**
 * Lightning Shock at once (AttackStage sets AttackTime 15 on the first tick, ZzzCharacter.cpp:3008):
 * MODEL_LIGHTNING_SHOCK sub0 280 cm over the caster, hovering until the clip passes frame 6 (or
 * LifeTime 15), then 20 cm on and 75 cm + an accelerating fall down a tick, crackling red, until
 * it is under the ground and opens it.
 */
const lightningShockStep = (enh: boolean): Step => (_at, c) => {
  const { caster, scene } = c;
  if (entityGone(caster)) return;
  const yaw = deg(entityYaw(caster));
  const shock = new TickPoint(entityPos(caster, cm(280), new Vector3()));
  let fall = 0;
  let gravity = 1;
  let alive = true;
  const until = (): boolean => !alive;
  const dir = new Vector3();
  const q = new Vector3();
  carrierSprites(scene, shock.at, until, 20, 0.8, [1, 0.4, 0.4], [1, 0.2, 0.2], [1, 0.4, 0.4]);
  if (enh) carrierLight(scene, SHOCK_LIGHT, 1, ticks(20), { at: shock.at, done: until }, { attack: ticks(2) });
  tickLoop(20, i => {
    const p = shock.tick();
    if ((caster.modelObject?.actionFrame() ?? 0) > 6 || 20 - i < 15) {
      p.addInPlace(muTurn(0, -20, -75 - fall, yaw, dir));
      gravity += 0.1;
      fall += gravity;
    }
    magicParticle(scene, p, [1, 0.3, 0.3], 0.8);
    for (let k = 0; k < 11; k++) {
      q.set(p.x + jitterCm(35), p.y + jitterCm(35), p.z + jitterCm(35));
      spawnCard(scene, q, { texture: TEX.flare, colour: [1, 0.2, 0.1], size: cm(PX_FLARE * 2.2), ticks: 1 });
      if (randInt(3) === 0) mega(scene, q, [1, 0.7, 0.4], (randInt(80) + 32) * 0.01);
    }
    for (let k = 0; k < 2; k++) {
      bonePos(caster, randInt(41), q);
      q.x += jitterCm(15);
      q.y += jitterCm(15);
      q.z += jitterCm(15);
      mega(scene, q, [1, 0.5, 0.4], (randInt(60) + 22) * 0.01);
    }
    if (p.y < groundY(p.x, p.z)) {
      alive = false;
      shockGround(scene, p, yaw, enh);
      return false;
    }
    if (i === 19) alive = false;
  });
};
const lightningShock = lightningShockStep(false);

// Enhanced and Ultra (the rows' `enhanced`): Drain Life, Chain Lightning, Lightning Orb and Lightning Shock
// with the light their art throws (`effectLight`), contact with the ground and a little secondary detail.
// Classic never gets here.

/** A moving piece of an effect: where it is and whether it is over. */
interface Carrier {
  at: PointSource;
  done: () => boolean;
}

/** A crackle's light: never steady. */
const CRACKLE_FLICKER = { min: 0.55, max: 1, steps: 3 };

/** A `curseLight` riding `follow`, released as soon as `alive` says no (or when its seconds run out). */
function sum1Light(scene: Scene, colour: RGB, extent: number, seconds: number, follow: PointSource, alive?: () => boolean, extra?: Partial<LightRecipe>): LightSource {
  let light: LightSource | null = null;
  const ride: PointSource = out => {
    if (light && alive && !alive()) light.stop();
    return follow(out);
  };
  light = curseLight(scene, colour, extent, seconds, follow(new Vector3()), ride, extra);
  return light;
}

/** A light a moving piece carries. */
const carrierLight = (scene: Scene, colour: RGB, extent: number, seconds: number, piece: Carrier, extra?: Partial<LightRecipe>): LightSource =>
  sum1Light(scene, colour, extent, seconds, piece.at, () => !piece.done(), extra);

/** `src` dropped onto the terrain, a hair above it. */
const onGround = (src: PointSource): PointSource => out => {
  src(out);
  out.y = groundY(out.x, out.z) + 0.04;
  return out;
};

/** A fixed point as a source. */
const heldAt = (p: Vector3): PointSource => out => out.copyFrom(p);

/** Up over `rise` ticks, down over the last `fall` of `n`. */
const swell = (n: number, rise: number, fall: number) => (age: number): number => Math.min(1, age / rise, (n - age) / fall);

/** A soft flare laid flat on the ground: the pool of colour an effect leaves under itself. */
function groundGlow(scene: Scene, at: PointSource, colour: RGB, size: number, n: number, until?: () => boolean): void {
  spawnCard(scene, at(new Vector3()), { texture: TEX.flare, colour, size, ticks: n, flat: true, brightness: swell(n, 4, n * 0.4), follow: at, until });
}

/** `n` Spark03 chips kicked up off `at`, falling and bouncing (SPARK+1 sub20's motion, as the orb's burst). */
function kickSparks(scene: Scene, at: Vector3, colour: RGB, n: number, kick = 1): void {
  const v = new Vector3();
  for (let k = 0; k < n; k++) {
    muTurn((randInt(40) - 20) * 0.25 * kick, (randInt(40) - 20) * 0.25 * kick, (randInt(10) + 15) * 0.5 * kick, randInt(360), v);
    spawnCard(scene, at, { texture: TEX.spark3, colour, size: cm(PX_SPARK3 * (0.8 + randInt(10) * 0.04)), ticks: 30 + randInt(20), decay: 1 / 1.04, minLight: 0.05, velocity: [v.x, v.y, v.z], gravity: cm(0.75), bounce: [cm(3), 0.3, 2] });
  }
}

// Drain Life, enhanced.

/** The siphon head's halo, the glows' red as a light, and the pool it leaves under a body. */
const DRAIN_HEAD_HALO: RGB = [0.55, 0.06, 0.1];
const DRAIN_AURA: RGB = [1, 0.2, 0.25];
const DRAIN_POOL: RGB = [0.22, 0.02, 0.04];

/**
 * The red the glows pool on the ground under both bodies, and the light they throw: round the caster
 * for the effect's 70 ticks, round the target from tick 10 (MoveHandlers.cpp:2085-2103).
 */
function drainAuras(scene: Scene, caster: Entity, target: Entity): void {
  for (const [body, from, n] of [[caster, 0, 70], [target, 10, 60]] as const) {
    delay(ticks(from), () => {
      if (entityGone(body)) return;
      const gone = (): boolean => entityGone(body);
      groundGlow(scene, followEntity(body, 0.04), DRAIN_POOL, 1.8, n, gone);
      sum1Light(scene, DRAIN_AURA, 0.8, ticks(n), followEntity(body, 1), () => !gone(), { attack: ticks(6), release: ticks(12) });
    });
  }
}

/** Life lifting off the target while the siphons rise: a red mote off a random bone, drifting up. */
function drainMote(scene: Scene, target: Entity): void {
  const bones = boneCount(target);
  if (!bones) return;
  const p = bonePos(target, randInt(bones), new Vector3());
  const n = 20 + randInt(10);
  spawnCard(scene, p, { texture: TEX.flare, colour: [1, 0.15, 0.2], size: cm(PX_FLARE * (0.3 + randInt(20) * 0.01)), ticks: n, velocity: [jitterCm(2), cm(3 + randInt(3)), jitterCm(2)], drag: 0.95, brightness: swell(n, 3, n * 0.6) });
}

/** A siphon reaching home: a short red bloom on the caster's chest (the original's arrival is a Scale 0 sprite). */
function drainArrival(scene: Scene, caster: Entity): void {
  const chest = followEntity(caster, cm(120));
  spawnCard(scene, chest(new Vector3()), { texture: TEX.flare, colour: [1, 0.3, 0.4], size: cm(PX_FLARE * 1.2), grow: cm(PX_FLARE * 0.25), ticks: 8, lifeFade: true, follow: chest });
}

// Chain Lightning, enhanced.

/**
 * Where a hop lands, with the bone glows: a blue-white strike on the chest, sparks off it, a shock ring and
 * a pool of blue on the ground, and the hop's light on the body for its remaining `n` ticks.
 */
function chainStrike(scene: Scene, to: Entity, n: number): void {
  const chest = followEntity(to, 1);
  const at = chest(new Vector3());
  const gone = (): boolean => entityGone(to);
  spawnCard(scene, at, { texture: TEX.flare, colour: [0.6, 0.65, 1], size: cm(PX_FLARE * 3), grow: cm(PX_FLARE * 0.3), ticks: 6, lifeFade: true, follow: chest });
  kickSparks(scene, at, [0.7, 0.75, 1], 6);
  const feet = followEntity(to, 0.04);
  spawnCard(scene, feet(new Vector3()), { texture: TEX.shockwave, colour: [0.25, 0.3, 0.9], size: cm(PX_SHOCKWAVE * 0.3), grow: cm(PX_SHOCKWAVE * 0.25), ticks: 8, lifeFade: true, flat: true, follow: feet });
  groundGlow(scene, feet, [0.12, 0.14, 0.5], 1.8, n, gone);
  sum1Light(scene, CHAIN_LIGHT, 1.3, ticks(n), chest, () => !gone(), { flicker: CRACKLE_FLICKER, release: ticks(6) });
}

// Lightning Orb, enhanced.

const ORB_LIGHT: RGB = [0.2, 0.55, 1];

/** The orb in flight: its light and the blue it throws on the ground under it. */
function orbGrace(scene: Scene, orb: PointSource, until: () => boolean): void {
  groundGlow(scene, onGround(orb), [0.05, 0.12, 0.4], 2, 20, until);
  sum1Light(scene, ORB_LIGHT, 1.5, ticks(20), orb, () => !until(), { release: ticks(3) });
}

/** The burst: a blue shock ring and pool on the ground under it, and its flickering light over its 18 ticks. */
function orbBurstGrace(scene: Scene, at: Vector3): void {
  const ground = onGround(heldAt(at))(new Vector3());
  spawnCard(scene, ground, { texture: TEX.shockwave, colour: [0.3, 0.35, 1], size: cm(PX_SHOCKWAVE * 0.4), grow: cm(PX_SHOCKWAVE * 0.35), ticks: 10, lifeFade: true, flat: true });
  groundGlow(scene, heldAt(ground), [0.1, 0.2, 0.6], 3, 18);
  sum1Light(scene, ORB_LIGHT, 2, ticks(18), heldAt(at), undefined, { flicker: CRACKLE_FLICKER, release: ticks(8) });
}

// Lightning Shock, enhanced.

const SHOCK_LIGHT: RGB = [1, 0.3, 0.15];

/**
 * The ground opening: its light and a hot red pool, the five BITMAP_MAGIC sub12 marks 150 cm out and 72
 * degrees apart and the MODEL_STONE sub13 thrown every tick (the original makes both at Scale 0, unseen;
 * ZzzEffect.cpp:936-948, MoveHandlers.cpp:2508), and embers kicked off the impact.
 */
function shockGrace(scene: Scene, at: Vector3, ground: number, yaw: number): void {
  const floor = new Vector3(at.x, ground + 0.04, at.z);
  groundGlow(scene, heldAt(floor), [0.35, 0.07, 0.02], 3.5, 24);
  sum1Light(scene, SHOCK_LIGHT, 2.5, ticks(20), heldAt(new Vector3(floor.x, floor.y + 0.5, floor.z)), undefined, { flicker: CRACKLE_FLICKER, release: ticks(10) });
  const q = new Vector3();
  for (let i = 0; i < 5; i++) {
    muTurn(0, 150, 0, yaw + i * 72, q).addInPlace(floor);
    q.y = groundY(q.x, q.z) + 0.05;
    spawnCard(scene, q, { texture: TEX.magicGround, colour: [0.7, 0.1, 0.02], size: cm(PX_MAGIC * 0.8), ticks: 12, flat: true, brightness: swell(12, 2, 6), roll: Math.random() * Math.PI * 2, spin: SPRITE_TURN });
  }
  kickSparks(scene, new Vector3(at.x, ground + cm(20), at.z), [1, 0.5, 0.2], 12, 1.4);
  tickLoop(12, () => {
    effects.spawn('debris', scene, floor, { model: randInt(2) === 0 ? MODEL.stone : MODEL.stone2, count: 1, colour: [0.55, 0.45, 0.4] });
  });
}

// ---- teleport steps --------------------------------------------------------------

/** The cards cross the ground: fade the last 40 cm above it rather than cut them on a hard line. */
const TELEPORT_GROUND_FADE = cm(40);
/**
 * BITMAP_SPARK+1 sub1 (ZzzEffectParticle.cpp:2121-2128, 6614-6617): Spark03 flung 50 cm a
 * tick any way, Scale 6 (a 192 cm card) losing 2 a tick over its 2-tick life, drawn at the
 * column's `LifeTime * 0.1` (ZzzEffect.cpp:6854-6871). One recipe per pair of ticks; the
 * column's first spark is Scale 12 and stays at the bottom.
 */
const teleportSparks = (size: number, box: readonly [number, number, number], tint: RGB = RGBS.white): readonly ParticleRecipe[] =>
  [0.95, 0.75, 0.55, 0.35, 0.15].map(gain => ({
    texture: TEX.spark3,
    colour: [gain * tint[0], gain * tint[1], gain * tint[2]],
    colourEnd: [gain * tint[0], gain * tint[1], gain * tint[2]],
    size,
    life: ticks(2),
    box,
    dir1: [-1, -1, -1],
    dir2: [1, 1, 1],
    power: perTick(50) * 0.75,
    endScale: 4 / 6,
    capacity: 96,
    groundFade: TELEPORT_GROUND_FADE,
  }));
/** The column above the first spark: every 24 cm from 48 to 432 cm. */
const TELEPORT_COLUMN = teleportSparks(cm(192), [0.02, cm(192), 0.02]);
const TELEPORT_COLUMN_MID = cm(48 + 432) / 2;
const TELEPORT_COLUMN_SPARKS = 17;
const TELEPORT_BASE = teleportSparks(cm(384), [0, 0, 0]);
/**
 * `CreateEffect(BITMAP_SPARK + 1)` (ZzzEffect.cpp:973-976): LT 10, each tick a column of 18
 * white sparks at 24 cm steps up to 432 cm, fading with the effect's life. The Teleport
 * Begin at the old square and the End at the new one (ZzzEffectMagicSkill.cpp:161-179).
 */
const sparkColumn = (base: readonly ParticleRecipe[], column: readonly ParticleRecipe[]): Step => (at, c) => {
  const feet = at.clone();
  for (let i = 0; i < 10; i++) {
    const level = i >> 1;
    const burst = () => {
      effects.spawn('particles', c.scene, feet, { recipe: base[level], count: 1, height: cm(24) });
      effects.spawn('particles', c.scene, feet, { recipe: column[level], count: TELEPORT_COLUMN_SPARKS, height: TELEPORT_COLUMN_MID });
    };
    if (i === 0) burst();
    else delay(i * TICK, burst);
  }
};
const teleportColumn = sparkColumn(TELEPORT_BASE, TELEPORT_COLUMN);

/** Enhanced: the sparks' tint, cyan, above 1 so the column holds its core through the graded tiers' curve. */
const TELEPORT_TINT: RGB = [0.6, 0.85, 1.2];
const teleportColumnTinted = sparkColumn(teleportSparks(cm(384), [0, 0, 0], TELEPORT_TINT), teleportSparks(cm(192), [0.02, cm(192), 0.02], TELEPORT_TINT));
/** Enhanced: light rising off the body while it fades (a dissolve), bounded by the recipe's capacity. */
const TELEPORT_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: TELEPORT_TINT,
  colourEnd: [0, 0, 0],
  size: 0.22,
  sizeJitter: 0.4,
  life: 0.5,
  lifeJitter: 0.3,
  box: [0.28, 0.75, 0.28],
  dir1: [-0.1, 1, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 1.6,
  powerJitter: 0.4,
  gravity: 2,
  endScale: 0.3,
  capacity: 128,
};
/** Per bone and 25 Hz tick, a stable 0..1 roll: the shimmer flickers without allocating. */
const shimmerRoll = (t: number, i: number): number => {
  const x = Math.sin(i * 12.9898 + Math.floor(t * 25) * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/**
 * Enhanced: the body shimmers into light while it fades - a flickering card on every bone,
 * brightest halfway through the fade - with motes rising off it. `begin` ends at the jump or
 * once the body is gone, `end` once it is whole again.
 */
const teleportShimmer = (moment: 'begin' | 'end'): Step => (at, c) => {
  const e = c.caster;
  const model = e.modelObject;
  if (!model) return;
  const x0 = at.x;
  const z0 = at.z;
  const t0 = fxNow();
  const done = (): boolean => {
    if (entityGone(e) || fxNow() - t0 > 1.2) return true;
    if (moment === 'end') return model.Alpha >= 0.98;
    const p = e.transform!.pos;
    return model.Alpha <= 0.02 || Math.abs(p.x - x0) > 0.01 || Math.abs(p.z - z0) > 0.01;
  };
  const bell = (): number => 4 * model.Alpha * (1 - model.Alpha);
  effects.spawn('aura', c.scene, at, {
    follow: out => entityPos(e, 0, out),
    bone: (mu, out) => bonePos(e, mu, out),
    boneCount: () => Math.max(0, (model.gltf?.skeleton?.bones.length ?? 0) - 1),
    until: done,
    ramp: 0.06,
    boneGlow: { bones: 'all', texture: TEX.flare, colour: TELEPORT_TINT, size: 0.5, breathe: (t, i) => (0.35 + 0.65 * shimmerRoll(t, i)) * (0.25 + 0.75 * bell()) },
  });
  effects.spawn('particles', c.scene, at, { recipe: TELEPORT_MOTES, rate: 90, seconds: 1.2, follow: followEntity(e, 0.9), until: done, rateScale: bell });
};
/** Enhanced: a soft glow (PoundingBall falls to black inside its edge) and a thin ring on the ground at the square. */
const teleportGround: Step = seq(
  ring({ texture: TEX.powerWave, colour: [0.3, 0.5, 1], seconds: 0.5, scale: 3.6, growFrom: 0.6, grow: 1.15, fadeTail: 0.8, fadeColour: true }),
  ring({ texture: TEX.shockwave, colour: [0.45, 0.62, 0.8], seconds: 0.45, scale: 3, growFrom: 0.4, grow: 1.6, fadeTail: 0.7, fadeColour: true })
);
/** Enhanced Begin / End: the tinted column, the ground flash and the body's shimmer. */
const teleportEnhanced = (moment: 'begin' | 'end'): Step => seq(teleportColumnTinted, teleportGround, teleportShimmer(moment));

/**
 * The flash of `CreateTeleportBegin` (`moment` begin, the row's `cast`) or
 * `CreateTeleportEnd` (end, the row's `impact`) at the feet of `entity`, as the
 * current tier draws it. The body fade and the sounds are teleportSystem's.
 */
export function playTeleportFlash(scene: Scene, skill: number, entity: Entity, moment: 'begin' | 'end'): void {
  if (!entity.transform) return;
  const row = skillVisualFor(skill);
  const step = moment === 'begin' ? row.cast : row.impact;
  const feet = entityPos(entity, 0, new Vector3());
  step?.(feet, contextFor(scene, entity, null));
  lighting.skillAt(scene, baseSkill(skill), moment === 'begin' ? 'cast' : 'impact', feet);
}

// ---- dk2 steps

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** The original's `Angle` (MU Z-up; pitch, roll, yaw in radians) as a node rotation: `(-a0, -a2, -a1)` (common/renderAngles.ts). */
const muAngles = (out: Vector3, pitch: number, roll: number, yaw: number): Vector3 => out.set(-pitch, -yaw, -roll);
/** `VectorRotate((x, y, 0), AngleMatrix(0, 0, yaw))` in cm, added to `out` in tiles. MU (x, y) is world (x, z). */
const addMuOffset = (out: Vector3, yaw: number, x: number, y: number): Vector3 => {
  out.x += cm(x * Math.cos(yaw) - y * Math.sin(yaw));
  out.z += cm(x * Math.sin(yaw) + y * Math.cos(yaw));
  return out;
};
/** `VectorRotate((0, -1, 0), AngleMatrix(pitch, 0, yaw))`: the way a JOINT_SPARK's `Velocity` carries its head. */
const sparkHeading = (pitch: number, yaw: number): Vector3 =>
  new Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

/** `RequestTerrainLight` at a point, as the grey level the original's BodyLight adds `o->Light` to. */
function terrainLevel(x: number, z: number): number {
  const l = storeRef().world?.getTerrainLight(x, z);
  return l ? 0.2126 * l.x + 0.7152 * l.y + 0.0722 * l.z : 1;
}
/** A `BodyLight x BlendMeshLight` brightness over a tick curve, clamped as the fixed-function colour was. */
const lit = (body: number, blendMeshLight: (tick: number) => number) => (t: number): number =>
  Math.min(1, body * blendMeshLight(t / TICK));

/** Play one of the original's `PlayBuffer`s at the caster. */
const sayAt = (c: SkillContext, key: Sounds): void => {
  const t = c.caster.transform;
  if (t) playCombat(key, { x: t.pos.x, z: t.pos.z });
};

/**
 * `step` once the caster's `action` reaches clip key `key` (`IsAttackImpactFrame`, or Rageful Blow's
 * `AnimationFrame >= 1`), or `maxTicks` after the packet, when `AttackTime` reaches 15 by itself
 * (ZzzCharacter.cpp:3044-3063, :4132-4141). A caster that has left the clip fires at once.
 */
const whenClipKey = (action: PlayerAction, key: number, maxTicks: number, step: Step): Step => (at, c) => {
  const p = at.clone();
  const t0 = fxNow();
  let n = 0;
  // Another character's clip is applied after the packet handler runs: only leaving it after it was seen counts.
  let seen = false;
  const check = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const inClip = !!m && m.CurrentAction === action;
    seen ||= inClip;
    if ((inClip && m!.actionFrame() >= key) || (seen && !inClip) || n >= maxTicks) {
      step(p, c);
      return;
    }
    n++;
    // Due on the tick grid from the packet: chained one-tick delays drift a frame late each.
    delay(t0 + ticks(n) - fxNow(), check);
  };
  check();
};

/** `c->Weapon[0]` - appearance slot 0 (`leftHand`), drawn in the right hand on bone 33 - with the level and tier it is drawn at. */
function wieldedWeapon(e: Entity): { file: string; group: number; num: number; stamp: Record<string, unknown> } | null {
  const part = e.charAppearance?.leftHand;
  if (!part) return null;
  const item = ItemsDatabase.getItem(part.group, part.num);
  if (!item) return null;
  const meta = (e.modelObject as { Weapon1?: { getMeshes(all: boolean): { metadata?: Record<string, unknown> }[] } } | undefined)?.Weapon1?.getMeshes(true)[0]?.metadata;
  return {
    file: item.szModelFolder + item.szModelName,
    group: part.group,
    num: part.num,
    stamp: { itemTier: meta?.itemTier ?? null, itemLvl: meta?.itemLvl ?? 0, isExcellent: meta?.isExcellent ?? false },
  };
}
/** `ItemObjectAttribute`'s scale: 0.8, and 0.7 from MODEL_SPEAR to MODEL_PLATINA_STAFF (spears, bows, staffs; ZzzObject.cpp:5175-5178). */
const itemScale = (w: { group: number; num: number }): number => (w.group === 3 || w.group === 4 || (w.group === 5 && w.num <= 13) ? 0.7 : 0.8);
/** `ItemObjectAttribute` overwrites `o->Light` with 0.3 grey before `RequestTerrainLight` is added to it (ZzzObject.cpp:5157). */
const ITEM_LIGHT: RGB = [0.3, 0.3, 0.3];
/** Player `Weapon[0].LinkBone` (ZzzCharacter.cpp:12067-12071). */
const WEAPON_LINK_BONE = 33;

/**
 * BITMAP_JOINT_SPARK sub0 (ZzzEffectJoint.cpp:950-959): Spark01, white, 6-25 cm a tick along its `Angle`,
 * LT 8-15, two tails. Drawn as a stretched particle rather than a two-point ribbon: a Twisting Slash throws
 * twenty a tick. 2 cm wide and one tick of travel long, 6-25 cm with its speed.
 */
const JOINT_SPARKS: ParticleRecipe = {
  texture: TEX.spark,
  colour: RGBS.white,
  size: 0.02,
  sizeJitter: 0,
  stretch: 12.5,
  stretchBySpeed: true,
  aimed: true,
  life: ticks(15),
  lifeJitter: 7 / 15,
  box: [0.1, 0, 0.1],
  dir1: [0, 0, 0],
  dir2: [0, 0, 0],
  power: perTick(25),
  powerJitter: 19 / 25,
  capacity: 600,
};
/** BITMAP_SPARK sub0 (ZzzEffectParticle.cpp): a Spark02 chip thrown up and falling, 1.6-2.8 cm; 3 cm. */
const SPARK_CHIPS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.03,
  life: 1.2,
  power: 1.5,
  gravity: -4,
  dir1: [-0.6, 0.4, -0.6],
  dir2: [0.6, 1, 0.6],
};
/** One JOINT_SPARK at `at` along `heading`, with a `chip` chance of a Spark02 chip beside it. */
function jointSpark(scene: Scene, at: Vector3, heading: Vector3, chip: number): void {
  effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS, count: 1, heading });
  if (Math.random() < chip) effects.spawn('particles', scene, at, { recipe: SPARK_CHIPS, count: 1 });
}

/**
 * BITMAP_SMOKE sub3 (ZzzEffectParticle.cpp:1250-1255, :5330-5335): LT 10, Scale 0.8-1.1 of the 64-texel
 * smoke01 growing 0.1 a tick, thrown 40-47 cm along a random heading pitched +-45° and slowing x0.4 a tick,
 * Light (0.8, 0.8, 1) x LifeTime / 8.
 */
const WHEEL_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.8, 0.8, 1],
  size: cm(64) * 0.95,
  sizeJitter: 0.15,
  life: ticks(10),
  lifeJitter: 0,
  endScale: 2,
  box: [0, 0, 0],
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 1.7,
  powerJitter: 0.1,
  spin: 0,
};

/**
 * In Hellas the sparks become BITMAP_WATERFALL_5 sub3 spray 120 cm up (MoveHandlers.cpp:2816-2827;
 * ZzzEffectParticle.cpp:3432-3437, :8407-8412): LT 20, 64 texels x 1.6, Light 0.5, 7-11 cm a tick down
 * along the orbit's pitched +-30° heading, turning 4° a tick.
 */
const WHEEL_SPRAY: ParticleRecipe = {
  texture: 'Effect/waterFall5.OZJ',
  colour: [0.5, 0.5, 0.5],
  size: cm(64) * 1.6,
  sizeJitter: 0,
  life: ticks(20),
  lifeJitter: 0,
  endScale: 0.94,
  box: [0.1, 0, 0.1],
  dir1: [-0.5, -1, -0.5],
  dir2: [0.5, -0.85, 0.5],
  power: perTick(9),
  powerJitter: 2 / 9,
  spin: 4 * DEG * 25,
  capacity: 200,
};

/** MODEL_SKILL_WHEEL2's alpha per copy: SubType `4 - LifeTime` of WHEEL1 runs -1..3 (MoveHandlers.cpp:2772-2800). */
const WHEEL_ALPHAS = [1, 1, 0.6, 0.5, 0.4];

/** Graded tiers: the sparks cool from white to orange as they die, a little wider. */
const JOINT_SPARKS_HD: ParticleRecipe = { ...JOINT_SPARKS, colour: [1, 0.92, 0.75], colourEnd: [1, 0.45, 0.12], size: 0.024 };
/** Graded tiers: hot chips that bounce off the blade, one in three sparks. */
const SPARK_CHIPS_HD: ParticleRecipe = { ...SPARK_CHIPS, colour: [1, 0.85, 0.55], colourEnd: [1, 0.35, 0.08], size: 0.04, life: 0.7, power: 2.2, gravity: -7, capacity: 256 };
/**
 * Graded tiers: smoke01 is an additive square that the tone curve lifts to a grey slab over the grass; the
 * same puff as a soft dust cloud with real alpha, kicked low along the ground under each copy.
 */
const WHEEL_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: [0.42, 0.38, 0.33],
  colourEnd: [0.3, 0.27, 0.24],
  size: 0.55,
  sizeJitter: 0.3,
  life: 0.7,
  lifeJitter: 0.3,
  endScale: 2.2,
  box: [0.15, 0, 0.15],
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.5, 1],
  power: 0.9,
  powerJitter: 0.4,
  spin: 1,
  blend: 'alpha',
  capacity: 192,
};
/** Graded tiers: the flare01 glow warmer and smaller, so it no longer blows out the grass under it. */
const WHEEL_GLOW_HD: RGB = [0.85, 0.62, 0.4];
/** Graded tiers: the band each copy sweeps, the blade's reach either side of its orbit, at its height. */
const WHEEL_SWEEP_HALF = 0.45;
const WHEEL_SWEEP: RGB = [0.34, 0.38, 0.48];

/**
 * One MODEL_SKILL_WHEEL2 (MoveHandlers.cpp:2779-2857, RenderWheelWeapon ZzzEffect.cpp:8616-8648): LT 25,
 * 150 cm ahead of the owner (180 with a spear) at an `Angle[2]` that starts at the cast facing and turns
 * -18° a tick; drawn 100 cm up with `Angle[1] = 90` (the blade flat) and an extra yaw of -30° per tick on
 * top. Every tick under it: one smoke, four sparks trailing the turn, a flare01 glow and the grey light.
 */
function wheelCopy(c: SkillContext, skill: number, yaw0: number, radius: number, weapon: ReturnType<typeof wieldedWeapon>, alpha: number, hd: boolean): void {
  const caster = c.caster;
  const t0 = fxNow();
  const age = (): number => (fxNow() - t0) / TICK;
  const orbit = (): number => yaw0 - 18 * DEG * age();
  const ground: PointSource = out => {
    entityPos(caster, 0, out);
    const f = forwardOf(orbit());
    out.x += f.x * radius;
    out.z += f.z * radius;
    return out;
  };
  const seconds = ticks(25);
  const start = ground(new Vector3());
  const hellas = inHellas(storeRef().world?.mapIndex ?? -1);
  if (weapon) {
    effects.spawn('model', c.scene, start, {
      model: weapon.file,
      seconds,
      scale: itemScale(weapon),
      alpha,
      fadeTail: 0,
      native: { light: ITEM_LIGHT, stamp: weapon.stamp, ...itemObjectAttribute(weapon.group, weapon.num) },
      follow: out => {
        ground(out);
        out.y += 1;
        return out;
      },
      rotate: out => muAngles(out, 0, 90 * DEG, orbit() - 30 * DEG * (age() + 1)),
    });
  }
  const glow = hd ? { colour: WHEEL_GLOW_HD, size: cm(64) * 1.5 } : { colour: [1, 0.8, 0.6] as RGB, size: cm(64) * 2 };
  effects.spawn('sprite', c.scene, start, { texture: TEX.flare, ...glow, seconds, fadeTail: 0.05, height: cm(hellas ? 60 : 20), follow: ground });
  if (hd) {
    // Graded tiers: the band the whirling blade sweeps, so the five copies read as one wheel.
    const band = (r: number): PointSource => out => {
      entityPos(caster, 1, out);
      const f = forwardOf(orbit());
      out.x += f.x * r;
      out.z += f.z * r;
      return out;
    };
    const w = alpha * 0.8 + 0.2;
    effects.spawn('blur', c.scene, start, {
      follow: band(radius + WHEEL_SWEEP_HALF),
      base: band(radius - WHEEL_SWEEP_HALF),
      texture: TEX.swordBlur,
      colour: [WHEEL_SWEEP[0] * w, WHEEL_SWEEP[1] * w, WHEEL_SWEEP[2] * w],
      seconds: seconds - ticks(3),
      until: () => entityGone(caster),
    });
  }
  lighting.skillBody(c.scene, skill, 'wheel', out => {
    const t = caster.transform;
    if (!t) return;
    const f = forwardOf(orbit());
    out.x = t.pos.x + f.x * radius;
    out.y = t.pos.y;
    out.z = t.pos.z + f.z * radius;
  });
  const p = new Vector3();
  for (let k = 0; k < 25; k++) {
    delay(ticks(k), () => {
      if (entityGone(caster)) return;
      ground(p);
      if (hd) {
        if (k % 2 === 0) effects.spawn('particles', c.scene, p, { recipe: WHEEL_DUST, count: 1 });
      } else effects.spawn('particles', c.scene, p, { recipe: WHEEL_SMOKE, count: 1 });
      if (hellas) {
        effects.spawn('particles', c.scene, new Vector3(p.x, p.y + cm(120), p.z), { recipe: WHEEL_SPRAY, count: 1 });
        return;
      }
      const a = orbit();
      for (let j = 0; j < 4; j++) {
        const at = new Vector3(p.x + rand(-0.1, 0.1), p.y, p.z + rand(-0.1, 0.1));
        if (hd) {
          effects.spawn('particles', c.scene, at, { recipe: JOINT_SPARKS_HD, count: 1, heading: sparkHeading(rand(-30, 30) * DEG, a + rand(90, 120) * DEG) });
          if (Math.random() < 1 / 3) effects.spawn('particles', c.scene, at, { recipe: SPARK_CHIPS_HD, count: 1 });
        } else jointSpark(c.scene, at, sparkHeading(rand(-30, 30) * DEG, a + rand(90, 120) * DEG), 0.25);
      }
    });
  }
}

/**
 * Twisting Slash at its impact key (ZzzCharacter.cpp:4410-4422): SOUND_SKILL_SWORD4, MODEL_SKILL_WHEEL1 (LT 5,
 * one WHEEL2 copy a tick) and `PostMoveProcess_Active(15)`, which keeps `Weapon[0]` out of the hand.
 */
const twistingSlashOf = (hd: boolean): Step => (_at, c) => {
  const skill = baseSkill(currentSkill);
  const yaw0 = entityYaw(c.caster);
  const weapon = wieldedWeapon(c.caster);
  const radius = cm(weapon?.group === 3 ? 180 : 150);
  sayAt(c, 'Sound/sKnightSkill4');
  if (weapon) effects.spawn('weaponHide', c.scene, Vector3.Zero(), { entity: c.caster, seconds: ticks(15) });
  for (let i = 0; i < WHEEL_ALPHAS.length; i++) {
    const alpha = WHEEL_ALPHAS[i];
    delay(ticks(i), () => {
      if (!entityGone(c.caster)) wheelCopy(c, skill, yaw0, radius, weapon, alpha, hd);
    });
  }
};
const twistingSlash = twistingSlashOf(false);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** A tick curve sampled from a table, linear between samples and held at the ends. */
function curve(values: readonly number[]): (tick: number) => number {
  return tick => {
    if (tick <= 0) return values[0];
    const i = Math.floor(tick);
    if (i >= values.length - 1) return values[values.length - 1];
    return lerp(values[i], values[i + 1], tick - i);
  }
}

/**
 * MODEL_SKILL_FURY_STRIKE's flight (MoveHandlers.cpp:3107-3170): on LT 20..12 the weapon sits at
 * `StartPosition + AngleMatrix(HeadAngle = (80, 0, facing + 180)) x (0, sin(angle) x 260, 0)`, 200 cm + Gravity up,
 * `angle = (20 - LT) x 15°` to LT 16 then 135°, Gravity 50 +8 a tick, negated at LT 15 and -8 a tick after.
 * Per tick after spawn: [forward, up] in cm.
 */
const FURY_PATH: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  let gravity = 50;
  for (let n = 0; n <= 8; n++) {
    const lifeTime = 20 - n;
    const angle = lifeTime > 15 ? n * 15 : 135;
    if (lifeTime === 15) gravity = -gravity;
    gravity += lifeTime > 15 ? 8 : -8;
    const d = Math.sin(angle * DEG) * 260;
    out.push([Math.cos(80 * DEG) * d, Math.sin(80 * DEG) * d + gravity + 200]);
  }
  return out;
})();
const FURY_FORWARD = curve(FURY_PATH.map(p => p[0]));
const FURY_UP = curve(FURY_PATH.map(p => p[1]));

/** MODEL_WAVE (ZzzEffect.cpp:1338-1345, MoveHandlers.cpp:2585-2602): Scale 0.5 +1.2 a tick to past 2, then +0.1; sinking 1.8, then 1.5 cm a tick. */
const WAVE_SCALE = curve([0.5, 1.7, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.1, 4.2]);
const WAVE_SINK = curve([0, 1.8, 3.6, 5.1, 6.6, 8.1, 9.6, 11.1, 12.6, 14.1, 15.6, 17.1, 18.6, 20.1, 21.6, 23.1]);
const WAVE_DRIFT = curve([0, 1.2, 2.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.4, 11.4, 12.4, 13.4, 14.4, 15.4]);
/** Its BlendMeshLight: 1.5 until the scale passes 2, then LifeTime / 30. */
const waveLight = (tick: number): number => (tick < 2 ? 1.5 : (15 - tick) / 30);

/** EarthQuake02 / 05 / 08's BlendMeshLight: `(LT0 - LifeTime) x 0.1` for the first ten ticks, then `LifeTime x 0.1` (ZzzEffect.cpp:7131-7258). */
const rampThenFade = (life: number) => (tick: number): number => (tick < 10 ? tick * 0.1 : (life - tick) * 0.1);
/** EarthQuake01 / 04 / 07's `LifeTime x 0.1 / 3`. */
const fadeThirty = (life: number) => (tick: number): number => (life - tick) / 30;

/** A MODEL_STONE1/2 sub0 chip thrown from within 150 cm of `at` (ZzzEffect.cpp:7137-7146). */
function furyStone(scene: Scene, at: Vector3): void {
  const a = Math.random() * Math.PI * 2;
  const r = cm(rand(0, 150));
  const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
  effects.spawn('debris', scene, p, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, count: 1 });
}

/** Where one EarthQuake model of a set sits: its point, `Scale` and MU yaw. */
interface QuakePlace {
  at: Vector3;
  scale: number;
  yaw: number;
}

/**
 * A set of one of Rageful Blow's EarthQuake models spawned on one tick: additive with its own BlendMeshLight
 * curve, or textured (`+3`). Each sinks 0.5 cm a tick once its LifeTime is under `sinkBelow`
 * (ZzzEffect.cpp:7105-7262). One spawn, the rest of the set drawn as its instanced copies.
 */
function quake(c: SkillContext, m: string, places: readonly QuakePlace[], life: number, body: number, blendMeshLight: ((tick: number) => number) | null, sinkBelow: number, scroll = false, tint: RGB = RGBS.white): void {
  if (!places.length) return;
  const at = places[0].at;
  const t0 = fxNow();
  effects.spawn('model', c.scene, at, {
    model: m,
    seconds: ticks(life),
    scale: places[0].scale,
    yaw: -places[0].yaw,
    copies: places.length > 1 ? places.slice(1).map(p => ({ at: p.at, scale: p.scale, yaw: -p.yaw })) : undefined,
    fadeTail: 0,
    scrollU: scroll ? QUAKE_SCROLL : undefined,
    follow: out => out.set(at.x, at.y - cm(0.5 * Math.max(0, (fxNow() - t0) / TICK - (life - sinkBelow))), at.z),
    ...(blendMeshLight ? { colour: tint, intensity: lit(body, blendMeshLight) } : { native: { light: ITEM_LIGHT } }),
  });
}

/** EarthQuake01's camera kick, `(rand() % 8 - 4) x 0.1`°, on the ticks its LifeTime is over 15 and a multiple of 3 (ZzzEffect.cpp:7109-7112). */
function craterShake(): void {
  for (let lt = 33; lt > 15; lt -= 3) {
    const kick = (): void => earthQuake((Math.floor(Math.random() * 8) - 4) * 0.1);
    // Re-rolled through the tick, as every frame of it writes the global.
    delay(ticks(35 - lt), kick);
    delay(ticks(35 - lt + 0.5), kick);
  }
}

/** A glow wall's stone chips: one in `every` ticks between `from` and `to` ticks of its life. */
function wallStones(c: SkillContext, at: Vector3, from: number, to: number, every: number): void {
  for (let k = from; k <= to; k++) {
    if (Math.random() < 1 / every) delay(ticks(k), () => furyStone(c.scene, at));
  }
}

/** Graded tiers: embers lifting off the crater, the satellites and the crack tips while they glow. */
const FURY_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.62, 0.28],
  colourEnd: [0.75, 0.16, 0.03],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.35, 0.02, 0.35],
  dir1: [-0.3, 1, -0.3],
  dir2: [0.3, 1, 0.3],
  power: 1.1,
  powerJitter: 0.5,
  gravity: -0.4,
  capacity: 256,
};
/** Graded tiers: the hot chips the impact throws. */
const FURY_BURST_SPARKS: ParticleRecipe = {
  ...FURY_EMBERS,
  size: 0.12,
  life: 0.7,
  box: [0.2, 0.1, 0.2],
  dir1: [-1, 0.6, -1],
  dir2: [1, 1.5, 1],
  power: 4.5,
  gravity: -8,
  capacity: 128,
};
/** Graded tiers: the dust skirt the impact throws flat along the ground. */
const FURY_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: [0.36, 0.3, 0.25],
  colourEnd: [0.26, 0.22, 0.19],
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.1,
  lifeJitter: 0.3,
  box: [0.2, 0, 0.2],
  dir1: [-1, 0.15, -1],
  dir2: [1, 0.35, 1],
  power: 1.4,
  powerJitter: 0.4,
  endScale: 2.6,
  spin: 0.6,
  blend: 'alpha',
  capacity: 128,
};
/** Graded tiers: the glow walls and cracks pulled toward orange; the tone curve took the untinted fire sheets to a pale peach. */
const FURY_GLOW_HD: RGB = [1, 0.62, 0.38];
/** Graded tiers: the thrown weapon's smear, steel grey. */
const FURY_SMEAR: RGB = [0.4, 0.44, 0.55];

/**
 * Rageful Blow from clip key 1 (ZzzCharacter.cpp:4159-4168, :3045-3048): SOUND_FURY_STRIKE1 and
 * MODEL_SKILL_FURY_STRIKE at the feet - the wielded weapon thrown up tumbling 80° a tick; at LT 13 the
 * MODEL_TAIL streaks and SOUND_FURY_STRIKE2; at LT 11 the impact (explosion, sparks, MODEL_WAVE, the crater
 * +3/+1/+2 and five +4/+5 satellites); at LT 10 twenty +7/+8 cracks in five branches and SOUND_FURY_STRIKE3
 * (MoveHandlers.cpp:2939-3175).
 */
const furyStrikeOf = (hd: boolean): Step => (_at, c) => {
  const caster = c.caster;
  const skill = baseSkill(currentSkill);
  const yaw0 = entityYaw(caster);
  const feet = entityPos(caster, 0, new Vector3());
  const fwd = forwardOf(yaw0);
  const weapon = wieldedWeapon(caster);
  const glowTint = hd ? FURY_GLOW_HD : RGBS.white;
  const pathAt = (tick: number, out: Vector3): Vector3 =>
    out.set(feet.x + fwd.x * cm(FURY_FORWARD(tick)), feet.y + cm(FURY_UP(tick)), feet.z + fwd.z * cm(FURY_FORWARD(tick)));
  sayAt(c, 'Sound/eRageBlow_1');

  if (weapon) {
    const t0 = fxNow();
    effects.spawn('model', c.scene, pathAt(0, new Vector3()), {
      model: weapon.file,
      seconds: ticks(9),
      scale: itemScale(weapon),
      fadeTail: 0,
      native: { light: ITEM_LIGHT, stamp: weapon.stamp, ...itemObjectAttribute(weapon.group, weapon.num) },
      follow: out => pathAt((fxNow() - t0) / TICK, out),
      rotate: out => muAngles(out, 80 * DEG * ((fxNow() - t0) / TICK + 1), 0, yaw0 + 330 * DEG),
    });
    if (hd) {
      effects.spawn('joint', c.scene, pathAt(0, new Vector3()), {
        head: out => pathAt((fxNow() - t0) / TICK, out),
        maxTails: 5,
        smooth: 3,
        taper: true,
        width: 0.45,
        colour: FURY_SMEAR,
        texture: TEX.flare2,
        seconds: ticks(10),
        fadeTail: 0.3,
      });
    }
  }

  // LT 13: eight MODEL_TAIL at the weapon's LT-14 point + (-25, -40), four 50 cm apart and four 30 cm apart
  // shifted 20-49 cm on x and +-250 cm up; LT 6, Light 0.5, BlendMeshLight LT / 20, falling 80 cm +60 a tick.
  delay(ticks(7), () => {
    if (entityGone(caster)) return;
    sayAt(c, 'Sound/eRageBlow_2');
    const base = addMuOffset(pathAt(6, new Vector3()), entityYaw(caster), -25, -40);
    const body = terrainLevel(base.x, base.z) + 0.5;
    const tail = (x: number, y: number, z: number): void => {
      const top = new Vector3(x, y, z);
      effects.spawn('model', c.scene, top, {
        model: MODEL.tail,
        seconds: ticks(6),
        colour: RGBS.white,
        yaw: -45 * DEG,
        fadeTail: 0,
        intensity: lit(body, tick => (6 - tick) / 20),
        follow: out => {
          const a = Math.max(0, (fxNow() - t1) / TICK);
          return out.set(top.x, top.y - cm((a + 1) * (80 + 30 * a)), top.z);
        },
      });
    };
    const t1 = fxNow();
    for (let i = 0; i < 4; i++) tail(base.x, base.y - cm(i * 50), base.z);
    const x = base.x + cm(rand(20, 50));
    const y = base.y + cm(rand(-250, 250));
    for (let i = 0; i < 4; i++) tail(x, y - cm(i * 30), base.z);
  });

  // LT 11: the impact 80 cm past the weapon's LT-12 point and 25 cm aside, 25 cm over the ground.
  const hit = new Vector3();
  delay(ticks(9), () => {
    if (entityGone(caster)) return;
    const yaw = entityYaw(caster);
    addMuOffset(pathAt(8, hit), yaw, -25, -80);
    hit.y = groundAt(hit.x, hit.z, feet.y) + cm(25);
    explosion(RGBS.white, 0.5)(hit, c);
    if (hd) {
      // Graded tiers: a hot core under the white card, thrown chips, a dust skirt and the burst's light.
      sprite({ texture: TEX.flare, colour: [1, 0.5, 0.22], size: 2, seconds: ticks(12), grow: 1.3, growFrom: 0.5, fadeTail: 0.7 })(hit, c);
      particles({ recipe: FURY_BURST_SPARKS, count: 24 })(hit, c);
      ringOf(particles({ recipe: FURY_DUST, count: 1 }), 10, 1.1)(new Vector3(hit.x, hit.y - cm(20), hit.z), c);
      const burst = hit.clone();
      lighting.skillBody(c.scene, skill, 'burst', out => {
        out.x = burst.x;
        out.y = burst.y;
        out.z = burst.z;
      });
    }
    for (let j = 0; j < 8; j++) {
      const at = new Vector3(hit.x + rand(-0.1, 0.1), hit.y, hit.z + rand(-0.1, 0.1));
      jointSpark(c.scene, at, sparkHeading(rand(-60, 0) * DEG, yaw0 + (330 + rand(90, 120)) * DEG), 1 / 8);
    }
    const waveBody = terrainLevel(hit.x, hit.z) + 1;
    const t2 = fxNow();
    const waveAt = new Vector3(hit.x, hit.y - cm(15), hit.z);
    effects.spawn('model', c.scene, waveAt, {
      model: MODEL.flashing,
      seconds: ticks(15),
      colour: RGBS.white,
      fadeTail: 0,
      scaleAt: t => WAVE_SCALE(t / TICK),
      intensity: lit(waveBody, waveLight),
      follow: out => {
        const a = (fxNow() - t2) / TICK;
        return out.set(waveAt.x - cm(WAVE_DRIFT(a)), waveAt.y - cm(WAVE_SINK(a)), waveAt.z);
      },
    });
    // Its AddTerrainLight(-0.5 x Luminosity, range 5) (MoveHandlers.cpp:2601-2602): light sources only add, so a dark ground card 10 m across.
    effects.spawn('sprite', c.scene, waveAt, {
      texture: TEX.flare,
      flat: true,
      blend: 'subtract',
      cover: 0.5,
      size: 10,
      seconds: ticks(15),
      fadeTail: 0,
      follow: out => out.set(waveAt.x - cm(WAVE_DRIFT((fxNow() - t2) / TICK)), hit.y - cm(22), waveAt.z),
    });

    const crater = new Vector3(hit.x, hit.y - cm(27), hit.z);
    const body = terrainLevel(crater.x, crater.z) + 0.3;
    const centre = [{ at: crater, scale: 1.5, yaw: 0 }];
    quake(c, MODEL.earthQuake3, centre, 35, body, null, 13);
    quake(c, MODEL.earthQuake, centre, 35, body, fadeThirty(35), 10, false, glowTint);
    quake(c, MODEL.earthQuake2, centre, 20, body, rampThenFade(20), 5, true, glowTint);
    craterShake();
    wallStones(c, crater, 11, 15, 10);
    if (hd) effects.spawn('particles', c.scene, crater, { recipe: FURY_EMBERS, rate: 10, seconds: ticks(24) });
    lighting.skillBody(c.scene, skill, 'crater', out => {
      out.x = crater.x;
      out.y = crater.y;
      out.z = crater.z;
    });

    // Five satellites at SubType + 72°·i, 100-249 cm out, on ground that is walkable, dry and there.
    const world = storeRef().world;
    const a0 = rand(0, 100) * DEG;
    const satellites: QuakePlace[] = [];
    for (let i = 0; i < 5; i++) {
      const a = a0 + i * 72 * DEG;
      const r = cm(rand(100, 250));
      const p = new Vector3(crater.x - Math.sin(a) * r, 0, crater.z + Math.cos(a) * r);
      const wall = world?.getTerrainFlag(Math.floor(p.x), Math.floor(p.z)) ?? 0;
      if (wall & (TW_NOMOVE | TW_NOGROUND | TW_WATER)) continue;
      p.y = groundAt(p.x, p.z, feet.y) + cm(3);
      const scale = rand(40, 90) / 100;
      const yaw = (45 + rand(-15, 15)) * DEG;
      satellites.push({ at: p, scale, yaw });
      wallStones(c, p, 10, 35, 15);
      if (hd) after(ticks(4), particles({ recipe: FURY_EMBERS, rate: 4, seconds: ticks(28) }))(p, c);
      lighting.skillBody(c.scene, skill, 'wall', out => {
        out.x = p.x;
        out.y = p.y;
        out.z = p.z;
      });
    }
    quake(c, MODEL.earthQuake4, satellites, 35, body, fadeThirty(35), 10, false, glowTint);
    quake(c, MODEL.earthQuake5, satellites, 40, body, rampThenFade(40), 15, true, glowTint);
  });

  // LT 10: five cracks of four 85-99 cm steps, each turning +-50-79° (alternating, the last step random).
  delay(ticks(10), () => {
    if (entityGone(caster)) return;
    sayAt(c, 'Sound/eRageBlow_3');
    const body = terrainLevel(hit.x, hit.z) + 0.3;
    const pos = Array.from({ length: 5 }, () => new Vector3(hit.x, hit.y, hit.z));
    const turn = [0, 0, 0, 0, 0];
    let count = 0;
    const cracks: QuakePlace[] = [];
    for (let j = 0; j < 4; j++) {
      const step = rand(85, 100);
      if (j >= 3) count = Math.floor(Math.random() * 2);
      for (let i = 0; i < 5; i++) {
        turn[i] += (count % 2 === 0 ? 1 : -1) * rand(50, 80);
        const a = (turn[i] + i * rand(62, 72)) * DEG;
        const p = pos[i];
        p.x += cm(-Math.sin(a) * step);
        p.z += cm(Math.cos(a) * step);
        p.y = groundAt(p.x, p.z, feet.y) + cm(3);
        const at = p.clone();
        cracks.push({ at, scale: 1, yaw: a + 270 * DEG });
        lighting.skillBody(c.scene, skill, 'wall', out => {
          out.x = at.x;
          out.y = at.y;
          out.z = at.z;
        });
      }
      count++;
    }
    quake(c, MODEL.earthQuake7, cracks, 40, body, fadeThirty(40), 10, false, glowTint);
    quake(c, MODEL.earthQuake8, cracks, 40, body, rampThenFade(40), 15, true, glowTint);
    if (hd) {
      // Graded tiers: embers off each crack's last step, and one light over the whole glowing field.
      for (const tip of pos) after(ticks(4), particles({ recipe: FURY_EMBERS, rate: 4, seconds: ticks(26) }))(tip, c);
      const centre = hit.clone();
      lighting.skillBody(c.scene, skill, 'field', out => {
        out.x = centre.x;
        out.y = centre.y;
        out.z = centre.z;
      });
    }
  });
};
const furyStrike = furyStrikeOf(false);

/** RenderCharacter skips `Weapon[0]` while the FURY clip is at key 4 or less (ZzzCharacter.cpp:10077-10080). */
const furyEmptyHand: Step = (_at, c) => {
  const m = c.caster.modelObject;
  if (!wieldedWeapon(c.caster)) return;
  effects.spawn('weaponHide', c.scene, Vector3.Zero(), {
    entity: c.caster,
    seconds: 2,
    until: () => !m || m.CurrentAction !== PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE || m.actionFrame() > 4,
  });
};

/** `m_vPosSword`: `Weapon[0]`'s link bone, 300 cm along the facing (ZzzCharacter.cpp:2652-2660). */
function swordPoint(caster: Entity, forward: number, out: Vector3): Vector3 {
  bonePos(caster, WEAPON_LINK_BONE, out, CAST_HEIGHT);
  const f = forwardOf(entityYaw(caster));
  out.x += f.x * forward;
  out.z += f.z * forward;
  return out;
}

/** GetMagicScrew (ZzzEffectJoint.cpp:7360-7377): a unit vector wandering with WorldTime `ms`; MU (x, y, z) is world (x, z, y). */
function magicScrew(param: number, rate: number, ms: number, out: Vector3): Vector3 {
  const i = param + Math.floor(ms / 40);
  const a = (i + 55555) * 0.048 * rate;
  const b = i * 0.0613 * rate;
  const c = (i + 11111) * 0.1113 * rate;
  const x = Math.sin(a) * Math.cos(b);
  const y = Math.sin(a) * Math.sin(b);
  const z = Math.cos(a);
  return out.set(Math.cos(c) * y - Math.sin(c) * z, x, Math.sin(c) * y + Math.cos(c) * z);
}

/** One MODEL_SPEARSKILL sub2 gather streak: where it starts, the tick it was born and its GetMagicScrew seed. */
interface GatherStreak {
  from: Vector3;
  born: number;
  screw: number;
}
/** MODEL_SPEARSKILL sub2's life and tails (ZzzEffectJoint.cpp:1575-1581). */
const GATHER_LIFE = 20;
const GATHER_TAILS = 5;

/**
 * Death Stab's gather streaks as one batch (ZzzEffectJoint.cpp:4283-4306): NSkill, Light (1, 0.3, 0.3), width
 * `LifeTime x 3` cm. A head runs from its start (+ a 1 cm GetMagicScrew wobble) onto the gathering point of its
 * tick over LT 20..10 and rests there; its tails are where it was the ticks before.
 */
function gatherStreaks(c: SkillContext, tickOf: () => number, t0: number, streaks: GatherStreak[], gathers: Vector3[]): void {
  const screw = new Vector3();
  const head = (s: GatherStreak, a: number, out: Vector3): Vector3 => {
    const g = gathers[Math.min(s.born + a, gathers.length - 1)];
    magicScrew(s.screw, 1.4, (t0 + (s.born + a) * TICK) * 1000, screw).scaleInPlace(cm(1)).addInPlace(s.from);
    return Vector3.LerpToRef(screw, g, Math.min(1, a / 10), out);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: 3 * 7,
      fill: (k, j, out) => {
        const s = streaks[k];
        if (!s) return 0;
        const age = tickOf() - s.born;
        if (age < 0 || age >= GATHER_LIFE) return 0;
        head(s, Math.max(0, age - j), out);
        return (GATHER_LIFE - age) / GATHER_LIFE;
      },
    },
    maxTails: GATHER_TAILS - 1,
    seconds: ticks(8 + GATHER_LIFE),
    width: cm(GATHER_LIFE * 3),
    fadeTail: 0,
    colour: [1, 0.3, 0.3],
    texture: TEX.flareForce,
    until: () => entityGone(c.caster),
  });
}

/** One BITMAP_FLARE sub12 of the drill: its MODEL_SPEAR emitter, the facing, the tick it was born and its `Direction[0]`. */
interface DrillFlare {
  emitter: Vector3;
  yaw: number;
  born: number;
  phase: number;
}
/** BITMAP_FLARE sub12's life and tails (ZzzEffectJoint.cpp:1886-1888). */
const DRILL_LIFE = 70;
const DRILL_TAILS = 50;
/**
 * MoveJoint re-runs itself until LifeTime hits a multiple of 12 (ZzzEffectJoint.cpp:6959-6968), each sub-step
 * moving and leaving a tail: 10 sub-steps on the birth tick, 12 on each tick after, dead on its seventh tick.
 */
const drillSubSteps = (age: number): number => 10 + 12 * age;
const DRILL_TICKS = 6;
/** A MODEL_SPEAR emitter's life (EffectRegistry.cpp:57): one flare a tick from each of the two. */
const DRILL_EMITTER_TICKS = 10;

/**
 * Death Stab's blue drill as one batch (EffectBehaviors.cpp:87-95; ZzzEffectJoint.cpp:1883-1897, :5570-5604):
 * Flare.jpg, Light (0.1, 0.1, 1), width 100 cm. A flare's centre walks 4 cm a sub-step along the facing; its
 * head circles 26 cm out in the side/up plane at 0.1 rad a sub-step, sinking `(90 - LifeTime) x 0.3` cm.
 */
function drillFlares(c: SkillContext, tickOf: () => number, flares: DrillFlare[], count: number, seconds: number): void {
  const head = (d: DrillFlare, a: number, out: Vector3): Vector3 => {
    const lifeTime = DRILL_LIFE - a;
    const turn = (d.phase + lifeTime) * 0.1;
    const side = -Math.cos(turn) * 26;
    const up = Math.sin(turn) * 26 - (90 - lifeTime) * 0.3;
    const fx = Math.sin(d.yaw);
    const fz = -Math.cos(d.yaw);
    const sx = Math.cos(d.yaw);
    const sz = Math.sin(d.yaw);
    const walk = cm(4 * (a + 1));
    return out.set(d.emitter.x + fx * walk + sx * cm(side), d.emitter.y + cm(up), d.emitter.z + fz * walk + sz * cm(side));
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count,
      fill: (k, j, out) => {
        const d = flares[k];
        if (!d) return 0;
        const age = tickOf() - d.born;
        if (age < 0 || age >= DRILL_TICKS) return 0;
        head(d, Math.max(0, drillSubSteps(age) - 1 - j), out);
        return 1;
      },
    },
    maxTails: DRILL_TAILS - 1,
    seconds,
    width: 1,
    fadeTail: 0,
    colour: [0.1, 0.1, 1],
    texture: TEX.flareBig,
  });
}

/** A point that follows bone `bone`, knocked up to `range` tiles off it per axis, re-rolled once a tick (`GetNearRandomPos`). */
function jitteredBone(e: Entity, bone: number, range: number): PointSource {
  const off = new Vector3();
  let tick = -1;
  return out => {
    const k = Math.floor(fxNow() / TICK);
    if (k !== tick) {
      tick = k;
      off.set(rand(-range, range), rand(-range, range), rand(-range, range));
    }
    return bonePos(e, bone, out).addInPlace(off);
  };
}

/**
 * The Death Stab victim (ZzzCharacter.cpp:4094-4119): while `m_byHurtByDeathstab` counts down from 35, on
 * half the ticks every bone with a parent (dummies skipped) gets a JOINT_THUNDER sub7 to that parent, both
 * ends +-20 cm, width 20, Light (0.5, 0.5, 1), LT 1 (ZzzEffectJoint.cpp:1164-1173): a short humming crackle,
 * three jittered segments here. Not in Battle Castle.
 */
function electrifiedSkeleton(c: SkillContext, target: Entity, seconds: number): void {
  if (storeRef().world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) return;
  const bones = target.modelObject?.gltf?.skeleton?.bones;
  if (!bones) return;
  const pairs: { from: PointSource; to: PointSource }[] = [];
  for (let i = 1; i < bones.length; i++) {
    if (/dummy/i.test(bones[i].name)) continue;
    const parent = bones[i].getParent();
    const pi = parent ? bones.indexOf(parent) : -1;
    if (pi >= 1) pairs.push({ from: jitteredBone(target, i - 1, cm(20)), to: jitteredBone(target, pi - 1, cm(20)) });
  }
  if (pairs.length) {
    effects.spawn('joint', c.scene, entityPos(target, 0, new Vector3()), {
      pairs,
      segments: 3,
      jitter: 0.08,
      width: cm(20),
      colour: [0.5, 0.5, 1],
      texture: TEX.jointThunder,
      textureScroll: 1,
      seconds,
      fadeTail: 0.05,
      reroll: TICK,
      blink: 0.5,
      until: () => entityGone(target),
    });
  }
}

/** Graded tiers: blue motes the drill throws off as it spins out, and the victim's crackle sparks. */
const DRILL_MOTES: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: [0.55, 0.65, 1],
  colourEnd: [0.15, 0.2, 0.8],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.4,
  box: [0.1, 0.1, 0.1],
  dir1: [-0.5, -0.4, -0.5],
  dir2: [0.5, 0.5, 0.5],
  aimed: true,
  power: 5,
  powerJitter: 0.6,
  gravity: -1,
  capacity: 256,
};
const STAB_SPARKS: ParticleRecipe = { ...DRILL_MOTES, aimed: false, dir1: [-1, -0.2, -1], dir2: [1, 1.2, 1], power: 2.5, gravity: -5, life: 0.5 };
/** Graded tiers: red chips drawn in to the gathering point, a hotter red than the streaks' so the curve keeps it red. */
const GATHER_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.32, 0.18],
  colourEnd: [0.6, 0.05, 0.02],
  size: 0.07,
  sizeJitter: 0.4,
  life: 0.3,
  lifeJitter: 0.3,
  box: [0.35, 0.35, 0.35],
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  power: 0.6,
  capacity: 128,
};

/**
 * Death Stab's AttackStage (ZzzCharacter.cpp:2618-2701), `t` = AttackTime (1 at the packet, +1 a tick):
 * t2-8 three red streaks a tick from a +-300 cm cube 1400 cm behind the knight onto the gathering point;
 * t8 SOUND_SKILL_SWORD2; t6-12 on half the ticks two MODEL_SPEAR emitters in front of the sword, each
 * leaving a blue drill flare a tick for 10 ticks; t10 the victim's electrified skeleton for its 35-tick
 * countdown, re-armed to t12.
 */
const deathStabOf = (hd: boolean): Step => (at, c) => {
  const caster = c.caster;
  const target = c.target;
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);
  const skill = baseSkill(currentSkill);

  const gathers = [swordPoint(caster, 3, new Vector3())];
  const streaks: GatherStreak[] = [];
  gatherStreaks(c, tickOf, t0, streaks, gathers);
  if (hd) {
    // Graded tiers: the gathering point swells red as the streaks arrive, with chips drawn in and its light.
    const gather: PointSource = out => out.copyFrom(gathers[Math.min(tickOf(), gathers.length - 1)]);
    delay(ticks(1), () => {
      if (entityGone(caster)) return;
      const p = gather(new Vector3());
      effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: [1, 0.2, 0.08], size: 1.4, seconds: ticks(12), sizeAt: q => 0.35 + 0.65 * Math.min(1, q * 1.6), fadeTail: 0.35, follow: gather });
      effects.spawn('particles', c.scene, p, { recipe: GATHER_MOTES, rate: 40, seconds: ticks(8), follow: gather });
      lighting.skillBody(c.scene, skill, 'gather', out => {
        const g = gathers[Math.min(tickOf(), gathers.length - 1)];
        out.x = g.x;
        out.y = g.y;
        out.z = g.z;
      });
    });
  }

  // The `rand_fps_check(2)` rolls of t6-12, drawn up front so the drill batch is sized to its flares.
  const rolls = Array.from({ length: 7 }, () => Math.random() < 0.5);
  const flares: DrillFlare[] = [];
  const lastRoll = rolls.lastIndexOf(true);
  if (lastRoll >= 0) drillFlares(c, tickOf, flares, rolls.filter(Boolean).length * 2 * DRILL_EMITTER_TICKS, ticks(5 + lastRoll + DRILL_EMITTER_TICKS + DRILL_TICKS + 1));

  for (let t = 2; t <= 12; t++) {
    delay(ticks(t - 1), () => {
      if (entityGone(caster)) return;
      const n = t - 1;
      const yaw = entityYaw(caster);
      const f = forwardOf(yaw);
      if (t <= 8) {
        gathers[n] = swordPoint(caster, 3, new Vector3());
        const base = entityPos(caster, cm(120), new Vector3());
        for (let j = 0; j < 3; j++) {
          const from = new Vector3(base.x + rand(-3, 3) - f.x * 14, base.y + rand(-3, 3), base.z + rand(-3, 3) - f.z * 14);
          streaks.push({ from, born: n, screw: Math.floor(Math.random() * 4096) * 17721 });
        }
      }
      if (t === 8) sayAt(c, 'Sound/sKnightSkill2');
      if (t >= 6 && rolls[t - 6]) {
        const emitter = swordPoint(caster, cm(100 + (t - 8) * 10), new Vector3());
        for (let k = 0; k < DRILL_EMITTER_TICKS; k++) {
          for (let e = 0; e < 2; e++) flares.push({ emitter, yaw, born: n + k, phase: Math.floor(Math.random() * 360) });
        }
        if (hd) {
          // Graded tiers: motes flung forward off the spin, and one light down the drill's 2.8 m from its first roll.
          effects.spawn('particles', c.scene, emitter, { recipe: DRILL_MOTES, count: 10, heading: new Vector3(f.x, 0, f.z) });
          if (t - 6 === rolls.indexOf(true)) {
            const mid = new Vector3(emitter.x + f.x * 1.4, emitter.y, emitter.z + f.z * 1.4);
            lighting.skillBody(c.scene, skill, 'drill', out => {
              out.x = mid.x;
              out.y = mid.y;
              out.z = mid.z;
            });
          }
        }
      }
      if (t === 10 && target && !entityGone(target)) {
        electrifiedSkeleton(c, target, ticks(37));
        if (hd) {
          // Graded tiers: the stab lands as a blue flash and sparks on the chest, and the crackle lights the body.
          const chest = entityPos(target, IMPACT_HEIGHT, new Vector3());
          sprite({ texture: TEX.flareBlue, colour: [0.5, 0.6, 1], size: 1.1, seconds: ticks(8), grow: 1.4, growFrom: 0.4, fadeTail: 0.6 })(chest, c);
          particles({ recipe: STAB_SPARKS, count: 16 })(chest, c);
          lighting.skillBody(c.scene, skill, 'victim', out => {
            entityPos(target, IMPACT_HEIGHT, chest);
            out.x = chest.x;
            out.y = chest.y - IMPACT_HEIGHT;
            out.z = chest.z;
          });
        }
      }
    });
  }
};
const deathStab = deathStabOf(false);
// ---- dk3 steps

/** `c->AttackTime` counts from 1 at the cast and fires the effect switch at g_iLimitAttackTime 15 (ZzzCharacter.cpp:2615, :4132-4145). */
const ATTACK_TIME_TICKS = 14;

/**
 * `step` when the caster's clip (one of `actions`) passes `key` - an AttackStage shortcut to the AttackTime
 * cap (ZzzCharacter.cpp:2910-2915) - or once `cap` ticks have gone, whichever is first.
 */
const atClipKey = (key: number, actions: readonly number[], step: Step, cap = ATTACK_TIME_TICKS): Step => (at, c) => {
  const p = at.clone();
  const t0 = fxNow();
  // Polled against the clock, not by counting polls: each delay lands on a frame and would drift late.
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    if ((m && actions.includes(m.CurrentAction) && m.actionFrame() >= key) || fxNow() - t0 >= ticks(cap) - 1e-4) step(p, c);
    else delay(Math.min(TICK, ticks(cap) - (fxNow() - t0)), poll);
  };
  poll();
};

/** The two Fire Breath clips (SkillCast.cpp:314-319). */
const RIDER_ACTIONS: readonly number[] = [PlayerAction.PLAYER_SKILL_RIDER, PlayerAction.PLAYER_SKILL_RIDER_FLY];
/** BITMAP_FIRE+2 (Fire03, 256x64): four 64 px cells, `Frame = (23 - LifeTime) / 6` (ZzzEffectParticle.cpp:4617). */
const FIRE3_CELLS: SheetCells = { w: 64, h: 64, count: 4 };
/** BITMAP_EXPLOTION+1 (DinoE, 256x64): four 64 px cells over its 12 ticks (ZzzEffectParticle.cpp:4278-4280). */
const DINO_CELLS: SheetCells = { w: 64, h: 64, count: 4 };
/** A breath puff's `Scale *= 0.95` a tick over its 24 (ZzzEffectParticle.cpp:4615): the size at 30 % of its life and at its end. */
const PUFF_SIZE_HELD = Math.pow(0.95, 24 * 0.3);
const PUFF_SIZE_END = Math.pow(0.95, 24);
/**
 * JOINT_SPARK sub1's width is its Scale 2 - two centimetres (ZzzEffectJoint.cpp:960-966), under a pixel at
 * this camera; ours is five wide so the sparks read at all.
 */
const BREATH_SPARK_WIDTH = cm(5);
/** JOINT_SPARK sub1's `Light /= 1.4` a tick and `Velocity += 0.3` a tick (ZzzEffectJoint.cpp:4201-4208). */
const SPARK_DECAY = 1 / 1.4;
const SPARK_ACCEL = perTick(0.3) * 25;
/**
 * CreateBomb2's 20 BITMAP_SPARK sub2 chips (ZzzEffect.cpp:6349-6360, ZzzEffectParticle.cpp:2016-2031,
 * :6558-6597): Spark02 (4 px) at Scale 0.8-1.4, thrown 6-12 cm a tick outward and 6-21 up, falling 2 cm a
 * tick more each tick, LT 24-39, bright for LifeTime/16.
 */
const BOMB2_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.044,
  sizeJitter: 0.27,
  life: ticks(39),
  lifeJitter: 0.38,
  box: [0.05, 0.05, 0.05],
  dir1: [-3, 1.5, -3],
  dir2: [3, 5.25, 3],
  power: 1,
  powerJitter: 0,
  gravity: -12.5,
  spin: 3,
  capacity: 128,
};

/** CreateBomb2 (ZzzEffect.cpp:6349-6371): the chips and one DinoE card at scale 4 (2.56 m), with SOUND_EXPLOTION01. */
const bomb2: Step = (at, c) => {
  effects.spawn('sprite', c.scene, at, { texture: TEX.dinoE, colour: RGBS.white, size: cm(256), seconds: ticks(12), cells: DINO_CELLS, fadeTail: 0.1 });
  effects.spawn('particles', c.scene, at, { recipe: BOMB2_SPARKS, count: 20 });
  playCombat('Sound/eExplosion', at);
};

/**
 * Fire Breath at the key (ZzzCharacter.cpp:4405-4409): SOUND_SKILL_SWORD3 and BITMAP_SHOTGUN at the feet.
 * The emitter is unseen: it starts 20 cm ahead and 50 up and runs 30 cm a tick along the facing for its 10
 * ticks, dropping two BITMAP_FIRE+2 sub10 puffs 20 cm to either side each tick at Scale `(15 - LT) / 20 *
 * (2..4)`, and CreateBomb2 30 cm over its last spot (ZzzEffect.cpp:3002-3035, MoveHandlers.cpp:5077-5110).
 * At its birth 2x20 JOINT_SPARK sub1 leave from (-20,-20,60) and (30,-20,60), each pitched 5-24 deg off
 * the facing and rolled a growing i*18 deg, so the two sprays are cones round the facing.
 */
const fireBreath: Step = (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  // (f.z, -f.x) is the caster's right: the side its right-hand bone 33 is on (checked in-page, dk3.md).
  const place = (ahead: number, right: number, up: number, out = new Vector3()): Vector3 =>
    out.set(feet.x + f.x * ahead + f.z * right, feet.y + up, feet.z + f.z * ahead - f.x * right);
  playCombat('Sound/sKnightSkill3', feet);

  // All forty in one ribbon mesh (effects/rays.ts): they share their birth tick and their Light.
  const sparks: Ray[] = [];
  for (const right of [cm(20), cm(-30)]) {
    const from = place(cm(20), right, cm(60)).subtractInPlace(feet);
    const offset = [from.x, from.y, from.z] as const;
    let roll = 0;
    for (let i = 0; i < 20; i++) {
      roll += (i * 18 * Math.PI) / 180;
      const pitch = ((5 + Math.floor(Math.random() * 20)) * Math.PI) / 180;
      const side = Math.sin(pitch) * Math.sin(roll);
      sparks.push({
        offset,
        dir: [f.x * Math.cos(pitch) - f.z * side, -Math.sin(pitch) * Math.cos(roll), f.z * Math.cos(pitch) + f.x * side],
        speed: perTick(16 + Math.floor(Math.random() * 20)),
        accel: SPARK_ACCEL,
        width: BREATH_SPARK_WIDTH,
        life: ticks(4 + Math.floor(Math.random() * 4)),
      });
    }
  }
  effects.spawn('rays', c.scene, feet, { rays: sparks, texture: TEX.spark, colour: RGBS.white, seconds: ticks(7), tail: ticks(2), decay: SPARK_DECAY });

  const t0 = fxNow();
  lighting.skillFollow(c.scene, 49, out => {
    place(cm(20) + cm(30) * Math.min(9, (fxNow() - t0) / TICK), 0, cm(50), tmpEmitter);
    out.x = tmpEmitter.x;
    out.y = tmpEmitter.y;
    out.z = tmpEmitter.z;
  });
  for (let k = 0; k < 10; k++) {
    const tick = (): void => {
      const size = cm(64) * ((5 + k) / 20) * (2 + Math.floor(Math.random() * 3));
      for (const right of [cm(20), cm(-20)]) {
        const speed = perTick(3.2 + Math.random() * 1.5);
        effects.spawn('sprite', c.scene, place(cm(20) + cm(30) * k, right, cm(50)), {
          texture: TEX.fire3,
          colour: RGBS.white,
          cells: FIRE3_CELLS,
          size: size * PUFF_SIZE_HELD,
          growFrom: 1 / PUFF_SIZE_HELD,
          grow: PUFF_SIZE_END / PUFF_SIZE_HELD,
          seconds: ticks(24),
          // `Gravity += 0.004; z += Gravity * 10`: about 12 cm up over the life.
          move: [f.x * speed, cm(12) / ticks(24), f.z * speed],
          fadeTail: 1,
        });
      }
      if (k === 9) bomb2(place(cm(20) + cm(30) * k, 0, cm(80)), c);
    };
    if (k === 0) tick();
    else delay(ticks(k), tick);
  }
};
const tmpEmitter = new Vector3();

/** BITMAP_WATERFALL_5 sub8 (ZzzEffectParticle.cpp:3476-3481, :8437-8446): 1.2-1.9 m, rising 1-3 cm a tick less 0.6 a tick, +0.05 Scale and Light /1.1 a tick. */
const DESTRUCTION_MIST: ParticleRecipe = {
  texture: TEX.waterFall5,
  colour: [0.5, 0.5, 1],
  colourEnd: [0.11, 0.11, 0.22],
  size: 1.54,
  sizeJitter: 0.23,
  life: ticks(30),
  lifeJitter: 0,
  box: [1.5, 0.75, 1.5],
  dir1: [0, 0.25, 0],
  dir2: [0, 0.75, 0],
  power: 1,
  powerJitter: 0,
  gravity: -3.75,
  endScale: 1.6,
  capacity: 256,
};
/** BITMAP_WATERFALL_3 sub8 (:3663-3668, :8597-8604): 32-61 cm, rising 5-9 cm a tick less 0.6 a tick, the same growth and fade. */
const DESTRUCTION_SPLASH: ParticleRecipe = {
  ...DESTRUCTION_MIST,
  texture: TEX.waterFall3,
  size: 0.47,
  sizeJitter: 0.3,
  dir1: [0, 1.25, 0],
  dir2: [0, 2.25, 0],
  endScale: 3.1,
};
/** BITMAP_SMOKE sub55 (:1540-1547, :5736-5745): about 1 m, rising faster by 0.1 cm a tick, +0.05 Scale and Light /1.08 a tick. */
const DESTRUCTION_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: RGBS.white,
  colourEnd: [0.31, 0.31, 0.31],
  size: 1.05,
  sizeJitter: 0.1,
  life: ticks(30),
  lifeJitter: 0,
  box: [1.5, 0.75, 1.5],
  dir1: [0, 0, 0],
  dir2: [0, 0, 0],
  power: 0,
  powerJitter: 0,
  gravity: 0.625,
  endScale: 1.9,
  capacity: 256,
};
/**
 * Spots a tick at the target (MoveHandlers.cpp:7589-7604 throws 15 into a 3 m cube round an absolute z of
 * 150, the ground here): only the upper half of the cube is above ground, so half the spots, in that half.
 */
const DESTRUCTION_SPOTS = 4;
/** The controllers' `Light /= 1.05` a tick (ZzzEffect.cpp:9214-9240). */
const DESTRUCTION_LIGHT_DECAY = 1 / 1.05;

/**
 * Strike of Destruction (ZzzCharacter.cpp:4169-4179): MODEL_BLOW_OF_DESTRUCTION is no mesh but two
 * controllers, sub0 100 cm ahead and 20 right of the caster (A) and sub1 on the target tile (B), LT 40
 * (ZzzEffect.cpp:4771-4792). Nothing shows until LT 24: then the Swordeff_mono flash 65 cm over A and the
 * 3.2 m BITMAP_LIGHT a metre over B, FLARE_BLUE ground marks 4 and 6 tiles wide tinted a Light that falls
 * from 1.2 by /1.05 a tick (ZzzEffect.cpp:9214-9240, :10058-10073), the camera shaking to LT 15 and the
 * spray at B. At LT 23 the splashes and cracks (MoveHandlers.cpp:7530-7625). The original's stones there are
 * created at Scale 0 (sub13 multiplies by CreateEffect's Scale, 0 here: ZzzEffect.cpp:2700-2710) and never show.
 */
const blowOfDestruction: Step = (at, c) => {
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const feet = entityPos(c.caster, 0, new Vector3());
  // (-20, -100) in the caster's frame: a metre ahead, 20 cm to its right, (f.z, -f.x).
  const a = new Vector3(feet.x + f.x + f.z * cm(20), feet.y, feet.z + f.z - f.x * cm(20));
  const b = at.clone();
  const tint: RGB = [0.3, 0.3, 1];
  const turn = (): number => Math.random() * Math.PI * 2;
  // The crack streaks on mesh 1 scroll `-(WorldTime % 2000) * 0.0001` in V (ZzzObject.cpp:606-617).
  const streaks = { mesh: 1, at: (now: number): number => -((now * 1000) % 2000) * 0.0001 };
  // The crack meshes are authored flat in MU's XY, so the default (upright) basis is what lays them down.

  after(ticks(16), (_p, cc) => {
    effects.spawn('sprite', cc.scene, a, { texture: TEX.swordEffMono, colour: [0.5, 0.5, 1], size: cm(64) * 3.05, height: cm(65), seconds: ticks(24), fadeTail: 0.1 });
    // L = 1.2 falling /1.05 a tick to 0.37 at LT 0, then cut.
    const light = { seconds: ticks(24), fadeTail: 0.04, decay: DESTRUCTION_LIGHT_DECAY };
    effects.spawn('ring', cc.scene, a, { texture: TEX.flareBlue, colour: [1.2, 1.2, 1.2], scale: 4, fadeColour: true, ...light });
    effects.spawn('sprite', cc.scene, b, { texture: TEX.flare, colour: [0.6, 0.6, 1.2], size: cm(64) * 5, height: 1, ...light });
    effects.spawn('ring', cc.scene, b, { texture: TEX.flareBlue, colour: [1.2, 1.2, 1.2], scale: 6, fadeColour: true, ...light });
    effects.spawn('quake', cc.scene, b, { seconds: ticks(10), min: -0.4, max: 0.3 });
    const spot = new Vector3(b.x, b.y + 0.75, b.z);
    for (let k = 0; k < 10; k++) {
      delay(ticks(k), () => {
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_MIST, count: DESTRUCTION_SPOTS });
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_SPLASH, count: DESTRUCTION_SPOTS });
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_SMOKE, count: DESTRUCTION_SPOTS });
      });
    }
  })(at, c);

  after(ticks(17), (_p, cc) => {
    const splash = (p: Vector3, scale: number): void => {
      effects.spawn('model', cc.scene, p, { model: MODEL.nightwater, scale, colour: tint, yaw: turn(), seconds: ticks(25), fadeTail: 1 });
    };
    splash(a, 0.9);
    splash(a, 0.9);
    effects.spawn('model', cc.scene, a, { model: MODEL.knightPlanCrack, scale: 1.2 + Math.floor(Math.random() * 10) * 0.05, colour: tint, yaw: turn(), height: cm(10), seconds: ticks(25), fadeTail: 1, scrollV: streaks });
    // KNIGHT_PLANCRACK_B every 55 cm from A, one per metre to B plus one: about half the way. Each is turned
    // +90 deg at its init and alternately 10-29 deg either side of the caster's facing.
    const dir = toward(a, b);
    const n = Math.floor(Math.hypot(b.x - a.x, b.z - a.z)) + 1;
    for (let i = 0; i < n; i++) {
      const side = ((10 + Math.floor(Math.random() * 20)) * Math.PI) / 180;
      const p = new Vector3(a.x + dir.x * cm(55) * i, a.y, a.z + dir.z * cm(55) * i);
      effects.spawn('model', cc.scene, p, { model: MODEL.knightPlanCrack2, scale: 1, colour: tint, yaw: yaw + Math.PI / 2 + (i % 2 === 0 ? side : -side), height: cm(15), seconds: ticks(25), fadeTail: 1, scrollV: streaks });
    }
    splash(b, 2);
    splash(b, 1);
    // RAKLION_BOSS_CRACKEFFECT: Scale 0.2 + 1, 30 cm up, alpha -0.03 a tick, so gone after 33 of its 40 ticks.
    effects.spawn('model', cc.scene, b, { model: MODEL.knightPlanCrackGrand, scale: 1.2, colour: tint, yaw: turn(), height: cm(30), seconds: ticks(33), fadeTail: 1 });
  })(at, c);
};

/**
 * The Cold debuff's one look on insert (WSclient.cpp:15631-15634): MODEL_ICE sub0 at the feet, Scale 0.8,
 * BlendMesh 0, LT 50, smoking and fading once its clip passes key 5 (ZzzEffect.cpp:2187-2195, :7637-7661).
 * The body tint, the bright pass and the slowed walk that go with it are common/debuffBody.ts.
 */
function coldIce(scene: Scene, entity: Entity): void {
  const feet = entityPos(entity, 0, new Vector3());
  effects.spawn('model', scene, feet, { model: MODEL.ice, seconds: ticks(50), scale: 0.8, blendMesh: 0, colour: RGBS.white, loop: false, fadeTail: 0.4 });
  // A BITMAP_SMOKE every other tick 32-160 cm up while it fades, its last 20 ticks.
  delay(ticks(30), () => effects.spawn('particles', scene, feet, { recipe: SMOKE, rate: 12.5, seconds: ticks(20), height: 0.96 }));
}

/** MODEL_COMBO's BlendMeshLight /= 1.4 a tick (MoveHandlers.cpp:5260). */
const COMBO_DECAY = 1 / 1.4;
/** The original's 60 BITMAP_LIGHT sub0 rays (WSclient.cpp:4829-4832). */
const COMBO_RAYS = 60;

/**
 * The combo burst at the caster (WSclient.cpp:4829-4832): MODEL_COMBO 50 cm up, unturned, every mesh bright
 * (BlendMesh -2), LT 20, its Scale 0.9 growing by 0.1, 0.2, 0.3... a tick while LT > 4 - 14.5 by tick 16, which
 * `growEase` 2 over the life follows - and its light /1.4 a tick (ZzzEffect.cpp:3159-3175, MoveHandlers.cpp:5251-5263).
 * With it 60 BITMAP_LIGHT sub0 joints (30 here): width 70-109 cm, Light (0.1,0.5,1), a random yaw and `Angle[0] = 30 -
 * rand() % 40` (positive dives), each stepping 10 times a tick 10-19 cm along it for the first 4 ticks and
 * keeping its last 30 steps, then holding until LT 0 (ZzzEffectJoint.cpp:2421-2434, :6453-6468).
 */
const comboBurst: Step = (at, c) => {
  // 0.9 + 0.05 n (n + 1) by tick n, stopping at tick 16 (LT 4): 14.5, 16.1 times the start.
  effects.spawn('model', c.scene, at, { model: MODEL.combo, seconds: ticks(20), scale: 0.9, grow: 16.1, growEase: 2, growUntil: 0.8, decay: COMBO_DECAY, fadeTail: 0.05, colour: RGBS.white });
  // One ribbon mesh for all sixty (effects/rays.ts): each head runs 10 steps a tick for 4 ticks and the last
  // 30 steps (3 ticks) are what is drawn, from 10 to 40 steps out once it stops.
  const rays: Ray[] = [];
  for (let i = 0; i < COMBO_RAYS; i++) {
    const heading = forwardOf(Math.random() * Math.PI * 2);
    const pitch = ((30 - Math.floor(Math.random() * 40)) * Math.PI) / 180;
    rays.push({
      dir: [heading.x * Math.cos(pitch), -Math.sin(pitch), heading.z * Math.cos(pitch)],
      speed: perTick(10 * (10 + Math.floor(Math.random() * 10))),
      width: cm(70 + Math.floor(Math.random() * 40)),
    });
  }
  effects.spawn('rays', c.scene, at, { rays, texture: TEX.flare, colour: [0.1, 0.5, 1], seconds: ticks(20), moveFor: ticks(4), tail: ticks(3), fadeTail: 0.05 });
};

// Enhanced and Ultra: each runs the Classic step above untouched and adds to it.

/** A skill light's anchor held on one point. */
const lightAt = (p: Vector3) => (out: { x: number; y: number; z: number }): void => {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
};

/** Fire Breath's lavender glitter shed along the emitter's path, drifting up as it fades. */
const BREATH_GLITTER: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.75, 1.1],
  colourEnd: [0.12, 0.12, 0.3],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.3,
  box: [0.22, 0.15, 0.22],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1, 1],
  power: 0.5,
  powerJitter: 0.5,
  gravity: 0.5,
  capacity: 128,
};
/** Hot chips out of the closing burst, DinoE's warm rim cooling to its violet. */
const BREATH_BOMB_CHIPS: ParticleRecipe = {
  texture: TEX.spark,
  colour: [1, 0.8, 0.6],
  colourEnd: [0.3, 0.2, 0.5],
  size: 0.12,
  sizeJitter: 0.3,
  life: 0.5,
  lifeJitter: 0.3,
  dir1: [-1, 0.2, -1],
  dir2: [1, 1.2, 1],
  power: 3,
  powerJitter: 0.4,
  gravity: -6,
  spin: 5,
  capacity: 64,
};

/**
 * Fire Breath, graded: the same emitter, puffs, forty sparks and CreateBomb2, with a soft lavender body
 * riding the emitter so the stream reads as one breath, glitter shed along it, and at the burst a flash,
 * hot chips, a smoke puff and a shock on the ground under it. Its lights are the row's `follow` and `bomb`.
 */
const fireBreathPlus: Step = (at, c) => {
  fireBreath(at, c);
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const t0 = fxNow();
  // The emitter's head (fireBreath's `place(20 + 30 k, 0, 50)`), held at its last spot.
  const head: PointSource = out => {
    const d = cm(20) + cm(30) * Math.min(9, (fxNow() - t0) / TICK);
    return out.set(feet.x + f.x * d, feet.y + cm(50), feet.z + f.z * d);
  };
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: [0.24, 0.24, 0.45], size: 0.8, grow: 1.8, seconds: ticks(13), fadeTail: 0.45, follow: head });
  effects.spawn('particles', c.scene, feet, { recipe: BREATH_GLITTER, rate: 75, seconds: ticks(10), follow: head });
  delay(ticks(9), () => {
    const p = head(new Vector3());
    p.y = feet.y + cm(80);
    lighting.skillSpot(c.scene, 49, 'bomb', lightAt(p));
    effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: [0.45, 0.36, 0.6], size: 1.4, seconds: ticks(6), fadeTail: 0.8 });
    effects.spawn('particles', c.scene, p, { recipe: BREATH_BOMB_CHIPS, count: 14 });
    effects.spawn('particles', c.scene, p, { recipe: SMOKE, count: 3 });
    effects.spawn('ring', c.scene, p, { texture: TEX.shockwave, colour: [0.32, 0.28, 0.5], scale: 1.2, grow: 2.4, seconds: ticks(10), fadeColour: true });
  });
};

/** Strike of Destruction's ice chips out of the strike, bright and falling back. */
const DESTRUCTION_CHIPS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [0.75, 0.85, 1.2],
  colourEnd: [0.15, 0.25, 0.6],
  size: 0.11,
  sizeJitter: 0.35,
  life: 0.75,
  lifeJitter: 0.3,
  box: [0.5, 0.05, 0.5],
  dir1: [-1, 1, -1],
  dir2: [1, 2.2, 1],
  power: 3.2,
  powerJitter: 0.4,
  gravity: -9,
  spin: 6,
  capacity: 128,
};
/** Cold breathing off the cracks as they fade. */
const DESTRUCTION_FROST: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.4, 0.9],
  colourEnd: [0.04, 0.06, 0.18],
  size: 0.16,
  sizeJitter: 0.4,
  life: 1,
  lifeJitter: 0.3,
  box: [0.25, 0.02, 0.25],
  dir1: [-0.1, 0.6, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 0.6,
  powerJitter: 0.3,
  gravity: 0.2,
  endScale: 1.8,
  capacity: 128,
};

/**
 * Strike of Destruction, graded: the same controllers, marks, spray and cracks, with the strike landing
 * at B as a short white-blue core, a shock running out over the 6-tile mark and ice chips thrown up (a
 * smaller shock and chips at A), and frost breathing off each crack while it fades. Lights: `a`, `b`
 * over the two marks for their 24 ticks and a `strike` pop at B.
 */
const blowOfDestructionPlus: Step = (at, c) => {
  blowOfDestruction(at, c);
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const a = new Vector3(feet.x + f.x + f.z * cm(20), feet.y, feet.z + f.z - f.x * cm(20));
  const b = at.clone();
  delay(ticks(16), () => {
    lighting.skillSpot(c.scene, 232, 'a', lightAt(a));
    lighting.skillSpot(c.scene, 232, 'b', lightAt(b));
    lighting.skillSpot(c.scene, 232, 'strike', lightAt(b));
    effects.spawn('sprite', c.scene, b, { texture: TEX.flare, colour: [0.4, 0.5, 0.85], size: 1.8, height: 0.8, seconds: ticks(5), fadeTail: 0.8 });
    effects.spawn('ring', c.scene, b, { texture: TEX.shockwave, colour: [0.4, 0.5, 1.1], scale: 2, grow: 3.5, seconds: ticks(12), fadeColour: true });
    effects.spawn('ring', c.scene, a, { texture: TEX.shockwave, colour: [0.3, 0.36, 0.85], scale: 1.2, grow: 3, seconds: ticks(10), fadeColour: true });
    effects.spawn('particles', c.scene, b, { recipe: DESTRUCTION_CHIPS, count: 28 });
    effects.spawn('particles', c.scene, a, { recipe: DESTRUCTION_CHIPS, count: 10 });
  });
  // The crack trail's spots, as blowOfDestruction lays them.
  delay(ticks(17), () => {
    const dir = toward(a, b);
    const n = Math.floor(Math.hypot(b.x - a.x, b.z - a.z)) + 1;
    const p = new Vector3();
    for (let i = 0; i < n; i++) {
      p.set(a.x + dir.x * cm(55) * i, a.y, a.z + dir.z * cm(55) * i);
      effects.spawn('particles', c.scene, p, { recipe: DESTRUCTION_FROST, count: 3 });
    }
    effects.spawn('particles', c.scene, b, { recipe: DESTRUCTION_FROST, count: 8 });
  });
};

/** Combo's chips thrown out of the burst with its rays. */
const COMBO_CHIPS: ParticleRecipe = {
  texture: TEX.spark,
  colour: [0.55, 0.8, 1.2],
  colourEnd: [0.05, 0.2, 0.5],
  size: 0.17,
  sizeJitter: 0.3,
  life: 0.45,
  lifeJitter: 0.3,
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.9, 1],
  power: 5,
  powerJitter: 0.3,
  gravity: -4,
  spin: 4,
  capacity: 64,
};

/**
 * Combo, graded: the same disc and sixty rays, with a white-blue core at the caster, a shock running out
 * on the ground under the rays that dive into it, and chips thrown with them. Its light is the row's `burst`.
 */
const comboBurstPlus: Step = (at, c) => {
  comboBurst(at, c);
  lighting.skillSpot(c.scene, 59, 'burst', out => {
    const p = entityPos(c.caster, cm(50), tmpEmitter);
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  });
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.35, 0.6, 1.1], size: 2.2, grow: 1.5, seconds: ticks(6), fadeTail: 0.9 });
  effects.spawn('ring', c.scene, at, { texture: TEX.shockwave, colour: [0.25, 0.5, 1], scale: 1.5, grow: 4, seconds: ticks(12), fadeColour: true });
  effects.spawn('particles', c.scene, at, { recipe: COMBO_CHIPS, count: 24 });
};

// ---- dk1 steps -------------------------------------------------------------------

/** AttackTime runs from 1 at ReceiveMagic and the hit block fires at 15 (ZzzCharacter.cpp:2615, :4133-4139). */
const BLOW_TICKS = 14;
/** ATTACK_IMPACT_FRAME: a player attack clip past key 5 forces AttackTime to 15 (ZzzCharacter.cpp:2588, :3049-3062). */
const BLOW_KEY = 5;

/**
 * `step` at a sword skill's blow: 14 ticks after the echo, or sooner once the caster's clip passes
 * key 5. A remote caster's clip is applied after the packet handler, so the key counts only once
 * the model plays the clip it was given. Dropped when the caster is no longer in SWORD1..5 by
 * then, CreateSpark's own test (:4884).
 */
const atSwordBlow = (step: Step): Step => (at, c) => {
  const t0 = fxNow();
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const action = m?.CurrentAction ?? -1;
    const inSword = action >= PlayerAction.PLAYER_ATTACK_SKILL_SWORD1 && action <= PlayerAction.PLAYER_ATTACK_SKILL_SWORD5;
    const keyed = inSword && action === c.caster.playerAnimation?.action && m!.actionFrame() >= BLOW_KEY;
    if (keyed || fxNow() - t0 >= ticks(BLOW_TICKS) - 1e-6) {
      if (inSword) step(at, c);
      return;
    }
    delay(TICK / 2, poll);
  };
  poll();
};

/** The row's `strike` light on `on`, riding it at chest height. */
const strikeOn = (scene: Scene, skill: number, on: Entity): void => {
  if (!on.transform) return;
  const p = entityPos(on, IMPACT_HEIGHT, new Vector3());
  lighting.skillStrike(scene, skill, {
    position: { x: p.x, y: p.y, z: p.z },
    follow: out => {
      entityPos(on, IMPACT_HEIGHT, p);
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    },
  });
};

/** Tiles above the target's feet the hit flash sits. */
const SPARK_FLASH_HEIGHT = 0.3;

/**
 * CreateSpark's flash (ZzzEffectBlurSpark.cpp:444-449): BITMAP_SPARK+1 (Spark03, 32 px) at the
 * target's feet, Scale 1 losing 0.5 a tick and gone under 0.2 (ZzzEffectParticle.cpp:6612-6615).
 * Its 20 Spark02 chips are impactVisuals' HIT_SPARKS, thrown by the damage packet.
 */
const swordSpark: Step = (_at, c) => {
  if (!c.target || entityGone(c.target)) return;
  // The original's 32 cm for two ticks, half in the ground, did not read at our camera: 64 cm, three ticks, shin high.
  effects.spawn('sprite', c.scene, entityPos(c.target, SPARK_FLASH_HEIGHT, new Vector3()), { texture: TEX.spark3, size: cm(64), seconds: ticks(3), grow: 0.5, fadeTail: 0 });
};

/** Enhanced: where the blade meets the body - tiles above the target's feet, and out of it toward the caster so the body does not hide the flash. */
const BLOW_HEIGHT = 0.6;
const BLOW_OUT = 0.4;
/** Enhanced: the soft flare round the blow flash. */
const BLOW_HALO: RGB = [0.8, 0.85, 1];
/** Enhanced: the blow's chips (Spark02, as CreateSpark's) off the blow, thrown the way each blade travels: Falling Slash low and wide, Lunge flat and fast, Uppercut a tall fountain. */
const FALLING_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-1.3, -0.2, -1.3], dir2: [1.3, 1.2, 1.3], power: 2.4, gravity: -7, capacity: 96 };
const LUNGE_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.3, dir1: [-2.2, 0.2, -2.2], dir2: [2.2, 1, 2.2], power: 2.2, gravity: -4, capacity: 96 };
const UPPER_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.45, dir1: [-0.7, 3, -0.7], dir2: [0.7, 5.5, 0.7], power: 1, gravity: -11, capacity: 96 };
/** Cyclone's spin sprays its chips in a flat ring all round; Slash's big cut throws a wide fan up and over. */
const CYCLONE_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-2.6, 0, -2.6], dir2: [2.6, 0.7, 2.6], power: 2.4, gravity: -5, capacity: 96 };
const SLASH_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.45, dir1: [-1.8, 0.8, -1.8], dir2: [1.8, 2.6, 1.8], power: 2, gravity: -9, capacity: 96 };

/**
 * Enhanced blow, at the same moment and place as swordSpark: the Spark03 flash hotter inside a soft
 * flare, chips thrown the way the blade travels, and the blow's light on the target (the row's `strike`).
 */
const swordBlowLit = (skill: number, chips: ParticleRecipe): Step => (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target)) return;
  const at = entityPos(target, BLOW_HEIGHT, new Vector3());
  const out = toward(at, entityPos(c.caster, 0, new Vector3()));
  at.x += out.x * BLOW_OUT;
  at.z += out.z * BLOW_OUT;
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: BLOW_HALO, size: 0.7, seconds: 0.2, growFrom: 0.6, grow: 1.1, fadeTail: 0.7 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.spark3, size: 0.75, seconds: ticks(4), growFrom: 1.2, grow: 0.45, fadeTail: 0.3 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.shiny, size: 0.8, seconds: ticks(4), growFrom: 1.3, grow: 0.3, spin: 4, fadeTail: 0.4 });
  effects.spawn('particles', c.scene, at, { recipe: chips, count: 14 });
  strikeOn(c.scene, skill, target);
};

/** The enhanced blow, timed as the Classic one; the skill is read now, before another is dispatched. */
const litBlow = (chips: ParticleRecipe): Step => (at, c) =>
  atSwordBlow(swordBlowLit(baseSkill(currentSkill), chips))(at, c);

/** Seconds into PLAYER_DEFENSE1 the guard is up. */
const GUARD_SET = 0.2;
/** Tiles above the weapon hand the guard glint sits. */
const GUARD_GLINT_UP = 0.3;

/**
 * Enhanced Defense: the original draws nothing, so the guard only gets a steel glint on the
 * weapon hand as it sets, and its light, while the caster is still in the guard.
 */
const guardGlint: Step = (_at, c) => {
  const skill = baseSkill(currentSkill);
  delay(GUARD_SET, () => {
    if (entityGone(c.caster) || c.caster.modelObject?.CurrentAction !== PlayerAction.PLAYER_DEFENSE1) return;
    // Up the raised blade, clear of the body that would clip a glint on the hand itself.
    const follow: PointSource = out => {
      bonePos(c.caster, RIGHT_HAND_BONE, out, CAST_HEIGHT);
      out.y += GUARD_GLINT_UP;
      return out;
    };
    const at = follow(new Vector3());
    effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: RGBS.steel, size: 0.8, seconds: 0.35, growFrom: 0.4, fadeTail: 0.6, follow });
    effects.spawn('sprite', c.scene, at, { texture: TEX.shiny, colour: RGBS.white, size: 0.6, seconds: 0.4, growFrom: 0.3, grow: 0.5, spin: 3, fadeTail: 0.5, follow });
    strikeOn(c.scene, skill, c.caster);
  });
};


/**
 * BITMAP_FIRE sub2, the default branch (ZzzEffectParticle.cpp:387-500, :4690-4698): Fire01's four cells over LT 24,
 * 64 texels x Scale 1.5 = 96 cm, the scale growing by a Gravity that climbs 0.004 a tick (1.5 -> 2.7) and the card
 * rising 12 cm, drifting under 1.6 cm a tick. Light is the spawner's, cached per level.
 */
const RUSH_FIRES = new Map<number, ParticleRecipe>();
function rushFire(light: number): ParticleRecipe {
  let r = RUSH_FIRES.get(light);
  if (!r) {
    r = {
      texture: TEX.fire,
      cells: { w: 64, h: 64, count: 4 },
      colour: [light, light, light],
      colourEnd: [light, light, light],
      size: cm(64) * 1.5,
      sizeJitter: 0,
      life: ticks(24),
      lifeJitter: 0,
      endScale: 1.8,
      box: [0, 0, 0],
      dir1: [-1, -1, -1],
      dir2: [1, 1, 1],
      power: perTick(1.6),
      powerJitter: 1,
      gravity: 0.25,
      capacity: 256,
    };
    RUSH_FIRES.set(light, r);
  }
  return r;
}

/**
 * The Rush spray (ZzzCharacter.cpp:2942-2957, MoveHandlers.cpp:7193-7206): at `p` +-15 cm, four JOINT_SPARK sub0 at
 * `Angle (150..209, 0, yaw)` (backward, pitched +-30 deg), each with a BITMAP_FIRE sub2 of Light `light`.
 */
function rushSpray(scene: Scene, p: Vector3, yaw: number, light: number, hd = false): void {
  const at = new Vector3(p.x + rand(-0.15, 0.15), p.y, p.z + rand(-0.15, 0.15));
  if (hd) {
    rushSprayHd(scene, at, yaw, light);
    return;
  }
  const fire = rushFire(light);
  for (let i = 0; i < 4; i++) {
    effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS, count: 1, heading: sparkHeading(rand(150, 210) * DEG, yaw) });
    effects.spawn('particles', scene, at, { recipe: fire, count: 1 });
  }
}

/**
 * Graded tiers: the Rush fire warmer and smaller, and lifted by its own half height: the 96 cm cards at +20 cm cut a
 * hard line into the ground and 56 of them buried the knight's legs in one orange block.
 */
const RUSH_FIRE_HD: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.72, 0.42],
  colourEnd: [0.85, 0.3, 0.08],
  size: cm(64),
  sizeJitter: 0.2,
  life: ticks(20),
  lifeJitter: 0.2,
  endScale: 1.5,
  box: [0.05, 0, 0.05],
  dir1: [-0.4, 0.6, -0.4],
  dir2: [0.4, 1, 0.4],
  power: perTick(2),
  powerJitter: 0.5,
  gravity: 0.4,
  capacity: 192,
};
/** Graded tiers: embers the Rush throws up and back. */
const RUSH_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.75, 0.4],
  colourEnd: [0.9, 0.25, 0.05],
  size: 0.05,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.4,
  box: [0.15, 0.05, 0.15],
  dir1: [-0.5, 0.8, -0.5],
  dir2: [0.5, 1.6, 0.5],
  power: 1.6,
  powerJitter: 0.5,
  gravity: -2,
  capacity: 256,
};
/** Graded tiers: the spray at Light `light`: the sparks cool white to orange, the fires thin out with the light instead of dimming. */
function rushSprayHd(scene: Scene, at: Vector3, yaw: number, light: number): void {
  for (let i = 0; i < 4; i++) effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS_HD, count: 1, heading: sparkHeading(rand(150, 210) * DEG, yaw) });
  const fires = Math.round(2 * light + Math.random() * 0.5);
  if (fires) effects.spawn('particles', scene, new Vector3(at.x, at.y + cm(32), at.z), { recipe: RUSH_FIRE_HD, count: fires });
  if (Math.random() < light) effects.spawn('particles', scene, at, { recipe: RUSH_EMBERS, count: 2 });
}

/**
 * MODEL_SWORD_FORCE sub0 (ZzzEffect.cpp:4531-4548, MoveHandlers.cpp:7154-7212): SwordForce.glb, one additive mesh,
 * at the feet + 100 cm along the facing, LT 15. Move k (1-15): `Direction[1] -= 2` so it runs 10 + 2k cm; on k 1-3
 * the scale grows 0.9 a tick and a sub1 copy stays behind (scale 3.5, LT 5, BlendMeshLight LT / 10); after that the
 * scale falls 0.05 a tick, BlendMeshLight = Light = LT / 18 and the blade sprays sparks and fire on the ground.
 * AddTerrainLight (1, 0.8, 0.6), range 1, every move. SOUND_BCS_RUSH is only loaded in Battle Castle (MapManager.cpp:277).
 */
function swordForce(c: SkillContext, skill: number, hd = false): void {
  const caster = c.caster;
  const yaw = entityYaw(caster);
  const f = forwardOf(yaw);
  const origin = entityPos(caster, 1, new Vector3());
  const body = terrainLevel(origin.x, origin.z);
  const t0 = fxNow();
  // Where it is after `k` moves: the sum of 10 + 2i cm.
  const blade = (k: number, out: Vector3): Vector3 => {
    const d = cm(10 * k + k * (k + 1));
    return out.set(origin.x + f.x * d, origin.y, origin.z + f.z * d);
  };
  const moves = (): number => 1 + (fxNow() - t0) / TICK;
  if (storeRef().world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) sayAt(c, 'Sound/battlecastle/sCHaveyBlow');
  // BodyLight (terrain + Light) x BlendMeshLight, clamped: Light and BlendMeshLight are 1, then LT / 18.
  const level = (k: number): number => (k <= 3 ? 1 : (16 - k) / 18);
  effects.spawn('model', c.scene, blade(1, new Vector3()), {
    model: MODEL.swordForce,
    seconds: ticks(14),
    fadeTail: 0,
    plainColour: hd,
    follow: out => blade(moves(), out),
    rotate: out => muAngles(out, 0, 0, yaw),
    scaleAt: t => {
      const k = 1 + t / TICK;
      return k <= 3 ? 0.9 * k : 2.7 - 0.05 * (k - 3);
    },
    intensity: t => {
      const l = level(Math.floor(1 + t / TICK + 1e-3));
      return Math.min(1, (body + l) * l);
    },
  });
  lighting.skillBody(c.scene, skill, 'force', out => {
    const p = blade(Math.min(15, moves()), tmpForce);
    out.x = p.x;
    out.y = p.y - 1;
    out.z = p.z;
  });
  if (hd) swordForceHd(c, blade, moves, yaw, level);
  for (let k = 1; k <= 15; k++) {
    delay(ticks(k - 1), () => {
      const p = blade(k - 1, new Vector3());
      if (k <= 3) {
        // The sub1 copy left where the blade was: scale 3.5, BlendMeshLight 0.5 -> 0.1 (MoveHandlers.cpp:7200-7207).
        effects.spawn('model', c.scene, p, {
          model: MODEL.swordForce,
          seconds: ticks(5),
          scale: 3.5,
          fadeTail: 0,
          plainColour: hd,
          rotate: out => muAngles(out, 0, 0, yaw),
          intensity: t => {
            const l = (5 - Math.floor(t / TICK + 1e-3)) / 10;
            return Math.min(1, (body + l) * l);
          },
        });
        return;
      }
      p.y -= 1;
      rushSpray(c.scene, p, yaw, level(k), hd);
    });
  }
}
const tmpForce = new Vector3();

/**
 * Graded tiers, riding the sword force: a warm glow on the blade that dims with its BlendMeshLight, a scorch streak
 * along the ground it runs over and hot chips off its leading edge.
 */
function swordForceHd(c: SkillContext, blade: (k: number, out: Vector3) => Vector3, moves: () => number, yaw: number, level: (k: number) => number): void {
  const at = blade(1, new Vector3());
  const follow: PointSource = out => blade(Math.min(15, moves()), out);
  effects.spawn('sprite', c.scene, at, {
    texture: TEX.flare,
    colour: [0.9, 0.55, 0.22],
    size: 1.6,
    seconds: ticks(14),
    fadeTail: 0,
    follow,
    intensity: p => level(Math.floor(1 + p * 14)),
  });
  effects.spawn('joint', c.scene, at, {
    head: out => follow(out).set(out.x, out.y - 0.95, out.z),
    maxTails: 12,
    smooth: 2,
    taper: true,
    width: 0.7,
    colour: [0.75, 0.38, 0.12],
    texture: TEX.flare2,
    seconds: ticks(20),
    fadeTail: 0.4,
  });
  const f = forwardOf(yaw);
  for (let k = 2; k <= 12; k += 2) {
    delay(ticks(k - 1), () => {
      const p = blade(k, new Vector3());
      p.set(p.x + f.x * 0.3, p.y - 0.9, p.z + f.z * 0.3);
      effects.spawn('particles', c.scene, p, { recipe: SPARK_CHIPS_HD, count: Math.round(6 * level(k)) + 1 });
    });
  }
}

/**
 * Crescent Moon Slash (Rush). ReceiveMagic plays SOUND_SKILL_SWORD2 (WSclient.cpp:4502-4506, sound/combat.ts). Every
 * tick of the charge the spray rises 20 cm over the feet (ZzzCharacter.cpp:2934-2958) until the clip passes key 5 or
 * AttackTime reaches 15 by itself (14 ticks at base speed); that tick the sword force leaves (:4686-4689).
 */
const crescentMoonSlashOf = (hd: boolean): Step => (at, c) => {
  const caster = c.caster;
  const skill = baseSkill(currentSkill);
  const t0 = fxNow();
  let n = 0;
  let seen = false;
  // Graded tiers: the charge lights the knight's feet and a hot glow gathers on the ground under him until the force leaves.
  let charge: ReturnType<typeof lighting.skillBody> = null;
  let glow: EffectHandle | null = null;
  if (hd) {
    const feet: PointSource = out => entityPos(caster, 0.1, out);
    charge = lighting.skillBody(c.scene, skill, 'charge', out => {
      if (entityGone(caster)) return;
      const p = feet(tmpForce);
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    });
    glow = effects.spawn('sprite', c.scene, feet(new Vector3()), {
      texture: TEX.flare,
      colour: [1, 0.5, 0.18],
      size: 1.8,
      seconds: ticks(20),
      flat: true,
      sizeAt: p => 0.6 + 0.4 * Math.min(1, p * 2),
      fadeTail: 0.3,
      follow: feet,
    });
  }
  const tick = (): void => {
    if (entityGone(caster)) return;
    const m = caster.modelObject;
    const inClip = !!m && m.CurrentAction === PlayerAction.PLAYER_ATTACK_RUSH;
    seen ||= inClip;
    rushSpray(c.scene, entityPos(caster, cm(20), new Vector3()), entityYaw(caster), 1, hd);
    if ((inClip && m!.actionFrame() > 5) || (seen && !inClip) || n >= 13) {
      charge?.stop();
      glow?.stop();
      swordForce(c, skill, hd);
      return;
    }
    n++;
    delay(t0 + ticks(n) - fxNow(), tick);
  };
  tick();
};
const crescentMoonSlash = crescentMoonSlashOf(false);

/** One BITMAP_JOINT_HEALING sub6 of the Impale gather: where it starts, its heading and the tick it was born. */
interface SpearThread {
  from: Vector3;
  dir: Vector3;
  born: number;
}
/**
 * Impale's gather (MoveHandlers.cpp:670-690; ZzzEffectJoint.cpp:481-504, :3632-3690): MODEL__SPEAR, never drawn, sits
 * where `Weapon[0]`'s link bone was at t4 for LT 5 and sends three JOINT_HEALING sub6 a tick at it from 100 cm out,
 * `Angle (0..89, 0, 0..359)` (the upper half). JointEnergy01, Light (1, 1, 0.5), 5 cm, LT 12, four tails; the head
 * goes 2 cm a tick faster each move from rest, through the point and on. From LT 10 each joint lights a Shiny02
 * glint at the point, `(6 - |LT - 6|) x 0.15` bright and 0.4-0.75 of 32 x 64 texels.
 */
function spearGather(c: SkillContext, at: Vector3, hd = false): void {
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);
  const threads: SpearThread[] = [];
  for (let b = 0; b < 5; b++) {
    for (let j = 0; j < 3; j++) {
      const dir = sparkHeading(rand(0, 90) * DEG, rand(0, 360) * DEG);
      threads.push({ from: at.subtract(dir), dir, born: b });
    }
  }
  const head = (s: SpearThread, m: number, out: Vector3): Vector3 => {
    const d = cm(m * (m - 1));
    return out.set(s.from.x + s.dir.x * d, s.from.y + s.dir.y * d, s.from.z + s.dir.z * d);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: threads.length,
      fill: (k, j, out) => {
        const s = threads[k];
        const m = tickOf() - s.born + 1;
        if (m < 1 || m > 13) return 0;
        head(s, Math.max(0, m - j), out);
        return 1;
      },
    },
    maxTails: 3,
    seconds: ticks(4 + 13),
    width: cm(5),
    fadeTail: 0,
    colour: [1, 1, 0.5],
    texture: TEX.jointEnergy,
  });
  for (const s of threads) {
    delay(ticks(s.born + 2), () => {
      effects.spawn('sprite', c.scene, at, {
        texture: TEX.shiny2,
        size: cm(32) * rand(0.4, 0.75),
        aspect: 2,
        seconds: ticks(11),
        fadeTail: 0,
        intensity: p => (6 - Math.abs(10 - Math.floor(p * 11) - 6)) * 0.15,
      });
    });
  }
  if (hd) {
    // Graded tiers: the point swells gold as the threads pass through it, with motes around it and its light.
    effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [1, 0.78, 0.4], size: 1.1, seconds: ticks(12), sizeAt: p => 0.3 + 0.7 * Math.min(1, p * 2), fadeTail: 0.4 });
    effects.spawn('particles', c.scene, at, { recipe: IMPALE_MOTES, rate: 50, seconds: ticks(7) });
    lighting.skillBody(c.scene, baseSkill(currentSkill), 'gather', out => {
      out.x = at.x;
      out.y = at.y;
      out.z = at.z;
    });
  }
}

/** Graded tiers: gold motes around Impale's gathering point, and the sparks the cone throws forward. */
const IMPALE_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.88, 0.5],
  colourEnd: [1, 0.45, 0.1],
  size: 0.06,
  sizeJitter: 0.4,
  life: 0.3,
  lifeJitter: 0.3,
  box: [0.3, 0.3, 0.3],
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  power: 0.6,
  capacity: 128,
};
const CONE_SPARKS: ParticleRecipe = {
  ...JOINT_SPARKS,
  colour: [1, 0.9, 0.7],
  colourEnd: [1, 0.5, 0.15],
  size: 0.03,
  life: 0.35,
  lifeJitter: 0.4,
  box: [0.25, 0.25, 0.25],
  dir1: [-0.25, -0.25, -0.25],
  dir2: [0.25, 0.25, 0.25],
  power: 7,
  powerJitter: 0.5,
  capacity: 256,
};
/** Graded tiers: the spears' comet streak and their tint, RidingSpear01's own blue-white. */
const SPEAR_STREAK: RGB = [0.3, 0.42, 0.85];
const SPEAR_TINT_HD: RGB = [0.38, 0.45, 0.65];

/** One BITMAP_FLARE sub4 of the Impale cone: its MODEL_SPEAR emitter, the facing, the tick it was born and its `Direction[0]`. */
interface ConeFlare {
  emitter: Vector3;
  yaw: number;
  born: number;
  phase: number;
}
/**
 * RenderJoints' U for tail j is `(NumTails - j) / (MaxTails - 1)` (ZzzEffectJoint.cpp:7087-7091) while `paths` puts slot i
 * at `1 - i / (MaxTails - 1)`: a joint still filling starts at slot `MaxTails - 1 - NumTails`, the slots before it closed on its head.
 */
const tailOfSlot = (i: number, numTails: number, maxTails: number): number => Math.max(0, i - (maxTails - 1 - numTails));
/** BITMAP_FLARE sub4's life and tails (ZzzEffectJoint.cpp:1905-1914): 110, spent 2 sub-steps on the birth tick, 12 on each after. */
const CONE_LIFE = 110;
const CONE_TAILS = 200;
const coneSubSteps = (age: number): number => 2 + 12 * age;
const CONE_TICKS = 10;

/**
 * Impale's cone (ZzzCharacter.cpp:2720-2731; EffectBehaviors.cpp:87-95; ZzzEffectJoint.cpp:1883-1921, :5570-5604):
 * two MODEL_SPEAR emitters, never drawn, 50 cm ahead and 110 cm up for LT 10, each leaving a white BITMAP_FLARE sub4
 * (Flare.jpg, width 50) a tick. A flare's centre walks 2 cm a sub-step along the facing while its head circles the
 * side/up plane at `(LT + 40) x 0.65` cm (97 -> 26), 0.1 rad a sub-step; MaxTails 200 keeps its whole path.
 */
function spearCone(c: SkillContext, hd = false): void {
  const caster = c.caster;
  const yaw = entityYaw(caster);
  const f = forwardOf(yaw);
  const emitter = entityPos(caster, cm(110), new Vector3());
  emitter.x += f.x * cm(50);
  emitter.z += f.z * cm(50);
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);
  const flares: ConeFlare[] = [];
  for (let k = 0; k < DRILL_EMITTER_TICKS; k++) {
    for (let e = 0; e < 2; e++) flares.push({ emitter, yaw, born: k, phase: Math.floor(Math.random() * 360) });
  }
  const sx = Math.cos(yaw);
  const sz = Math.sin(yaw);
  const head = (d: ConeFlare, a: number, out: Vector3): Vector3 => {
    const lifeTime = CONE_LIFE - a;
    const r = Math.max(lifeTime + 40, 10) * 0.65;
    const turn = (d.phase + lifeTime) * 0.1;
    const side = cm(-Math.cos(turn) * r);
    const walk = cm(2 * (a + 1));
    return out.set(d.emitter.x + f.x * walk + sx * side, d.emitter.y + cm(Math.sin(turn) * r), d.emitter.z + f.z * walk + sz * side);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: flares.length,
      fill: (k, j, out) => {
        const d = flares[k];
        const age = tickOf() - d.born;
        if (age < 0 || age >= CONE_TICKS) return 0;
        const n = coneSubSteps(age);
        head(d, Math.max(0, n - 1 - tailOfSlot(j, n, CONE_TAILS)), out);
        return 1;
      },
    },
    maxTails: CONE_TAILS - 1,
    seconds: ticks(DRILL_EMITTER_TICKS + CONE_TICKS),
    width: cm(50),
    fadeTail: 0,
    colour: RGBS.white,
    texture: TEX.flareBig,
  });
  if (!hd) return;
  // Graded tiers: sparks flung forward off the spiral while it runs, and the cone's warm light at its middle.
  const heading = new Vector3(f.x, 0, f.z);
  for (let k = 0; k < DRILL_EMITTER_TICKS + 2; k++) {
    delay(ticks(k), () => {
      if (entityGone(caster)) return;
      const p = new Vector3(emitter.x + f.x * 0.6, emitter.y, emitter.z + f.z * 0.6);
      effects.spawn('particles', c.scene, p, { recipe: CONE_SPARKS, count: 3, heading });
    });
  }
  const mid = new Vector3(emitter.x + f.x * 1.1, emitter.y, emitter.z + f.z * 1.1);
  lighting.skillBody(c.scene, baseSkill(currentSkill), 'cone', out => {
    out.x = mid.x;
    out.y = mid.y;
    out.z = mid.z;
  });
}

/**
 * Impale's AttackStage (ZzzCharacter.cpp:2702-2760), `t` = AttackTime (1 at the packet): t4 the gather at the weapon's
 * link bone, t8 the cone, t10 SOUND_RIDINGSPEAR, t13 and t14 three MODEL_SPEARSKILL each (ZzzEffect.cpp:641-646,
 * :8683-8694): RidingSpear01 at Scale 1.5, 145 cm ahead and 110 cm up +-30 cm, drawn RENDER_BRIGHT at 0.3 grey x
 * LT x 0.05, drifting 5 cm a tick along the facing. No light. The mounted cast's glint and swing are the cast's
 * (skillCastSystem warriorCast).
 */
const impaleOf = (hd: boolean): Step => (at, c) => {
  const caster = c.caster;
  delay(ticks(3), () => {
    if (!entityGone(caster)) spearGather(c, bonePos(caster, WEAPON_LINK_BONE, new Vector3(), CAST_HEIGHT), hd);
  });
  delay(ticks(7), () => {
    if (!entityGone(caster)) spearCone(c, hd);
  });
  delay(ticks(9), () => {
    if (!entityGone(caster)) sayAt(c, 'Sound/eRidingSpear');
  });
  for (const t of [13, 14]) {
    delay(ticks(t - 1), () => {
      if (entityGone(caster)) return;
      const yaw = entityYaw(caster);
      const f = forwardOf(yaw);
      for (let i = 0; i < 3; i++) {
        const start = entityPos(caster, cm(110) + rand(-0.3, 0.3), new Vector3());
        start.x += f.x * cm(145) + rand(-0.3, 0.3);
        start.z += f.z * cm(145) + rand(-0.3, 0.3);
        const t1 = fxNow();
        const follow: PointSource = out => {
          const d = perTick(5) * (fxNow() - t1 + TICK);
          return out.set(start.x + f.x * d, start.y, start.z + f.z * d);
        };
        effects.spawn('model', c.scene, start, {
          model: MODEL.ridingSpear,
          seconds: ticks(20),
          scale: 1.5,
          colour: hd ? SPEAR_TINT_HD : [0.3, 0.3, 0.3],
          plainColour: hd,
          fadeTail: 1,
          rotate: out => muAngles(out, 0, 0, yaw),
          follow,
        });
        if (hd) {
          // Graded tiers: each spear draws a short blue-white streak behind it.
          effects.spawn('joint', c.scene, start, {
            head: follow,
            maxTails: 6,
            taper: true,
            width: 0.3,
            colour: SPEAR_STREAK,
            texture: TEX.flare2,
            seconds: ticks(16),
            fadeTail: 0.6,
          });
        }
      }
      if (hd && t === 13) {
        // Graded tiers: the thrust lands as a blue-white flash ahead of the knight, and the spears carry their light.
        const tip = entityPos(caster, cm(110), new Vector3());
        tip.x += f.x * cm(145);
        tip.z += f.z * cm(145);
        effects.spawn('sprite', c.scene, tip, { texture: TEX.flare, colour: [0.4, 0.5, 0.85], size: 1.1, seconds: ticks(6), grow: 1.4, fadeTail: 0.7 });
        const t1 = fxNow();
        lighting.skillBody(c.scene, baseSkill(currentSkill), 'spears', out => {
          const d = perTick(5) * (fxNow() - t1 + TICK);
          out.x = tip.x + f.x * d;
          out.y = tip.y;
          out.z = tip.z + f.z * d;
        });
      }
    });
  }
};
const impale = impaleOf(false);

/** JOINT_SPIRIT sub2's life, tails and speed (ZzzEffectJoint.cpp:668-679, :3935-3945): 21 moves, Velocity 50 then +5 a move. */
const SPIRIT_MOVES = 21;
const spiritReach = (m: number): number => cm(50 * m + 2.5 * m * (m - 1));
/** One BITMAP_FLARE sub2 of the Swell Life column: its spot under the feet, LifeTime and first `Direction[2]`. */
interface RisingFlare {
  x: number;
  z: number;
  life: number;
  rise: number;
}
/** Swell Life casts a caster has pending: a packet restarts `AttackTime`, so only the latest one bursts. */
const swellLifePending = new WeakMap<Entity, number>();

/**
 * The Swell Life burst (ZzzCharacter.cpp:4190-4213), from the caster + 100 cm:
 * - 36 JOINT_SPIRIT sub2 at `Angle (-10, 0, i x 10)`: JointSpirit01, width 60, three tails, Light 0.5 then x 1/1.2 a
 *   move once LT < 10. Each move the head draws a flare01 BITMAP_LIGHT of scale `4 + (20 - LT) / 5`, (1, 0.5, 0.1)
 *   while LT >= 10 and the joint's own grey after (ZzzEffectJoint.cpp:3895-3947).
 * - At LT 19 each spawns a BITMAP_FLARE sub2 +-100 cm around, 100 cm under the feet: Flare.jpg, white, width 40, 20
 *   tails, LT 25-74, still until LT 25, then up `Direction[2] + 5` a tick from 35-54 (ZzzEffectJoint.cpp:1786-1798, :5455-5462).
 * - Joints 0 and 20 put a BITMAP_MAGIC+1 sub4 at the feet: Magic_Ground2 2-4 tiles across, turned 0 and -200 deg,
 *   LT 40, (1, 0.5, 0.1) x `sin((60 - LT) x 0.05) + 0.5`, the last four ticks 0.8..0.2 (ZzzEffect.cpp:1188-1195, :9787-9882).
 */
function swellLifeBurst(c: SkillContext, hd = false): void {
  const caster = c.caster;
  sayAt(c, 'Sound/eSwellLife');
  const origin = entityPos(caster, 1, new Vector3());
  const feet = entityPos(caster, 0, new Vector3());
  const t0 = fxNow();
  const moves = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3) + 1;
  const headings = Array.from({ length: 36 }, (_, i) => sparkHeading(-10 * DEG, i * 10 * DEG));
  const spirit = (i: number, m: number, out: Vector3): Vector3 => {
    const h = headings[i];
    const d = spiritReach(Math.max(0, m));
    return out.set(origin.x + h.x * d, origin.y + h.y * d, origin.z + h.z * d);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: headings.length,
      fill: (k, j, out) => {
        const m = moves();
        if (m > SPIRIT_MOVES) return 0;
        spirit(k, m - j, out);
        return hd ? (SPIRIT_SPINDLE_HD[j] ?? 0) : 1;
      },
    },
    maxTails: 2,
    seconds: ticks(SPIRIT_MOVES),
    width: hd ? SPIRIT_WIDTH_HD : cm(60),
    // Light x 1/1.2 a move over the last 10 of 21, drawn as a linear fade.
    fadeTail: 10 / SPIRIT_MOVES,
    colour: hd ? SPIRIT_TINT_HD : [0.5, 0.5, 0.5],
    texture: TEX.jointSpirit,
  });
  const headSize = cm(64) * (hd ? SPIRIT_HEAD_HD : 1);
  for (let i = 0; i < headings.length; i++) {
    const follow: PointSource = out => spirit(i, Math.min(SPIRIT_MOVES, moves()), out);
    effects.spawn('sprite', c.scene, origin, { texture: TEX.flare, colour: hd ? SPIRIT_GLOW_HD : [1, 0.5, 0.1], size: headSize, seconds: ticks(11), fadeTail: 0, follow, sizeAt: p => 4 + Math.floor(p * 11) / 5 });
    delay(ticks(11), () =>
      effects.spawn('sprite', c.scene, origin, {
        texture: TEX.flare,
        colour: hd ? SPIRIT_FADE_HD : [0.5, 0.5, 0.5],
        size: headSize,
        seconds: ticks(10),
        fadeTail: 0,
        follow,
        sizeAt: p => 4 + (11 + Math.floor(p * 10)) / 5,
        intensity: p => Math.pow(1 / 1.2, 1 + Math.floor(p * 10)),
      })
    );
  }
  const flares: RisingFlare[] = headings.map(() => ({ x: origin.x + rand(-1, 1), z: origin.z + rand(-1, 1), life: 25 + Math.floor(Math.random() * 50), rise: 35 + Math.floor(Math.random() * 20) }));
  const floor = origin.y - 2;
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: flares.length,
      fill: (k, j, out) => {
        const fl = flares[k];
        // Born on the joint's second move; moves once a tick from the next.
        const age = moves() - 2;
        if (age < 0 || age > fl.life) return 0;
        const r = Math.min(26, Math.max(0, age - tailOfSlot(j, Math.min(20, age + 1), 20) - (fl.life - 25)));
        out.set(fl.x, floor + cm(r * fl.rise + 2.5 * r * (r + 1)), fl.z);
        return 1;
      },
    },
    maxTails: 19,
    seconds: ticks(2 + 75),
    width: cm(40),
    fadeTail: 0,
    colour: RGBS.white,
    texture: TEX.flareBig,
  });
  const pulse = (t: number): number => {
    const lifeTime = 39 - Math.floor(t / TICK + 1e-3);
    return lifeTime < 5 ? 1 - (5 - lifeTime) * 0.2 : Math.sin((60 - lifeTime) * 0.05) + 0.5;
  };
  for (const turn of [0, -200]) {
    effects.spawn('ring', c.scene, feet, { texture: TEX.magicGround2, colour: [1, 0.5, 0.1], seconds: ticks(40), scale: rand(2, 4), spinFrom: turn, fadeTail: 0, brightness: pulse });
  }
  if (hd) swellLifeHd(c, origin, feet);
}

/**
 * Graded tiers: 36 flare01 cards 2.5-5 m across summed to a yellow sheet over the whole screen and the grey spirit
 * bands to a white disc 8 m wide; the same heads a third the size in a deeper orange, the bands narrower and warm.
 */
const SPIRIT_HEAD_HD = 0.3;
const SPIRIT_GLOW_HD: RGB = [1, 0.42, 0.08];
const SPIRIT_FADE_HD: RGB = [0.55, 0.32, 0.12];
const SPIRIT_TINT_HD: RGB = [0.45, 0.32, 0.17];
const SPIRIT_WIDTH_HD = cm(40);
/** JointSpirit01 is bright up to its head end and its long edges: pinched at both ends, a band reads as a blade, not a pane. */
const SPIRIT_SPINDLE_HD = [0.3, 1, 0.2];
/** Graded tiers: gold motes rising with the column. */
const SWELL_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.85, 0.5],
  colourEnd: [1, 0.45, 0.1],
  size: 0.07,
  sizeJitter: 0.4,
  life: 1.2,
  lifeJitter: 0.4,
  box: [1, 0.1, 1],
  dir1: [-0.1, 1, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 2.5,
  powerJitter: 0.6,
  gravity: 0.5,
  capacity: 160,
};
/** Graded tiers: the burst's flash on the knight, the motes, and the lights of the ring, the ground marks and the column. */
function swellLifeHd(c: SkillContext, origin: Vector3, feet: Vector3): void {
  const skill = baseSkill(currentSkill);
  effects.spawn('sprite', c.scene, origin, { texture: TEX.flare, colour: [1, 0.55, 0.18], size: 2.6, seconds: ticks(8), grow: 1.5, growFrom: 0.4, fadeTail: 0.7 });
  delay(ticks(2), () => effects.spawn('particles', c.scene, feet, { recipe: SWELL_MOTES, rate: 45, seconds: ticks(45) }));
  const at = (p: Vector3) => (out: { x: number; y: number; z: number }) => {
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  };
  lighting.skillBody(c.scene, skill, 'burst', at(origin));
  lighting.skillBody(c.scene, skill, 'ground', at(feet));
  delay(ticks(2), () => lighting.skillBody(c.scene, skill, 'column', at(feet)));
}

/**
 * Swell Life (48, 356, 360, 363): ReceiveMagic starts PLAYER_SKILL_VITALITY with AttackTime 1 (WSclient.cpp:4800-4814).
 * The burst fires at AttackTime 10 while the knight is still in the clip, else when AttackTime reaches 15 by itself
 * (ZzzCharacter.cpp:2851-2858).
 */
const swellLifeOf = (hd: boolean): Step => (_at, c) => {
  const caster = c.caster;
  const token = (swellLifePending.get(caster) ?? 0) + 1;
  swellLifePending.set(caster, token);
  const fire = (): void => {
    if (entityGone(caster) || swellLifePending.get(caster) !== token) return;
    swellLifeBurst(c, hd);
  };
  delay(ticks(9), () => {
    if (caster.modelObject?.CurrentAction === PlayerAction.PLAYER_SKILL_VITALITY) fire();
    else delay(ticks(5), fire);
  });
};
const swellLife = swellLifeOf(false);

/** Blood Storm's crimson: Double Blade's red trail Light (1,0.2,0.2) a shade darker under the bloom (ZzzCharacter.cpp:3950-3953). */
const BLOOD_STORM_RED: RGB = [0.9, 0.18, 0.12];

/**
 * Blood Storm (344; 346 by alias). No client of record has it: sven, MuOnlineClient and Source Main 5.2
 * stop the Blade Master ids at 338 and have no case for it, so this is a renewed look built from original
 * art only, for the user to sign off. At the target: MODEL_STORM (Storm01) turned into a crimson vortex,
 * four joint_sword_red ribbons spiralling up round it the way JOINT_HEALING sub10 does, and a blood spray at
 * chest height. The caster spins through the Twisting Slash clip; no light (a dark red one would not read).
 */
const bloodStorm: Step = (at, c) => bloodStormWith(at, c, 1);
/** `smooth`: curve pieces per tick on the ribbons (1, the Classic, draws each tick as a straight chord). */
const bloodStormWith = (at: Vector3, c: SkillContext, smooth: number): void => {
  // Scale 0.45: at the 0.8 first tried, Storm01 stood as a red beam off the top of the screen.
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(30), colour: BLOOD_STORM_RED, alpha: 0.7, spin: 10, scale: 0.45, fadeIn: 0.15, fadeTail: 0.4 });
  for (let i = 0; i < 4; i++) {
    const phase = (i * Math.PI) / 2;
    const t0 = fxNow();
    const head: PointSource = out => {
      const t = fxNow() - t0;
      const a = phase + t * 10;
      return out.set(at.x + Math.cos(a) * cm(80), at.y + 0.2 + t * 2, at.z + Math.sin(a) * cm(80));
    };
    effects.spawn('joint', c.scene, at, { head, maxTails: 12, width: 0.3, colour: [1, 0.2, 0.2], seconds: ticks(20), texture: TEX.jointFire, ...(smooth > 1 ? { smooth } : {}) });
  }
  particles({ recipe: BLOOD_CHIPS, count: 30, height: 0.9 })(at, c);
  particles({ recipe: BLOOD_MIST, count: 6, height: 0.9 })(at, c);
};

/** Crimson embers flung off the turning vortex. */
const STORM_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.38, 0.26],
  colourEnd: [0.3, 0.02, 0.02],
  size: 0.14,
  sizeJitter: 0.4,
  life: 0.5,
  lifeJitter: 0.3,
  box: [0.6, 0.6, 0.6],
  dir1: [-1, 0.2, -1],
  dir2: [1, 1, 1],
  power: 2.6,
  powerJitter: 0.4,
  gravity: -3,
  spin: 5,
  capacity: 64,
};

/**
 * Blood Storm, graded: the same vortex, ribbons and spray, over a shade of the vortex so the crimson
 * reads on a sunlit floor, with an inner vortex turning the other way, a first crimson pulse and shock,
 * embers and blood flung off it while it turns and a spatter left on the ground. Its light is `storm`.
 */
const bloodStormPlus: Step = (at, c) => {
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(30), colour: [0.6, 0.6, 0.6], blend: 'subtract', maxCover: 0.4, spin: 10, scale: 0.45, fadeIn: 0.15, fadeTail: 0.4 });
  // The ribbons as curves: turning 0.4 rad a tick, the Classic's chords read as a polygon.
  bloodStormWith(at, c, 4);
  lighting.skillSpot(c.scene, 344, 'storm', lightAt(at.clone()));
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(26), colour: [1, 0.3, 0.18], alpha: 0.6, spin: -14, scale: 0.3, fadeIn: 0.1, fadeTail: 0.45 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.55, 0.1, 0.06], size: 1.6, height: 0.9, seconds: ticks(6), fadeTail: 0.9 });
  effects.spawn('ring', c.scene, at, { texture: TEX.shockwave, colour: [0.7, 0.12, 0.08], scale: 1, grow: 2.5, seconds: ticks(14), fadeColour: true });
  effects.spawn('ring', c.scene, at, { texture: TEX.blood, colour: RGBS.gore, blend: 'alpha', scale: 1.4, grow: 1.5, spin: 40, seconds: ticks(40), fadeTail: 0.5 });
  effects.spawn('particles', c.scene, at, { recipe: STORM_EMBERS, rate: 45, seconds: ticks(22), height: 0.2 });
  effects.spawn('particles', c.scene, at, { recipe: BLOOD_CHIPS, rate: 30, seconds: ticks(18), height: 0.9 });
};

// ---- sum2 summons: 223 Explosion, 224 Requiem, 225 Pollution (SummonSystem.cpp CastSummonSkill) ------

/** The book's tier: `Weapon[1].Level` >= 11 is 2, >= 7 is 1, else 0 (SummonSystem.cpp:128-135). */
function bookTier(e: Entity): number {
  const lvl = e.charAppearance?.leftHand?.lvl ?? 0;
  return lvl >= 11 ? 2 : lvl >= 7 ? 1 : 0;
}


/** The facing yaw that walks from `from` to `to` (the inverse of `forwardOf`). */
const yawToward = (from: Vector3, to: Vector3): number => Math.atan2(to.x - from.x, -(to.z - from.z));

/** CreateCastingEffect's Lights: BITMAP_MAGIC sub9, CASTING_EFFECT1 / 11 / 111, 2 / 22 / 222 and 4 (SummonSystem.cpp:200-272). */
interface SummonCast {
  impact: RGB;
  outer: RGB;
  inner: RGB;
  burst: RGB;
}

const CAST_EXPLOSION: SummonCast = { impact: [1, 0.6, 0.4], outer: [1, 0.5, 0], inner: [1, 0.5, 0], burst: [1, 0.5, 0.8] };
const CAST_REQUIEM: SummonCast = { impact: [0.7, 0.7, 1], outer: [0, 0.7, 1], inner: [0, 0, 1], burst: [0.8, 0.5, 1] };
const CAST_POLLUTION: SummonCast = { impact: [0.6, 0.6, 0.9], outer: [0.6, 0.3, 0.9], inner: [0.8, 0.1, 0.6], burst: [0.9, 0.1, 1] };

/** BITMAP_MAGIC sub10's Alpha at tick `n`: +0.05 to 1, then -0.03 a tick from LT 20 (MoveHandlers.cpp:1386-1390). */
const castPoolAlpha = (n: number): number => (n < 24 ? Math.min(1, 0.05 * n) : 1 - 0.03 * (n - 24));
/** Ticks each of sub10's five flare01 layers is drawn: layer i drops out below LT 3i (ZzzEffect.cpp:9759-9771). */
const CAST_POOL_LAYERS = [44, 41, 38, 35, 32];

/**
 * CreateCastingEffect at the caster's feet (SummonSystem.cpp:200-272). BITMAP_MAGIC sub10: flare01 on
 * the terrain, 12 tiles, subtractive white, up to five layers deep (LT 44, ZzzEffect.cpp:1163-1168,
 * :9759-9771). Sub9: empact01 at 2.4 and 2.88 tiles in the first Light, turning -8 and +4 deg a tick,
 * full from the start and fading over the last 20 of its 40 ticks (:1157-1162, :9746-9752,
 * MoveHandlers.cpp:1373-1380). The CASTING_EFFECT models: 1 / 11 / 111 and 2 / 22 / 222 at Scale 0.9
 * (the `if (o->SubType = 0)` typo keeps the default), BlendMeshLight +0.05 a tick to 0.5 and -0.03 a
 * tick from LT 20, turning 3 deg a tick; 4 at LT 25 growing 0.6 a tick, up to 0.25 over 5 ticks and
 * dark by tick 13 (ZzzEffect.cpp:759-782, MoveHandlers.cpp:1133-1165). All lit terrain + Light.
 */
const summonCast = (k: SummonCast): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  for (const life of CAST_POOL_LAYERS) {
    ring({ texture: TEX.flare, colour: RGBS.white, scale: 12, seconds: ticks(life), blend: 'subtract', spinFrom: (-yaw * 180) / Math.PI, alphaAt: p => castPoolAlpha(p * life) })(feet, c);
  }
  ring({ texture: TEX.empact, colour: k.impact, scale: 2.4, seconds: ticks(40), spin: -8 * 25, alphaAt: p => Math.min(1, (1 - p) * 2) })(feet, c);
  ring({ texture: TEX.empact, colour: k.impact, scale: 2.88, seconds: ticks(40), spin: 4 * 25, alphaAt: p => Math.min(1, (1 - p) * 2) })(feet, c);
  const outer = bodyLight(feet, k.outer);
  const inner = bodyLight(feet, k.inner);
  const circles: [string, RGB, number][] = [
    [MODEL.suhwanzin1, outer, -1],
    [MODEL.suhwanzin11, outer, 1],
    [MODEL.suhwanzin111, outer, -1],
    [MODEL.suhwanzin2, inner, 1],
    [MODEL.suhwanzin22, inner, -1],
    [MODEL.suhwanzin222, inner, 1],
  ];
  for (const [m, colour, turn] of circles) {
    effects.spawn('model', c.scene, feet, { model: m, seconds: ticks(37), scale: 0.9, colour, alpha: 0.5, fadeIn: 10 / 37, fadeTail: 17 / 37, spin: turn * degPerTick(3), yaw });
  }
  effects.spawn('model', c.scene, feet, { model: MODEL.suhwanzin4, seconds: ticks(13), scale: 1, grow: 1 + 0.6 * 13, colour: bodyLight(feet, k.burst), alpha: 0.25, fadeIn: 5 / 13, fadeTail: 8 / 13, yaw });
};

/** MODEL_SUMMONER_SUMMON_SAHAMUTT's Scale by book tier (ZzzEffect.cpp:783-795). */
const SAHAMUTT_SCALE = [0.35, 0.5, 0.7];
/** The bones its fire comes off, three FIRE_CURSEDLICH sub2 each a tick (MoveHandlers.cpp:1247-1258). */
const SAHAMUTT_FIRE_BONES = [13, 23, 39, 49, 3, 4, 5, 61];
/**
 * FIRE_CURSEDLICH sub2 (firehik02, 64 px): LT 8..19, Scale (0.2..0.49) x 5 / 4 / 3 shrinking 0.04..0.12 a
 * tick, rising 3.75..7.25 cm a tick, in `Alpha x 0.3` grey (ZzzEffectParticle.cpp:303-309, :4331-4336).
 * The colour is the peak Alpha's; the emission count follows the Alpha instead of each card's light.
 */
const SAHAMUTT_FIRE: ParticleRecipe = {
  texture: TEX.fireCursedLich,
  colour: [0.18, 0.18, 0.18],
  size: 0.9,
  sizeJitter: 0.55,
  life: ticks(19),
  lifeJitter: 0.58,
  box: [0.04, 0.04, 0.04],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(7.25),
  powerJitter: 0.48,
  endScale: 0.35,
  fade: [
    [0, 1],
    [0.85, 1],
    [1, 0],
  ],
  capacity: 640,
};
/** CreateBomb3 by tier (ZzzEffect.cpp:6373-6431): cards a tick, the chance of each, the spread and the height range, cm. */
const SAHAMUTT_BOMBS = [
  { cards: 1, chance: 1 / 3, spread: 15, low: 30, high: 110 },
  { cards: 1, chance: 4 / 5, spread: 40, low: 30, high: 150 },
  { cards: 2, chance: 9 / 10, spread: 75, low: 30, high: 160 },
];
/** BITMAP_SUMMON_SAHAMUTT_EXPLOSION: loungexflow's 4x4 cells, one a tick over its 16 ticks (ZzzEffectParticle.cpp:4272). */
const SAHAMUTT_BLAST_CELLS: SheetCells = { w: 64, h: 64, count: 16 };

/**
 * One CreateBomb3 at the Sahamutt's feet: up to two loungexflow cards (Width 256 cm x 0.15 x rand() % 10),
 * and with them a Magic_Ground2 flash in (1, 0.5, 0.2) (LT 10, Scale 1.05..1.08 growing 0.1 a tick,
 * light x 0.9 a tick, ZzzEffectParticle.cpp:928-933, :4138-4144) and five BITMAP_SPARK sub2. Its three
 * stones are Scale 0 and draw nothing. The original makes the flash and sparks even on a tick with no
 * card, at an unset `vBombPos`; here they come only with a card.
 */
function sahamuttBomb(c: SkillContext, at: Vector3, tier: number): void {
  const b = SAHAMUTT_BOMBS[tier];
  let last: Vector3 | null = null;
  for (let i = 0; i < b.cards; i++) {
    if (Math.random() >= b.chance) break;
    const p = new Vector3(at.x + cm(randInt(b.spread * 2) - b.spread), at.y + cm(b.low + randInt(b.high - b.low)), at.z + cm(randInt(b.spread * 2) - b.spread));
    last = p;
    const scale = 0.15 * randInt(10);
    if (scale > 0) effects.spawn('sprite', c.scene, p, { texture: TEX.sahamuttBlast, cells: SAHAMUTT_BLAST_CELLS, size: cm(256) * scale, seconds: ticks(16), fadeTail: 0 });
  }
  if (!last) return;
  effects.spawn('sprite', c.scene, last, { texture: TEX.magicGround2, colour: [1, 0.5, 0.2], size: cm(128) * 1.064, scaleRate: perTick(12.8), decay: 0.9, seconds: ticks(10), fadeTail: 0 });
  particles({ recipe: BOMB_SPARKS, count: 5 })(last, c);
}

// Enhanced and Ultra: the summons throw the light of their art and gain embers, soot and ground contact.
// Classic draws none of this.

/** An `effectLight` whose strength follows `level()` (a summon's Alpha, 0..1), riding `follow`. */
function levelLight(scene: Scene, colour: RGB, extent: number, seconds: number, at: Vector3, follow: PointSource, level: () => number, extra?: Partial<LightRecipe>): LightSource {
  const peak = Math.max(colour[0], colour[1], colour[2], 1e-3);
  const r = colour[0] / peak;
  const g = colour[1] / peak;
  const b = colour[2] / peak;
  const color = (out: { r: number; g: number; b: number }): { r: number; g: number; b: number } => {
    const k = Math.max(0, Math.min(1, level()));
    out.r = r * k;
    out.g = g * k;
    out.b = b * k;
    return out;
  };
  return curseLight(scene, colour, extent, seconds, at, follow, { ...extra, color });
}

/** The casting circle's light (the empact rings are 2.9 tiles across) and motes lifting off it. */
const summonCastGrace = (k: SummonCast): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0.05, new Vector3());
  effects.spawn('particles', c.scene, feet, { recipe: risingEmbersFor(k.outer, 1.3), rate: 24, seconds: ticks(30), height: 0.1 });
  curseLight(c.scene, k.outer, 1.5, ticks(40), feet, undefined, { attack: ticks(8), release: ticks(20), heightOffset: 0.5, floorGain: 0.35 });
};

const SAHAMUTT_TINT: RGB = [1, 0.45, 0.15];
/** The bone fire with its grey pulled to orange at a little less luminance: the grey washed to pale peach under the tone curve. */
const SAHAMUTT_FIRE_GRADED: ParticleRecipe = { ...SAHAMUTT_FIRE, colour: [0.24, 0.13, 0.05] };
/** Embers shed by the running Sahamutt. */
const SAHAMUTT_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.55, 0.2],
  colourEnd: [0.6, 0.12, 0.02],
  size: 0.16,
  sizeJitter: 0.5,
  life: 0.7,
  lifeJitter: 0.4,
  box: [0.3, 0.3, 0.3],
  dir1: [-0.4, 0.6, -0.4],
  dir2: [0.4, 1, 0.4],
  power: 1.2,
  powerJitter: 0.5,
  gravity: 0.6,
  endScale: 0.3,
  capacity: 160,
};
/** Soot rolling up off the blasts, drawn as coverage. */
const SAHAMUTT_SOOT: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.5, 0.5, 0.5],
  size: 1.1,
  sizeJitter: 0.3,
  life: 1.6,
  lifeJitter: 0.3,
  box: [0.5, 0.3, 0.5],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  power: 0.9,
  spin: 0.8,
  endScale: 2.4,
  fade: [
    [0, 0],
    [0.2, 0.8],
    [1, 0],
  ],
  blend: 'dark',
  capacity: 96,
};

/** The Sahamutt's own light (its fire, at its Alpha) and the embers it sheds while it runs. */
function sahamuttGrace(c: SkillContext, b: SummonBody, gone: () => boolean, tier: number): void {
  const ride: PointSource = out => out.set(b.at.x, b.at.y + 0.5, b.at.z);
  effects.spawn('particles', c.scene, b.at, { recipe: SAHAMUTT_EMBERS, rate: 40, seconds: ticks(32), follow: ride, until: gone, rateScale: () => b.alpha / 0.6 });
  levelLight(c.scene, SAHAMUTT_TINT, SAHAMUTT_SCALE[tier] * 2, ticks(34), ride(new Vector3()), ride, () => b.alpha / 0.6, { release: ticks(4) });
}

/** The blasts' light for their 32 ticks, a glow on the ground under them and soot rolling up. */
function sahamuttBlastGrace(c: SkillContext, at: Vector3, tier: number): void {
  const p = at.clone();
  const extent = 1.2 + 0.3 * tier;
  effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: scaleRGB(SAHAMUTT_TINT, 0.25), size: 2 + 0.6 * tier, seconds: ticks(40), fadeIn: 0.1, fadeTail: 0.5, flat: true });
  effects.spawn('particles', c.scene, p, { recipe: SAHAMUTT_SOOT, rate: 10 + 4 * tier, seconds: ticks(32), height: 0.6 });
  curseLight(c.scene, [1, 0.55, 0.2], extent, ticks(40), p, undefined, { attack: ticks(2), release: ticks(10), heightOffset: 0.8, flicker: { min: 0.75, max: 1.1, steps: 4 } });
}

/**
 * 223 Explosion (SummonSystem.cpp:136-155, MoveHandlers.cpp:1168-1261): MODEL_SUMMONER_SUMMON_SAHAMUTT
 * (LT 80) starts 1.5..4.5 tiles off the caster on each axis and runs on the terrain at the point:
 * action 0 at 0.5 keys a tick while its Alpha climbs to 0.3 (6 ticks), then action 1: Alpha +0.05 while
 * the frame is under 3, the run (Distance / 13 a tick over frames 4..10, / 45 over 10..12), and from
 * frame 11 (tick 28) Alpha -0.3 a tick and a CreateBomb3 every tick until LT 20, with explosion03 on
 * half of them. Drawn textured plus the RENDER_BRIGHT | CHROME7 pass, both at Alpha (ZzzObject.cpp:1698-1702).
 */
const sahamuttOf = (graded: boolean): Step => (at, c) => {
  if (entityGone(c.caster)) return;
  const tier = bookTier(c.caster);
  const world = storeRef().world;
  const start = entityPos(c.caster, 0, new Vector3());
  start.x += Math.random() < 0.5 ? cm(randInt(300) + 150) : -cm(randInt(250) + 150);
  start.z += Math.random() < 0.5 ? cm(randInt(300) + 150) : -cm(randInt(250) + 150);
  start.y = world?.getTerrainHeight(start.x, start.z) ?? at.y;
  const dx = at.x - start.x;
  const dz = at.z - start.z;
  const bone = new Vector3();
  let action = 0;
  let done = 0;
  let lit = false;
  const beast = effects.spawn('summon', c.scene, start, {
    model: MODEL.summonSahamutt,
    seconds: ticks(80),
    scale: SAHAMUTT_SCALE[tier],
    yaw: yawToward(start, at),
    alpha: 0,
    meshes: [{ draw: 'both' }, { draw: 'both' }],
    clip: 0,
    keysPerTick: 0.5,
    drive: (b, t) => {
      const u = t - 6;
      if (u >= 0 && action === 0) {
        action = 1;
        b.play(1, 0.5, false, 12);
      }
      b.alpha = u < 0 ? 0.05 * t : u < 6 ? 0.3 + 0.05 * u : u < 22 ? 0.6 : Math.max(0, 0.6 - 0.3 * (u - 22));
      const f = u < 8 ? 0 : u < 19 ? (u - 8) / 13 : 11 / 13 + (Math.min(u, 23) - 19) / 45;
      b.at.x = start.x + dx * f;
      b.at.z = start.z + dz * f;
      b.at.y = world?.getTerrainHeight(b.at.x, b.at.z) ?? at.y;
      if (graded && !lit) {
        lit = true;
        sahamuttGrace(c, b, () => !beast.alive, tier);
      }
      for (; done < Math.floor(t); done++) {
        const tick = done + 1;
        if (graded && tick === 28) sahamuttBlastGrace(c, b.at, tier);
        if (b.alpha > 0 && b.loaded) {
          for (const i of SAHAMUTT_FIRE_BONES) {
            const n = 5 * b.alpha;
            const count = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
            if (count > 0 && b.bone(i, bone)) emitBurst(c.scene, graded ? SAHAMUTT_FIRE_GRADED : SAHAMUTT_FIRE, bone, count);
          }
        }
        if (tick >= 28 && tick <= 60) {
          sahamuttBomb(c, b.at, tier);
          if (Math.random() < 0.5) playCombat('Sound/SE_Ch_summoner_skill05_explosion03', b.at);
        }
      }
    },
  });
};

/** Neil's light: his white body and the red blade glow. */
const NEIL_TINT: RGB = [1, 0.2, 0.25];
/** The knives and ground rings on the point: white meshes with red ones. */
const NEIL_GROUND_TINT: RGB = [1, 0.45, 0.5];
/** Red chips thrown off the point as the knives land. */
const NEIL_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.35, 0.35],
  colourEnd: [0.7, 0, 0.05],
  size: 0.16,
  life: 0.5,
  lifeJitter: 0.3,
  power: 3.2,
  powerJitter: 0.4,
  gravity: -5,
  dir1: [-0.7, 0.4, -0.7],
  dir2: [0.7, 1, 0.7],
  spin: 6,
  capacity: 96,
};

/** The knives land (tick 23): a red flash on the point and chips thrown off it. */
function neilKnivesGrace(c: SkillContext, point: Vector3): void {
  effects.spawn('sprite', c.scene, point, { texture: TEX.flare, colour: [1, 0.25, 0.3], size: 1.8, seconds: ticks(8), fadeTail: 0.8, height: 0.6 });
  particles({ recipe: NEIL_SPARKS, count: 18 })(new Vector3(point.x, point.y + 0.4, point.z), c);
}

/** The ground rings (tick 29, 50 ticks): their light, a red glow under them and embers rising off them. */
function neilGroundGrace(c: SkillContext, point: Vector3, tier: number): void {
  const at = new Vector3(point.x, point.y + 0.05, point.z);
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.22, 0.03, 0.05], size: 2.6 + 0.4 * tier, seconds: ticks(50), fadeIn: 0.1, fadeTail: 0.4, flat: true });
  effects.spawn('particles', c.scene, at, { recipe: risingEmbersFor([1, 0.15, 0.2], 1.3), rate: 26, seconds: ticks(36), height: 0.1 });
  curseLight(c.scene, NEIL_GROUND_TINT, 1.5 + 0.3 * tier, ticks(50), at, undefined, { attack: ticks(4), release: ticks(20), heightOffset: 0.6, floorGain: 0.5 });
}

/** The nine bones Neil's red flare01 sprites sit on; 51 and 59 are also the blade blur's ends (ZzzObject.cpp:1719-1750). */
const NEIL_GLOW_BONES = [51, 52, 53, 54, 55, 56, 57, 58, 59];
const NEIL_KNIVES = [MODEL.neilKnife1, MODEL.neilKnife2, MODEL.neilKnife3];
const NEIL_GROUNDS = [MODEL.neilGround1, MODEL.neilGround2, MODEL.neilGround3];

/**
 * 224 Requiem (SummonSystem.cpp:158-174, ZzzEffect.cpp:797-806, MoveHandlers.cpp:1263-1303):
 * MODEL_SUMMONER_SUMMON_NEIL one tile before the caster, 10 cm up, LT 80, action 0 once at 0.35 keys a
 * tick, Alpha +0.04 a tick to 0.72 and -0.05 from LT 20. Meshes 0 / 2 bright while Alpha < 0.7 and
 * textured from there, mesh 1 bright red; nine red flare01 on bones 51-59 and a red blur from bone 51 to 59
 * through frames 0-10 (ZzzObject.cpp:1703-1753). Frame 8 (tick 23): NIFE1 (+2 at +7, +3 at +11) on the
 * point, LT 50, mesh 0 textured and mesh 1 bright red (EffectBehaviors.cpp:97-103). Frame 10 (tick 29):
 * GROUND1 60 cm before Neil and GROUND1 (+2, +3) on the point, LT 50, Alpha +0.3 a tick, both meshes
 * bright, mesh 1's U running -1 a second (ZzzObject.cpp:1761-1765), and requiem02.
 */
const requiemOf = (graded: boolean): Step => (at, c) => {
  if (entityGone(c.caster)) return;
  const tier = bookTier(c.caster);
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const home = entityPos(c.caster, cm(10), new Vector3());
  home.x += f.x;
  home.z += f.z;
  const point = at.clone();
  let glows = false;
  let knives = false;
  let grounds = false;
  const neil = effects.spawn('summon', c.scene, home, {
    model: MODEL.summonNeil,
    seconds: ticks(80),
    yaw,
    alpha: 0,
    meshes: [{ draw: 'add' }, { draw: 'add', colour: [1, 0, 0] }, { draw: 'add' }],
    keysPerTick: 0.35,
    loop: false,
    drive: (b, t) => {
      b.alpha = t < 60 ? Math.min(0.72, 0.04 * t) : 0.72 - 0.05 * (t - 60);
      const d = b.alpha < 0.7 ? 'add' : 'alpha';
      b.draw(0, d);
      b.draw(2, d);
      if (!glows && b.loaded) {
        glows = true;
        const gone = (): boolean => !neil.alive;
        const on = (n: number): PointSource => out => (b.bone(n, out) ? out : out.copyFrom(b.at));
        for (const n of NEIL_GLOW_BONES) {
          effects.spawn('sprite', c.scene, b.at, { texture: TEX.flare, colour: [1, 0, 0], size: cm(64), seconds: ticks(80 - t), fadeTail: 0, follow: on(n), until: gone });
        }
        if (t < 28) effects.spawn('blur', c.scene, b.at, { follow: on(59), base: on(51), colour: [1, 0, 0], texture: TEX.motionBlurR, seconds: ticks(28.6 - t), until: gone });
        if (graded) levelLight(c.scene, NEIL_TINT, 1.2, ticks(80 - t), b.at.clone(), on(55), () => b.alpha / 0.72, { release: ticks(4), heightOffset: 0.6, floorGain: 0.35 });
      }
      if (!knives && t >= 23) {
        knives = true;
        if (graded) neilKnivesGrace(c, point);
        for (let i = 0; i <= tier; i++) {
          effects.spawn('summon', c.scene, point, {
            model: NEIL_KNIVES[i],
            seconds: ticks(50),
            yaw,
            meshes: [{ draw: 'alpha' }, { draw: 'add', colour: [1, 0, 0] }],
            loop: false,
            drive: (k, kt) => {
              k.alpha = kt < 30 ? 1 : 1 - 0.05 * (kt - 30);
            },
          });
        }
      }
      if (!grounds && t >= 29) {
        grounds = true;
        const ground = (m: string, p: Vector3): void => {
          effects.spawn('summon', c.scene, p, {
            model: m,
            seconds: ticks(50),
            yaw,
            alpha: 0,
            meshes: [{ draw: 'add' }, { draw: 'add', scrollU: -1 }],
            drive: (g, gt) => {
              g.alpha = gt < 30 ? Math.min(1.2, 0.3 * gt) : 1.2 - 0.05 * (gt - 30);
            },
          });
        };
        ground(MODEL.neilGround1, new Vector3(b.at.x + f.x * cm(60), b.at.y, b.at.z + f.z * cm(60)));
        for (let i = 0; i <= tier; i++) ground(NEIL_GROUNDS[i], point);
        playCombat('Sound/SE_Ch_summoner_skill06_requiem02', point);
        if (graded) neilGroundGrace(c, point, tier);
      }
    },
  });
};

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

// ---- the table -------------------------------------------------------------------

/** Keyed by skill number (common/skillsDatabase.ts). */
export const SKILL_VISUALS: Partial<Record<number, SkillVisual>> = {
  // 1 Poison: impact@target - MODEL_POISON LT 40 + 10× BITMAP_SMOKE tinted (0.4, 0.6, 1.0). No bolt.
  1: { impact: seq(model({ model: MODEL.poison, seconds: ticks(40), scale: 1, colour: RGBS.venom }), particles({ recipe: POISON_SMOKE, count: 10 })) },
  // 2 Meteorite: MODEL_FIRE sub0 LT 40, Scale 1.0–1.7, from target + (130…162, 400) cm, Dir(0,0,−50).
  2: {
    travel: { ...modelBolt(MODEL.fire, RGBS.fire, FIRE_TRAIL, perTick(50), 1.35, FIRE_BLEND_MESH, true), fromSky: true, skyOffset: [cm(146), cm(400), 0] },
    impact: fireHit,
  },
  // 3 Lightning: SOUND_THUNDER01 at cast; per frame JOINT_THUNDER weaponBone → target (width 50 + width 10,
  // LT 2, MaxTails 50, Vel 50) + BITMAP_ENERGY particles at the bone. Bolts re-roll every 2 ticks for the clip.
  3: {
    impact: (at, c) => {
      const from = weaponBone(c.caster);
      const to = c.target ? followEntity(c.target, IMPACT_HEIGHT) : at;
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.arc, seconds: ticks(10), width: cm(50), segments: 24, forks: 2, jitter: 0.1, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      effects.spawn('joint', c.scene, at, { from, to, colour: RGBS.white, seconds: ticks(10), width: cm(10), segments: 24, jitter: 0.12, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      effects.spawn('particles', c.scene, at, { recipe: ENERGY_CHIPS, rate: 25, seconds: ticks(10), follow: from });
      arcHit(at, c);
    },
  },
  // 4 Fire Ball: MODEL_FIRE sub1 LT 60, Scale 0.8–1.1, z+120, Dir(0,−50,0); within 100 → 2× MODEL_STONE.
  4: { travel: modelBolt(MODEL.fire, RGBS.fire, FIRE_TRAIL, perTick(50), 0.95, FIRE_BLEND_MESH, true), impact: seq(fireHit, stones(2)) },
  // 5 Flame: the renewed look - fire pillars out of molten rock around the point (effects/pillar.ts), in place
  // of the BITMAP_FLAME sub0 LT 40 tongue column the original stacked at SkillXY (ZzzCharacter.cpp:4485).
  5: { area: seq(firePillars(3, 1.4, 0.1), scorch(1.5), burn(1.2)) },
  // 6 Teleport: CreateTeleportBegin at the old square (cast) and CreateTeleportEnd at the new one (impact), BITMAP_SPARK+1 each.
  6: { cast: teleportColumn, impact: teleportColumn, enhanced: { cast: teleportEnhanced('begin'), impact: teleportEnhanced('end') } },
  // 7 Ice: impact@target - MODEL_ICE sub0 + 5× MODEL_ICE_SMALL. No bolt.
  7: { impact: iceHit },
  // 8 Twister: impact@caster - MODEL_STORM LT 59, Dir(0,−10,0) (walks forward), smoke, JOINT_THUNDER from
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
  // 9 Evil Spirit: impact@caster+100z - 4x JOINT_SPIRIT sub0 pairs at Angle(0,0,i*90), width 80 + 20:
  // ALPHA_BLEND_MINUS, Vel 70, LT 49, MaxTails 6, homing the caster+80z (MoveHumming 10 deg/frame)
  // under damped random steering between terrain +100 and +400; each width-80 joint stamps
  // MODEL_LASER (Scale 1.3, RENDER_DARK) at its head every frame - the black spirits
  // (ZzzCharacter.cpp:4468, ZzzEffectJoint.cpp:3698, ZzzEffect.cpp:1890).
  //
  // Eight of them, each the black skull on its dark ribbon, spread over the skill's reach
  // (`SPIRIT_REACH`) instead of looping round the caster. Nothing bright: the spirits are shadow.
  9: {
    area: atCaster((at, c) => {
      const seconds = ticks(49);
      const fadeTail = 10 / 49;
      const centre = followEntity(c.caster, 0);
      const start = fxNow();
      const spirit = (i: number): SwarmSpirit => {
        const wave = Math.floor(i / SPIRIT_WAVE);
        const turn = ((i % SPIRIT_WAVE) * Math.PI * 2) / SPIRIT_WAVE + (wave * Math.PI) / (2 * SPIRIT_WAVE);
        const heading = facing(c, turn);
        // Radii interleaved across waves so every wave reaches both the inside and the rim.
        const slot = (i * 3) % SPIRIT_COUNT;
        const radius = SPIRIT_REACH * (SPIRIT_ORBIT_MIN + (SPIRIT_ORBIT_MAX - SPIRIT_ORBIT_MIN) * Math.sqrt((slot + 0.5) / SPIRIT_COUNT));
        const spin = (i % 2 ? 1 : -1) * Math.min(SPIRIT_ORBIT_TURN, SPIRIT_ORBIT_SPEED / radius);
        const phase = Math.atan2(heading.x, heading.z);
        const lift = 1.2 + Math.random() * 1.6;
        const seek: PointSource = out => {
          centre(out);
          const a = phase + spin * (fxNow() - start);
          out.x += Math.sin(a) * radius;
          out.z += Math.cos(a) * radius;
          out.y += lift;
          return out;
        };
        const head = at.clone();
        const follow: PointSource = out => out.copyFrom(head);
        const velocity = SPIRIT_SPEED * (0.85 + Math.random() * 0.3);
        effects.spawn('particles', c.scene, at, { recipe: SPIRIT_SMOKE, rate: 12, seconds, follow });
        return { velocity, heading, seek, track: h => head.copyFrom(h) };
      };
      // One swarm per wave: its spirits' bodies, spines and skulls share a handful of meshes.
      const launch = (w: number): void => {
        const spirits: SwarmSpirit[] = [];
        for (let i = w * SPIRIT_WAVE; i < Math.min(SPIRIT_COUNT, (w + 1) * SPIRIT_WAVE); i++) spirits.push(spirit(i));
        effects.spawn('spiritSwarm', c.scene, at, { ...SPIRIT_SWARM, spirits, seconds, fadeTail });
      };
      for (let w = 0; w * SPIRIT_WAVE < SPIRIT_COUNT; w++) {
        if (w === 0) launch(w);
        else delay(w * SPIRIT_WAVE_GAP, () => launch(w));
      }
      // The shadow they bring: smoke closing in from the edge of the view, lighter on the caster's
      // own screen than on anyone else's near the cast.
      const mine = c.caster === storeRef().world?.playerEntity;
      effects.spawn('shroud', c.scene, at, {
        seconds,
        fadeTail,
        follow: followEntity(c.caster, 0.9),
        ...(mine ? SHROUD_OWN : SHROUD_OTHERS),
      });
    }, 1),
  },
  /**
   * 10 Hellfire. The skill is a leap: `SetAction(o, PLAYER_SKILL_HELL)` and
   * `c->AttackTime = 1` at the cast (ZzzInterface.cpp:5900-5906), the wizard
   * burning off random bones the whole way up (ZzzCharacter.cpp:5633), and the
   * ground only opens once he is back on it - `MoveCharacter` holds the branch
   * until `c->AttackTime >= g_iLimitAttackTime`, 15 ticks, and only then
   * creates MODEL_CIRCLE (LT 45) + MODEL_CIRCLE_LIGHT (LT 40) at `o->Position`
   * (ZzzCharacter.cpp:4307-4318, g_iLimitAttackTime at :90).
   *
   * The clip carries the jump itself: the root bone of `player_action_154`
   * climbs 0.58 → 3.52 over its first five keys and is back down by key 6, so
   * at the action's own PlaySpeed the wizard touches down around tick 12 and
   * the fire follows him in about three ticks later. Firing the circle at the
   * cast instead - which is what this row did, the `0.05` being `atCaster`'s
   * *height* and not a delay - put the whole ground effect under a wizard who
   * was still in the air, and left nothing at all for the landing.
   */
  10: {
    cast: bodyFire(HELLFIRE_TOUCHDOWN, 4),
    area: after(
      ticks(HELLFIRE_TOUCHDOWN),
      atCaster(
        seq(
          // Not `flat` - despite the name. `Skill/Circle01` is an 8x8 disc with
          // zero thickness in Z, because MU authors ground planes in XY (Z is
          // up there), and `flat` skips the Z-up-to-Y-up basis change that lays
          // it down. It stood the fire ring on its edge like a wall.
          model({ model: MODEL.circle, seconds: ticks(45), colour: RGBS.fire, scale: 1, grow: 1.3 }),
          model({ model: MODEL.circle2, seconds: ticks(40), colour: [1, 0.8, 0.2], scale: 1, spin: 2 }),
          stones(6, 2),
          particles({ recipe: FIRE_SPARKS, count: 30 }),
          // The whole circle the stones are thrown from, not a bolt's footprint.
          scorch(2.6),
          burn(2.6)
        ),
        0.05
      )
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
      effects.spawn('joint', c.scene, from, { to, colour: [0.5, 0.7, 1], seconds: ticks(20), width: 1.6, jitter: 0, segments: 4, texture: TEX.jointLaser });
      effects.spawn('joint', c.scene, from, { to, colour: RGBS.white, seconds: ticks(20), width: 0.4, jitter: 0.01, segments: 8, texture: TEX.jointLaser });
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
  // 14 Inferno: impact@caster - CreateInferno: 8 bombs on r=220 at 45° + 2 stones each; then MODEL_SKILL_INFERNO
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
  // 15 Teleport Ally: CreateTeleportBegin(target) (cast) + CreateTeleportEnd(caster) (impact) - BITMAP_SPARK+1 at both.
  15: { cast: teleportColumn, impact: teleportColumn, enhanced: { cast: teleportEnhanced('begin'), impact: teleportEnhanced('end') } },
  // 16 Soul Barrier: 5× CreateJoint(MODEL_SPEARSKILL sub0, width 20, white, LT 999999, MaxTails 30) - persistent,
  // so the ribbons live in BUFF_VISUALS[4] and end on MagicEffectStatus. Here only the arrival glimmer.
  16: { impact: particles({ recipe: SOUL_MOTES, count: 12, height: 0.6 }) },
  // 17 Energy Ball: BITMAP_ENERGY sub0 LT 20, Dir(0,−60,0), z+100; per frame ENERGY + SPARK+1 (scale 4) particles;
  // arrival SPARK+1 sub1 scale 6.
  17: {
    travel: { ...bolt(TEX.thunder, RGBS.arc, ENERGY_CHIPS, 0.5, perTick(60)), trail: { recipe: ENERGY_CHIPS, rate: 25 } },
    impact: seq(sprite({ texture: TEX.spark3, colour: RGBS.arc, size: 0.6, seconds: ticks(10), grow: 2 }), hitSparks(ARC_MOTES, 8)),
  },
  // 18 Defense: the guard clip and sKnightDefense only; the original draws nothing (SkillCast.cpp:224-231,
  // WSclient.cpp:3610-3612). OpenMU answers with 0x19, so the echo carries ReceiveAction's clip and sound.
  // Enhanced adds a steel glint as the guard sets.
  18: { enhanced: { impact: guardGlint } },
  // 19 Falling Slash / 20 Lunge / 21 Uppercut: the SWORD1..3 clip and its weapon trail (weaponTrailSystem),
  // then CreateSpark at the blow (ZzzCharacter.cpp:4884). The hero's blade-tip glint (SkillCast.cpp:374) is the cast's, not the row's.
  19: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(FALLING_CHIPS) } },
  20: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(LUNGE_CHIPS) } },
  21: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(UPPER_CHIPS) } },
  // 22 Cyclone (326 by alias): the SWORD4 clip, its weapon trail and CreateSpark at the blow, as 19-21;
  // the name has no effect of its own (WSclient.cpp:4390-4396, ZzzCharacter.cpp:4884). Enhanced: 19-21's lit blow.
  22: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(CYCLONE_CHIPS) } },
  // 23 Slash (327 by alias): the same on the even SWORD5 swing; atSwordBlow drops the odd
  // TWO_HAND_SWORD3 swing, which gets no CreateSpark (WSclient.cpp:4398-4410, ZzzCharacter.cpp:4884). Enhanced: likewise.
  23: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(SLASH_CHIPS) } },
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
          effects.spawn('joint', cc.scene, from, { to, colour: RGBS.holy, seconds: ticks(12), width: cm(5), segments: 2, jitter: 0.05, texture: TEX.jointEnergy });
        }
      })(at, c);
    },
  },
  // 27 Greater Defense: BITMAP_MAGIC+1 sub2 LT 20 + 5× MODEL_SPEARSKILL sub4 (Light (0.4,0.8,0.2), LT 10000) →
  // the ribbons persist in BUFF_VISUALS[2].
  27: { impact: magicGround([0.4, 0.8, 0.2]) },
  // 28 Greater Damage: BITMAP_MAGIC+1 sub3 LT 20.
  28: { impact: magicGround([1, 0.75, 0.55]) },
  // 30–36 Summons: impact@caster - BITMAP_MAGIC+1 sub3.
  30: { area: summonCircle }, 31: { area: summonCircle }, 32: { area: summonCircle }, 33: { area: summonCircle },
  34: { area: summonCircle }, 35: { area: summonCircle }, 36: { area: summonCircle },
  // 38 Decay @SkillXY: 2× MODEL_FIRE sub6 LT 40, Scale 1.5–2.2, Light (0.8,0.5,0.1), Pos += (200–300, ±50, 500–800),
  // Dir(0,0,−50−rand%50), BITMAP_SMOKE trail; landing → MODEL_SKILL_INFERNO sub2, smoke, 6 stones.
  38: {
    area: seq(
      skyfall(MODEL.fire, [0.8, 0.5, 0.1], SMOKE, [2.5, 6.5, 0.3], perTick(75), 1.85, seq(model({ model: MODEL.inferno, seconds: ticks(15), colour: RGBS.decay, flat: true, scale: 0.9 }), particles({ recipe: SMOKE, count: 15 }), stones(6, 1), venomHit), true),
      after(0.12, skyfall(MODEL.fire, [0.8, 0.5, 0.1], SMOKE, [2, 5, -0.4], perTick(75), 1.6, seq(particles({ recipe: SMOKE, count: 7 }), stones(6, 1), venomHit), true))
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
        streamerFan(24, (Math.PI * 2) / 24, { velocity: perTick(70), seconds: ticks(20), maxTails: 5, width: 0.6, colour: RGBS.soul, texture: TEX.jointSpirit }),
        particles({ recipe: NOVA_MOTES, count: 40, height: 0.8 })
      ),
      0.05
    ),
  },
  // 41 Twisting Slash: at clip key 5 (or AttackTime 15) five copies of the wielded weapon whirl round the knight
  // with sparks, smoke, a glow and a grey light under each; see twistingSlash.
  41: {
    area: whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlash),
    // Graded tiers: the swept band, warm sparks and chips, dust for smoke, a warm light on each copy.
    enhanced: { area: whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlashOf(true)) },
  },
  // 42 Rageful Blow: the hand empties as the FURY clip starts; at key 1 the weapon is thrown up and the ground
  // breaks in front of the knight; see furyStrike.
  42: {
    area: seq(furyEmptyHand, whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE, 1, 14, furyStrike)),
    // Graded tiers: the weapon's smear, a hot core, chips and dust at the impact, embers off the glowing ground.
    enhanced: { area: seq(furyEmptyHand, whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE, 1, 14, furyStrikeOf(true))) },
  },
  // 43 Death Stab: red streaks gathering in front of the sword, the blue drill and the victim's electrified
  // skeleton, staged on AttackTime; see deathStab.
  43: {
    cast: deathStab,
    // Graded tiers: the gathering point swells red, the drill throws blue motes, the stab flashes on the victim; each lit.
    enhanced: { cast: deathStabOf(true) },
  },
  // 44 Crescent Moon Slash (Rush): the charge sprays sparks and fire at the feet until key 5 or 14 ticks, then the
  // sword force runs 3.9 m ahead growing, fading and lighting the ground; see crescentMoonSlash.
  44: { cast: crescentMoonSlash, enhanced: { cast: crescentMoonSlashOf(true) } },
  // 45 Javelin (Lance): 3× MODEL_SKILL_JAVELIN sub0/1/2 - LT 35, Vel 10, Scale 1.2, z+150, HeadAngle ±Ang.
  45: {
    area: (at, c) => fanArrows(at, c, 3, MODEL.javelin, RGBS.steel, 0.3, 1.2),
    impact: steelHit,
  },
  // 46 Deep Impact (Starfall): the arrow, then MODEL_ARROW_IMPACT at its position.
  46: { travel: arrow(MODEL.arrowLaser, RGBS.holy), impact: seq(model({ model: MODEL.arrowImpact, seconds: ticks(20), scale: 1, colour: RGBS.holy, grow: 1.4 }), steelHit) },
  // 47 Impale: t4 threads gather on the spear point, t8 a white spiral cone, t10 the sound, t13-14 six spears; see impale.
  47: { cast: impale, enhanced: { cast: impaleOf(true) } },
  // 48 Swell Life: at AttackTime 10 the spirit ring, its orange glows, the rising column and two ground rings; see swellLife.
  48: { cast: swellLife, enhanced: { cast: swellLifeOf(true) } },
  // 49 Fire Breath (AT_SKILL_RIDER): BITMAP_SHOTGUN and its sparks when the rider clip passes key 5, or
  // after the 14-tick AttackTime cap (ZzzCharacter.cpp:2910-2915, :4405-4409); see `fireBreath`.
  49: { cast: atClipKey(5, RIDER_ACTIONS, fireBreath), enhanced: { cast: atClipKey(5, RIDER_ACTIONS, fireBreathPlus) } },
  // 50 Flame of Evil (monster)
  50: { impact: fireHit },
  // 51 Ice Arrow: cast - MODEL_ICE sub1 + sub2 (+180°) at the target LT 20, Scale 0.8, BlendMeshLight 0.5, 3× BITMAP_SMOKE,
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
  // 52 Penetration: charge t=3 BITMAP_GATHERING sub0 LT 10 at (−100 fwd, +150 z) - 3 a frame JOINT_THUNDER sub3 /
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
  // 56 Power Slash: charge - 5× MODEL_MAGIC2 sub2 at yaw −40..+40 step 20, LT 20; each 2× SHINY+1 + LIGHT sprites.
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
  // 57 Spiral Slash: charge frame > 5 - CreateJoint(BITMAP_FLARE sub23, width 40) on the weapon.
  57: { cast: seq(slash(RGBS.wind, TEX.flareBig), (at, c) => effects.spawn('joint', c.scene, at, { head: weaponBone(c.caster), maxTails: 10, width: 0.4, colour: RGBS.wind, seconds: SLASH_SECONDS })), impact: steelHit },
  // 58 Nova (start): the charge - bones 0..38, (skillCount+1)× BITMAP_LIGHT sub6 (Light (0.3,0.3,1.0), scale
  // 1.3+count·0.08) + CreateForce: 3× JOINT_HEALING sub8 from r=500, LT 17. On the hero it runs for the hold
  // (`combat.novaCharging` / `novaStage`); on anyone else for a full charge's length.
  58: { cast: novaCharge },
  // 59 Combo: MODEL_COMBO and its 60 rays at the caster, whoever the target (WSclient.cpp:4829-4832).
  59: {
    impact: atCaster(comboBurst, cm(50)),
    area: atCaster(comboBurst, cm(50)),
    enhanced: { impact: atCaster(comboBurstPlus, cm(50)), area: atCaster(comboBurstPlus, cm(50)) },
  },
  // 60 Force / 66 Force Wave (and 509): at the strike key, caster-anchored rings, streaks and lance; sDarkSpear.
  60: { impact: strikeKey(force, 'Sound/sDarkSpear'), enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear') } },
  66: {
    impact: strikeKey(force, 'Sound/sDarkSpear'),
    area: strikeKey(force, 'Sound/sDarkSpear'),
    enhanced: { impact: litStrike(forceGraded, 'Sound/sDarkSpear'), area: litStrike(forceGraded, 'Sound/sDarkSpear') },
  },
  // 61 Fire Burst (and 508 / 514): at the strike key, three homing darts with their ghost trails and two
  // starburst cards at the caster; eFirebustBoom from the darts.
  61: { impact: strikeKey(fireBurst, 'Sound/eFirebustBoom'), enhanced: { impact: litStrike(fireBurstGraded, 'Sound/eFirebustBoom') } },
  // 62 Earthshake (512 / 516): on the Dark Horse's action 3 - shock rings every 10 ticks, rings of
  // MODEL_GROUND_STONE on horse keys 8-9.5, the fury's burst 1.1 tiles ahead at tick 28 and five crack
  // chains at 29 (GOBoid.cpp:727-769, MoveHandlers.cpp:2940-3170).
  62: { area: atCaster(earthshake, 0), enhanced: { area: atCaster(earthshakeOf(true), 0) } },
  // 63 Party Teleport (Summon): the held hand's blue BITMAP_LIGHT after key 5.5, and at AttackTime 6
  // MODEL_CIRCLE sub2 + MODEL_CIRCLE_LIGHT sub3 for 250 ticks (ZzzCharacter.cpp:4121-4129, :4384-4389).
  63: {
    area: atCaster(seq(partyCircleWarm, teleportHand, after(ticks(6), partyCircle)), 0),
    enhanced: { area: atCaster(seq(partyCircleWarm, teleportHandOf(true), after(ticks(6), partyCircleOf(true))), 0) },
  },
  // 64 Add Critical (Increase Critical Damage; 511/515/517/522): at AttackTime 15 a MODEL_DARKLORD_SKILL at each weapon's
  // link bone and SOUND_CRITICAL (ZzzCharacter.cpp:4366-4383). The lasting look is BUFF_VISUALS[5].
  64: { impact: critCast, area: critCast, enhanced: { impact: critCastOf(true), area: critCastOf(true) } },
  // 65 Electric Spike (519): a charge every tick of keys 1.2-1.6 (BITMAP_GATHERING sub2 + SOUND_ELEC_STRIKE_READY), the five
  // FLARE_FORCE joints at 5.5 with SOUND_ELEC_STRIKE, two MODEL_DARKLORD_SKILL at the weapon on keys 7-8
  // (ZzzCharacter.cpp:4390-4404, :10509-10553). Fallback times for a caster with no clip are the keys at 0.4.
  65: {
    area: seq(
      sparkCharges,
      atFrame(DL_FLASH, 5.5, ticks(19), sparkBolt),
      atFrame(DL_FLASH, 7, ticks(23), sparkAfterglow)
    ),
    enhanced: {
      area: seq(
        sparkChargesOf(true),
        atFrame(DL_FLASH, 5.5, ticks(19), sparkBoltOf(true)),
        atFrame(DL_FLASH, 7, ticks(23), sparkAfterglow)
      ),
    },
  },
  // 67 Stun: CreateJoint(BITMAP_FLASH sub7 at the caster).
  67: { area: atCaster((at, c) => effects.spawn('joint', c.scene, at, { head: followEntity(c.caster, 1.2), maxTails: 10, width: 0.5, colour: RGBS.gold, seconds: ticks(20) }), 1.2) },
  // 68 Removal Stun / 71 Removal Invisible: BITMAP_FLASH sub0/1 at target +1200 z, width 120, MaxTails 10, LT 40,
  // Vel 70, Angle (90,0,0) - a ribbon dropping from the sky.
  68: { impact: flashDrop(RGBS.gold) },
  71: { impact: flashDrop(RGBS.soul) },
  // 69 Add Mana (Swell Mana): 36× JOINT_SPIRIT sub21 (= sub2) fan + BITMAP_MAGIC+1 sub10.
  69: { impact: atCaster(spiritBurst(RGBS.soul), 1), area: atCaster(spiritBurst(RGBS.soul), 1) },
  // 70 Cloaking / Invisible: BITMAP_MAGIC+1 sub6 at the target LT 60, Scale 2–4; BITMAP_LIGHT on random bones per frame.
  70: { impact: seq(magicGround(RGBS.soul, ticks(60), 3), particles({ recipe: SOUL_MOTES, rate: 30, seconds: ticks(60), height: 0.5 })) },
  // 72 Removal Buff (Abolish Magic): six MODEL_SPEARSKILL sub5-7 bands spiralling in on the caster, rising and bursting
  // out, and four BITMAP_SHOCK_WAVE sub3, at clip key 3.5 (ZzzCharacter.cpp:2927-2931, :4295-4341).
  72: { impact: removalBuff, area: removalBuff, enhanced: { impact: removalBuffHd, area: removalBuffHd } },
  // 73 Death Cannon (Mana Rays): CreateJoint(BITMAP_JOINT_FORCE sub4 at caster+130 z, Angle(0,0,yaw), width 40).
  73: {
    impact: (at, c) => {
      const from = entityPos(c.caster, 1.3, new Vector3());
      effects.spawn('joint', c.scene, from, { heading: toward(from, at), velocity: perTick(120), seconds: ticks(20), maxTails: 12, width: 0.4, colour: RGBS.soul });
      after(0.25, seq(flash(TEX.flareBlue, RGBS.soul, 1.3, 0.4), hitSparks(ARC_MOTES)))(at, c);
    },
  },
  // 74 Space Split (Fire Blast): at the strike, a hidden MODEL_PIER_PART sub2 homing on the target and dropping six
  // inferno pillars (spaceSplit). BattleCastle/sCDarkAttack plays there, on every map like rows 44-46.
  74: { impact: litStrike(spaceSplit, 'Sound/battlecastle/sCDarkAttack'), enhanced: { impact: litStrike(spaceSplitGraded, 'Sound/battlecastle/sCDarkAttack') } },
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
  // 78 Fire Scream (DL): 14 ticks after the packet, 3 pairs MODEL_DARK_SCREAM + _FIRE at yaw and yaw ±10 moved ±80 cm
  // sideways, each with a ground streak, a puff and a flame card a tick (fireScream). Caster-anchored: 518 / 520 may
  // arrive as a targeted packet.
  78: {
    area: after(ticks(STRIKE_MAX_TICKS), fireScream),
    enhanced: { area: (at, c) => after(ticks(STRIKE_MAX_TICKS), fireScreamGraded(baseSkill(currentSkill)))(at, c) },
  },
  // 79 Explosion (monster)
  79: { impact: seq(fireHit, shockRing(RGBS.fire, 3)) },
  // 200 Summon Monster (a monster calling reinforcements): the summon circle, like rows 30-36.
  200: { impact: summonCircle, area: summonCircle },
  // 201-204 potions / immunities: a soft shiny flash.
  201: { impact: flash(TEX.shiny, RGBS.soul, 1.2, 0.5) },
  202: { impact: flash(TEX.shiny, RGBS.gold, 1.2, 0.5) },
  203: { impact: seq(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), particles({ recipe: HOLY_MOTES, count: 16, height: 0.4 })) },
  204: { impact: seq(flash(TEX.shiny, RGBS.soul, 1.3, 0.6), particles({ recipe: SOUL_MOTES, count: 16, height: 0.4 })) },
  // 210–213 spells of protection/restriction/pursuit, shield-burn.
  210: { impact: flash(TEX.flareBlue, RGBS.soul, 1.4, 0.6) },
  211: { impact: flash(TEX.flare, RGBS.shade, 1.4, 0.6) },
  212: { impact: flash(TEX.eye, RGBS.shade, 1.2, 0.6) },
  213: { impact: seq(flash(TEX.flareRed, RGBS.blood, 1.4, 0.5), particles({ recipe: BLOOD_CHIPS, count: 12, height: 0.6 })) },
  // 214 Drain Life: MODEL_ALICE_DRAIN_LIFE at AttackTime 15 - red glows, ghost streaks from behind the caster, a
  // siphon off every other target bone homing back (drainLife).
  214: { impact: drainLife, enhanced: { impact: drainLifeStep(true) } },
  // 215 Chain Lightning: the hand crackle while the ground clip plays and the wav again at AttackTime 15; the
  // arcs come with the BF 0A hops (playChainLightningHop).
  215: { cast: seq(chainHands, chainSoundAgain), enhanced: { cast: seq(chainHandsLit, chainSoundAgain) } },
  // 216 Lightning Orb: the forearm crackle, then MODEL_LIGHTNING_ORB at AttackTime 15 (lightningOrb).
  216: { cast: orbArm, impact: lightningOrb, enhanced: { cast: orbArmLit, impact: lightningOrbStep(true) } },
  // 217 Thorns (Damage Reflection): the SLEEP-clip hand in (0.8,0.5,0.2), then 14 ticks after the reply the
  // circle at the caster and the ALICE_BUFFSKILL rings on the target, or on the caster without one (aliceCurse).
  217: {
    cast: summonerHand(CURSE_HAND_THORNS),
    impact: onCurseLanding(aliceCurse(ALICE_THORNS)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_THORNS), curseHandLight(CURSE_HAND_THORNS)), impact: onCurseLanding(seq(aliceCurse(ALICE_THORNS, true), aliceGrace(ALICE_THORNS))) },
  },
  // 219 Sleep (454 Str): the violet hand FX while the clip plays; 14 ticks after the reply the violet
  // circle at the caster and the ALICE rings, flares and homing streaks on the target (aliceCurse).
  219: {
    cast: summonerHand(CURSE_HAND_SLEEP),
    impact: onCurseLanding(aliceCurse(ALICE_SLEEP)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_SLEEP), curseHandLight(CURSE_HAND_SLEEP)), impact: onCurseLanding(seq(aliceCurse(ALICE_SLEEP), aliceGrace(ALICE_SLEEP))) },
  },
  // 220 Blind (OpenMU's 461 / 463): Sleep's construction drawn entirely subtractive - black smoke at the
  // hand, a black disc spreading under the caster, a black imploding vortex on the target.
  220: {
    cast: summonerHand(CURSE_HAND_BLIND),
    impact: onCurseLanding(aliceCurse(ALICE_BLIND)),
    enhanced: { impact: onCurseLanding(seq(aliceCurse(ALICE_BLIND), aliceGrace(ALICE_BLIND))) },
  },
  // 218 Berserker (469 / 470 / 472): the hand in (1,0.1,0.2), then 14 ticks after the reply the circle and the
  // rings on the caster in a violet glow, and the wav again (aliceCurse).
  218: {
    cast: summonerHand(CURSE_HAND_BERSERKER),
    impact: onCurseLanding(seq(aliceCurse(ALICE_BERSERKER), berserkerWav)),
    enhanced: {
      cast: seq(summonerHand(CURSE_HAND_BERSERKER), curseHandLight(CURSE_HAND_BERSERKER)),
      impact: onCurseLanding(seq(aliceCurse(ALICE_BERSERKER, true), aliceGrace(ALICE_BERSERKER), berserkerWav)),
    },
  },
  // 221 Weakness (459 Str) / 222 Enervation (Innovation, 460 Str): the hand FX, then 14 ticks later at the
  // caster's feet the ZIN circles and ripples, the three Suhwanzin circles and the glitter rain, and the sound.
  221: {
    cast: summonerHand(CURSE_HAND_WEAKNESS),
    impact: onCurseLanding(zinCurse(ZIN_WEAKNESS)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_WEAKNESS), curseHandLight(CURSE_HAND_WEAKNESS)), impact: onCurseLanding(seq(zinCurse(ZIN_WEAKNESS), zinGrace(ZIN_WEAKNESS))) },
  },
  222: {
    cast: summonerHand(CURSE_HAND_ENERVATION),
    impact: onCurseLanding(zinCurse(ZIN_ENERVATION)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_ENERVATION), curseHandLight(CURSE_HAND_ENERVATION)), impact: onCurseLanding(seq(zinCurse(ZIN_ENERVATION), zinGrace(ZIN_ENERVATION))) },
  },
  // 223 Explosion: the casting circle at the caster, then the Sahamutt runs from beside the caster to the
  // point, burning, and blasts it for 32 ticks (summonCast, sahamutt). The graded tiers also scorch the ground.
  223: {
    cast: summonCast(CAST_EXPLOSION),
    area: sahamuttOf(false),
    enhanced: { cast: seq(summonCast(CAST_EXPLOSION), summonCastGrace(CAST_EXPLOSION)), area: seq(sahamuttOf(true), after(ticks(28), seq(scorch(1), burn(1)))) },
  },
  // 224 Requiem: the casting circle, Neil before the caster swinging his blade, the knives and ground rings on
  // the point (summonCast, requiem).
  224: {
    cast: summonCast(CAST_REQUIEM),
    area: requiemOf(false),
    enhanced: { cast: seq(summonCast(CAST_REQUIEM), summonCastGrace(CAST_REQUIEM)), area: requiemOf(true) },
  },
  // 225 Pollution: the casting circle, and at the point for 160 ticks violet smoke, clouds and drops with the
  // Laguls riding their spirit ribbons round it (summonCast, pollution).
  225: {
    cast: summonCast(CAST_POLLUTION),
    area: pollutionOf(false),
    enhanced: { cast: seq(summonCast(CAST_POLLUTION), summonCastGrace(CAST_POLLUTION)), area: pollutionOf(true) },
  },
  // 230 Lightning Shock: MODEL_LIGHTNING_SHOCK falling red from 280 cm over the caster and opening the ground
  // (lightningShock). The five magic_ground cards and the stones get Scale 0 there and are not drawn.
  230: { area: lightningShock, enhanced: { area: lightningShockStep(true) } },
  // 232 Strike of Destruction (337/340/343 alias here, drawn at the target's feet): see `blowOfDestruction`.
  232: { area: blowOfDestruction, enhanced: { area: blowOfDestructionPlus } },
  // 233 Expansion of Wizardry: MODEL_SWELL_OF_MAGICPOWER at the caster, Light (0.3,0.2,0.9) (WSclient.cpp
  // AT_SKILL_SWELL_OF_MAGICPOWER cast).
  233: { impact: swellOfMagic, area: swellOfMagic },
  // 234 Recover: cast - BITMAP_IMPACT at caster (0,−220,130), Light (0.7,0.6,0), LT 80, Scale 0→; target - 19× JOINT
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
  // 235 Multi-Shot: five arrows at ±5/10/20; the muzzle volley is 3× MODEL_MULTI_SHOT1 at the caster and
  // 2× MULTI_SHOT2 / MULTI_SHOT3 20 cm ahead, Light (0.8,0.9,1.6) (WSclient.cpp AT_SKILL_MULTI_SHOT).
  235: {
    area: (at, c) => {
      fanArrows(at, c, 5, MODEL.arrow, RGBS.steel, FIVE_SPREAD);
      multiShotVolley(at, c);
    },
    impact: steelHit,
  },
  // 236 Flame Strike: MODEL_EFFECT_FLAME_STRIKE sub0 at the caster - Alpha 0→, LT 35, Vel = the clip's speed.
  236: { area: atCaster(model({ model: MODEL.flameStrike, seconds: ticks(35), colour: RGBS.fire, scale: 1, fadeIn: 0.3, loop: false }), 0.05) },
  // 237 Gigantic Storm: 5× CreateEffect(BITMAP_JOINT_THUNDER) on a r=200 ring, LT 20, StartPos.z += 800.
  237: { area: seq(ringOf(seq(skyBolt(8, 0.35), arcHit), 5, 2, 0.05), particles({ recipe: WIND_STREAKS, rate: 80, seconds: 1 })) },
  // 238 Chaotic Diseier (523): the dark stars on the body, eight dark 2line_gost ribbons with their birds, feathers and
  // smoke flying the facing, and on the caster's own screen the dark bomb at his target (ClassAttack.cpp:698-775,
  // WSclient.cpp:4971-5025). SOUND_SKILL_CAOTIC is SKILL_SOUNDS[238].
  238: { area: seq(chaoticStars, chaoticGhosts, chaoticBomb), enhanced: { area: seq(chaoticStars, chaoticGhostsOf(true), chaoticBombOf(true)) } },
  // 239 Doppelganger self explosion
  239: { impact: seq(fireHit, shockRing(RGBS.fire, 4)) },
  // 260-270 Rage Fighter (MonkSystem.cpp RageCreateEffect).
  // 260 Killing Blow: MODEL_WOLF_HEAD_EFFECT at the caster aimed at the target + BITMAP_SBUMB Scale 2.1 there.
  260: {
    cast: seq(
      slash(RGBS.gold, TEX.motionBlur, 0.7),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: MODEL.wolfHead, seconds: 0.6, colour: RGBS.gold, grow: 1.4, yaw: entityYaw(c.caster) })
    ),
    impact: seq(steelHit, explosion(RGBS.gold, 0.9)),
  },
  // 261 Beast Uppercut: MODEL_DOWN_ATTACK_DUMMY_R is not converted - a rising gold burst stands in.
  261: { cast: slash(RGBS.gold, TEX.motionBlur, 0.7), impact: seq(steelHit, sprite({ texture: TEX.impact, colour: RGBS.gold, size: 1, seconds: 0.4, rise: 2, grow: 1.6 })) },
  // 262 Chain Drive: BITMAP_SWORDEFF at the caster; the giant-swing MODEL_SHOCKWAVE01 wave runs at the target.
  262: {
    cast: seq(
      slash(RGBS.arc, TEX.motionBlur, 0.7),
      atCaster(sprite({ texture: TEX.swordEff, colour: RGBS.arc, size: 1.6, seconds: 0.5, spin: 4, grow: 1.6 }), 0.9),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(15), scale: 0.8, colour: RGBS.arc, follow: flying(c, 0.05, perTick(40)), yaw: entityYaw(c.caster) })
    ),
    impact: seq(arcHit, after(0.12, arcHit), after(0.24, arcHit)),
  },
  // 263 Dark Side: MODEL_SHOCKWAVE01 sub3 dark wave (Light 0.2) chasing the target + BITMAP_DAMAGE2 bursts.
  263: {
    cast: seq(
      slash(RGBS.shade, TEX.motionBlur, 0.8),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(12), scale: 0.8, colour: [0.25, 0.2, 0.3], follow: flying(c, 0.05, perTick(60)), yaw: entityYaw(c.caster) })
    ),
    impact: seq(flash(TEX.damage2, RGBS.shade, 1.3, 0.4), particles({ recipe: SHADE_MOTES, count: 20 })),
  },
  264: { area: seq(model({ model: MODEL.dragonHead, seconds: 1, colour: RGBS.fire, grow: 1.5, scale: 1.5 }), shockRing(RGBS.fire, 5), scatter(fireHit, 5, 2, 0.05)) },
  // 265 Dragon Slasher (AT_SKILL_DRAGON_KICK): MODEL_DRAGON_KICK_DUMMY (0.7,0.7,1) at the caster plus the
  // MULTI_SHOT1/2/3 volley fired forward, Light (0.8,0.9,1.6).
  265: {
    cast: seq(
      slash(RGBS.steel, TEX.motionBlur, 1),
      (at, c) => {
        effects.spawn('model', c.scene, entityPos(c.caster, 0.1, new Vector3()), { model: MODEL.dragonKick, seconds: 0.8, colour: [0.7, 0.7, 1], grow: 1.3, yaw: entityYaw(c.caster) });
        multiShotVolley(at, c);
      }
    ),
    impact: steelHit,
  },
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
  // 344 Blood Storm (346 Strengthener by alias): no original; a renewed look from original art (bloodStorm).
  344: { area: bloodStorm, enhanced: { area: bloodStormPlus } },
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
  // 495/497 Earth Prison
  495: { impact: seq(model({ model: MODEL.groundCrystal, seconds: 1.5, colour: RGBS.gold, grow: 1.2, scale: 1.2 }), particles({ recipe: DUST, count: 20 })) },
  497: { impact: seq(model({ model: MODEL.groundCrystal, seconds: 1.5, colour: RGBS.gold, grow: 1.2, scale: 1.2 }), particles({ recipe: DUST, count: 20 })) },
  // 323/521/524 Iron Defense: the reference client predates it (no AT_SKILL, no effect, no sound), so Classic draws
  // nothing. The old stand-in flash waits under `enhanced` for the improve phase.
  323: IRON_DEFENSE,
  521: IRON_DEFENSE,
  524: IRON_DEFENSE,
};

/**
 * Fire a projectile, carrying its own light for the length of the flight.
 *
 * The original lights an arrow body every frame it is alive (ZzzEffect.cpp
 * MoveEffect, `AddTerrainLight(..., range 2)` per arrow model);
 * `lighting/skills.ts` holds the colours and decides which models light at
 * all, so anything else through here - a fire ball, a summoned beast -
 * simply asks and is told no. Every shot in the game goes out this way, so
 * a volley, a skill shot and a plain bow shot all light the same.
 */
function shoot(scene: Scene, from: Vector3, skill: number, opts: ProjectileOptions): void {
  const model = opts.model?.model;
  const head = from.clone();
  const light = model
    ? lighting.arrow(scene, skill, model, out => {
        out.x = head.x;
        out.y = head.y;
        out.z = head.z;
      })
    : null;

  effects.spawn('projectile', scene, from, {
    ...opts,
    trace: p => head.copyFrom(p),
    onArrive: at => {
      light?.stop();
      opts.onArrive?.(at);
    },
    onLost: () => {
      light?.stop();
      opts.onLost?.();
    },
  });
}

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
  const own = SKILL_VISUALS[skill];
  const impact = (own && forTier(own).impact) ?? steelHit;
  for (let i = 0; i < n; i++) {
    const a = base + (typeof spread === 'number' ? (i - (n - 1) / 2) * spread : spread[i] ?? 0);
    const to = new Vector3(from.x + Math.sin(a) * dist, at.y + IMPACT_HEIGHT * 0.5, from.z + Math.cos(a) * dist);
    shoot(c.scene, from, baseSkill(skill), {
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

/** The skill being dispatched - for helpers that fire a row's impact later. */
let currentSkill = 0;

/**
 * Master-level "Strengthener / Mastery" skills reuse their base skill's
 * look: the OpenMU numbers past 300 that are cast-able map onto the base
 * row by name prefix (the original's SKILL_REPLACEMENTS collapse).
 */
const MASTER_ALIASES: Record<number, number> = {
  326: 22, 327: 23, 328: 19, 329: 20, 330: 41, 331: 42, 332: 41, 333: 42, 336: 43, 337: 232, 339: 43, 340: 232, 342: 43, 343: 232,
  346: 344, 356: 48, 360: 48, 363: 48,
  378: 5, 379: 3, 380: 233, 381: 14, 382: 40, 383: 233, 384: 1, 385: 9, 387: 38, 388: 10, 389: 7, 390: 2, 391: 39, 392: 40, 393: 39, 394: 2, 395: 58,
  403: 16, 404: 16, 406: 16,
  411: 235, 413: 26, 414: 24, 416: 52, 417: 27, 418: 24, 420: 28, 422: 28, 423: 27, 424: 51, 431: 235, 441: 77,
  454: 219, 455: 215, 456: 230, 458: 214, 459: 221, 460: 222, 461: 220, 462: 214, 463: 220, 469: 218, 470: 218, 472: 218,
  479: 22, 480: 3, 481: 41, 482: 56, 483: 5, 484: 40, 486: 14, 487: 9, 489: 7, 490: 55, 491: 7, 492: 236, 493: 55, 494: 236, 496: 237,
  ...DARK_LORD_MASTER_ALIASES,
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

/**
 * The row a master-level skill borrows: `SKILL_VISUALS` and the lighting
 * tables are keyed by the base skill, and a Strengthener / Mastery number
 * must land on the same row as the skill it strengthens.
 */
export function baseSkill(skill: number): number {
  return SKILL_VISUALS[skill] ? skill : MASTER_ALIASES[skill] ?? skill;
}

/** The row for a skill as the current tier draws it, through master aliases, else its type's fallback. */
export function skillVisualFor(skill: number): SkillVisual {
  return forTier(SKILL_VISUALS[skill] ?? SKILL_VISUALS[MASTER_ALIASES[skill] ?? -1] ?? fallbackFor(skillDefinition(skill)));
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
  shoot(ctx.scene, from, baseSkill(skill), {
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

// ---- the basic bow / crossbow shot -------------------------------------------------

/**
 * `CreateArrow` (ZzzEffectMagicSkill.cpp:174-251): the launcher picks the
 * arrow, keyed here by its item index in group 4 (`common/items.json`).
 * Anything not listed throws the plain MODEL_ARROW - the five wooden bows do,
 * and so do the few late launchers whose own model this client has no sheet
 * for (the Celestial Bow's MODEL_ARROW_HOLY).
 */
const LAUNCHER_ARROWS: Partial<Record<number, { model: string; colour: RGB }>> = {
  2: { model: MODEL.arrowV, colour: RGBS.steel }, // Elven Bow
  6: { model: MODEL.arrowNature, colour: RGBS.venom }, // Chaos Nature Bow
  8: { model: MODEL.arrowSteel, colour: RGBS.steel }, // Crossbow
  9: { model: MODEL.arrowSteel, colour: RGBS.steel }, // Golden Crossbow
  10: { model: MODEL.arrowSaw, colour: RGBS.steel }, // Arquebus
  11: { model: MODEL.arrowLaser, colour: RGBS.arc }, // Light Crossbow
  12: { model: MODEL.arrowThunder, colour: RGBS.arc }, // Serpent Crossbow
  13: { model: MODEL.arrowWing, colour: RGBS.energy }, // Bluewing Crossbow
  14: { model: MODEL.arrowBomb, colour: RGBS.fire }, // Aquagold Crossbow
  16: { model: MODEL.arrowDouble, colour: RGBS.holy }, // Saint Crossbow
  18: { model: MODEL.arrowBestCrossbow, colour: RGBS.holy }, // Divine Crossbow of Archangel
  19: { model: MODEL.arrowDrill, colour: RGBS.steel }, // Great Reign Crossbow
  20: { model: MODEL.laceArrow, colour: RGBS.venom }, // Arrow Viper Bow
  21: { model: MODEL.arrowSpark, colour: RGBS.spark }, // Sylph Wind Bow
  22: { model: MODEL.arrowRing, colour: RGBS.wind }, // Albatross Bow
  23: { model: MODEL.arrowDarkStinger, colour: RGBS.dark }, // Dark Stinger Bow
  24: { model: MODEL.arrowGamble, colour: RGBS.gold }, // Air Lyn Bow
};

/** `ArrowPos`: the shot leaves 135 cm up and 60 cm ahead of the shooter. */
const BOW_MUZZLE_HEIGHT = cm(135);
const BOW_MUZZLE_FORWARD = cm(60);

/** The Aquagold Crossbow's bolt bursts where it lands (`CreateBomb`). */
const ARROW_BURST = bomb(RGBS.fire);

/**
 * The arrow a plain bow / crossbow attack throws. The original fires it from
 * `AttackStage`'s hit key, whenever the clip is one of the bow / crossbow
 * attacks (ZzzCharacter.cpp:4700-4735) - a basic swing, not a skill - so the
 * callers hand it the shot at the moment the blow lands.
 *
 * `CheckClientArrow` just kills a spent arrow, so nothing is drawn on
 * arrival; the sparks belong to the damage packet (`impactVisuals.ts`). The
 * Aquagold Crossbow is the exception the original makes: its MODEL_ARROW_BOMB
 * bursts (ZzzEffect.cpp:6620).
 */
export function playBowShotVisual(scene: Scene, shooter: Entity, target: Entity): void {
  const launcher = combat.equippedLauncher(shooter.charAppearance);
  if (!launcher || entityGone(shooter) || entityGone(target)) return;

  const shot = LAUNCHER_ARROWS[launcher.num] ?? { model: MODEL.arrow, colour: RGBS.steel };
  const from = entityPos(shooter, BOW_MUZZLE_HEIGHT, new Vector3());
  const to = entityPos(target, IMPACT_HEIGHT, new Vector3());
  from.addInPlace(to.subtract(from).normalize().scaleInPlace(BOW_MUZZLE_FORWARD));

  const ctx = contextFor(scene, shooter, target);

  shoot(scene, from, 0, {
    ...arrow(shot.model, shot.colour),
    to: followEntity(target, IMPACT_HEIGHT),
    ...(shot.model === MODEL.arrowBomb
      ? { onArrive: (at: Vector3) => ARROW_BURST(at, ctx) }
      : {}),
  });
}

// ---- persistent buff visuals (MagicEffectStatus) ----------------------------------

/** The parts of a buff's look; `keepLook` adds the wearer (`follow`, `bone`, `boneCount`, `until`). */
type BuffLook = (entity: Entity, scene: Scene) => Partial<AuraOptions>;

/** The knot the five green MODEL_SPEARSKILL sub4 joints run: radius 80, `z = 110 + 120 v.z`, width 20, Light (0.4, 0.8, 0.2) (ZzzEffectJoint.cpp:1553, :4470). */
const GREEN_KNOT: SpearJoints = { count: 5, width: 0.2, colour: [0.4, 0.8, 0.2], radius: 0.8, base: 1.1, lift: 1.2, flare: true };
/** Soul Barrier's five sub0 joints: the same knot, white, width 50 from the packet path (WSclient.cpp:15481). */
const SOUL_KNOT: SpearJoints = { count: 5, width: 0.5, colour: RGBS.white, radius: 0.8, base: 1.1, lift: 1.2, flare: true };
/** A seal's three sub10 joints: radius 60, `z = 50 + 60 v.z`, width 12, Light (1, 0.6, 0.6), the bujuckline sheet (:1559, :4480). */
const SEAL_KNOT: SpearJoints = { count: 3, width: 0.12, colour: [1, 0.6, 0.6], texture: TEX.luckySeal, radius: 0.6, base: 0.5, lift: 0.6 };

/** The weapon link bones (weaponAttachment.ts) and the two above each: `LinkBone`, `LinkBone - 6`, `LinkBone - 7` (ZzzCharacter.cpp:10777). */
const HAND_SHINY_BONES = [33, 27, 26, 42, 36, 35] as const;
/** `g_byUpperBoneLocation` (ZzzEffect.cpp:34). */
const UPPER_BONES = [25, 26, 27, 20, 34, 35, 36] as const;
/** Bip01 R Hand 28, L Hand 37: where the crit flare and the magic rune land. */
const HAND_BONES = [28, 37] as const;
/** The Ourforces glow's 17 bones, in three breathing groups (ZzzEffect.cpp:9602-9636). */
const OURFORCES_BONES = [12, 17, 5, 10, 36, 27, 37, 28, 11, 35, 2, 3, 36, 20, 27, 4, 26] as const;
const OURFORCES_SLOW = new Set([5, 12, 7, 8, 9, 14, 15, 16]);
const ourforcesBreathe = (t: number, i: number): number =>
  i < 3 ? (Math.sin(t * 10) + 1) * 0.25 + 0.2 : OURFORCES_SLOW.has(i) ? (Math.sin(t * 5) + 1) * 0.25 + 0.5 : (Math.sin(t * 10) + 1) * 0.3 + 0.3;
const OURFORCES_GLOW: BoneGlow = { bones: OURFORCES_BONES, texture: TEX.flareRed, colour: RGBS.white, size: 0.96, breathe: ourforcesBreathe };
/** Swell of Magic Power: BITMAP_LIGHT 1.8 on every bone, `(0.7, 0.3, 0.9) * (|sin t| + 0.2) * 0.5` (ZzzEffect.cpp:9316). */
const MAGIC_GLOW: BoneGlow = { bones: 'all', texture: TEX.flare, colour: [0.7, 0.3, 0.9], size: 1.15, breathe: t => (Math.abs(Math.sin(t)) + 0.2) * 0.5 };

/** Swell of Magic Power: every 6 s a MODEL_ARROWSRE06 sub1 on each hand, Light (0.2, 0.2, 0.9) (ZzzEffect.cpp:8310). */
function magicRune(scene: Scene, entity: Entity): void {
  for (const bone of HAND_BONES) {
    const at: PointSource = out => bonePos(entity, bone, out, CAST_HEIGHT);
    effects.spawn('model', scene, at(new Vector3()), { model: MODEL.arrowsRe06, seconds: 1, colour: [0.2, 0.2, 0.9], follow: at, loop: false });
  }
}

/**
 * Keyed by OpenMU MagicEffectNumber, which is the original's `eBuffState`
 * value for value (documentation/buff_visuals): the look the original keeps
 * on a body while the effect holds (WSclient.cpp InsertBuffPhysicalEffect
 * :15466, the per-frame block ZzzCharacter.cpp:10770-10990). The green knot
 * of 1 / 2 / 3 is one shared set (SHARED_LOOKS). An id with no row has no
 * body look in the original either; the mastery ids OpenMU sends on their
 * own (135, 138, 139, 148, 153-155) take their base effect's look.
 */
export const BUFF_VISUALS: Partial<Record<number, BuffLook>> = {
  // 1 Greater Damage, 3 Elf Soldier: BITMAP_SHINY+1 on the hands and forearms, `L * (1, 0.3, 0.2)`, plus the shared knot.
  1: () => ({ handShiny: { bones: HAND_SHINY_BONES, colour: [1, 0.3, 0.2] } }),
  3: () => ({ handShiny: { bones: HAND_SHINY_BONES, colour: [1, 0.3, 0.2] } }),
  // 2 Greater Defense: the shared knot only.
  // 4 Soul Barrier: five white sub0 joints.
  4: () => ({ spearJoints: SOUL_KNOT }),
  // 5 Critical Damage Increase (148 its mastery): the weapon helices every 1.2 s (critPulse).
  5: (e, s) => ({ pulse: { every: 1.2, fire: () => critPulse(s, e) } }),
  148: (e, s) => ({ pulse: { every: 1.2, fire: () => critPulse(s, e) } }),
  // 7 AG recovery: the orbiting healing rings.
  7: () => ({ healingRings: true }),
  // 8 Greater Fortitude / Swell Life (135 its proficiency): orange motes off the upper body.
  8: () => ({ boneMotes: { bones: UPPER_BONES, colour: [1, 0.5, 0.1] } }),
  135: () => ({ boneMotes: { bones: UPPER_BONES, colour: [1, 0.5, 0.1] } }),
  // 29-31 the seals: three pink ribbons low round the legs.
  29: () => ({ spearJoints: SEAL_KNOT }),
  30: () => ({ spearJoints: SEAL_KNOT }),
  31: () => ({ spearJoints: SEAL_KNOT }),
  // 0x39 Freeze (eDeBuff_Harden): the ice shell.
  57: () => ({ iceShell: true }),
  // 0x3A Defense reduction: the skull.
  58: () => ({ skull: true }),
  // 0x3D Stun: three ribbons climbing off the head, once.
  61: () => ({ stun: true }),
  // 0x47 Reflection (eBuff_Thorns): rising pin lights.
  71: () => ({ pins: { colour: [0.9, 0.6, 0.1] } }),
  // 0x48 Sleep: violet water drops off random bones (the insert path's (0.7,0.1,0.9), WSclient.cpp:15575).
  72: () => ({ sleepDrops: { colour: [0.7, 0.1, 0.9] } }),
  // 0x49 Blind: black cra_04 smoke off random bones.
  73: () => ({ blindSmoke: true }),
  // 74 eDeBuff_NeilDOT (Requiem) and 75 eDeBuff_SahamuttDOT (Explosion) (ZzzCharacter.cpp:10932-10948).
  74: () => ({ neilSparks: true }),
  75: () => ({ smoulder: true }),
  // 0x4C Weakness, 0x4D Innovation: shiny drops (with their flare01 underlay) and falling pin lights off random bones.
  76: () => ({ boneSparks: { colour: [1.4, 0.2, 0.2], underlay: true, pins: true } }),
  77: () => ({ boneSparks: { colour: [0.25, 1, 0.7], underlay: true, pins: true } }),
  // 0x51 Berserker: hand auroras and body marks.
  81: () => ({ berserk: true }),
  // 0x52 Wiz Enhance / Swell of Magic Power (138 / 139 its strengthener and mastery): every bone glows violet, a rune on the hands every 6 s.
  82: (e, s) => ({ boneGlow: MAGIC_GLOW, pulse: { every: 6, fire: () => magicRune(s, e) } }),
  138: (e, s) => ({ boneGlow: MAGIC_GLOW, pulse: { every: 6, fire: () => magicRune(s, e) } }),
  139: (e, s) => ({ boneGlow: MAGIC_GLOW, pulse: { every: 6, fire: () => magicRune(s, e) } }),
  // 0x56 Cold (eDeBuff_BlowOfDestruction, Strike of Destruction and Chain Drive): the ice at the feet, once.
  86: (e, s) => ({ pulse: { every: Infinity, fire: () => coldIce(s, e) } }),
  // 129-131 Ourforces (Rage Fighter): the red glow on 17 bones; 153-155 their power-ups.
  129: () => ({ boneGlow: OURFORCES_GLOW }),
  130: () => ({ boneGlow: OURFORCES_GLOW }),
  131: () => ({ boneGlow: OURFORCES_GLOW }),
  153: () => ({ boneGlow: OURFORCES_GLOW }),
  154: () => ({ boneGlow: OURFORCES_GLOW }),
  155: () => ({ boneGlow: OURFORCES_GLOW }),
};

/**
 * One look kept up while any of its ids holds: the original keeps a single
 * set of five green joints on a body under Attack, Defense or HelpNpc
 * (`ShouldKeepAuraJointAlive`, ZzzEffectJoint.cpp:4440), never a second.
 */
const SHARED_LOOKS: readonly { key: number; ids: readonly number[]; look: BuffLook }[] = [
  { key: -1, ids: [1, 2, 3], look: () => ({ spearJoints: GREEN_KNOT }) },
];

const buffHandles = new Map<Entity, Map<number, EffectHandle>>();

function keepLook(scene: Scene, entity: Entity, key: number, look: BuffLook | null): void {
  let byKey = buffHandles.get(entity);
  const have = byKey?.get(key);
  if (have && (!look || !have.alive)) {
    have.stop();
    byKey!.delete(key);
  }
  if (!look) {
    if (byKey && byKey.size === 0) buffHandles.delete(entity);
    return;
  }
  if (have?.alive || !entity.transform) return;
  if (!byKey) {
    byKey = new Map();
    buffHandles.set(entity, byKey);
  }
  const handle = effects.spawn('aura', scene, entityPos(entity, 0, new Vector3()), {
    ...look(entity, scene),
    follow: out => entityPos(entity, 0, out),
    bone: (mu, out) => bonePos(entity, mu, out),
    boneCount: () => Math.max(0, (entity.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1),
    until: () => entityGone(entity),
  });
  byKey.set(key, handle);
}

/** Command: keep (or drop) the persistent look of `effectId` on `entity`, whose `buffs` set is already up to date. */
export function setBuffVisual(scene: Scene, entity: Entity, effectId: number, active: boolean): void {
  keepLook(scene, entity, effectId, active ? (BUFF_VISUALS[effectId] ?? null) : null);
  for (const shared of SHARED_LOOKS) {
    if (!shared.ids.includes(effectId)) continue;
    const on = active || shared.ids.some(id => entity.buffs?.has(id));
    keepLook(scene, entity, shared.key, on ? shared.look : null);
  }
}

/** Drop every buff look on an entity that left (despawn, out of scope). */
export function clearBuffVisuals(entity: Entity): void {
  const byEffect = buffHandles.get(entity);
  if (!byEffect) return;
  for (const h of byEffect.values()) h.stop();
  buffHandles.delete(entity);
}

// Dev hook for the live harness: no offline test character casts every skill,
// so probes fire a row by hand (`window.__skillVisuals.area(9)`). `victim` is
// whatever else is standing about - offline that is the second test character,
// and it stands in for the object `logic.ts` finds on the cast point, so the
// rows that draw at a target (a bolt, a siphon) can be shot at all.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const victim = (): Entity | null => {
    const world = storeRef().world;
    const caster = world?.playerEntity;
    if (!world || !caster) return null;
    const alive = (e: Entity): boolean => e !== caster && !!e.transform && !e.dying;
    return world.netObjsQuery.entities.find(alive) ?? world.playersQuery.entities.find(alive) ?? null;
  };
  (window as unknown as { __skillVisuals: unknown }).__skillVisuals = {
    area: (skill: number) => {
      const world = storeRef().world;
      const caster = world?.playerEntity;
      if (!world || !caster?.transform) return false;
      playAreaSkillVisual(world.scene, skill, caster, null, (x, y) => world.getTerrainHeight(x, y), victim());
      return true;
    },
    targeted: (skill: number) => {
      const world = storeRef().world;
      const caster = world?.playerEntity;
      if (!world || !caster?.transform) return false;
      playTargetedSkillVisual(world.scene, skill, caster, victim());
      return true;
    },
    // A buff's persistent look on the test character, on or off (`?buffs=` does the same at load).
    buff: (effectId: number, active = true) => {
      const world = storeRef().world;
      const hero = world?.playerEntity;
      if (!world || !hero?.transform) return false;
      if (!hero.buffs) world.addComponent(hero, 'buffs', new Set<number>());
      if (active) hero.buffs!.add(effectId);
      else hero.buffs!.delete(effectId);
      setBuffVisual(world.scene, hero, effectId, active);
      return true;
    },
  };
}
