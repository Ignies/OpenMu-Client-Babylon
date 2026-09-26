/**
 * Aura - the persistent look of a buff or debuff on a body, kept up until
 * told to stop. Every part here is a transcription of what the original
 * draws for an `eBuffState` while it holds: the five MODEL_SPEARSKILL
 * ribbons knotted round a Greater Defense (ZzzCharacter.cpp:10795), the
 * shiny on a Greater Damage's hands (:10770), the orange motes off a Swell
 * Life's shoulders (ZzzEffect.cpp:7006), the red glow on every bone under an
 * Ourforces buff (:9563)... The table is `common/skillVisuals.ts`
 * BUFF_VISUALS, one row per effect id (the original's `eBuffState`, which is
 * what OpenMU sends); the design is documentation/buff_visuals/ARCHITECTURE.md.
 *
 * Parts follow the wearer through `follow` (the feet) and `bone` (a MU bone
 * index to world), step at the original's 25 Hz where a rate is per tick,
 * ramp in and out over RAMP_SECONDS so a buff never pops, and all end
 * together on `stop()` or when `until` says the wearer left.
 *
 * Driven by: `effects.spawn('aura', …)` from `common/skillVisuals.ts`.
 * Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import {
  LiveList,
  TICK,
  acquireCard,
  additiveMaterial,
  emitBurst,
  fxNow,
  hash,
  releaseCard,
  setCardCell,
  type Card,
  type ParticleRecipe,
  type PointSource,
  type RGB,
} from './core';
import { MODEL, TEX } from './recipes';
import { spawnJoint } from './joint';
import { modelLayer, type ModelHandle } from './model';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Fade in/out so a buff does not pop. */
const RAMP_SECONDS = 0.3;

/** A sheet of `px` texels at the original's `Scale` is `px * Scale` cm across (ZzzOpenglUtil.cpp:869). */
const px = (texels: number, scale: number): number => (texels * scale) / 100;

/**
 * The knot the aura joints' heads run (ZzzEffectJoint.cpp:4400-4420):
 * `iFrame = WorldTime / 40`, negated on odd joints, offset `index * 53731`;
 * three sines at 0.048, 0.0613 and 0.1113 rad per frame.
 */
const KNOT_FRAMES_PER_SECOND = 25;
const KNOT_A = 0.048;
const KNOT_B = 0.0613;
const KNOT_C = 0.1113;

/** The aura ribbons keep 30 tails and drop a segment over 60 cm (:7108). */
const SPEAR_TAILS = 30;
const SPEAR_MAX_SEGMENT = 0.6;
/** The mid-tail flare: `CreateSprite(BITMAP_FLARE_BLUE, …, 0.7)` on a 64 px sheet, dimming above the waist (:7136). */
const SPEAR_FLARE_SIZE = px(64, 0.7);
const SPEAR_FLARE_WAIST = 0.5;

/** Hand shiny: `Luminosity = rand() % 30 + 70` a tick, BITMAP_SHINY+1 (32×64) at 1.5 (ZzzCharacter.cpp:10775). */
const SHINY_MIN = 0.7;
const SHINY_ROLL = 0.3;
const SHINY_W = px(32, 1.5);
const SHINY_H = px(64, 1.5);

/**
 * Swell Life motes: two BITMAP_LIGHT sub4 particles a tick, 10 ticks each,
 * Scale 2 on the 64 px flare shrinking `0.04..0.08` a tick, `Gravity +=
 * (0.6..1.0) * 9.5` cm a tick, colour × 1/1.35 a tick (ZzzEffectParticle.cpp:3197, :8058).
 */
const MOTE_PER_TICK = 2;
const MOTE_TICKS = 10;
const MOTE_SIZE = px(64, 2);
const MOTE_SHRINK: readonly [number, number] = [px(64, 0.04), px(64, 0.08)];
const MOTE_LIFT: readonly [number, number] = [0.6 * 0.095, 1.0 * 0.095];
const MOTE_FADE = 1 / 1.35;

/**
 * Thorns pins: one tick in three a BITMAP_FLARE sub44 joint 30 cm up and ±30
 * cm about, rising `2..3 + 1/tick` cm, alive 15 ticks, fading × 1/1.05 a
 * tick, stamping BITMAP_PIN_LIGHT (16×128) at 1.5 and 0.5 (ZzzEffectJoint.cpp:2028, :5879, :5911).
 */
const PIN_CHANCE = 1 / 3;
const PIN_TICKS = 15;
const PIN_SPREAD = 0.3;
const PIN_START_HEIGHT = 0.3;
const PIN_LIFT: readonly [number, number] = [0.02, 0.03];
const PIN_LIFT_GAIN = 0.01;
const PIN_FADE = 1 / 1.05;
const PIN_BIG: readonly [number, number] = [px(16, 1.5), px(128, 1.5)];
const PIN_SMALL: readonly [number, number] = [px(16, 0.5), px(128, 0.5)];

/**
 * Weakness / Innovation sparks: one tick in two a BITMAP_SHINY+6 (64 px)
 * particle 20 cm under a random bone, Scale 0.5..0.7, 30 ticks, falling 1.3
 * cm a tick, turning 5° a tick, shrinking 0.02 a tick (ZzzEffect.cpp:6801, ZzzEffectParticle.cpp:2707, :7354).
 */
