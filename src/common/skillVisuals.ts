import { Vector3 } from '../libs/babylon/exports';
import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { lighting } from '../lighting';
import { combat } from '../combat';
import { weather } from '../weather';
import { effects, type EffectHandle } from '../effects';
import { boneLocalPos, bonePos, delay, effectTexture, entityGone, entityPos, entityYaw, followEntity, fxNow, type ParticleRecipe, type PointSource, type RGB } from '../effects/core';
import type { SpriteOptions } from '../effects/sprite';
import type { ShroudOptions } from '../effects/shroud';
import type { SpiritSwarmOptions, SwarmSpirit } from '../effects/spiritSwarm';
import type { ModelHandle, ModelOptions } from '../effects/model';
import type { StampsHandle } from '../effects/stamps';
import type { RingOptions } from '../effects/ring';
import type { ParticlesOptions } from '../effects/particles';
import type { ProjectileOptions } from '../effects/projectile';
import type { JointOptions, TaperShape } from '../effects/joint';
import type { Ray } from '../effects/rays';
import type { AuraOptions, BoneGlow, SpearJoints } from '../effects/aura';
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
import { playCombat } from '../sound/combat';
import type { Sounds } from '../sound/recipes';
import { itemObjectAttribute } from './itemObjectAttribute';
import { inHellas } from './locomotion';
import { skillDefinition, type SkillDefinition } from './skillsDatabase';
import { storeRef } from './storeRef';
import { tierIndex } from './lightingQuality';
import { TWFlags } from './terrain/consts';
import { COMBAT_BUS, playSfx } from '../sound';
import { earthQuake } from '../camera';
import { warmGLTF } from './modelLoader';
import { ENUM_WORLD } from './types';
import { TW_NOGROUND, TW_NOMOVE, TW_WATER } from './terrain/consts';
import type { SheetCells } from '../effects/core';

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
/** BITMAP_SPARK+1 (Spark03) LT 10 - the Teleport flash. */
const teleportFlash: Step = sprite({ texture: TEX.spark3, colour: RGBS.energy, size: 1.6, seconds: ticks(10), count: 3, spread: 0.3, grow: 1.8, growFrom: 0.5 });
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

/**
 * The Summoner book cast (SummonSystem.cpp CreateCastingEffect): BITMAP_MAGIC
 * sub10 white + sub9 tinted at the feet, then the SUMMONER_CASTING_EFFECT
 * models tinted `core` (not converted here - motes stand in).
 */
