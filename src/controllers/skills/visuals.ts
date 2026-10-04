import { ARC_MOTES, BOMB_SPARKS, EXPLOSION_CELLS, FIRE_PUFF, FIRE_SPARKS, HOLY_MOTES, MODEL, RGBS, SHADE_MOTES, SMOKE, SPARKS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { type AuraOptions, type SpearJoints } from '@/controllers/fx/aura';

import { effects, type EffectHandle } from '@/controllers/fx';
import { type Entity } from '@/ecs/world';
import { type ModelOptions } from '@/controllers/fx/model';
import { type ParticlesOptions } from '@/controllers/fx/particles';
import { bonePos, delay, entityGone, entityPos, entityYaw, followEntity, fxNow, type PointSource, type RGB } from '@/controllers/fx/core';
import { type ProjectileOptions } from '@/controllers/fx/projectile';
import { type RingOptions } from '@/controllers/fx/ring';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { skillDefinition, type SkillDefinition } from '@versions/shared/skills/skillsDatabase';
import { type SpriteOptions } from '@/controllers/fx/sprite';
import { combat, RELEASE_KEY, RELEASE_TICKS } from '@/controllers/combat';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';
import { heldWeapons } from '@/controllers/actors';
import { tierIndex } from '@/controllers/lighting/lightingQuality';
import { weather } from '@/controllers/weather';

/**
 * Skill visual engine: step DSL, dispatch, fallbacks, buff looks (see readme.md).
 * Ports ZzzCharacter.cpp `AT_SKILL_*` / `AttackStage`, WSclient.cpp `ReceiveMagic`, ZzzEffect.cpp `CreateEffect`.
 */

// ---- units ------------------------------------------------------------------

/** One original tick, seconds (LifeTime is counted in these). */
export const TICK = 0.04;
/** Ticks → seconds. */
export const ticks = (n: number): number => n * TICK;
/** Centimetres → tiles (`TILE_CM`, controllers/terrain/consts.ts). */
export const cm = (n: number): number => n / 100;
/** A per-tick `Direction` in cm → tiles/s. */
export const perTick = (n: number): number => (n * 25) / 100;

// ---- heights (tiles above the feet) --------------------------------------------

/** The caster's hands. */
export const CAST_HEIGHT = 1.1;
/** A target's chest, where bolts hit. */
export const IMPACT_HEIGHT = 0.9;
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
export const TRIPLE_SPREAD = (15 * Math.PI) / 180;
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

export const sprite = (o: SpriteOptions): Step => (at, c) => effects.spawn('sprite', c.scene, at, o);
export const particles = (o: ParticlesOptions): Step => (at, c) => effects.spawn('particles', c.scene, at, o);
export const model = (o: ModelOptions): Step => (at, c) => effects.spawn('model', c.scene, at, o);
export const ring = (o: RingOptions): Step => (at, c) => effects.spawn('ring', c.scene, at, o);
export const seq = (...steps: Step[]): Step => (at, c) => {
  for (const s of steps) s(at, c);
};
/** `step`, but at the caster instead of the point. */
export const atCaster = (step: Step, height = CAST_HEIGHT): Step => (_at, c) =>
  step(entityPos(c.caster, height, new Vector3()), c);
/** `step`, `n` times around `at` within `radius` tiles, staggered by `every` seconds. */
export const scatter = (step: Step, n: number, radius: number, every = 0): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random();
    const r = radius * (0.3 + Math.random() * 0.7);
    const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    if (every > 0 && i > 0) delay(i * every, () => step(p, c));
    else step(p, c);
  }
};
/** `step` at `n` points on a ring of `radius` tiles, evenly spaced (CreateInferno's 45° bombs). */
export const ringOf = (step: Step, n: number, radius: number, every = 0): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = new Vector3(at.x + Math.cos(a) * radius, at.y, at.z + Math.sin(a) * radius);
    if (every > 0 && i > 0) delay(i * every, () => step(p, c));
    else step(p, c);
  }
};
/**
 * `step` again after `seconds` - on the effects clock (`controllers/fx/core.ts`
 * `delay`), never `setTimeout`: a warp or a death resets the layer and the
 * pending step with it.
 */
export const after = (seconds: number, step: Step): Step => (at, c) => {
  const p = at.clone();
  delay(seconds, () => step(p, c));
};
/** What lets a cast release early: its caster's clip reaching `key` (AttackStage). See readme.md. */
export interface ReleaseRule {
  /** The clip key; `RELEASE_KEY` (5) by default. */
  readonly key?: number;
  /** The clips that count; by default AttackStage's attack clips (`combat.releasesOnKey`). */
  readonly clips?: ReadonlySet<number>;
  /** `g_iLimitAttackTime` for the cast: 15 by default, 5 for Penetration (ZzzCharacter.cpp:2779). */
  readonly limit?: number;
}