const SPARK_CHANCE = 1 / 2;
const SPARK_TICKS = 30;
const SPARK_DROP = 0.2;
const SPARK_SIZE: readonly [number, number] = [px(64, 0.5), px(64, 0.7)];
const SPARK_FALL = 0.013;
const SPARK_SPIN = (5 * Math.PI) / 180;
const SPARK_SHRINK = px(64, 0.02);
/**
 * Their BITMAP_PIN_LIGHT companion: one tick in two a pin_lights (16x128) particle under a random bone,
 * Scale 1.0..1.4 shrinking 0.02 a tick, falling 10 cm a tick for 30 ticks (MoveHandlers.cpp:1535-1552,
 * ZzzEffectParticle.cpp:2730-2745, :7378-7395).
 */
const DROP_SCALE: readonly [number, number] = [1.0, 1.4];
const DROP_SHRINK = 0.02;
const DROP_FALL = 0.1;

/**
 * Sleep (eDeBuff_Sleep): one tick in two a BITMAP_TWINTAIL_WATER sub2 (water.jpg, 32 px) 20 cm under a
 * random bone, Scale 1.0..1.62, LT 60..69, rising 2..2.9 cm a tick, light x 1/1.02 a tick
 * (MoveHandlers.cpp:2366-2370, ZzzEffectParticle.cpp:1136-1142, :5255-5270). Its Scale runs down
 * 0.026 a tick and the original draws it mirrored once it passes zero, so it shrinks away and comes back
 * to about 0.3 of its size by the end.
 */
const SLEEP_DROP_TICKS = 69;
const sleepDropRecipes = new Map<string, ParticleRecipe>();
function sleepDrops(colour: RGB): ParticleRecipe {
  const key = colour.join(',');
  let r = sleepDropRecipes.get(key);
  if (!r) {
    r = {
      texture: TEX.water,
      colour,
      size: px(32, 1.31),
      sizeJitter: 0.24,
      life: SLEEP_DROP_TICKS * TICK,
      lifeJitter: 0.13,
      box: [0.2, 0.2, 0.2],
      dir1: [0, 1, 0],
      dir2: [0, 1, 0],
      power: (2.45 * 25) / 100,
      powerJitter: 0.15,
      // |1.31 - 0.026 x 65 p| / 1.31: zero at p 0.78, 0.29 at the end.
      sizeKeys: [
        [0, 1],
        [0.78, 0],
        [1, 0.29],
      ],
      fade: [
        [0, 1],
        [0.25, 0.76],
        [0.5, 0.57],
        [0.75, 0.44],
        [1, 0.26],
      ],
      capacity: 96,
    };
    sleepDropRecipes.set(key, r);
  }
  return r;
}
/**
 * Blind (eDeBuff_Blind): two BITMAP_LIGHT+2 sub6 a tick on random bones, subtractive white: cra_04 at
 * Scale 1.58..1.61 growing 0.04 a tick, LT 21, 6 cm a tick out in a random heading (x 0.6 a tick after
 * the first) and 2 cm up against 0.1 of gravity, fading over the last 10 ticks (MoveHandlers.cpp:2351-2363,
 * ZzzEffectParticle.cpp:885-903, :4050-4080, :9226-9232).
 */
const BLIND_SMOKE_TICKS = 21;
const BLIND_SMOKE: ParticleRecipe = {
  texture: TEX.cra04,
  colour: [1, 1, 1],
  size: px(64, 1.6),
  sizeJitter: 0.01,
  life: BLIND_SMOKE_TICKS * TICK,
  lifeJitter: 0,
  box: [0.05, 0.02, 0.05],
  dir1: [-0.4, 1, -0.4],
  dir2: [0.4, 1, 0.4],
  power: 0.5,
  powerJitter: 0.1,
  gravity: -0.62,
  spin: 0.87,
  endScale: 1.52,
  blend: 'dark',
  fade: [
    [0, 1],
    [0.52, 1],
    [1, 0],
  ],
  capacity: 256,
};

/**
 * Stun: three MODEL_SPEARSKILL sub8 joints, 40 cm out, turning 25° and
 * rising 15 cm a tick for 40 ticks, Scale 30, on the BITMAP_LIGHT sheet
 * (ZzzEffectJoint.cpp:1633, :4370). The original's Light is 0.5; a half-grey
 * flare strip does not read at our camera, so ours is white.
 */
const STUN_RADIUS = 0.4;
const STUN_TURN = (25 * Math.PI) / 180;
const STUN_RISE = 0.15;
const STUN_TICKS = 40;
const STUN_WIDTH = 0.3;
const STUN_LIGHT: RGB = [1, 1, 1];

/**
 * AG recovery rings: every 50 ticks a BITMAP_JOINT_HEALING sub9 joint (width
 * 15, 20 tails) that orbits at 50 cm closing 1 cm a tick, rises 1 cm a tick,
 * turns 2 × 0.1 rad a tick, its light `(1, 0.5, 1) / 11` growing × 1.25 a
 * tick for 10 ticks and fading × 1/1.1 from tick 40, a 0.5 FLARE_BLUE on
 * every tail (ZzzEffect.cpp:7030, ZzzEffectJoint.cpp:521, :3524, :7176).
 */
