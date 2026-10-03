import { EXPLOSION_CELLS, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects, type EffectHandle } from '@/controllers/fx';
import { type Entity } from '@/ecs/world';
import { FIRE_BLEND_MESH, LANDING_SMOKE_LIFT } from '../_shared';
import { IMPACT_HEIGHT, SkillContext, Step, TICK, cm, onRelease, perTick, ring, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { bonePos, delay, entityGone, entityPos, entityYaw, followEntity, fxNow, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { type ProjectileHead } from '@/controllers/fx/projectile';
import { type Sounds } from '@/controllers/sound/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';

import { CAST_HEIGHT } from '@/controllers/lighting/skills';
import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { TICK_SECONDS } from '../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/**
 * BITMAP_FIRE sub5 as MODEL_FIRE sub0/sub1 leaves it every tick (ZzzEffect.cpp:7954; ZzzEffectParticle.cpp:407-419,
 * :4555-4563): LT 24, 64 px x 1.28-1.91, shrinking 0.04 a tick, rising 12 cm, turning 5 deg a tick, and
 * kept at its creation Light `(Lum, 0.1 Lum, 0)` until it dies. Deep red, not FIRE_TRAIL's orange.
 */
export const FIRE_BALL_TRAIL: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.1, 0],
  size: 1.02,
  sizeJitter: 0.2,
  life: 0.96,
  lifeJitter: 0,
  power: 0,
  powerJitter: 0,
  gravity: 0.26,
  box: [0.02, 0.02, 0.02],
  spin: 2.2,
  endScale: 0.4,
  fade: [
    [0, 1],
    [1, 1],
  ],
};

/** Hot chips a flying MODEL_FIRE sheds on the graded tiers: small, orange going red, falling away from the path. */
export const FIRE_BALL_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.55, 0.15],
  colourEnd: [0.7, 0.12, 0],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.55,
  lifeJitter: 0.3,
  box: [0.12, 0.12, 0.12],
  dir1: [-1, -0.2, -1],
  dir2: [1, 0.8, 1],
  power: 0.9,
  gravity: -2.5,
  spin: 4,
  capacity: 256,
};

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
export const teleportColumn = sparkColumn(TELEPORT_BASE, TELEPORT_COLUMN);

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
export const teleportEnhanced = (moment: 'begin' | 'end'): Step => seq(teleportColumnTinted, teleportGround, teleportShimmer(moment));

// ---- dw1 steps --------------------------------------------------------------------

/**
 * `step` at the release (`onRelease`: AttackTime 15 or the cast clip's key 5, ZzzCharacter.cpp:4132-4145,
 * WSclient.cpp:4276-4304), on the target's feet as they are then (`to->Position`); nothing if the caster has gone.
 */
export const atRelease = (step: Step): Step => (at, c) => {
  const feet = at.clone();
  feet.y -= IMPACT_HEIGHT;
  onRelease(c, () => {
    if (entityGone(c.caster)) return;
    if (c.target && !entityGone(c.target)) entityPos(c.target, 0, feet);
    step(feet, c);
  });
};

/** The skill's `PlayBuffer` at its release, heard from the caster. */
export const releaseSound = (key: Sounds): Step => (_at, c) => {
  if (c.caster.transform) playCombat(key, c.caster.transform.pos);
};

/** A value re-rolled once a tick, `min + k * step` for k in 0..steps-1 (`(rand() % 4 + 4) * 0.1`). */
export function perTickRoll(min: number, steps: number, step: number): (t: number) => number {
  let tick = -1;
  let v = min;
  return t => {
    const n = Math.floor(t / TICK);
    if (n !== tick) {
      tick = n;
      v = min + Math.floor(Math.random() * steps) * step;
    }
    return v;
  };
}

/** MODEL_STONE1 / 2, rolled per chip: opaque fire02 lava thrown out and bouncing (debris.ts; MuOnlineClient ZzzEffect.cpp:10956-11060). */
export const lavaChips = (n: number): Step => (at, c) => {
  for (let i = 0; i < n; i++) effects.spawn('debris', c.scene, at, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, count: 1, colour: RGBS.white, blendMesh: -1 });
};

/** What the graded tiers add to a MODEL_FIRE in flight: a glow card on the ball and embers shed along the path. */
export interface FireBallLook {
  glow?: ProjectileHead;
  embers?: ParticleRecipe;
}

/** Embers a second off a flying ball (FIRE_BALL_EMBERS). */
const FIRE_BALL_EMBER_RATE = 40;

/**
 * MODEL_FIRE in flight: the lava core, its fire01 tail at `BlendMeshLight` `tail`, a BITMAP_FIRE sub5 a tick
 * and the red light riding it (ZzzEffect.cpp:7931-7959). The light dies with the ball. `hitTest` ends the
 * flight early (CheckTargetRange); `done` gets where the ball died.
 */