/** `clips` for an AttackStage case that never forces the release: it comes when AttackTime runs out. */
export const NO_KEY: ReadonlySet<number> = new Set();

/** The caster's clip has passed the rule's key (`AnimationFrame >= key`, ZzzCharacter.cpp:2598-2604). */
function keyReached(e: Entity, rule: ReleaseRule): boolean {
  const m = e.modelObject;
  if (!m) return false;
  const monsterRig = !!e.monsterAnimation || (e.skin ?? -1) >= 0;
  const counts = rule.clips ? rule.clips.has(m.CurrentAction) : combat.releasesOnKey(m.CurrentAction, monsterRig);
  return counts && m.actionFrame() >= (rule.key ?? RELEASE_KEY);
}

/**
 * Run `fn` at the cast's release (`AttackTime >= g_iLimitAttackTime`, ZzzCharacter.cpp:4132-4140): 14 ticks
 * after the packet, or from the next tick on as soon as the caster's clip passes its key, so a faster clip
 * (attack / magic speed) releases sooner.
 */
export function onRelease(c: SkillContext, fn: () => void, rule: ReleaseRule = {}): void {
  const last = ticks(rule.limit === undefined ? RELEASE_TICKS : rule.limit - 1);
  if (!c.caster.modelObject) {
    delay(last, fn);
    return;
  }
  const t0 = fxNow();
  const poll = (): void => {
    const t = fxNow() - t0 + 1e-9;
    if (t >= last || keyReached(c.caster, rule)) fn();
    else delay(0, poll);
  };
  delay(TICK, poll);
}

/** The hero's last cast: when its packet came, and whether it has released since. */
let heroCastAt = -Infinity;
let heroReleased = true;

/** A cast by the hero: watch its release (default rule) for `afterHeroRelease`. */
function watchHeroRelease(c: SkillContext): void {
  if (!c.caster.localPlayer) return;
  const at = fxNow();
  heroCastAt = at;
  heroReleased = false;
  onRelease(c, () => {
    if (heroCastAt === at) heroReleased = true;
  });
}

/**
 * Run `fn` at the hero's cast release, or now when none is pending: the release block is where the
 * kill's ATTACK_DIE energy is created (ZzzCharacter.cpp:5242-5247). Never later than 14 ticks after the cast.
 */
export function afterHeroRelease(fn: () => void): void {
  const poll = (): void => {
    if (heroReleased || fxNow() - heroCastAt + 1e-9 >= ticks(RELEASE_TICKS)) fn();
    else delay(0, poll);
  };
  poll();
}

/** `step` at the cast's release (`onRelease`), with the skill being dispatched now as `currentSkill`. */
export const afterRelease = (step: Step, rule?: ReleaseRule): Step => (at, c) => {
  const p = at.clone();
  const skill = currentSkill;
  onRelease(c, () => {
    currentSkill = skill;
    step(p, c);
  }, rule);
};

/** `step` `n` times, `every` seconds apart (a per-frame spawn over a few frames). */
export const repeat = (n: number, every: number, step: Step): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const p = at.clone();
    if (i === 0) step(p, c);
    else delay(i * every, () => step(p, c));
  }
};
/**
 * The facing convention: `transform.rot.y` is `atan2(dz, dx) + π/2`
 * (skillCastSystem / app/logic.ts), so the forward vector is (sin yaw, −cos yaw)
 * - the same one deathSystem and the debris entry use.
 */