const RING_EVERY_TICKS = 50;
const RING_STEP_DEG = 50;
const RING_RADIUS = 0.5;
const RING_CLOSE = 0.01;
const RING_RISE = 0.01;
const RING_START_HEIGHT = 0.1;
const RING_TURN = 0.2;
const RING_WIDTH = 0.15;
const RING_TAILS = 20;
const RING_LIGHT: RGB = [1 / 11, 0.5 / 11, 1 / 11];
const RING_GROW_TICKS = 10;
const RING_GROW = 1.25;
/** The tail flares take the ribbon's light at the top of its growth (a card's tint is set once). */
const RING_FLARE_LIGHT: RGB = [RING_LIGHT[0] * RING_GROW ** RING_GROW_TICKS, RING_LIGHT[1] * RING_GROW ** RING_GROW_TICKS, RING_LIGHT[2] * RING_GROW ** RING_GROW_TICKS];
const RING_FADE_FROM_TICK = 40;
const RING_FADE = 1 / 1.1;
const RING_FLARE_SIZE = px(64, 0.5);

/**
 * Berserker: BITMAP_ORORA (64 px) at the hands, Scale 0.2 growing 0.01 a
 * tick over 100 ticks turning 5° a tick, fading × 1/1.05 once over 0.8; a
 * second pair 25 ticks long growing 0.04 turning 20° fading × 1/1.33
 * (ZzzEffectParticle.cpp:2752, :7399). Light marks on 14 bones (ZzzEffect.cpp:9277).
 */
const ORORA_SLOW = { ticks: 100, grow: 0.01, turn: (5 * Math.PI) / 180, fade: 1 / 1.05 };
const ORORA_FAST = { ticks: 25, grow: 0.04, turn: (20 * Math.PI) / 180, fade: 1 / 1.33 };
const ORORA_START = 0.2;
const ORORA_FADE_FROM = 0.8;
const ORORA_HANDS: readonly number[] = [37, 28];
const MARK_BONES: readonly number[] = [20, 20, 19, 18, 17, 2, 35, 26, 36, 27, 37, 28, 39, 30];
const MARK_SCALES: readonly number[] = [1.5, 1.5, 0.6, 1.1, 0.9, 0.8, 0.6, 0.6, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7];
const MARK_PX = 64;

/** Frozen: MODEL_ICE sub1/2 on the body, Scale 0.8, pitched -20°, the second turned about; a Fire03 ember orbiting at 60 cm, 20° a tick, `z = sin(t) * 20 + 30` (ZzzEffect.cpp:2197, :7710). */
const ICE_SCALE = 0.8;
const ICE_PITCH = (-20 * Math.PI) / 180;
/** The frame the ice clip is held on while the body stays frozen (`AnimationFrame = 4`). */
const ICE_HOLD_FRAME = 4;
const EMBER_RADIUS = 0.6;
const EMBER_TURN = (20 * Math.PI) / 180;
const EMBER_HEIGHT = 0.3;
const EMBER_BOB = 0.2;
const EMBER_SIZE = 0.6;
const EMBER_CELLS = { w: 64, h: 64, count: 4 };
const EMBER_FPS = 12;

/** The skull over a Defense-reduced head: the original creates BITMAP_SKULL but this build never draws it; ours is a small one that bobs. */
const SKULL_SIZE = 0.5;
const SKULL_HEIGHT = 2.3;
const SKULL_BOB = 0.08;

// ---- 2. state + readers ----------------------------------------------------

/** N MODEL_SPEARSKILL ribbons on the knot; geometry in tiles (the original's cm / 100). */
export interface SpearJoints {
  count: number;
  /** Ribbon width (C++ `Scale`). */
  width: number;
  colour: RGB;
  /** The sheet run along the ribbon (default BITMAP_FLARE_BLUE). */
  texture?: string;
  /** `pos = target + (radius v.x, radius v.y, base + lift v.z)`. */
  radius: number;
  base: number;
  lift: number;
  /** Draw the mid-tail flare (sub 0/4/9 do, the seals do not). */
  flare?: boolean;
}

/** Shiny cards on bones, each rolling its brightness a tick. */
export interface HandShiny {
  bones: readonly number[];
  colour: RGB;
}

/** Short-lived rising cards born on random bones a tick (Swell Life). */
export interface BoneMotes {
  bones: readonly number[];
  colour: RGB;
}

/** One card per bone, breathing. */
export interface BoneGlow {
  /** MU bone indices, or every bone of the skeleton. */
  bones: readonly number[] | 'all';
  texture: string;
  colour: RGB;
  /** Card edge in tiles, or one per bone. */
  size: number | readonly number[];
  /** Brightness 0…1 at clock `t` for bone slot `i`. */
  breathe: (t: number, i: number) => number;
}

/** Something fired on a timer (the crit flare, the Swell of Magic hand rune). */
export interface Pulse {
  every: number;
  fire: () => void;
}