export function fireBallFlight(
  c: SkillContext,
  skill: number,
  from: Vector3,
  to: Vector3,
  o: { scale: number; tail: number | ((t: number) => number); alongPath: boolean } & FireBallLook,
  done: (at: Vector3) => void,
  hitTest?: (p: Vector3) => boolean
): void {
  const head = from.clone();
  const light = lighting.skillLand(c.scene, skill, from, out => {
    out.x = head.x;
    out.y = head.y;
    out.z = head.z;
  });
  let hit = false;
  let flying = true;
  let handle: EffectHandle | null = null;
  handle = effects.spawn('projectile', c.scene, from, {
    to,
    speed: perTick(50),
    head: o.glow,
    model: { model: MODEL.fire, colour: RGBS.white, scale: o.scale, blendMesh: FIRE_BLEND_MESH, blendLight: o.tail, alongPath: o.alongPath },
    trail: { recipe: FIRE_BALL_TRAIL, rate: 25 },
    trace: p => {
      head.copyFrom(p);
      if (!hit && handle && hitTest?.(p)) {
        hit = true;
        handle.stop();
      }
    },
    onArrive: p => {
      flying = false;
      light?.dispose();
      if (!hitTest) done(p);
    },
    onLost: () => {
      flying = false;
      light?.dispose();
      if (hit) done(head.clone());
    },
  });
  if (o.embers) {
    effects.spawn('particles', c.scene, from, { recipe: o.embers, rate: FIRE_BALL_EMBER_RATE, seconds: ticks(60), follow: out => out.copyFrom(head), until: () => !flying });
  }
}

/** Explotion01 through its cells, faded inside each cell (controllers/fx/softEdge.ts): its grey ground showed as a square on the graded tiers. */
export const softExplosion = (colour: RGB, scale = 1): Step =>
  sprite({ texture: TEX.explosion, colour, size: cm(256) * scale, seconds: ticks(20), cells: EXPLOSION_CELLS, fadeTail: 0.25, soft: true });

/** A soft glow laid on the ground under an effect, its contact with the ground (ring layer, flare01). */
export const groundFlare = (colour: RGB, scale: number, seconds: number): Step =>
  ring({ texture: TEX.flare, colour, scale, seconds, growFrom: 0.6, fadeTail: 0.6 });

/** One of the row's `bodies` lights (controllers/lighting/skills.ts), standing at `at`. */
export const placeBodyLight = (skill: number, body: string): Step => (at, c) => {
  const x = at.x;
  const y = at.y;
  const z = at.z;
  lighting.skillBody(c.scene, skill, body, out => {
    out.x = x;
    out.y = y;
    out.z = z;
  });
};

/** The caster's bearing to the target at the release (`CreateAngle2D`, ZzzCharacter.cpp:4888-4890), else its facing. */
export function bearing(c: SkillContext, from: Vector3): number {
  if (!c.target || entityGone(c.target)) return entityYaw(c.caster);
  const to = entityPos(c.target, 0, new Vector3());
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return dx * dx + dz * dz > 1e-6 ? Math.atan2(dx, -dz) : entityYaw(c.caster);
}

/** A monster caster's number, or -1 for a character. */
export const monsterOf = (e: Entity): number => (e.charAppearance ? -1 : (e.npcType ?? -1));

// ---- dw2 steps

/**
 * `step` at the release (`onRelease`: AttackTime 15 or the cast clip's key 5, ZzzCharacter.cpp:4132-4145), with
 * the caster's facing as it is then; nothing if the caster left meanwhile.
 */
export const dw2AtAttackTime = (step: Step): Step => (at, c) => {
  const p = at.clone();
  onRelease(c, () => {
    if (entityGone(c.caster)) return;
    step(p, { ...c, yaw: entityYaw(c.caster) });
  });
};

/**
 * The landing smoke's cards reach up to 3.6 tiles and the ground cut them off in a straight edge; on the graded tiers
 * they are a third smaller and lifted 0.4 tiles more, so they clear it.
 */
export const smallerSmoke = (r: ParticleRecipe): ParticleRecipe => ({ ...r, size: r.size * 0.7, endScale: 1.7 });
export const LANDING_SMOKE_LIFT_GRADED = LANDING_SMOKE_LIFT + 0.4;
export const CLOAK_EFFECT = 18;

/** Teleport's column on the graded tiers: its sparks' tint, 2.16 tiles up either way, LT 10. */
export const TELEPORT_LIGHT = effectLight([0.5, 0.75, 1], 2.16, 0.4, { heightOffset: CAST_HEIGHT, release: 0.25 });

/** MODEL_FIRE sub0 / sub1 in flight; the effect stops it where the ball dies, this is only a give-up time. */
export const FIRE_BALL_LIGHT: LightRecipe = {
  color: [1, 0.1, 0],
  range: 2,
  seconds: 3,
  release: 0.04,
  flicker: { min: 0.7, max: 1, steps: 4 },
};

/** BITMAP_EXPLOTION's (0.5, 0.3, 0.1) x LT/20 in range 4 (ZzzEffectParticle.cpp:4265-4269). */
export const EXPLOSION_LIGHT: LightRecipe = { color: [0.5, 0.3, 0.1], range: 4, seconds: 20 * TICK_SECONDS, release: 20 * TICK_SECONDS };