const summonerCast = (circle: RGB, core: RGB): Step =>
  atCaster(seq(
    ring({ texture: TEX.magicGround, colour: RGBS.white, seconds: ticks(20), scale: 2.5, spin: 40, growFrom: 0.6 }),
    ring({ texture: TEX.magicGround, colour: circle, seconds: ticks(25), scale: 2, spin: -50 }),
    particles({ recipe: { ...SHADE_MOTES, colour: core }, count: 16, height: 0.5 })
  ), 0);

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
const force: Step = (_at, c) => {
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
      intensity: t => Math.pow(1.5, -movesAt(t)),
      fadeTail: 0,
    });
  }
  // Direction[1] from -60 by +12 a tick to 0: 48, 36, 24, 12 cm, then held 1.2 m out.
  const reach = (n: number): number => (n >= 4 ? cm(120) : cm(60 * n - 6 * n * (n + 1)));
  const t0 = fxNow();
  effects.spawn('model', c.scene, p, {
    model: MODEL.piercing2,
    seconds: ticks(9),
    scale: 2,
    angle: [0, 0, yaw],
    follow: out => {
      const d = reach(movesAt(fxNow() - t0));
      return out.set(p.x + f.x * d, p.y, p.z + f.z * d);
    },
    intensity: t => Math.pow(1.6, -Math.min(5, movesAt(t))),
    fadeTail: 0,
  });
  // While LT > 5 the lance drops one ring a tick where it stands, Scale 0.05 x LT.
  for (let m = 1; m <= 5; m++) {
    const d = reach(m - 1);
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
};

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
function pierFire(c: SkillContext, at: Vector3, dir: Vector3): void {
  const v0 = cm((randInt(8) + 32) * 0.3);
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, at, {
    texture: TEX.fire2,
    size: cm(64),
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
function pierDart(c: SkillContext, target: Entity, from: Vector3, yaw: number, aimHeight: number): void {
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
      const dx = aim.x - pos.x;
      const dz = aim.z - pos.z;
      heading[2] = turnToward(heading[2], (Math.atan2(dx, -dz) * 180) / Math.PI, velocity);
      heading[0] = turnToward(heading[0], 360 - (Math.atan2(aim.y - pos.y, Math.hypot(dx, dz)) * 180) / Math.PI, velocity);
      velocity += 0.4;
      if (lifeTime < 10) velocity += 0.1;
      const pitch = (heading[0] * Math.PI) / 180;
      const turn = (heading[2] * Math.PI) / 180;
      dir.set(Math.cos(pitch) * Math.sin(turn), -Math.sin(pitch), -Math.cos(pitch) * Math.cos(turn));
      pos.addInPlace(dir.scaleToRef(DART_STEP, step));
      pierFire(c, pos.clone(), dir.clone());
      ghosts.add(pos, heading, Math.min(1, k / 5));
    }
    gravity = Math.fround(gravity + 0.1);
    dart.setAngle(heading);
    if (++k < DART_MOVES) delay(TICK, move);
  };
  move();
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

// ---- dk2 steps

const DEG = Math.PI / 180;
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
 * UseSkillWarrior's BITMAP_SHINY+2 (SkillCast.cpp:374): Shiny03, LT 18, `Scale = sin(LifeTime * 10°) * 3`
 * at `Weapon[0]`'s link bone + (0, -120, 0) (ZzzEffectParticle.cpp:27-43, :7322-7325). The sheet is 128 x 16
 * texels and a particle is `texels x Scale` cm (:8996). The hero's own cast only.
 */
const weaponGlint: Step = (_at, c) => {
  if (!c.caster.localPlayer) return;
  const local = new Vector3(0, -1.2, 0);
  effects.spawn('sprite', c.scene, entityPos(c.caster, CAST_HEIGHT, new Vector3()), {
    texture: TEX.shiny3,
    size: cm(128) * 3,
    aspect: 16 / 128,
    seconds: ticks(18),
    sizeAt: p => Math.sin(Math.PI * p),
    fadeTail: 0,
    follow: out => boneLocalPos(c.caster, WEAPON_LINK_BONE, local, out, CAST_HEIGHT),
  });
};

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
  weaponGlint(at, c);

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
const SPARK_DECAY = 25 * Math.log(1.4);
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
const DESTRUCTION_LIGHT_DECAY = 25 * Math.log(1.05);

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

/** MODEL_COMBO's BlendMeshLight /= 1.4 a tick (MoveHandlers.cpp:5260), as a rate per second. */
const COMBO_DECAY = 25 * Math.log(1.4);
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
  // 6 Teleport: cast - BITMAP_SPARK+1 LT 10 at the caster (AlphaTarget 0).
  6: { cast: atCaster(teleportFlash, 0.6) },
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
  // 15 Teleport Ally: CreateTeleportBegin(target) + CreateTeleportEnd(caster) - BITMAP_SPARK+1 at both.
  15: { impact: seq(teleportFlash, atCaster(teleportFlash, 0.6)) },
  // 16 Soul Barrier: 5× CreateJoint(MODEL_SPEARSKILL sub0, width 20, white, LT 999999, MaxTails 30) - persistent,
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
  // 19 Falling Slash / 20 Lunge / 21 Uppercut / 22 Cyclone / 23 Slash: cast only - the weapon blur (BlurType 1).
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
    area: seq((at, c) => (c.target ? weaponGlint(at, c) : undefined), whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlash)),
    // Graded tiers: the swept band, warm sparks and chips, dust for smoke, a warm light on each copy.
    enhanced: { area: seq((at, c) => (c.target ? weaponGlint(at, c) : undefined), whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlashOf(true))) },
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
  // 45 Javelin (Lance): 3× MODEL_SKILL_JAVELIN sub0/1/2 - LT 35, Vel 10, Scale 1.2, z+150, HeadAngle ±Ang.
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
  // 48 Swell Life: impact@caster+100z - 36× JOINT_SPIRIT sub2 fan (Light 0.5) + BITMAP_MAGIC+1 sub4 LT 40.
  48: { impact: atCaster(spiritBurst([0.5, 0.5, 0.5]), 1), area: atCaster(spiritBurst([0.5, 0.5, 0.5]), 1) },
  // 49 Fire Breath (AT_SKILL_RIDER): BITMAP_SHOTGUN and its sparks when the rider clip passes key 5, or
  // after the 14-tick AttackTime cap (ZzzCharacter.cpp:2910-2915, :4405-4409); see `fireBreath`.
  49: { cast: atClipKey(5, RIDER_ACTIONS, fireBreath) },
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
  59: { impact: atCaster(comboBurst, cm(50)), area: atCaster(comboBurst, cm(50)) },
  // 60 Force / 66 Force Wave (and 509): at the strike key, caster-anchored rings, streaks and lance; sDarkSpear.
  60: { impact: strikeKey(force, 'Sound/sDarkSpear') },
  66: { impact: strikeKey(force, 'Sound/sDarkSpear'), area: strikeKey(force, 'Sound/sDarkSpear') },
  // 61 Fire Burst (and 508 / 514): at the strike key, three homing darts with their ghost trails and two
  // starburst cards at the caster; eFirebustBoom from the darts.
  61: { impact: strikeKey(fireBurst, 'Sound/eFirebustBoom') },
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
  // 64 Add Critical (Increase Critical Damage): MODEL_DARKLORD_SKILL at weapon bone 0 (sub0) and bone 1 (sub1), Light (1,0.6,0.3).
  64: { impact: addCritical, area: addCritical },
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
  // 74 Space Split (Fire Blast): MODEL_PIER_PART sub2 caster→target - LT 20, Vel 50, z−20, Dir(0,−40,0).
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
  // 214 Drain Life: MODEL_ALICE_DRAIN_LIFE sub0 LT 70 (no such model here) - a spirit joint target → caster for the 70 ticks.
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
  // 223 Explosion: MODEL_SUMMONER_SUMMON_SAHAMUTT LT 80 from 1.5-4.5 tiles beside the caster onto the point,
  // CreateBomb3 on landing (SummonSystem.cpp CreateSummonObject); cast circle tints (1,0.6,0.4)/(1,0.5,0).
  223: {
    cast: summonerCast([1, 0.6, 0.4], [1, 0.5, 0]),
    area: (at, c) => {
      const from = entityPos(c.caster, 0.4, new Vector3());
      from.x += (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 3);
      from.z += (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 3);
      const to = at.clone();
      to.y += 0.3;
      effects.spawn('projectile', c.scene, from, {
        to,
        speed: 6,
        model: { model: MODEL.summonSahamutt, colour: RGBS.white, scale: 0.5, fadeIn: 0.3 },
        trail: { recipe: FIRE_PUFF, rate: 25 },
        onArrive: p => seq(bomb([1, 0.5, 0]), particles({ recipe: FIRE_SPARKS, count: 16 }), scorch(1), burn(1))(p, c),
      });
    },
  },
  // 224 Requiem: MODEL_SUMMONER_SUMMON_NEIL LT 80 one tile before the caster fading in to 0.7; frame 8 the
  // NEIL_NIFE knives at the target, frame 10 the NEIL_GROUND rings, all (0,0.7,1) (ZzzEffect.cpp:7995).
  224: {
    cast: summonerCast([0.7, 0.7, 1], [0, 0.7, 1]),
    area: (at, c) => {
      const front = entityPos(c.caster, 0, new Vector3());
      const f = facing(c);
      front.x += f.x;
      front.z += f.z;
      effects.spawn('model', c.scene, front, { model: MODEL.summonNeil, seconds: ticks(80), scale: 1, colour: RGBS.white, alpha: 0.7, fadeIn: 0.25, fadeTail: 0.25, yaw: entityYaw(c.caster), loop: false });
      // The knife models are not converted - a pierce flash stands in for each.
      after(0.9, seq(flash(TEX.pierce, [0, 0.7, 1], 1.3, 0.4), hitSparks(STEEL_GLINTS, 12)))(at, c);
      after(1.15, seq(
        ring({ texture: TEX.magicGround2, colour: [0, 0.7, 1], seconds: ticks(50), scale: 2.5, spin: 40, growFrom: 0.6 }),
        particles({ recipe: { ...SOUL_MOTES, colour: [0, 0.7, 1] }, count: 16, height: 0.4 })
      ))(at, c);
    },
  },
  // 225 Pollution: MODEL_SUMMONER_SUMMON_LAGUL LT 160 at the point + 4 JOINT_SPIRIT pairs (width 100/20) at
  // 90 deg steps; purple BITMAP_CLOUD (0.6,0.1,1) and smoke raining over +-2.5 tiles for its life.
  225: {
    cast: summonerCast([0.6, 0.6, 0.9], [0.6, 0.3, 0.9]),
    area: (at, c) => {
      effects.spawn('model', c.scene, at, { model: MODEL.summonLagul, seconds: 4, scale: 1, colour: RGBS.white, fadeIn: 0.2, fadeTail: 0.15 });
      streamerFan(4, Math.PI / 2, { velocity: perTick(24), seconds: ticks(40), maxTails: 8, width: 1, colour: RGBS.shade, turn: 0.9, texture: TEX.jointSpirit })(at, c);
      streamerFan(4, Math.PI / 2, { velocity: perTick(24), seconds: ticks(40), maxTails: 8, width: 0.2, colour: RGBS.dark, turn: 0.9, texture: TEX.jointSpirit })(at, c);
      repeat(10, 0.35, scatter(sprite({ texture: TEX.cloud, colour: [0.6, 0.1, 1], size: 2, seconds: 1.2, grow: 1.5, height: 0.4, rise: 0.3 }), 1, 2.2))(at, c);
      effects.spawn('particles', c.scene, at, { recipe: SHADE_MOTES, rate: 12, seconds: 4 });
    },
  },
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
  // 232 Strike of Destruction (337/340/343 alias here, drawn at the target's feet): see `blowOfDestruction`.
  232: { area: blowOfDestruction },
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
  // 238 Chaotic Diseier: 5× BITMAP_SHINY+6 sub3 (Light 0.5, Scale 0.5) at the caster and 8× JOINT
  // BITMAP_2LINE_GHOST from ±1.2 tiles / +0.5-1.1 z pulled into the body; CreateBomb at the target
  // (WSclient.cpp AT_SKILL_GAOTIC).
  238: {
    cast: atCaster((at, c) => {
      sprite({ texture: TEX.shiny5, colour: [0.5, 0.5, 0.5], size: 1.2, seconds: ticks(20), count: 5, spread: 0.3, grow: 1.5 })(at, c);
      for (let i = 0; i < 8; i++) {
        const from = new Vector3(at.x - 1.19 + Math.random() * 2.4, at.y - 0.4 + Math.random() * 0.6, at.z - 1.19 + Math.random() * 2.4);
        effects.spawn('joint', c.scene, from, { to: followEntity(c.caster, 0.9), colour: RGBS.shade, seconds: ticks(20), width: 0.2, jitter: 0.08, texture: TEX.ghost });
      }
    }, 0.9),
    area: seq(bomb(), particles({ recipe: SHADE_MOTES, count: 20 })),
  },
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