export interface AuraOptions {
  follow: PointSource;
  /** Ends the aura on its own when true (the wearer left the world). */
  until?: () => boolean;
  /** Seconds to fade in and out (default RAMP_SECONDS); a short flash on a body wants less. */
  ramp?: number;
  /** A MU bone index to world; parts on bones need it. */
  bone?: (mu: number, out: Vector3) => Vector3;
  /** How many bones the wearer's skeleton has (`boneGlow` on `'all'`). */
  boneCount?: () => number;
  spearJoints?: SpearJoints;
  handShiny?: HandShiny;
  boneMotes?: BoneMotes;
  boneGlow?: BoneGlow;
  pulse?: Pulse;
  /** Thorns: the rising pin lights. */
  pins?: { colour: RGB };
  /** Weakness / Innovation: shiny drops off random bones, with their flare01 underlay and pin_lights when asked. */
  boneSparks?: { colour: RGB; underlay?: boolean; pins?: boolean };
  /** Sleep: violet water drops rising off random bones. */
  sleepDrops?: { colour: RGB };
  /** Blind: black smoke pouring off random bones. */
  blindSmoke?: boolean;
  /** Frozen: the ice shell and its ember. */
  iceShell?: boolean;
  /** Defense reduction: the skull. */
  skull?: boolean;
  /** Stun: the three rising ribbons, once. */
  stun?: boolean;
  /** AG recovery: the orbiting healing rings. */
  healingRings?: boolean;
  /** Berserker: the hand auroras and the body marks. */
  berserk?: boolean;
}

interface Part {
  /** `ramp` is the aura's 0…1 fade; `ticks` how many 25 Hz ticks elapsed this frame. */
  update(dt: number, ramp: number, ticks: number): void;
  release(): void;
}

const live = new LiveList();

/** How many auras are up (debug). */
export function auraCount(): number {
  return live.size;
}

const tmp = new Vector3();
let seed = 0;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Bone position with the aura's fallback when no skeleton is up: the feet + 0.9. */
function boneOf(o: AuraOptions, mu: number, out: Vector3): Vector3 {
  if (o.bone) return o.bone(mu, out);
  o.follow(out);
  out.y += 0.9;
  return out;
}

// ---- parts ----

function spearJoints(scene: Scene, o: AuraOptions, p: SpearJoints, stopping: () => boolean): Part {
  const anchor = new Vector3();
  const offset = Math.floor(hash(seed++) * 100000);
  const handles: EffectHandle[] = [];
  for (let i = 0; i < p.count; i++) {
    const head: PointSource = out => {
      o.follow(anchor);
      const frame = fxNow() * KNOT_FRAMES_PER_SECOND;
      const f = (i % 2 ? frame : -frame) + i * 53731 + offset;
      const a = (f + 55555) * KNOT_A;
      const b = f * KNOT_B;
      const c = (f + 11111) * KNOT_C;
      const t0 = Math.sin(a) * Math.cos(b);
      const t1 = Math.sin(a) * Math.sin(b);
      const t2 = Math.cos(a);
      const sc = Math.sin(c);
      const cc = Math.cos(c);
      // The original's (x, y, z) with z up; ours has y up.
      const vx = cc * t1 - sc * t2;
      const vy = sc * t1 + cc * t2;
      const vz = t0;
      return out.set(anchor.x + vx * p.radius, anchor.y + p.base + vz * p.lift, anchor.z + vy * p.radius);
    };
    handles.push(
      spawnJoint(scene, anchor, {
        head,
        anchor: o.follow,
        maxTails: SPEAR_TAILS,
        maxSegment: SPEAR_MAX_SEGMENT,
        width: p.width,
        colour: p.colour,
        texture: p.texture ?? TEX.flareBlue,
        seconds: Infinity,
        until: stopping,
        ...(p.flare ? { sprites: { texture: TEX.flareBlue, colour: p.colour, size: SPEAR_FLARE_SIZE, fadeAbove: SPEAR_FLARE_WAIST } } : {}),
      })
    );
  }
  return {
    update() {},
    release() {
      for (const h of handles) h.stop();
      handles.length = 0;
    },
  };
}

function handShiny(scene: Scene, o: AuraOptions, p: HandShiny): Part {
  const m = additiveMaterial(scene, TEX.shiny2, p.colour);
  const cards = p.bones.map(() => acquireCard(scene, m));
  let acc = 0;
  let lum = SHINY_MIN;
  return {
    update(_dt, ramp, ticks) {
      acc += ticks;
      // The original rolls the luminosity once a tick.
      if (acc >= 1) {
        acc = 0;
        lum = SHINY_MIN + Math.random() * SHINY_ROLL;
      }
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        boneOf(o, p.bones[i], tmp);
        c.position.copyFrom(tmp);
        c.scaling.set(SHINY_W, SHINY_H, 1);
        c.visibility = lum * ramp;
      }
    },
    release() {
      for (const c of cards) releaseCard(scene, c);
      cards.length = 0;
    },
  };
}

interface Mote {
  card: Card;
  bone: number;
  age: number;
  lift: number;
  rise: number;
  size: number;
  light: number;
}