export const forwardOf = (yaw: number): { x: number; z: number } => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });
/** `step`, offset from `at` by `forward` tiles along the caster's facing and `side` tiles to its right, `up` tiles higher. */
export const offset = (step: Step, forward: number, up = 0, side = 0): Step => (at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const p = new Vector3(
    at.x + f.x * forward - f.z * side,
    at.y + up,
    at.z + f.z * forward + f.x * side
  );
  step(p, c);
};
/** The caster's facing as a unit vector (+ `turn` radians). */
export const facing = (c: SkillContext, turn = 0): Vector3 => {
  const f = forwardOf(entityYaw(c.caster) + turn);
  return new Vector3(f.x, 0, f.z);
};
/** Toward `to` from `at`, flat, unit. */
export const toward = (at: Vector3, to: Vector3): Vector3 => {
  const d = new Vector3(to.x - at.x, 0, to.z - at.z);
  return d.lengthSquared() > 1e-6 ? d.normalize() : new Vector3(0, 0, 1);
};
/** Follow a point `forward` tiles ahead of the caster at `height`. */
export const ahead = (caster: Entity, forward: number, height: number): PointSource => out => {
  entityPos(caster, height, out);
  const f = forwardOf(entityYaw(caster));
  out.x += f.x * forward;
  out.z += f.z * forward;
  return out;
};
/** A point that leaves the caster along its facing at `speed` tiles/s (a MODEL with `Direction`). */
export const flying = (c: SkillContext, height: number, speed: number, turn = 0, startForward = 0): PointSource => {
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
export const orbiting = (caster: Entity, radius: number, height: number, rate: number, phase: number): PointSource => {
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
export const weaponBone = (caster: Entity): PointSource => out => bonePos(caster, WEAPON_BONE, out, CAST_HEIGHT);
/** `c->Weapon`: the weapons a character holds, the castle's inside Chaos Castle. */
export const weaponsOf = (e: Entity) => heldWeapons(e, storeRef().world?.mapIndex ?? -1);
/** A blur trail swept in front of the caster (CreateWeaponBlur on the weapon bone). */
export const slash = (colour: RGB = RGBS.steel, texture: string = TEX.swordBlur, reach = SLASH_REACH): Step => (_at, c) => {
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

export const hitSparks = (recipe = SPARKS, count = HIT_COUNT): Step => particles({ recipe, count });
export const flash = (texture: string, colour: RGB, size = 1, seconds = 0.4): Step =>
  sprite({ texture, colour, size, seconds, grow: 1.6, growFrom: 0.4, fadeTail: 0.5 });
/**
 * BITMAP_EXPLOTION played through its 10 cells over 20 ticks, `Width = 256 cm × Scale`
 * (ZzzEffectParticle.cpp). Never a plain `flash`: the sheet's filler cells are white.
 */
export const explosion = (colour: RGB, scale = 1, seconds = ticks(20)): Step =>
  sprite({ texture: TEX.explosion, colour, size: cm(256) * scale, seconds, cells: EXPLOSION_CELLS, fadeTail: 0.25 });
/**
 * Burn the settled snow off the ground under `at` (controllers/weather/snowMelt.ts).
 *
 * Not from the original - nothing in `ZzzEffect.cpp` has ever touched the
 * terrain - but the ground here is a simulation rather than a texture, and a
 * fireball that leaves a snowfield untouched is the one thing on screen that
 * gives that away. Radius in tiles; it takes only x/z, so a hit at a target's
 * chest still melts what is under them. Free to call anywhere: a map with no
 * snow overlay never samples the patch.
 */
export const scorch = (radius: number, strength = 1): Step => at => {
  weather.meltSnow(at.x, at.z, radius, strength);
};
/**
 * The other half of what fire does to the ground: the grass goes up, and the
 * fire spreads from the hit under its own vigour until it runs out of that or
 * out of grass (`controllers/weather/grassBurn.ts`). Radius in tiles, the same one the
 * snow takes - a bigger spell lights a bigger fire and therefore burns
 * further, with no per-skill table anywhere to say so.
 */
export const burn = (radius: number, strength = 1): Step => (at, c) => {
  weather.burnGrass(c.scene, at.x, at.z, radius, strength);
};
/** Every fire skill's landing, and so the one place the snow gets melted. */
export const fireHit: Step = seq(explosion(RGBS.fire), hitSparks(FIRE_SPARKS, 16), particles({ recipe: FIRE_PUFF, count: 6 }), scorch(1.2), burn(1.2));
export const arcHit: Step = seq(flash(TEX.thunder, RGBS.arc, 1.3, 0.3), hitSparks(ARC_MOTES, 20));
/** BITMAP_MAGIC+1 (Magic_Ground2) at a body's feet, LT 20 - the buff-cast circle. */
export const magicGround = (colour: RGB, seconds = ticks(20), scale = 2.5): Step =>
  ring({ texture: TEX.magicGround2, colour, seconds, scale, spin: 60, growFrom: 0.5 });
export const holyCircle = (colour: RGB = RGBS.holy): Step =>
  seq(magicGround(colour), particles({ recipe: HOLY_MOTES, count: 24, height: 0.2 }));
export const shockRing = (colour: RGB = RGBS.gold, scale = 4): Step =>
  ring({ texture: TEX.shockwave, colour, seconds: 0.6, scale, grow: 2, growFrom: 0.2, fadeTail: 0.6 });
export const steelHit: Step = seq(hitSparks(STEEL_GLINTS, 14), flash(TEX.spark2, RGBS.steel, 0.8, 0.25));
const wizardCast: Step = atCaster(sprite({ texture: TEX.magicCircle, colour: RGBS.energy, size: 0.5, seconds: 0.4, spin: 6, grow: 1.4 }));

/** CreateBomb (ZzzEffect.cpp:6394): 20 BITMAP_SPARK chips + one grey BITMAP_EXPLOTION card. */
const bomb = (colour: RGB = [0.5, 0.5, 0.5]): Step =>
  seq(explosion(colour), particles({ recipe: BOMB_SPARKS, count: 20 }));

// ---- travel ------------------------------------------------------------------

export interface Travel extends Omit<ProjectileOptions, 'to' | 'onArrive' | 'from'> {
  /** Start high above the target and fall on it (Meteorite, Cometfall). */
  fromSky?: boolean;
  /** Sky start: tiles up and tiles along +x / -z from the target (the original's Pos += (x, y, z)). */
  skyOffset?: readonly [number, number, number];
  /** Leave at the cast's release (`onRelease`, `true` for the default rule) instead of at the packet. */
  release?: true | ReleaseRule;
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
export const ENHANCED_TIER = 1;

/** A row as the current tier draws it. */
function forTier(row: SkillVisual): SkillVisual {
  return row.enhanced && tierIndex() >= ENHANCED_TIER ? { ...row, ...row.enhanced } : row;
}

export const bolt = (head: string, colour: RGB, trail: ParticlesOptions['recipe'], size = 0.6, speed = perTick(60)): Travel => ({
  speed,
  head: { texture: head, colour, size },
  trail: { recipe: trail, rate: 30 },
});

export const arrow = (m: string = MODEL.arrow, colour: RGB = RGBS.steel): Travel => ({
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

/** Summons: BITMAP_MAGIC+1 sub3 at the caster's feet + smoke at the point. */
export function summonCircle(at: Vector3, c: SkillContext): void {
  atCaster(magicGround(RGBS.holy, ticks(20), 2.5), 0)(at, c);
  particles({ recipe: SMOKE, count: 12 })(at, c);
}

// ---- sum2 steps ------------------------------------------------------------------

/**
 * `c->AttackTime >= g_iLimitAttackTime` (15): the Summoner curses land 14 ticks after the reply
 * set AttackTime to 1 (WSclient.cpp:4899, ZzzCharacter.cpp:171, :4724-4754, :5158-5198).
 */
const CURSE_DELAY = ticks(14);

/** `step` once the curse lands, with the skill being dispatched now (the landing sound reads it). */
export const onCurseLanding = (step: Step): Step => (at, c) => {
  const skill = currentSkill;
  after(CURSE_DELAY, (p, cc) => {
    currentSkill = skill;
    step(p, cc);
  })(at, c);
};

// ---- the table -------------------------------------------------------------------

/** Keyed by skill number (versions/shared/skills/skillsDatabase.ts). */
export const SKILL_VISUALS: Partial<Record<number, SkillVisual>> = {};

/**
 * Fire a projectile, carrying its own light for the length of the flight.
 *
 * The original lights an arrow body every frame it is alive (ZzzEffect.cpp
 * MoveEffect, `AddTerrainLight(..., range 2)` per arrow model);
 * `controllers/lighting/skills.ts` holds the colours and decides which models light at
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
export function fanArrows(at: Vector3, c: SkillContext, n: number, m: string, colour: RGB, spread: number | readonly number[] = TRIPLE_SPREAD, scale = 1): void {
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
export let currentSkill = 0;

/**
 * Master-level "Strengthener / Mastery" skills reuse their base skill's
 * look: the OpenMU numbers past 300 that are cast-able map onto the base
 * row (the original's SKILL_REPLACEMENTS collapse). Filled by `registerSkills`
 * from each base skill's `lookAliases` and `masterAliases`.
 */
export const LOOK_ALIASES: Record<number, number> = {};

/** `SkillDef.warriorGlint` by skill id. */
export const WARRIOR_GLINTS: Record<number, true | 'mounted'> = {};

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
  return SKILL_VISUALS[skill] ? skill : LOOK_ALIASES[skill] ?? skill;
}

/** The row for a skill as the current tier draws it, through master aliases, else its type's fallback. */
export function skillVisualFor(skill: number): SkillVisual {
  return forTier(SKILL_VISUALS[skill] ?? SKILL_VISUALS[LOOK_ALIASES[skill] ?? -1] ?? fallbackFor(skillDefinition(skill)));
}

/** How many skills have their own row (aliases included). */
export function skillVisualCount(): number {
  return Object.keys(SKILL_VISUALS).length + Object.keys(LOOK_ALIASES).length;
}

// ---- dispatch ---------------------------------------------------------------------

export function contextFor(scene: Scene, caster: Entity, target: Entity | null): SkillContext {
  return { scene, caster, target, yaw: entityYaw(caster) };
}

function runTravel(row: SkillVisual, ctx: SkillContext, target: Entity): void {
  const { release, ...rest } = row.travel!;
  if (!release) return launch(row, rest, ctx, target);
  const skill = currentSkill;
  onRelease(ctx, () => {
    if (entityGone(ctx.caster) || entityGone(target)) return;
    currentSkill = skill;
    launch(row, rest, ctx, target);
  }, release === true ? {} : release);
}

function launch(row: SkillVisual, flight: Omit<Travel, 'release'>, ctx: SkillContext, target: Entity): void {
  const { fromSky, skyOffset, ...travel } = flight;
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
    watchHeroRelease(ctx);
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
 * cast point (the hero's own cast knows it; for others app/logic.ts picks the
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
    watchHeroRelease(ctx);
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
 * arrow, keyed here by its item index in group 4 (`versions/shared/items/bows/`).
 * Anything not listed throws the plain MODEL_ARROW - the five wooden bows do,
 * and so do the few late launchers whose own model this client has no sheet
 * for (the Celestial Bow's MODEL_ARROW_HOLY).
 */
export const LAUNCHER_ARROWS: Partial<Record<number, { model: string; colour: RGB }>> = {};

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
  const launcher = combat.equippedLauncher(weaponsOf(shooter));
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
export type BuffLook = (entity: Entity, scene: Scene) => Partial<AuraOptions>;

/** The knot the five green MODEL_SPEARSKILL sub4 joints run: radius 80, `z = 110 + 120 v.z`, width 20, Light (0.4, 0.8, 0.2) (ZzzEffectJoint.cpp:1553, :4470). */
const GREEN_KNOT: SpearJoints = { count: 5, width: 0.2, colour: [0.4, 0.8, 0.2], radius: 0.8, base: 1.1, lift: 1.2, flare: true };

/**
 * Keyed by OpenMU MagicEffectNumber, which is the original's `eBuffState`
 * value for value: the look the original keeps
 * on a body while the effect holds (WSclient.cpp InsertBuffPhysicalEffect
 * :15466, the per-frame block ZzzCharacter.cpp:10770-10990). The green knot
 * of 1 / 2 / 3 is one shared set (SHARED_LOOKS). An id with no row has no
 * body look in the original either; the mastery ids OpenMU sends on their
 * own (135, 138, 139, 148, 153-155) take their base effect's look.
 */
export const BUFF_VISUALS: Partial<Record<number, BuffLook>> = {};

/** Work a buff does as it lands or lifts before its look is kept; true means the look is handled. */
export type BuffArrival = (scene: Scene, entity: Entity, active: boolean) => boolean;

export const BUFF_ARRIVALS: Partial<Record<number, BuffArrival>> = {};

/** What a buff draws when its wearer is hit, given who hit last (the original's `AttackPlayer`). */
export type BuffHit = (scene: Scene, wearer: Entity, attacker: Entity | null) => void;

export const BUFF_HITS: Partial<Record<number, BuffHit>> = {};

/** Command: the wearer was hit; every buff it holds with a hit look draws it. */
export function playBuffHits(scene: Scene, wearer: Entity, attacker: Entity | null): void {
  if (!wearer.buffs) return;
  for (const id in BUFF_HITS) if (wearer.buffs.has(+id)) BUFF_HITS[id]!(scene, wearer, attacker);
}

/**
 * One look kept up while any of its ids holds: the original keeps a single
 * set of five green joints on a body under Attack, Defense or HelpNpc
 * (`ShouldKeepAuraJointAlive`, ZzzEffectJoint.cpp:4440), never a second.
 */
const SHARED_LOOKS: readonly { key: number; ids: readonly number[]; look: BuffLook }[] = [
  { key: -1, ids: [1, 2, 3], look: () => ({ spearJoints: GREEN_KNOT }) },
];

/** Live buff looks per entity. Weak: an entity that leaves scope takes its entry with it. */
const buffHandles = new WeakMap<Entity, Map<number, EffectHandle>>();

export function keepLook(scene: Scene, entity: Entity, key: number, look: BuffLook | null): void {
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
  if (BUFF_ARRIVALS[effectId]?.(scene, entity, active)) return;
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
// and it stands in for the object `app/logic.ts` finds on the cast point, so the
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