/** Critical Damage: every 1.2 s BITMAP_FLARE_FORCE + (19 in 20) MODEL_DARKLORD_SKILL at each weapon, Light (1, 0.6, 0.3) (ZzzCharacter.cpp:10033). */
function critFlare(scene: Scene, entity: Entity): void {
  const tint: RGB = [1, 0.6, 0.3];
  for (const bone of [33, 42]) {
    const at: PointSource = out => bonePos(entity, bone, out, CAST_HEIGHT);
    effects.spawn('sprite', scene, at(new Vector3()), { texture: TEX.flareForce, colour: tint, size: 0.5, seconds: ticks(10), follow: at, grow: 1.6 });
    if (Math.random() < 19 / 20) effects.spawn('model', scene, at(new Vector3()), { model: MODEL.darkLordSkill, seconds: ticks(20), scale: 0.6, colour: tint, follow: at, grow: 1.5 });
  }
}

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
  // 5 Critical Damage Increase (148 its mastery): the weapon flare every 1.2 s.
  5: (e, s) => ({ pulse: { every: 1.2, fire: () => critFlare(s, e) } }),
  148: (e, s) => ({ pulse: { every: 1.2, fire: () => critFlare(s, e) } }),
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
  // 0x4C Weakness, 0x4D Innovation: shiny drops off random bones.
  76: () => ({ boneSparks: { colour: [1.4, 0.2, 0.2] } }),
  77: () => ({ boneSparks: { colour: [0.25, 1, 0.7] } }),
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