function boneMotes(scene: Scene, o: AuraOptions, p: BoneMotes): Part {
  const m = additiveMaterial(scene, TEX.flare, p.colour);
  const motes: Mote[] = [];
  const pool: Card[] = [];
  const take = (): Card => pool.pop() ?? acquireCard(scene, m);
  const n = p.bones.length;
  return {
    update(_dt, ramp, ticks) {
      for (let t = 0; t < ticks; t++) {
        // Two a tick on a random upper bone and its mirror (`g_byUpperBoneLocation[i]`, `[6 - i]`).
        const i = Math.floor(Math.random() * n);
        for (const bone of [p.bones[i], p.bones[n - 1 - i]]) {
          if (motes.length >= n * MOTE_TICKS) break;
          motes.push({ card: take(), bone, age: 0, lift: 0, rise: 0, size: MOTE_SIZE, light: 1 });
        }
        for (let k = motes.length - 1; k >= 0; k--) {
          const mote = motes[k];
          mote.age++;
          mote.lift += rand(MOTE_LIFT[0], MOTE_LIFT[1]);
          mote.rise += mote.lift;
          mote.size -= rand(MOTE_SHRINK[0], MOTE_SHRINK[1]);
          mote.light *= MOTE_FADE;
          if (mote.age >= MOTE_TICKS || mote.size <= 0) {
            mote.card.visibility = 0;
            pool.push(mote.card);
            motes[k] = motes[motes.length - 1];
            motes.pop();
          }
        }
      }
      for (const mote of motes) {
        boneOf(o, mote.bone, tmp);
        mote.card.position.set(tmp.x, tmp.y + mote.rise, tmp.z);
        mote.card.scaling.setAll(mote.size);
        mote.card.visibility = mote.light * ramp;
      }
    },
    release() {
      for (const mote of motes) releaseCard(scene, mote.card);
      for (const c of pool) releaseCard(scene, c);
      motes.length = 0;
      pool.length = 0;
    },
  };
}

function boneGlow(scene: Scene, o: AuraOptions, p: BoneGlow): Part {
  const m = additiveMaterial(scene, p.texture, p.colour);
  let cards: Card[] = [];
  let bones: readonly number[] = p.bones === 'all' ? [] : p.bones;
  const sizeOf = (i: number): number => (typeof p.size === 'number' ? p.size : (p.size[i] ?? p.size[0]));
  return {
    update(_dt, ramp) {
      if (p.bones === 'all') {
        // The skeleton may load after the buff arrived: size the set to it when it changes.
        const count = o.boneCount?.() ?? 0;
        if (count !== bones.length) {
          for (const c of cards) releaseCard(scene, c);
          bones = Array.from({ length: count }, (_, i) => i);
          cards = bones.map(() => acquireCard(scene, m));
        }
      } else if (cards.length !== bones.length) {
        cards = bones.map(() => acquireCard(scene, m));
      }
      const t = fxNow();
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        boneOf(o, bones[i], tmp);
        c.position.copyFrom(tmp);
        c.scaling.setAll(sizeOf(i));
        c.visibility = p.breathe(t, i) * ramp;
      }
    },
    release() {
      for (const c of cards) releaseCard(scene, c);
      cards = [];
    },
  };
}

function pulse(p: Pulse): Part {
  // The original's `LastCritDamageEffect < WorldTime - interval` fires at once on a fresh buff.
  let due = 0;
  return {
    update(dt) {
      due -= dt;
      if (due <= 0) {
        due += p.every;
        p.fire();
      }
    },
    release() {},
  };
}

interface Pin {
  big: Card;
  small: Card;
  x: number;
  z: number;
  y: number;
  lift: number;
  age: number;
  light: number;
}

function pins(scene: Scene, o: AuraOptions, colour: RGB): Part {
  const m = additiveMaterial(scene, TEX.pinLights, colour);
  const alive: Pin[] = [];
  const pool: Card[] = [];
  const take = (): Card => pool.pop() ?? acquireCard(scene, m);
  const anchor = new Vector3();
  return {
    update(_dt, ramp, ticks) {
      o.follow(anchor);
      for (let t = 0; t < ticks; t++) {
        if (Math.random() < PIN_CHANCE) {
          alive.push({
            big: take(),
            small: take(),
            x: rand(-PIN_SPREAD, PIN_SPREAD),
            z: rand(-PIN_SPREAD, PIN_SPREAD),
            y: PIN_START_HEIGHT,
            lift: rand(PIN_LIFT[0], PIN_LIFT[1]),
            age: 0,
            light: 1,
          });
        }
        for (let k = alive.length - 1; k >= 0; k--) {
          const pin = alive[k];
          pin.age++;
          pin.lift += PIN_LIFT_GAIN;
          pin.y += pin.lift;
          pin.light *= PIN_FADE;
          if (pin.age >= PIN_TICKS) {
            pin.big.visibility = 0;
            pin.small.visibility = 0;
            pool.push(pin.big, pin.small);
            alive[k] = alive[alive.length - 1];
            alive.pop();
          }
        }
      }
      for (const pin of alive) {
        // A pin rides the body sideways (the original re-reads the target) but keeps its own climb.
        const x = anchor.x + pin.x;
        const y = anchor.y + pin.y;
        const z = anchor.z + pin.z;
        pin.big.position.set(x, y, z);
        pin.big.scaling.set(PIN_BIG[0], PIN_BIG[1], 1);
        pin.big.visibility = pin.light * ramp;
        pin.small.position.set(x, y, z);
        pin.small.scaling.set(PIN_SMALL[0], PIN_SMALL[1], 1);
        pin.small.visibility = pin.light * ramp;
      }
    },
    release() {
      for (const pin of alive) {
        releaseCard(scene, pin.big);
        releaseCard(scene, pin.small);
      }
      for (const c of pool) releaseCard(scene, c);
      alive.length = 0;
      pool.length = 0;
    },
  };
}

interface Spark {
  card: Card;
  /** The flare01 card the original draws under every SHINY+6 (ZzzEffectParticle.cpp:9301-9304). */
  under: Card | null;
  x: number;
  y: number;
  z: number;
  size: number;
  spin: number;
  age: number;
}

interface Drop {
  card: Card;
  x: number;
  y: number;
  z: number;
  scale: number;
  age: number;
}

function boneSparks(scene: Scene, o: AuraOptions, p: NonNullable<AuraOptions['boneSparks']>): Part {
  const m = additiveMaterial(scene, TEX.shiny5, p.colour);
  const mu = additiveMaterial(scene, TEX.flare, p.colour);
  const mp = additiveMaterial(scene, TEX.pinLights, p.colour);
  const alive: Spark[] = [];
  const drops: Drop[] = [];
  const pool: Card[] = [];
  const poolU: Card[] = [];
  const poolP: Card[] = [];
  const take = (): Card => pool.pop() ?? acquireCard(scene, m);
  const takeU = (): Card => poolU.pop() ?? acquireCard(scene, mu);
  const takeP = (): Card => poolP.pop() ?? acquireCard(scene, mp);
  const place = (c: Card, s: Spark, ramp: number): void => {
    c.position.set(s.x, s.y, s.z);
    c.scaling.setAll(s.size);
    c.rotation.z = s.spin;
    c.visibility = ramp;
  };
  return {
    update(_dt, ramp, ticks) {
      const count = o.boneCount?.() ?? 0;
      for (let t = 0; t < ticks; t++) {
        if (count > 0 && Math.random() < SPARK_CHANCE) {
          // The particle stays where it was born; the original does not re-read the body.
          boneOf(o, Math.floor(Math.random() * count), tmp);
          alive.push({
            card: take(),
            under: p.underlay ? takeU() : null,
            x: tmp.x,
            y: tmp.y - SPARK_DROP,
            z: tmp.z,
            size: rand(SPARK_SIZE[0], SPARK_SIZE[1]),
            spin: rand(0, Math.PI * 2),
            age: 0,
          });
        }
        if (p.pins && count > 0 && Math.random() < SPARK_CHANCE) {
          boneOf(o, Math.floor(Math.random() * count), tmp);
          drops.push({ card: takeP(), x: tmp.x, y: tmp.y - SPARK_DROP, z: tmp.z, scale: rand(DROP_SCALE[0], DROP_SCALE[1]), age: 0 });
        }
        for (let k = alive.length - 1; k >= 0; k--) {
          const s = alive[k];
          s.age++;
          s.y -= SPARK_FALL;
          s.size -= SPARK_SHRINK;
          s.spin += SPARK_SPIN;
          if (s.age >= SPARK_TICKS || s.size <= 0) {
            s.card.visibility = 0;
            pool.push(s.card);
            if (s.under) {
              s.under.visibility = 0;
              poolU.push(s.under);
            }
            alive[k] = alive[alive.length - 1];
            alive.pop();
          }
        }
        for (let k = drops.length - 1; k >= 0; k--) {
          const d = drops[k];
          d.age++;
          d.y -= DROP_FALL;
          d.scale -= DROP_SHRINK;
          if (d.age >= SPARK_TICKS || d.scale <= 0) {
            d.card.visibility = 0;
            poolP.push(d.card);
            drops[k] = drops[drops.length - 1];
            drops.pop();
          }
        }
      }
      for (const s of alive) {
        place(s.card, s, ramp);
        if (s.under) place(s.under, s, ramp);
      }
      for (const d of drops) {
        d.card.position.set(d.x, d.y, d.z);
        d.card.scaling.set(px(16, d.scale), px(128, d.scale), 1);
        d.card.visibility = ramp;
      }
    },
    release() {
      for (const s of alive) {
        releaseCard(scene, s.card);
        if (s.under) releaseCard(scene, s.under);
      }
      for (const d of drops) releaseCard(scene, d.card);
      for (const c of pool) releaseCard(scene, c);
      for (const c of poolU) releaseCard(scene, c);
      for (const c of poolP) releaseCard(scene, c);
      alive.length = 0;
      drops.length = 0;
      pool.length = 0;
      poolU.length = 0;
      poolP.length = 0;
    },
  };
}

/**
 * A shared particle recipe fed from random bones: `perTick` a tick (a fraction is a chance), `drop`
 * tiles under the bone. The Sleep drops and the Blind smoke (MoveHandlers.cpp:2339-2376).
 */
function boneEmitter(scene: Scene, o: AuraOptions, recipe: ParticleRecipe, perTick: number, drop: number): Part {
  return {
    update(_dt, _ramp, ticks) {
      const count = o.boneCount?.() ?? 0;
      if (count <= 0) return;
      for (let t = 0; t < ticks; t++) {
        let n = Math.floor(perTick) + (Math.random() < perTick % 1 ? 1 : 0);
        while (n-- > 0) {
          boneOf(o, Math.floor(Math.random() * count), tmp);
          tmp.y -= drop;
          emitBurst(scene, recipe, tmp, 1);
        }
      }
    },
    release() {},
  };
}

function iceShell(scene: Scene, o: AuraOptions): Part {
  const at = o.follow(new Vector3());
  const shells: ModelHandle[] = [];
  for (const yaw of [0, Math.PI]) {
    const h = modelLayer.spawn(scene, at, {
      model: MODEL.ice,
      seconds: Infinity,
      scale: ICE_SCALE,
      follow: o.follow,
      yaw,
      holdFrame: ICE_HOLD_FRAME,
      blendMesh: 0,
    }) as ModelHandle;
    h.pitchTo(ICE_PITCH);
    shells.push(h);
  }
  const ember = acquireCard(scene, additiveMaterial(scene, TEX.fire3, [1, 1, 1]));
  let angle = 0;
  let frame = -1;
  return {
    update(_dt, ramp, ticks) {
      angle += EMBER_TURN * ticks;
      const t = fxNow();
      o.follow(tmp);
      ember.position.set(tmp.x + Math.cos(angle) * EMBER_RADIUS, tmp.y + EMBER_HEIGHT + Math.sin(t) * EMBER_BOB, tmp.z + Math.sin(angle) * EMBER_RADIUS);
      ember.scaling.setAll(EMBER_SIZE);
      const f = Math.floor(t * EMBER_FPS) % EMBER_CELLS.count;
      if (f !== frame && setCardCell(ember, EMBER_CELLS, f)) frame = f;
      ember.visibility = frame < 0 ? 0 : ramp;
    },
    release() {
      for (const h of shells) h.stop();
      shells.length = 0;
      releaseCard(scene, ember);
    },
  };
}

function skull(scene: Scene, o: AuraOptions): Part {
  const card = acquireCard(scene, additiveMaterial(scene, TEX.skull, [1, 1, 1]));
  return {
    update(_dt, ramp) {
      o.follow(tmp);
      card.position.set(tmp.x, tmp.y + SKULL_HEIGHT + Math.sin(fxNow() * 3) * SKULL_BOB, tmp.z);
      card.scaling.setAll(SKULL_SIZE);
      card.visibility = ramp;
    },
    release() {
      releaseCard(scene, card);
    },
  };
}

function stun(scene: Scene, o: AuraOptions, stopping: () => boolean): Part {
  // The original copies the target's position once: the ribbons climb from where the stun landed.
  const centre = o.follow(new Vector3());
  const born = fxNow();
  const handles: EffectHandle[] = [];
  for (let i = 0; i < 3; i++) {
    const start = ((i + 1) * Math.PI) / 2;
    const drop = i * 0.1;
    const head: PointSource = out => {
      const ticks = (fxNow() - born) / TICK;
      const a = start + STUN_TURN * ticks;
      return out.set(centre.x + Math.sin(a) * STUN_RADIUS, centre.y - drop + STUN_RISE * ticks, centre.z - Math.cos(a) * STUN_RADIUS);
    };
    handles.push(
      spawnJoint(scene, centre, {
        head,
        maxTails: SPEAR_TAILS,
        width: STUN_WIDTH,
        colour: STUN_LIGHT,
        texture: TEX.flare,
        seconds: STUN_TICKS * TICK,
        until: stopping,
      })
    );
  }
  return {
    update() {},
    release() {
      for (const h of handles) h.stop();
      handles.length = 0;
    },
  };
}

function healingRings(scene: Scene, o: AuraOptions, stopping: () => boolean): Part {
  let due = 0;
  let angle = 0;
  const handles: EffectHandle[] = [];
  return {
    update(dt) {
      due -= dt;
      if (due > 0) return;
      due += RING_EVERY_TICKS * TICK;
      angle += RING_STEP_DEG;
      const born = fxNow();
      const phase = angle * 0.1;
      const anchor = new Vector3();
      const colour: [number, number, number] = [RING_LIGHT[0], RING_LIGHT[1], RING_LIGHT[2]];
      const head: PointSource = out => {
        o.follow(anchor);
        const ticks = (fxNow() - born) / TICK;
        const r = Math.max(0, RING_RADIUS - RING_CLOSE * ticks);
        const a = phase + RING_TURN * ticks;
        return out.set(anchor.x + Math.sin(a) * r, anchor.y + RING_START_HEIGHT + RING_RISE * ticks, anchor.z + Math.cos(a) * r);
      };
      // Light: × 1.25 a tick for the first ten, × 1/1.1 a tick from the fortieth.
      let lastTick = 0;
      const h = spawnJoint(scene, anchor, {
        head,
        anchor: o.follow,
        maxTails: RING_TAILS,
        width: RING_WIDTH,
        colour,
        texture: TEX.jointEnergy,
        seconds: (RING_RADIUS / RING_CLOSE) * TICK,
        until: stopping,
        sprites: { texture: TEX.flareBlue, colour: RING_FLARE_LIGHT, size: RING_FLARE_SIZE, count: RING_TAILS },
        trace: () => {
          const tick = Math.floor((fxNow() - born) / TICK);
          for (; lastTick < tick; lastTick++) {
            const k = lastTick < RING_GROW_TICKS ? RING_GROW : lastTick >= RING_FADE_FROM_TICK ? RING_FADE : 1;
            if (k !== 1) for (let i = 0; i < 3; i++) colour[i] *= k;
          }
        },
      });
      handles.push(h);
      for (let i = handles.length - 1; i >= 0; i--) if (!handles[i].alive) handles.splice(i, 1);
    },
    release() {
      for (const h of handles) h.stop();
      handles.length = 0;
    },
  };
}

interface Orora {
  card: Card;
  bone: number;
  kind: typeof ORORA_SLOW;
  sign: number;
  age: number;
  light: number;
}

function berserk(scene: Scene, o: AuraOptions): Part {
  const red: RGB = [0.9, 0, 0.1];
  const ororaMat = additiveMaterial(scene, TEX.orora, red);
  const auroras: Orora[] = [];
  const start = (): void => {
    for (const kind of [ORORA_SLOW, ORORA_FAST]) {
      ORORA_HANDS.forEach((bone, i) => {
        auroras.push({ card: acquireCard(scene, ororaMat), bone, kind, sign: i === 0 ? 1 : -1, age: 0, light: 1 });
      });
    }
  };
  start();
  const markMat = additiveMaterial(scene, TEX.lightMarks, red);
  const marks = MARK_BONES.map(() => acquireCard(scene, markMat));
  return {
    update(_dt, ramp, ticks) {
      for (let t = 0; t < ticks; t++) {
        for (let k = auroras.length - 1; k >= 0; k--) {
          const a = auroras[k];
          a.age++;
          if (ORORA_START + a.kind.grow * a.age >= ORORA_FADE_FROM) a.light *= a.kind.fade;
          if (a.age >= a.kind.ticks) {
            releaseCard(scene, a.card);
            auroras.splice(k, 1);
          }
        }
        // The per-frame block re-creates the set once the slow pair has run out.
        if (auroras.length === 0) start();
      }
      for (const a of auroras) {
        boneOf(o, a.bone, tmp);
        a.card.position.copyFrom(tmp);
        a.card.scaling.setAll(px(64, ORORA_START + a.kind.grow * a.age));
        a.card.rotation.z = a.sign * a.kind.turn * a.age;
        a.card.visibility = a.light * ramp;
      }
      const breathe = 0.75 + 0.25 * Math.sin(fxNow() * Math.PI);
      for (let i = 0; i < marks.length; i++) {
        boneOf(o, MARK_BONES[i], tmp);
        marks[i].position.copyFrom(tmp);
        marks[i].scaling.setAll(px(MARK_PX, MARK_SCALES[i]));
        marks[i].visibility = breathe * ramp;
      }
    },
    release() {
      for (const a of auroras) releaseCard(scene, a.card);
      for (const c of marks) releaseCard(scene, c);
      auroras.length = 0;
      marks.length = 0;
    },
  };
}

// ---- the aura ----

function spawn(scene: Scene, _at: Vector3, opts: AuraOptions): EffectHandle {
  let stopping = false;
  const isStopping = (): boolean => stopping;
  const parts: Part[] = [];
  if (opts.spearJoints) parts.push(spearJoints(scene, opts, opts.spearJoints, isStopping));
  if (opts.handShiny) parts.push(handShiny(scene, opts, opts.handShiny));
  if (opts.boneMotes) parts.push(boneMotes(scene, opts, opts.boneMotes));
  if (opts.boneGlow) parts.push(boneGlow(scene, opts, opts.boneGlow));
  if (opts.pulse) parts.push(pulse(opts.pulse));
  if (opts.pins) parts.push(pins(scene, opts, opts.pins.colour));
  if (opts.boneSparks) parts.push(boneSparks(scene, opts, opts.boneSparks));
  if (opts.sleepDrops) parts.push(boneEmitter(scene, opts, sleepDrops(opts.sleepDrops.colour), 0.5, 0.2));
  if (opts.blindSmoke) parts.push(boneEmitter(scene, opts, BLIND_SMOKE, 2, 0));
  if (opts.iceShell) parts.push(iceShell(scene, opts));
  if (opts.skull) parts.push(skull(scene, opts));
  if (opts.stun) parts.push(stun(scene, opts, isStopping));
  if (opts.healingRings) parts.push(healingRings(scene, opts, isStopping));
  if (opts.berserk) parts.push(berserk(scene, opts));

  let ramp = 0;
  const rampSeconds = opts.ramp ?? RAMP_SECONDS;
  let tickAcc = 0;
  const fx = live.push({
    update(dt) {
      ramp += (stopping ? -dt : dt) / rampSeconds;
      if (ramp > 1) ramp = 1;
      if (ramp <= 0) return false;
      if (!stopping && opts.until?.()) stopping = true;
      // Per-tick rates step at the original's 25 Hz whatever the frame rate.
      tickAcc += dt;
      const ticks = Math.floor(tickAcc / TICK);
      tickAcc -= ticks * TICK;
      for (const p of parts) p.update(dt, ramp, ticks);
      return true;
    },
    release() {
      for (const p of parts) p.release();
      parts.length = 0;
    },
  });

  // A soft stop: ramp down, then the live list releases it.
  return {
    get alive() {
      return fx.alive;
    },
    stop() {
      stopping = true;
    },
  };
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const auraLayer: EffectLayer<AuraOptions, 'aura'> = {
  name: 'aura',
  update,
  reset,
  spawn,
};
