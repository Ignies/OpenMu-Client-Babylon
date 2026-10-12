import { TILE_CM } from '../terrain/consts';
import {
  Color4,
  Constants,
  Sprite,
  SpriteManager,
  type Scene,
} from '../render/babylon/exports';
import { downloadDataFile, hasDataFile, loadMuSprite } from '@/controllers/assets/mu';
import { maps } from '../maps';
import { EFFECT_RENDERING_GROUP, darkCardGain, keepDepthForEffects, spriteLevel } from './core';
import { devQuery, devQueryNumber } from '../../core/devSeams';
import { pageHidden } from '../../core/utils';
import { viewDepth } from '../render/viewPlanes';
import { reportLoadFailure } from '../assets';

const TICKS_PER_SECOND = 25;

/** Dev seam: `?emitterGate=0` lets every emitter spawn whether in view or not. */
const EMITTER_GATE = devQuery('emitterGate') !== '0';


const OZJ_HEADER_SIZE = 24;

const POOL_SIZE = 2048;

type TextureKey =
  | 'smoke'
  | 'cloud'
  | 'fire01'
  | 'fire03'
  | 'fireHik1'
  | 'fireHik2'
  | 'fireHik3'
  | 'fireHik3Mono'
  | 'waterfall1'
  | 'waterfall2'
  | 'waterfall3'
  | 'waterfall5'
  | 'spark03'
  | 'flareBlue'
  | 'fantaB'
  | 'fantaF'
  | 'clud64'
  | 'flare01'
  | 'flare01Red'
  | 'fi01'
  | 'fi02'
  | 'fireRed'
  | 'impact03'
  | 'impact01'
  | 'shiny02'
  | 'shiny05'
  | 'lightmarks'
  | 'pinLight'
  | 'waterfall4'
  | 'shiny03'
  | 'magicGround1'
  | 'shockWave'
  | 'flare'
  | 'flareRed'
  | 'lightningMega1'
  | 'lightningMega2'
  | 'lightningMega3'
  | 'shiny01';

const TEXTURES: Record<
  TextureKey,
  { file: string; size: number; frames?: number; height?: number }
> = {
  smoke: { file: 'Effect/smoke01.OZJ', size: 64 },
  cloud: { file: 'Effect/clouds.OZJ', size: 256 },
  fire01: { file: 'Effect/Fire01.OZJ', size: 64, frames: 4 },
  fire03: { file: 'Effect/Fire03.OZJ', size: 64, frames: 4 },
  fireHik1: { file: 'Effect/firehik01.OZJ', size: 64 },
  fireHik2: { file: 'Effect/firehik02.OZJ', size: 64 },
  fireHik3: { file: 'Effect/firehik03.OZJ', size: 64 },
  fireHik3Mono: { file: 'Effect/firehik_mono03.OZJ', size: 64 },
  waterfall1: { file: 'Effect/waterFall1.OZJ', size: 64 },
  waterfall2: { file: 'Effect/waterFall2.OZJ', size: 64 },
  waterfall3: { file: 'Effect/waterFall3.OZJ', size: 64 },
  waterfall5: { file: 'Effect/waterFall5.OZJ', size: 64 },
  spark03: { file: 'Effect/Spark03.OZJ', size: 32 },
  flareBlue: { file: 'Effect/flareBlue.OZJ', size: 64 },
  fantaB: { file: 'Effect/fantaB.OZJ', size: 64 },
  fantaF: { file: 'Effect/fantaF.OZJ', size: 64 },
  clud64: { file: 'Effect/clud64.OZJ', size: 64 },
  flare01: { file: 'Effect/flare01.OZJ', size: 64 },
  flare01Red: { file: 'Effect/flare01_red.OZJ', size: 64 },
  fi01: { file: 'Effect/fi01.OZJ', size: 128 },
  fi02: { file: 'Effect/fi02.OZT', size: 256 },
  fireRed: { file: 'Effect/firered.OZJ', size: 64 },
  // The held weapons' sprites (ZzzCharacter.cpp:7027-8386); `height` where the sheet is not square.
  impact03: { file: 'Object9/Impack03.OZJ', size: 64 },
  impact01: { file: 'Effect/impack01.OZJ', size: 64 },
  shiny02: { file: 'Effect/Shiny02.OZJ', size: 32, height: 64 },
  shiny05: { file: 'Effect/shiny05.OZJ', size: 64 },
  lightmarks: { file: 'Effect/lightmarks.ozj', size: 128 },
  pinLight: { file: 'Effect/pin_lights.OZJ', size: 16, height: 128 },
  waterfall4: { file: 'Effect/waterFall4.OZJ', size: 64 },
  shiny03: { file: 'Effect/Shiny03.OZJ', size: 128, height: 16 },
  magicGround1: { file: 'Effect/Magic_Ground1.OZJ', size: 128 },
  shockWave: { file: 'Effect/Shockwave.OZJ', size: 128 },
  flare: { file: 'Effect/Flare.OZJ', size: 64 },
  flareRed: { file: 'Effect/flareRed.OZJ', size: 64 },
  lightningMega1: { file: 'Effect/lighting_mega01.OZJ', size: 128 },
  lightningMega2: { file: 'Effect/lighting_mega02.OZJ', size: 128 },
  lightningMega3: { file: 'Effect/lighting_mega03.OZJ', size: 128 },
  shiny01: { file: 'Effect/Shiny01.OZJ', size: 16 },
};

/**
 * `dark` is a held sprite's `EnableAlphaBlendMinus`: black, with the sheet's
 * luminance as its coverage (`coverageSheet`), the rule the effects draw dark
 * art by (controllers/fx/core `darkCardGain`). `alpha` is `EnableAlphaBlend3`
 * (SRC_ALPHA, ONE_MINUS_SRC_ALPHA) on a sheet with alpha (OZT).
 */
type Blend = 'add' | 'subtract' | 'dark' | 'alpha';

type Particle = {
  live: boolean;
  kind: ParticleKind;
  sprite: Sprite;
  lifeTime: number;
  scale: number;
  alpha: number;
  gravity: number;
  rotation: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  /** `AngleMatrix(Angle)` by rows, which MovePosition turns the velocity by. */
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
  m20: number;
  m21: number;
  m22: number;
  /** `StartPosition`, for the kinds that measure how far they drift. */
  sx: number;
  sy: number;
  sz: number;
  lr: number;
  lg: number;
  lb: number;
  tr: number;
  tg: number;
  tb: number;
  pixelSize: number;
  frame: number;
  frames: number;
};

type ParticleKind = {
  readonly texture: TextureKey;
  readonly blend: Blend;
  init(p: Particle, scale: number, light: readonly [number, number, number]): void;
  update(p: Particle, f: number, worldTimeMs: number): void;
  color(p: Particle, out: Color4): void;
};

const rand = (n: number) => Math.floor(Math.random() * n);

const WHITE: readonly [number, number, number] = [1, 1, 1];

const plainColor = (p: Particle, out: Color4) => out.set(p.lr, p.lg, p.lb, 1);

/**
 * A node's own rotation (`node.rotation`): MU's `Angle` as `(-Angle[0], -Angle[2], -Angle[1])` in
 * radians (loadMapIntoScene.ts createObjects, then renderAngles.ts).
 */
export type NodeTurn = Readonly<{ x: number; y: number; z: number }>;

export const NO_TURN: NodeTurn = { x: 0, y: 0, z: 0 };

/** `AngleMatrix` (ZzzMathLib.cpp:185-212) of the MU `Angle` the node's turn stands for. */
function turnWith(p: Particle, turn: NodeTurn): void {
  const sr = Math.sin(-turn.x);
  const cr = Math.cos(-turn.x);
  const sp = Math.sin(-turn.z);
  const cp = Math.cos(-turn.z);
  const sy = Math.sin(-turn.y);
  const cy = Math.cos(-turn.y);

  p.m00 = cp * cy;
  p.m01 = sr * sp * cy - cr * sy;
  p.m02 = cr * sp * cy + sr * sy;
  p.m10 = cp * sy;
  p.m11 = sr * sp * sy + cr * cy;
  p.m12 = cr * sp * sy - sr * cy;
  p.m20 = -sp;
  p.m21 = sr * cp;
  p.m22 = cr * cp;
}

/**
 * `g_vParticleWind`: MoveParticles walks its pace by up to 0.6 a tick, held within 0.6, and the wind
 * by its pace, held within 1.7 (ZzzEffectParticle.cpp:3847-3859). `light0` drifts on half of it.
 */
const wind = { x: 0, y: 0, vx: 0, vy: 0, due: 0 };

const within = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

function stepWind(ticks: number): void {
  wind.due = Math.min(wind.due + ticks, 4);

  while (wind.due >= 1) {
    wind.due -= 1;
    wind.vx = within(wind.vx + (rand(2001) - 1000) * 0.0006, 0.6);
    wind.vy = within(wind.vy + (rand(2001) - 1000) * 0.0006, 0.6);
    wind.x = within(wind.x + wind.vx, 1.7);
    wind.y = within(wind.y + wind.vy, 1.7);
  }
}

function fireKind(
  texture: TextureKey,
  opts: {
    lifeBase: number;
    lifeRand: number;
    fadeBelow: number;
    gravityBase: number;
    shrinkBase: number;
    shrinkRand: number;
    scaleBase?: number;
    gravityRand?: number;
  }
): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = rand(5) + opts.lifeBase;
      p.scale = (rand(72) + (opts.scaleBase ?? 72)) * 0.01 * scale;
      p.rotation = rand(360);
      p.gravity = (rand(opts.gravityRand ?? 24) + opts.gravityBase) * 0.1;
      p.alpha = 0;

      [p.tr, p.tg, p.tb] = light;
      p.lr = p.lg = p.lb = 0;
    },
    update(p, f) {
      if (p.lifeTime < opts.fadeBelow) {
        p.alpha -= f * 0.2;

        // Only a particle on its way out is cut here. The ramp below starts
        // at 0 and climbs by a frame-scaled step, so testing it against a
        // fixed floor killed every particle whose first frame was shorter
        // than the original's tick: half of them at 60 Hz (the step lands on
        // 0.083 or 0.125), all of them past 120, which left a torch with
        // nothing but its flare card.
        if (p.alpha < 0.1) {
          p.live = false;
          return;
        }
      } else if (p.alpha < 1) {
        p.alpha += f * (rand(2) + 2) * 0.1;
      } else {
        p.alpha = 1;
      }

      p.lr = p.tr * p.alpha;
      p.lg = p.tg * p.alpha;
      p.lb = p.tb * p.alpha;

      if (p.scale > 0) {
        p.scale -= f * (rand(opts.shrinkRand) + opts.shrinkBase) * 0.01;
      } else {
        p.live = false;
        return;
      }

      p.pz += p.gravity * f;
      p.rotation += 3 * f;
    },
    color: plainColor,
  };
}

function stripFireKind(texture: TextureKey): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 24;

      p.vz = (rand(16) + 32) * 0.1;

      p.scale = (rand(64) + 128) * 0.01 * scale;
      p.rotation = 0;

      [p.tr, p.tg, p.tb] = light;
    },
    update(p, fps) {
      p.gravity += 0.004 * fps;
      p.scale -= 0.04 * fps;
      p.frame = Math.floor((23 - p.lifeTime) / 6);
      p.pz += p.gravity * 10 * fps;

      const luminosity = p.lifeTime / 24;

      p.lr = p.tr * luminosity;
      p.lg = p.tg * luminosity;
      p.lb = p.tb * luminosity;
    },
    color: plainColor,
  };
}

/**
 * `BITMAP_TRUE_FIRE` SubType 0 (5 lives 20): the whole sheet, upright and additive, at the spawn
 * scale, pushed `(rand() % 10 - 5) * 0.4` sideways and `(rand() % 10 + 5) * 0.2` up along the
 * object (ZzzEffectParticle.cpp:3337-3378). A tick it loses 0.02 of its scale, the sideways push
 * fades by 0.95, it rises 1 more and is `LifeTime / 25` bright, white (:8273-8337).
 */
function trueFireKind(texture: TextureKey, life: number): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale) {
      p.lifeTime = life;
      p.scale = scale;
      p.vx = (rand(10) - 5) * 0.4;
      p.vz = (rand(10) + 5) * 0.2;
    },
    update(p, f) {
      p.vx *= Math.pow(0.95, f);
      p.pz += f;
      p.scale -= 0.02 * f;
      p.lr = p.lg = p.lb = p.lifeTime / 25;
    },
    color: plainColor,
  };
}

/**
 * `VectorAddScaled(Position, Velocity)` in the particle's own case: a second move, as it is (the
 * tick made the first, turned with the object, MovePosition, ZzzEffectParticle.cpp:3885); then it
 * loses 5% sideways.
 */
function moveAgain(p: Particle, f: number): void {
  p.px += p.vx * f;
  p.py += p.vy * f;
  p.pz += p.vz * f;

  const drag = Math.pow(0.95, f);
  p.vx *= drag;
  p.vy *= drag;
}

/**
 * `BITMAP_ADV_SMOKE` (fi01.jpg, additive): 20 + rand() % 5 ticks, upright; SubType 0 `0.5 + r * 0.02`
 * big and pushed `((r + 5) * 0.4, (r - 5) * 0.4, (r + 5) * 0.2)`, SubType 2 the same at
 * `Scale * 0.5 + r * 0.02`, SubType 1 (the `else`) `1 + r * 0.1` and half the push
 * (ZzzEffectParticle.cpp:3292-3323). A tick it moves again, rises 0.3 faster, grows 0.07 (SubType 1
 * 0.09) and is `LifeTime / 10`, white (:8219-8248), which the tick holds at 1.
 */
function advSmokeKind(
  scaleBase: number,
  perScale: number,
  scaleStep: number,
  push: number,
  grow: number
): ParticleKind {
  return {
    texture: 'fi01',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 20 + rand(5);
      p.scale = scaleBase + perScale * scale + rand(10) * scaleStep;
      p.vx = (rand(10) + 5) * 0.4 * push;
      p.vy = (rand(10) - 5) * 0.4 * push;
      p.vz = (rand(10) + 5) * 0.2 * push;
    },
    update(p, f) {
      moveAgain(p, f);
      p.vz += 0.3 * f;
      p.scale += grow * f;
      p.lr = p.lg = p.lb = p.lifeTime / 10;
    },
    color: plainColor,
  };
}

/**
 * `BITMAP_WATERFALL_1` SubType 2 and `BITMAP_WATERFALL_5` SubType 9: 30 ticks, `Rotation = rand() % 360`,
 * `scaleBase + Scale` big, falling `rand() % 5 + 7`, 0.2 grey; a tick it loses 0.005 of its scale,
 * falls 0.1 slower, brightens 1.1 while more than 20 ticks are left and dims 1.2 below `fadeBelow`
 * (ZzzEffectParticle.cpp:3385-3405, :3482-3490, :8359-8373, :8447-8464).
 */
function waterfallKind(texture: TextureKey, scaleBase: number, fadeBelow: number): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 30;
      p.rotation = rand(360);
      p.scale = scaleBase + scale;
      p.vz = -(rand(5) + 7);
      p.lr = p.lg = p.lb = 0.2;
    },
    update(p, f) {
      p.scale -= f * 0.005;
      p.vz += 0.1 * f;

      const gain =
        p.lifeTime < fadeBelow
          ? Math.pow(1 / 1.2, f)
          : p.lifeTime > 20
            ? Math.pow(1.1, f)
            : 1;

      p.lr *= gain;
      p.lg *= gain;
      p.lb *= gain;
    },
    color: plainColor,
  };
}

/**
 * `BITMAP_WATERFALL_2` (waterFall2.jpg, additive): `Rotation = rand() % 360`, `(rand() % 6 + 6) * 0.1`
 * big plus `scaleAdd` times the object's scale, falling `rand() % 3 + 3`, made up to 10 aside and 20 off
 * in height, `(red, 0.4, 0.4)` (ZzzEffectParticle.cpp:3501-3533). A tick it grows 0.03, takes
 * `(rand() % 20 - 10) * 0.1` sideways, falls 0.1 slower, dims 1.1 below 10 ticks left and `dim` always
 * (:8494-8503).
 */
function waterfall2Kind(life: number, red: number, scaleAdd: number, dim: number): ParticleKind {
  return {
    texture: 'waterfall2',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = life;
      p.rotation = rand(360);
      p.scale = (rand(6) + 6) * 0.1 + scaleAdd * scale;
      p.vz = -(rand(3) + 3);
      p.px += rand(20) - 10;
      p.py += rand(20) - 10;
      p.pz += rand(40) - 20;
      p.lr = red;
      p.lg = p.lb = 0.4;
    },
    update(p, f) {
      p.scale += 0.03 * f;
      p.vx = (rand(20) - 10) * 0.1;
      p.vy = (rand(20) - 10) * 0.1;
      p.vz += 0.1 * f;

      const gain = Math.pow(1 / dim, f) * (p.lifeTime < 10 ? Math.pow(1 / 1.1, f) : 1);

      p.lr *= gain;
      p.lg *= gain;
      p.lb *= gain;
    },
    color: plainColor,
  };
}

/**
 * `BITMAP_ADV_SMOKE + 1` (fi02.tga, `EnableAlphaBlend3`): `Rotation = rand() % 360`, `Scale = 0.5`
 * (SubType 1 `0.5 * Scale`), then with no `break` `BITMAP_TRUE_FIRE`'s SubType 0: 24 ticks, pushed
 * `((r - 5) * 0.4, 0, (r + 5) * 0.2)` (ZzzEffectParticle.cpp:3325-3378). It fades in its alpha
 * too: RenderSprite colours a sheet with alpha `(L, L, L, L)` (:9104-9116, ZzzOpenglUtil.cpp:918-933).
 */
function advSmoke1Kind(ofScale: boolean): ParticleKind {
  return {
    texture: 'fi02',
    blend: 'alpha',
    init(p, scale) {
      p.lifeTime = 24;
      p.rotation = rand(360);
      p.scale = ofScale ? 0.5 * scale : 0.5;
      p.vx = (rand(10) - 5) * 0.4;
      p.vz = (rand(10) + 5) * 0.2;
    },
    update: (p, f) => puffMove(p, f, 25),
    color: (p, out) => out.set(p.lr, p.lg, p.lb, p.lr),
  };
}

/**
 * `BITMAP_CLOUD` SubType 6 (additive) and 14 (`EnableAlphaBlendMinus`, :9236-9245) on clouds.jpg:
 * 25 + rand() % 5 ticks, `Rotation = rand() % 360`, `Scale = 0.2` (14: `Scale * 0.2`), pushed
 * `((r + 5) * 0.4, 0, (r + 5) * 0.2)` (ZzzEffectParticle.cpp:2815-2824, :2908-2917); both take
 * `puffMove` at `LifeTime / 50` (:7550-7565, :7646-7660).
 */
function cloudPuffKind(blend: Blend, ofScale: boolean): ParticleKind {
  return {
    texture: 'cloud',
    blend,
    init(p, scale) {
      p.lifeTime = 25 + rand(5);
      p.rotation = rand(360);
      p.scale = ofScale ? 0.2 * scale : 0.2;
      p.vx = (rand(10) + 5) * 0.4;
      p.vz = (rand(10) + 5) * 0.2;
    },
    update: (p, f) => puffMove(p, f, 50),
    color: plainColor,
  };
}

/**
 * `BITMAP_CLOUD` SubType 10 and 11: 500 ticks, made up to 200 off on every axis, kept as its
 * `StartPosition`, pushed `(rand() % 10 + 5) * 0.12` in x and y (ZzzEffectParticle.cpp:2859-2885).
 */
function driftInit(p: Particle): void {
  p.lifeTime = 500;
  p.px += rand(400) - 200;
  p.py += rand(400) - 200;
  p.pz += rand(400) - 200;
  p.sx = p.px;
  p.sy = p.py;
  p.sz = p.pz;
  p.vx = p.vy = (rand(10) + 5) * 0.12;
}

/** `VectorAddScaled(Position, Velocity)`, then how far it is from where it was made (:7600-7605, :7628-7633). */
function driftOn(p: Particle, f: number): number {
  p.px += p.vx * f;
  p.py += p.vy * f;

  const dx = p.px - p.sx;
  const dy = p.py - p.sy;
  const dz = p.pz - p.sz;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * The tick `BITMAP_ADV_SMOKE + 1` and `BITMAP_CLOUD` SubType 6 share: it moves again, rises 0.6
 * faster, wanders `rand() % 4 - 2` (z * 0.8), grows 0.05, turns 1 or 2 degrees and is
 * `LifeTime / fade`, white (ZzzEffectParticle.cpp:7553-7564, :8250-8270).
 */
function puffMove(p: Particle, f: number, fade: number): void {
  moveAgain(p, f);
  p.vz += 0.6 * f;
  p.px += (rand(4) - 2) * f;
  p.py += (rand(4) - 2) * f;
  p.pz += (rand(4) - 2) * 0.8 * f;
  p.scale += 0.05 * f;
  p.lr = p.lg = p.lb = p.lifeTime / fade;
  p.rotation += (1 + rand(2)) * f;
}

/** `BITMAP_CLUD64` SubType 9 on `texture` (it swaps in BITMAP_SMOKE one time in two): see `frostCloud`. */
function frostKind(texture: TextureKey): ParticleKind {
  const jitter = (base: number) => base + (rand(20) - 10) * 0.002;
  return {
    texture,
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 40;
      p.scale = scale + ((rand(20) - 10) / 2) * ((scale * 0.1) / 2);
      p.rotation = rand(360);
      p.vx = (rand(20) - 10) * 0.03;
      p.vy = (rand(20) - 10) * 0.03;
      p.vz = -(1.2 + (rand(20) - 10) * 0.025);
    },
    update(p, f) {
      p.scale *= Math.pow(jitter(0.98), f);
      p.lr *= Math.pow(jitter(0.95), f);
      p.lg *= Math.pow(jitter(0.95), f);
      p.lb *= Math.pow(jitter(0.95), f);
    },
    color: plainColor,
  };
}

/** The light 1/1.05 a tick and the size `shrink` less (Spark03 SubType 11, 13, 14). */
function sparkFade(p: Particle, f: number, shrink: number): void {
  const keep = Math.pow(1 / 1.05, f);
  p.lr *= keep;
  p.lg *= keep;
  p.lb *= keep;
  p.scale -= shrink * f;
}

/** The shine's rolls, which its BITMAP_LIGHT sheet takes when it is made next. */
const shiny6Rolls = { x: 0, y: 0, z: 0, life: 10, rotation: 0 };

function shiny6Kind(texture: TextureKey): ParticleKind {
  const shine = texture === 'shiny05';
  return {
    texture,
    blend: 'add',
    init(p) {
      const r = shiny6Rolls;
      if (shine) {
        r.life = rand(3) + 10;
        r.x = rand(50) - 25;
        r.y = rand(50) - 25;
        r.z = rand(50) - 25;
        r.rotation = rand(20) - 10;
      }
      p.lifeTime = r.life;
      p.scale = 0.3;
      p.px += r.x;
      p.py += r.y;
      p.pz += r.z;
      p.rotation = r.rotation;
    },
    update(p, f) {
      p.scale -= 0.01 * f;
      p.rotation -= 5 * f;
    },
    color: plainColor,
  };
}

const KINDS = {
  fire1: fireKind('fireHik1', {
    lifeBase: 27,
    lifeRand: 5,
    fadeBelow: 15,
    gravityBase: 64,
    shrinkBase: 5,
    shrinkRand: 3,
  }),

  fire3: fireKind('fireHik3', {
    lifeBase: 17,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 64,
    shrinkBase: 7,
    shrinkRand: 3,
  }),

  // `BITMAP_FIRE_CURSEDLICH` SubType 4, the one every torch asks for
  // (ZzzEffectParticle.cpp:317-326). SubType 6 is the only one that leans -
  // `Velocity = (2.5 + r, -5 - r, 0)` - and no torch spawns it, so a fire2
  // that carried it drew a second plume next to the flame.
  fire2: fireKind('fireHik2', {
    lifeBase: 12,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 64,
    shrinkBase: 6,
    shrinkRand: 3,
  }),

  fire157: fireKind('fireHik3Mono', {
    lifeBase: 17,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 44,
    gravityRand: 14,
    scaleBase: 52,
    shrinkBase: 7,
    shrinkRand: 3,
  }),

  ember: {
    texture: 'spark03',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = rand(12) + 20;
      p.scale = (rand(60) + 90) * 0.01 * scale;
      p.rotation = rand(360);
      p.alpha = 1;

      p.gravity = (rand(12) + 10) * 0.1;

      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;

      turnWith(p, NO_TURN);
      p.vx = Math.cos(a) * r;
      p.vy = Math.sin(a) * r;
      p.vz = 0;

      [p.tr, p.tg, p.tb] = light;
    },
    update(p, f) {
      p.gravity += 0.03 * f;
      p.pz += p.gravity * f;

      p.rotation += 5 * f;
      p.scale -= 0.004 * f;

      const t = Math.max(0, Math.min(1, p.lifeTime / 26));

      const flicker = 0.75 + Math.random() * 0.25;

      p.lr = p.tr * t * flicker;
      p.lg = p.tg * t * t * flicker;
      p.lb = p.tb * t * t * t * flicker;
    },
    color: plainColor,
  },

  fire0: stripFireKind('fire01'),

  fire0b: stripFireKind('fire03'),

  trueFire: trueFireKind('fantaF', 24),

  trueFire5: trueFireKind('fantaF', 20),

  /** `BITMAP_TRUE_BLUE`: every line `BITMAP_TRUE_FIRE`'s but the sheet, fantaB.jpg (ZzzOpenData.cpp:5198). */
  trueBlue: trueFireKind('fantaB', 24),

  fi01_0: advSmokeKind(0.5, 0, 0.02, 1, 0.07),

  fi01_1: advSmokeKind(1, 0, 0.1, 0.5, 0.09),

  fi01_2: advSmokeKind(0, 0.5, 0.02, 1, 0.07),

  fi02_0: advSmoke1Kind(false),

  fi02_1: advSmoke1Kind(true),

  cloud6: cloudPuffKind('add', false),

  cloud14: cloudPuffKind('subtract', true),

  /**
   * `BITMAP_CLOUD` SubType 10 (clouds.jpg, `EnableAlphaBlendMinus`, :9236-9245): `driftInit`,
   * `(rand() % 15 + 10) / 15 + Scale` big, black whatever light it is made with (:2859-2872). A tick
   * it drifts again; within 300 of where it was made it gains 0.01 up to 0.15, out to 500 it loses
   * 1.05, and past that it goes (:7598-7625).
   */
  cloud10: {
    texture: 'cloud',
    blend: 'subtract',
    init(p, scale) {
      driftInit(p);
      p.scale = (rand(15) + 10) / 15 + scale;
      p.lr = 0;
    },
    update(p, f) {
      const distance = driftOn(p, f);

      if (distance <= 300) p.lr = Math.min(0.15, p.lr + 0.01 * f);
      else if (distance <= 500) p.lr *= Math.pow(1 / 1.05, f);
      else p.live = false;

      p.lg = p.lb = p.lr;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_CLOUD` SubType 11 (clouds.jpg, additive): `driftInit`, `(rand() % 15 + 15) / 30 + Scale`
   * big, in the light it is made with (:2873-2885). A tick it drifts again, turns `0.5 + rand() % 2`
   * degrees and goes past 500 from where it was made (:7626-7641).
   */
  cloud11: {
    texture: 'cloud',
    blend: 'add',
    init(p, scale) {
      driftInit(p);
      p.scale = (rand(15) + 15) / 30 + scale;
    },
    update(p, f) {
      p.rotation += (0.5 + rand(2)) * f;
      if (driftOn(p, f) > 500) p.live = false;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_FIRE_RED` (firered.jpg, additive): 20 ticks, `Scale * (rand() % 64 + 64) * 0.01` big,
   * rising `(rand() % 100 + 100) * 0.15` along the object, steady in the light it is made with
   * (ZzzEffectParticle.cpp:701-705, :4906-4909). Its one maker, the `BITMAP_FIRE_RED` effect, makes it
   * up to 16 off in x and y (EffectBehaviors.cpp:122-131).
   */
  fireRed: {
    texture: 'fireRed',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 20;
      p.scale = scale * (rand(64) + 64) * 0.01;
      p.vz = (rand(100) + 100) * 0.15;
      p.px += rand(32) - 16;
      p.py += rand(32) - 16;
    },
    update() {},
    color: plainColor,
  } satisfies ParticleKind,

  smoke0: {
    texture: 'smoke',
    blend: 'add',
    init(p) {
      p.lifeTime = 16;
      p.scale = (rand(32) + 48) * 0.01;
      p.rotation = rand(360);
    },
    update(p, fps) {
      const luminosity = p.lifeTime / 8;

      p.lr = p.lg = p.lb = luminosity;

      p.gravity += 0.2 * fps;
      p.pz += p.gravity * fps;
      p.scale += fps * 0.05;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_SMOKE` SubType 13, the Balgass lava vents' glow: sized `(rand() % 64 + 64) * 0.01` whatever
   * it is made with, it stays put, grows 0.09 a tick and fades orange, `(L, 0.5L, 0.1L)` at
   * `L = LifeTime / 20`, additive (ZzzEffectParticle.cpp:1238-1243, :5389-5393, :9085-9097).
   */
  smoke13: {
    texture: 'smoke',
    blend: 'add',
    init(p) {
      p.lifeTime = 20;
      p.scale = (rand(64) + 64) * 0.01;
      p.rotation = rand(360);
    },
    update(p, f) {
      const luminosity = p.lifeTime / 20;
      p.lr = luminosity;
      p.lg = luminosity * 0.5;
      p.lb = luminosity * 0.1;
      p.scale += 0.09 * f;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke2: {
    texture: 'smoke',
    blend: 'subtract',
    init(p) {
      p.lifeTime = 50;
      p.scale = (rand(64) + 64) * 0.01;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, fps) {
      const luminosity = p.lifeTime / 50;

      p.lr = p.lg = p.lb = luminosity;

      p.gravity -= 0.1 * fps;
      p.px -= p.gravity * 0.2 * fps;
      p.pz += p.gravity * fps;
      p.scale -= fps * 0.01;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke65: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 45;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(10) + 18) * 0.1;
    },
    update(p, f, worldTimeMs) {
      const luminosity = p.lifeTime / 40;

      p.lr = p.lg = p.lb = luminosity * 0.4;

      p.gravity -= 0.05 * f;
      p.px += p.gravity * Math.sin(worldTimeMs) * 0.05 * f;
      p.pz += p.gravity * f;
    },
    color: plainColor,
  } satisfies ParticleKind,

  cloud21: {
    texture: 'cloud',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 100;
      p.gravity = rand(1000);
      p.alpha = 0.6;

      p.px += rand(200) - 100;
      p.py += rand(200) - 100;
      p.pz += rand(20) - 20;

      p.scale = (rand(20) + 180) * 0.01 * scale;
      [p.lr, p.lg, p.lb] = light;
    },
    update(p, f) {
      if (p.lifeTime <= 0) {
        p.live = false;
      } else if (p.lifeTime > 50) {
        if (p.alpha < 1) p.alpha += f * 0.04;
        p.pz += 2 * f;
      } else {
        if (p.alpha > 0.1) p.alpha -= f * 0.005;
        p.pz -= 1 * f;
      }
    },
    color: (p, out) =>
      out.set(p.lr * p.alpha, p.lg * p.alpha, p.lb * p.alpha, 1),
  } satisfies ParticleKind,

  smoke21: {
    texture: 'smoke',
    blend: 'subtract',
    init(p, scale) {
      p.lifeTime = 80;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, f) {
      const lum = p.lifeTime / 50;
      p.lr = p.lg = p.lb = lum;

      p.gravity -= 0.1 * f;
      p.px -= p.gravity * 0.2 * f;
      p.pz += p.gravity * f;
      p.scale -= f * 0.01;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke22: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 60;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, f, t) {
      const lum = p.lifeTime / 50;
      p.lr = lum * 0.9;
      p.lg = lum * 0.5;
      p.lb = lum * 0.5;

      p.gravity -= 0.1 * f;
      p.px += p.gravity * Math.sin(t) * 0.05 * f;
      p.pz += p.gravity * f;
      p.scale += f * 0.04;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke60: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 60;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
      p.lr = p.lg = p.lb = 0.4;
    },
    update(p, f, t) {
      const lum = p.lifeTime / 50;
      p.lr = p.lg = p.lb = lum * 0.4;

      p.gravity -= 0.1 * f;
      p.px += p.gravity * Math.sin(t) * 0.05 * f;
      p.pz += p.gravity * f;
      p.scale += f * 0.04;
    },
    color: plainColor,
  } satisfies ParticleKind,

  waterfall5_9: waterfallKind('waterfall5', 0.6, 8),

  waterfall1_2: waterfallKind('waterfall1', 1.6, 5),

  /** `BITMAP_WATERFALL_2` SubType 1: 50 ticks, `(0, 0.4, 0.4)`, dimming 1.05 a tick more (:3535-3540, :8505-8510). */
  waterfall2_1: waterfall2Kind(50, 0, 0, 1.05),

  /** `BITMAP_WATERFALL_2` SubType 2: 40 ticks, grey, the object's scale added to its own (:3505-3509). */
  waterfall2_2: waterfall2Kind(40, 0.4, 1, 1),

  /**
   * `BITMAP_WATERFALL_3` SubType 4 (waterFall3.jpg, additive): 20 ticks, `Rotation = rand() % 360`,
   * `(rand() % 10 + 10) * 0.02 + Scale` big, leaping `rand() % 5 + 2`, in the light it is made with
   * (ZzzEffectParticle.cpp:3635-3643). With no case of its own a tick it grows 0.005, sinks 2.5 faster
   * and dims 1.1 (:8687-8691).
   */
  waterfall3_4: {
    texture: 'waterfall3',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 20;
      p.rotation = rand(360);
      p.scale = (rand(10) + 10) * 0.02 + scale;
      p.vz = rand(5) + 2;
    },
    update(p, f) {
      p.scale += 0.005 * f;
      p.vz -= 2.5 * f;

      const gain = Math.pow(1 / 1.1, f);

      p.lr *= gain;
      p.lg *= gain;
      p.lb *= gain;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_WATERFALL_3` SubType 3 (waterFall3.jpg, additive): 60 ticks, `Scale * (rand() % 10 + 15) * 0.02`,
   * `Rotation = rand() % 360`, falling 1, made up to 20 aside in x and -10 to 14 in height, in the light it
   * is made with (ZzzEffectParticle.cpp:3602-3611). A tick it grows 0.005, falls 0.05 faster and keeps
   * 0.97 of its light (:8559-8567).
   */
  waterfall3_3: {
    texture: 'waterfall3',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 60;
      p.vz = -1;
      p.scale = scale * (rand(10) + 15) * 0.02;
      p.rotation = rand(360);
      p.px += rand(40) - 20;
      p.pz += rand(25) - 10;
    },
    update(p, f) {
      p.scale += 0.005 * f;
      p.vz -= 0.05 * f;

      const keep = Math.pow(0.97, f);

      p.lr *= keep;
      p.lg *= keep;
      p.lb *= keep;
    },
    color: plainColor,
  } satisfies ParticleKind,

  spark03_24: {
    texture: 'spark03',
    blend: 'add',
    init(p) {
      p.alpha = 1;

      p.vx = (rand(3) - 1) * 2;
      p.vy = (rand(3) - 1) * 2;
      p.vz = (rand(3) - 1) * 2;

      p.lifeTime = 16;
      p.rotation = 0;
      p.scale = rand(5) / 10 + 0.4;
    },
    update(p, f) {
      if (p.lifeTime < 10 && p.rotation === 0) {
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.vz = -p.vz;
        p.rotation = 1;
      }

      if (p.lifeTime <= 10) {
        p.alpha -= f * 0.05;
        if (p.alpha < 0) p.alpha = 0;

        const gain = Math.pow(p.alpha, f);
        p.lr *= gain;
        p.lg *= gain;
        p.lb *= gain;
      }

      p.scale -= f * 0.02;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_LIGHT` SubType 0, flare01.jpg drawn additive (ZzzEffectParticle.cpp:3161-3164): a tick it
   * drifts +-0.2 plus half the wind, rises 2.5, loses 0.05 of its scale and is as bright as its
   * scale, gone at 0.1 (:7943-8010).
   */
  light0: {
    texture: 'flare01',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = rand(10) + 10;
      p.scale = ((rand(50) + 50) / 100) * scale;
    },
    update(p, f) {
      p.px += ((rand(2001) - 1000) * 0.0004 + wind.x) * 0.5 * f;
      p.py += ((rand(2001) - 1000) * 0.0004 + wind.y) * 0.5 * f;
      p.pz += 2.5 * f;
      p.scale -= 0.05 * f;
      if (p.scale <= 0.1) p.live = false;
      p.lr = p.lg = p.lb = p.scale;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_LIGHT` SubType 15, flare01.jpg drawn additive: `rand() % 10 + 100` ticks,
   * `Gravity = rand() % 3 + 2`, `(rand() % 20 + 20) / 100 * Scale` big, unseen at first
   * (ZzzEffectParticle.cpp:3241-3250). A tick its phase gains `(rand() % 10 + 5) * 0.01`, it stands
   * `Gravity * 2` off where it was made at that phase and rises `Gravity`, loses 0.001 of its scale
   * and fades in 0.1, out 0.1 over its last 20 ticks losing 0.01 more; it is the light it was made
   * with times that (:8139-8160). Its makers, the Doppelganger light boxes, all make it
   * `rand() % (int)(Scale * 60) - that / 2` off in x and y (GMDoppelGanger4.cpp:387-398).
   */
  light15: {
    texture: 'flare01',
    blend: 'add',
    init(p, scale) {
      const spread = Math.trunc(scale * 60);
      p.px += rand(spread) - Math.trunc(spread / 2);
      p.py += rand(spread) - Math.trunc(spread / 2);
      p.sx = p.px;
      p.sy = p.py;
      p.sz = 0;
      p.lifeTime = rand(10) + 100;
      p.gravity = rand(3) + 2;
      p.scale = ((rand(20) + 20) / 100) * scale;
      p.alpha = 0;
    },
    update(p, f) {
      p.sz += (rand(10) + 5) * 0.01 * f;
      p.px = p.sx + Math.sin(p.sz) * p.gravity * 2;
      p.py = p.sy + Math.cos(p.sz) * p.gravity * 2;
      p.pz += p.gravity * f;
      p.scale -= 0.001 * f;

      if (p.lifeTime > 20) {
        p.alpha = Math.min(1, p.alpha + 0.1 * f);
      } else {
        p.scale -= 0.01 * f;
        p.alpha -= 0.1 * f;
      }

      p.lr = p.tr * p.alpha;
      p.lg = p.tg * p.alpha;
      p.lb = p.tb * p.alpha;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * Wings of Darkness membrane flare (ZzzObject.cpp:9860-9884). The original
   * re-creates a BITMAP_FLARE_BLUE sprite at each of ten wing bones every
   * frame; a short-lived pooled particle reads the same and costs a tenth of
   * the sprites.
   */
  wingFlareBlue: {
    texture: 'flareBlue',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 6;
      p.scale = scale;
      p.rotation = rand(360);
      [p.tr, p.tg, p.tb] = light;
    },
    update(p) {
      // Sprite scale follows sinf(WorldTime * 0.004) * 0.3 + 0.3 in the
      // original; the emitter passes that in, so only the fade is left.
      const t = Math.max(0, Math.min(1, p.lifeTime / 6));
      p.lr = p.tr * t;
      p.lg = p.tg * t;
      p.lb = p.tb * t;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * Wing of Storm cloud aura (ZzzObject.cpp:9896-9915): BITMAP_CLUD64 at 25
   * wing bones, luminosity |sin(WorldTime * 0.0004)| * 0.4 + 0.5.
   */
  wingCloud: {
    texture: 'clud64',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 8;
      p.scale = scale;
      p.rotation = rand(360);
      [p.tr, p.tg, p.tb] = light;
    },
    update(p, f) {
      const t = Math.max(0, Math.min(1, p.lifeTime / 8));
      p.rotation += f;
      p.lr = p.tr * t;
      p.lg = p.tg * t;
      p.lb = p.tb * t;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_WATERFALL_4` SubType 12, the Sword Breaker's drops: 4-5 ticks, `rand() % 360` turned, its size
   * jittered by up to 75%, set +-10 cm off; a tick it turns `WorldTime % 360 * 0.01`, and its size and light
   * keep 0.92 (ZzzEffectParticle.cpp:3611-3621, :8626-8634).
   */
  waterfall4Glint: {
    texture: 'waterfall4',
    blend: 'add',
    init(p, scale) {
      p.rotation = rand(360);
      p.lifeTime = rand(2) - 1 + 5;
      p.scale = scale + ((rand(20) - 10) / 2) * ((scale * 0.3) / 2);
      p.px += rand(20) - 10;
      p.py += rand(20) - 10;
      p.pz += rand(20) - 10;
    },
    update(p, f, worldTimeMs) {
      p.rotation += (Math.floor(worldTimeMs) % 360) * 0.01 * f;
      const keep = Math.pow(0.92, f);
      p.scale *= keep;
      p.lr *= keep;
      p.lg *= keep;
      p.lb *= keep;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_CLUD64` SubType 9, the Frost Mace's frost (one in two drawn with smoke01, `frostSmoke`): 40 ticks,
   * sinking 1.2 cm a tick and drifting, its size keeping about 0.98 a tick and its light 0.95
   * (ZzzEffectParticle.cpp:1043-1055, :5205-5213).
   */
  frostCloud: frostKind('clud64'),
  frostSmoke: frostKind('smoke'),

  /**
   * `MODEL_STAR_SHINE` SubType 0, the Frost Mace's twinkle: 30 ticks; growing 1.1 a tick for ten, drawn as a
   * Shiny01 sprite at a random turn for the next ten, then shrinking unseen (ZzzEffect.cpp:4680-4690, :8322-8345).
   */
  starShine: {
    texture: 'shiny01',
    blend: 'add',
    init(p) {
      p.lifeTime = 30;
      p.rotation = rand(360);
    },
    update(p, f) {
      // The ticks are counted as the original counts them, before this one's decrement.
      if (p.lifeTime >= 10 && p.lifeTime < 20) return;
      const k = Math.pow(p.lifeTime >= 20 ? 1.1 : 0.9, f);
      p.scale *= k;
      p.lr *= k;
      p.lg *= k;
      p.lb *= k;
    },
    color(p, out) {
      const shown = p.lifeTime >= 10 && p.lifeTime < 20 ? 1 : 0;
      out.set(p.lr * shown, p.lg * shown, p.lb * shown, 1);
    },
  } satisfies ParticleKind,

  /**
   * `BITMAP_SPARK + 1` SubType 11, the Sylph Wind's and the staffs' sparks: whatever its scale, sized
   * `rand() % 5 / 10 + 1` and pushed `(rand() % 8 - 4, rand() % 4, rand() % 4)` cm a tick on its object's Angle;
   * 30 ticks, its light 1/1.05 and its size 0.04 less a tick (ZzzEffectParticle.cpp:2196-2204, :6704-6713).
   */
  spark1_11: {
    texture: 'spark03',
    blend: 'add',
    init(p) {
      p.vx = rand(8) - 4;
      p.vy = rand(4);
      p.vz = rand(4);
      p.lifeTime = 30;
      p.scale = rand(5) / 10 + 1;
    },
    update: (p, f) => sparkFade(p, f, 0.04),
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * SubType 14, the Albatross's: on its own `rand_fps_check(2)` pushed `(rand() % 4 - 4, rand() % 4, rand() % 4)`,
   * sized 0.4-0.8 and 30 ticks; else the 2-tick dot CreateParticle leaves at its scale. Its size 0.01 less a
   * tick (:2216-2226, :6724-6733).
   */
  spark1_14: {
    texture: 'spark03',
    blend: 'add',
    init(p) {
      if (Math.random() * 2 >= 1) return;
      p.vx = rand(4) - 4;
      p.vy = rand(4);
      p.vz = rand(4);
      p.lifeTime = 30;
      p.scale = rand(5) / 10 + 0.4;
    },
    update: (p, f) => sparkFade(p, f, 0.01),
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * `BITMAP_SHINY + 6` SubType 1, the Stryker's shine: 0.3, up to 25 cm off, `rand() % 20 - 10` degrees, 10-12
   * ticks, 0.01 smaller and 5 degrees back a tick (:2718-2727, :7368-7372). Drawn as shiny05 and BITMAP_LIGHT
   * at once (:9301-9304): `light6_1` is the second sheet, on the rolls the shine made just before it.
   */
  shiny6_1: shiny6Kind('shiny05'),
  light6_1: shiny6Kind('flare01'),
} satisfies Record<string, ParticleKind>;

export type KindName = keyof typeof KINDS;

export type Emission = {
  readonly kinds: readonly KindName[];
  readonly every: number;
  readonly count?: number;
  readonly light?:
    | readonly [number, number, number]
    | (() => readonly [number, number, number]);
  readonly scale?: number;
  readonly jitter?: number;
};

/**
 * Emissions for an object type on a world - `MapLayer.emissions` on each map
 * entry (`versions/shared/maps/<name>/spec.ts`), read through the facade.
 */
export function emissionsFor(
  world: number,
  type: number
): readonly Emission[] | undefined {
  return maps.emissionsFor(world, type);
}

type Pool = {
  manager: SpriteManager;
  pixelSize: number;
  /** Height over width: `RenderSprite` draws the bitmap at its own size (zzzeffectsprite.cpp:73-75). */
  aspect: number;
  frames: number;
  free: Sprite[];
  /** A `dark` sheet's brightest texel, which its alpha was stretched from. */
  cover: number;
};

/**
 * The sheet as coverage: black, alpha = luminance stretched to the sheet's
 * brightest texel (clud64 peaks at 0.51), so a sprite's own alpha can carry
 * a gain past the sheet's level without the product running over 1.
 */
async function coverageSheet(jpeg: Blob): Promise<{ url: string; cover: number }> {
  const bitmap = await createImageBitmap(jpeg);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  let peak = 1;
  for (let i = 0; i < px.length; i += 4) {
    peak = Math.max(peak, 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
  }
  for (let i = 0; i < px.length; i += 4) {
    const luma = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = 0;
    px[i + 3] = Math.round((luma / peak) * 255);
  }
  context.putImageData(image, 0, 0);

  const png = await canvas.convertToBlob({ type: 'image/png' });
  return { url: URL.createObjectURL(png), cover: peak / 255 };
}

/** An OZJ sheet: the JPEG past its header, or its coverage for `dark`. */
async function jpegSheet(file: string, blend: Blend): Promise<{ url: string; cover: number }> {
  const ozj = await downloadDataFile(file);
  const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], { type: 'image/jpeg' });

  return blend === 'dark' ? coverageSheet(blob) : { url: URL.createObjectURL(blob), cover: 1 };
}

let scene: Scene | null = null;
const pools = new Map<string, Pool>();
const loading = new Map<string, Promise<Pool | null>>();
const particles: Particle[] = [];
let worldTimeMs = 0;
let tickObserver: unknown = null;

const poolKey = (texture: TextureKey, blend: Blend) => `${texture}:${blend}`;

async function getPool(
  target: Scene,
  texture: TextureKey,
  blend: Blend
): Promise<Pool | null> {
  const key = poolKey(texture, blend);

  const existing = pools.get(key);
  if (existing) return existing;

  let inFlight = loading.get(key);

  if (!inFlight) {
    inFlight = (async () => {
      const { file, size, height = size } = TEXTURES[texture];

      // A sheet this version never shipped: no pool, no particles, and no
      // fetch per emission for the rest of the session (`hasDataFile`).
      if (!hasDataFile(file)) return null;

      const sheet = /\.ozt$/i.test(file)
        ? { url: (await loadMuSprite(file)).url, cover: 1 }
        : await jpegSheet(file, blend);

      const manager = new SpriteManager(
        `effectParticles_${key}`,
        sheet.url,
        POOL_SIZE,
        { width: size, height },
        target
      );

      manager.blendMode =
        blend === 'add'
          ? Constants.ALPHA_ONEONE
          : blend === 'subtract'
            ? Constants.ALPHA_SUBTRACT
            : Constants.ALPHA_COMBINE;

      manager.disableDepthWrite = true;
      manager.isPickable = false;

      // The group the flare card over the flame already sits in
      // (`controllers/lighting/effectLights.ts`). Babylon draws sprites before the
      // transparent queue, and MU's alpha-keyed meshes write depth in that
      // queue, so a flame left in group 0 was drawn first and then painted
      // over by the bridge rail, the fence or the bush standing in front of
      // it. Dev seam: `?fxgroup=0` puts them back.
      manager.renderingGroupId = devQueryNumber('fxgroup') ?? EFFECT_RENDERING_GROUP;
      keepDepthForEffects(target);

      const pool: Pool = {
        manager,
        pixelSize: size,
        aspect: height / size,
        frames: TEXTURES[texture].frames ?? 1,
        free: [],
        cover: sheet.cover,
      };
      pools.set(key, pool);

      return pool;
    })();

    loading.set(key, inFlight);
  }

  return inFlight;
}

function acquire(pool: Pool): Sprite | null {
  const reused = pool.free.pop();

  if (reused) {
    reused.isVisible = true;
    return reused;
  }

  if (pool.manager.sprites.length >= POOL_SIZE) return null;

  const sprite = new Sprite('particle', pool.manager);
  sprite.isPickable = false;

  return sprite;
}

/** The tick's one colour: each kind writes all four channels into it. */
const tickColor = new Color4(1, 1, 1, 1);

const unit = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function ensureTicking(target: Scene) {
  if (tickObserver && scene === target) return;

  scene = target;

  tickObserver = target.onBeforeRenderObservable.add(() => {
    const deltaMs = target.getEngine().getDeltaTime();
    worldTimeMs += deltaMs;

    const f = Math.min(1, (deltaMs / 1000) * TICKS_PER_SECOND);

    stepWind((deltaMs / 1000) * TICKS_PER_SECOND);

    const color = tickColor;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.lifeTime -= f;
      if (p.lifeTime <= 0) p.live = false;

      if (p.live) {
        // MovePosition (ZzzEffectParticle.cpp:3885): the velocity turned by the object's Angle.
        if (p.vx !== 0 || p.vy !== 0 || p.vz !== 0) {
          p.px += (p.vx * p.m00 + p.vy * p.m01 + p.vz * p.m02) * f;
          p.py += (p.vx * p.m10 + p.vy * p.m11 + p.vz * p.m12) * f;
          p.pz += (p.vx * p.m20 + p.vy * p.m21 + p.vz * p.m22) * f;
        }

        p.kind.update(p, f, worldTimeMs);
      }

      if (!p.live || p.scale <= 0) {
        release(p);
        particles.splice(i, 1);
        continue;
      }

      const sprite = p.sprite;

      sprite.position.set(
        p.px / TILE_CM,
        p.pz / TILE_CM,
        p.py / TILE_CM
      );

      const size = (p.pixelSize * p.scale) / TILE_CM;
      sprite.width = size;
      sprite.height = size;
      sprite.angle = (p.rotation * Math.PI) / 180;

      if (p.frames > 1) {
        sprite.cellIndex = ((p.frame % p.frames) + p.frames) % p.frames;
      }

      // RenderSprite packs the light a byte a channel, held in 0..1 (ZzzOpenglUtil.cpp:918-933, RenderUtils.h:8-18).
      p.kind.color(p, color);
      color.set(unit(color.r), unit(color.g), unit(color.b), unit(color.a));
      sprite.color.copyFrom(spriteLevel(target, color));
    }
  });
}

const releasePools = new Map<Sprite, Pool>();

function release(p: Particle) {
  p.sprite.isVisible = false;

  const pool = releasePools.get(p.sprite);
  if (pool) pool.free.push(p.sprite);
}

/**
 * `turn` is the node's own rotation, MU's `Angle` mirrored (`NodeTurn`); it is turned back here, so the
 * tick turns the velocity as MovePosition does (ZzzAI.cpp:148-156). `position`, `turn` and `light` are
 * read before it returns, so a caller may rewrite one scratch object for every spawn. Only a sheet's
 * first spawns wait for it to load (the promise, its failure reported); the rest are made at once.
 */
export function spawnParticle(
  target: Scene,
  kindName: KindName,
  position: { x: number; y: number; z: number },
  turn: NodeTurn,
  scale: number,
  light: readonly [number, number, number],
  jitter = 0
): Promise<void> | undefined {
  // The tick runs on drawn frames: made while hidden, these would all play at once on return.
  if (pageHidden()) return;
  const kind = KINDS[kindName] as ParticleKind;

  const pool = pools.get(poolKey(kind.texture, kind.blend));
  if (pool) {
    makeParticle(target, pool, kind, position, turn, scale, light, jitter);
    return;
  }

  const at = { x: position.x, y: position.y, z: position.z };
  const turned = { x: turn.x, y: turn.y, z: turn.z };
  const lit = [light[0], light[1], light[2]] as const;

  return getPool(target, kind.texture, kind.blend)
    .then(loaded => {
      if (loaded) makeParticle(target, loaded, kind, at, turned, scale, lit, jitter);
    })
    .catch(reportLoadFailure(`particle ${kindName}`));
}

function makeParticle(
  target: Scene,
  pool: Pool,
  kind: ParticleKind,
  position: { x: number; y: number; z: number },
  turn: NodeTurn,
  scale: number,
  light: readonly [number, number, number],
  jitter: number
): void {
  const sprite = acquire(pool);
  if (!sprite) return;

  releasePools.set(sprite, pool);
  ensureTicking(target);

  const p: Particle = {
    live: true,
    kind,
    sprite,
    pixelSize: pool.pixelSize,
    frame: 0,
    frames: pool.frames,
    lifeTime: 2,
    scale,
    alpha: 1,
    gravity: 0,
    rotation: 0,
    px: position.x * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    py: position.z * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    pz: position.y * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    vx: 0,
    vy: 0,
    vz: 0,
    m00: 1,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: 1,
    m12: 0,
    m20: 0,
    m21: 0,
    m22: 1,
    sx: 0,
    sy: 0,
    sz: 0,
    lr: light[0],
    lg: light[1],
    lb: light[2],
    tr: light[0],
    tg: light[1],
    tb: light[2],
  };

  turnWith(p, turn);
  kind.init(p, scale, light);

  particles.push(p);
}

type Reach = {
  readonly travel: number;
  readonly base: number;
  readonly perScale: number;
};

/**
 * Farthest any part of a kind's sprite gets from its spawn point, in tiles:
 * the centre's travel over its whole life plus the sprite's half-diagonal at
 * its largest, `base` plus `perScale` per unit of spawn scale. The view gate
 * adds it to the frustum; effectParticles.test.ts plays each kind out against it.
 */
export const KIND_REACH: Record<KindName, Reach> = {
  fire1: { travel: 2.7, base: 0, perScale: 0.65 },
  fire3: { travel: 1.85, base: 0, perScale: 0.65 },
  fire2: { travel: 1.4, base: 0, perScale: 0.65 },
  fire157: { travel: 1.2, base: 0, perScale: 0.56 },
  ember: { travel: 1, base: 0, perScale: 0.34 },
  fire0: { travel: 1.4, base: 0, perScale: 0.87 },
  fire0b: { travel: 1.4, base: 0, perScale: 0.87 },
  trueFire: { travel: 1, base: 0, perScale: 0.46 },
  trueFire5: { travel: 0.85, base: 0, perScale: 0.46 },
  trueBlue: { travel: 1, base: 0, perScale: 0.46 },
  fi01_0: { travel: 3.5, base: 2.14, perScale: 0 },
  fi01_1: { travel: 2.55, base: 3.68, perScale: 0 },
  fi01_2: { travel: 3.5, base: 1.7, perScale: 0.46 },
  fi02_0: { travel: 5.15, base: 3.08, perScale: 0 },
  fi02_1: { travel: 5.15, base: 2.2, perScale: 0.91 },
  cloud6: { travel: 7.3, base: 2.99, perScale: 0 },
  cloud14: { travel: 7.3, base: 2.75, perScale: 0.37 },
  cloud10: { travel: 8.5, base: 2.9, perScale: 1.82 },
  cloud11: { travel: 8.5, base: 1.76, perScale: 1.82 },
  fireRed: { travel: 6.2, base: 0, perScale: 0.58 },
  smoke0: { travel: 0.55, base: 0.72, perScale: 0 },
  smoke13: { travel: 0, base: 1.4, perScale: 0 },
  smoke2: { travel: 3.4, base: 0.58, perScale: 0 },
  smoke65: { travel: 0.75, base: 0, perScale: 0.29 },
  cloud21: { travel: 1.75, base: 0, perScale: 3.61 },
  smoke21: { travel: 4.2, base: 0, perScale: 0.29 },
  smoke22: { travel: 3.7, base: 1.09, perScale: 0.29 },
  smoke60: { travel: 3.7, base: 1.09, perScale: 0.29 },
  waterfall5_9: { travel: 2.9, base: 0.28, perScale: 0.46 },
  waterfall1_2: { travel: 2.9, base: 0.73, perScale: 0.46 },
  waterfall2_1: { travel: 1.7, base: 1.18, perScale: 0 },
  waterfall2_2: { travel: 1.6, base: 1.05, perScale: 0.46 },
  waterfall3_3: { travel: 1.62, base: 0.14, perScale: 0.22 },
  waterfall3_4: { travel: 4.55, base: 0.22, perScale: 0.46 },
  spark03_24: { travel: 0.6, base: 0.19, perScale: 0 },
  light0: { travel: 0.6, base: 0, perScale: 0.45 },
  light15: { travel: 4.45, base: 0, perScale: 0.62 },
  wingFlareBlue: { travel: 0, base: 0, perScale: 0.46 },
  wingCloud: { travel: 0, base: 0, perScale: 0.46 },
  waterfall4Glint: { travel: 0.18, base: 0, perScale: 0.8 },
  frostCloud: { travel: 0.75, base: 0, perScale: 0.5 },
  frostSmoke: { travel: 0.75, base: 0, perScale: 0.5 },
  starShine: { travel: 0, base: 0, perScale: 0.3 },
  spark1_11: { travel: 1.75, base: 0.32, perScale: 0 },
  spark1_14: { travel: 1.75, base: 0.19, perScale: 0.23 },
  shiny6_1: { travel: 0.44, base: 0.14, perScale: 0 },
  light6_1: { travel: 0.44, base: 0.14, perScale: 0 },
};

/** The reach of a spawn picking any of `kinds`, as one base plus a per-scale slope. */
function reachOf(kinds: readonly KindName[]): { base: number; perScale: number } {
  let base = 0;
  let perScale = 0;

  for (const kind of kinds) {
    const reach = KIND_REACH[kind];

    base = Math.max(base, reach.travel + reach.base);
    perScale = Math.max(perScale, reach.perScale);
  }

  return { base, perScale };
}

export class ParticleEmitter {
  #due: number[];

  /** Per emission, tiles past the widened frustum its sprites can still reach. */
  #reach: number[];

  constructor(
    private readonly target: Scene,
    private readonly emissions: readonly Emission[],
    private readonly position: { x: number; y: number; z: number },
    /** The node's `rotation`, as `spawnParticle` takes it. */
    private readonly turn: NodeTurn,
    private readonly scale: number
  ) {
    this.#due = emissions.map(() => 0);

    this.#reach = emissions.map(emission => {
      const { base, perScale } = reachOf(emission.kinds);
      const scaled = Math.abs(scale * (emission.scale ?? 1));

      return (
        base +
        perScale * scaled +
        (Math.sqrt(3) * (emission.jitter ?? 0)) / TILE_CM
      );
    });
  }

  update(): void {
    const deltaSeconds = this.target.getEngine().getDeltaTime() / 1000;

    // The original emits only for objects TestFrustrum2D keeps in view. The
    // backlog is dropped too, so nothing bursts when the emitter comes back.
    const depth = EMITTER_GATE
      ? viewDepth(this.target, this.position.x, this.position.y, this.position.z)
      : Infinity;

    for (let i = 0; i < this.emissions.length; i++) {
      const emission = this.emissions[i];

      if (depth <= -this.#reach[i]) {
        this.#due[i] = 0;
        continue;
      }

      this.#due[i] += (deltaSeconds * TICKS_PER_SECOND) / emission.every;

      if (this.#due[i] > 4) this.#due[i] = 4;

      while (this.#due[i] >= 1) {
        this.#due[i] -= 1;

        const count = emission.count ?? 1;

        for (let n = 0; n < count; n++) {
          const kind =
            emission.kinds[Math.floor(Math.random() * emission.kinds.length)];

          const light =
            typeof emission.light === 'function'
              ? emission.light()
              : (emission.light ?? WHITE);

          void spawnParticle(
            this.target,
            kind,
            this.position,
            this.turn,
            this.scale * (emission.scale ?? 1),
            light,
            emission.jitter
          );
        }
      }
    }
  }
}

export type BonedEmission = {
  readonly node: { getAbsolutePosition(): { x: number; y: number; z: number } };
  readonly kinds: readonly KindName[];
  readonly count: number;
  /** Constant size, or one sampled per spawn (wing auras pulse with WorldTime). */
  readonly scale: number | (() => number);
  readonly light: readonly [number, number, number] | (() => readonly [number, number, number]);
  readonly offsetY?: number;
  /** Spawn only every n-th 25 Hz tick (default 1 = every tick). */
  readonly every?: number;
};

export class BonedParticleEmitter {
  #due = 0;
  #tick = 0;
  /** A raised point's spawn position, rewritten for each (`spawnParticle` reads it before returning). */
  readonly #raised = { x: 0, y: 0, z: 0 };

  #reach: { base: number; perScale: number }[];

  constructor(
    private readonly target: Scene,
    private readonly points: readonly BonedEmission[]
  ) {
    this.#reach = points.map(point => reachOf(point.kinds));
  }

  update(): void {
    this.#due += (this.target.getEngine().getDeltaTime() / 1000) * TICKS_PER_SECOND;

    if (this.#due > 4) this.#due = 4;

    while (this.#due >= 1) {
      this.#due -= 1;
      this.#tick++;

      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];

        if (point.every && point.every > 1 && this.#tick % point.every !== 0) {
          continue;
        }

        const base = point.node.getAbsolutePosition();
        let position = base;
        if (point.offsetY) {
          position = this.#raised;
          position.x = base.x;
          position.y = base.y + point.offsetY;
          position.z = base.z;
        }

        const scale =
          typeof point.scale === 'function' ? point.scale() : point.scale;

        // Gated per point at its spawn position. The ticks still drain, so a
        // point out of view cannot burst when it comes back.
        if (EMITTER_GATE) {
          const reach = this.#reach[i];
          const depth = viewDepth(this.target, position.x, position.y, position.z);

          if (depth <= -(reach.base + reach.perScale * Math.abs(scale))) continue;
        }

        const light =
          typeof point.light === 'function' ? point.light() : point.light;

        for (let n = 0; n < point.count; n++) {
          const kind =
            point.kinds[Math.floor(Math.random() * point.kinds.length)];

          void spawnParticle(this.target, kind, position, NO_TURN, scale, light);
        }
      }
    }
  }
}

/** A sheet a held sprite can be drawn with. */
export type HeldTexture =
  | 'clud64'
  | 'flare01'
  | 'flare01Red'
  | 'flareBlue'
  | 'impact03'
  | 'impact01'
  | 'shiny02'
  | 'shiny05'
  | 'lightmarks'
  | 'pinLight'
  | 'waterfall2'
  | 'waterfall4'
  | 'spark03'
  | 'shiny03'
  | 'magicGround1'
  | 'shockWave'
  | 'flare'
  | 'flareRed'
  | 'lightningMega1'
  | 'lightningMega2'
  | 'lightningMega3';

/** One sprite riding a node: `CreateSprite`'s sheet and SubType blend. */
export type HeldPoint = {
  readonly node: { getAbsolutePosition(): { x: number; y: number; z: number } };
  readonly texture: HeldTexture;
  /** `CreateSprite`'s SubType 0 (`EnableAlphaBlend`) or 1 (`EnableAlphaBlendMinus`). */
  readonly blend: 'add' | 'subtract';
};

/** What a held sprite draws with this frame; `rotation` in degrees. */
export type HeldLook = { scale: number; r: number; g: number; b: number; rotation: number };

/**
 * Sprites the original re-issues every frame (`CreateSprite` from a render
 * pass lives for the frame it is drawn in): one per point, moved onto its
 * node each frame. A pooled particle with a life trails the node and stacks
 * with the ones spawned before it, which is what made the Wing of Storm's
 * joint glows two and a half times too bright.
 *
 * A subtract sprite is drawn as dark art: black over its coverage, which is
 * the sheet times the light's luminance times `darkCardGain`. Babylon's
 * subtract decodes the sheet into the linear buffer first, and a mid-grey
 * cloud texel at the map's level took every pixel under it to black.
 */
export class HeldSprites {
  readonly #sprites: (Sprite | null)[];
  readonly #owners: (Pool | null)[];
  readonly #blends: Blend[];
  readonly #look: HeldLook = { scale: 1, r: 1, g: 1, b: 1, rotation: 0 };
  readonly #color = new Color4(1, 1, 1, 1);

  constructor(
    private readonly target: Scene,
    private readonly points: readonly HeldPoint[]
  ) {
    this.#sprites = points.map(() => null);
    this.#owners = points.map(() => null);
    this.#blends = points.map(point => (point.blend === 'subtract' ? 'dark' : 'add'));
  }

  /** Places every sprite, or hides them all; `look(i, out)` fills point i's look. */
  update(visible: boolean, look: (i: number, out: HeldLook) => void): void {
    const darkGain = darkCardGain(this.target);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const blend = this.#blends[i];
      const pool = pools.get(poolKey(point.texture, blend)) ?? null;

      // The pools go with the map; a sprite of a disposed manager is gone.
      if (this.#owners[i] !== pool) {
        this.#sprites[i] = null;
        this.#owners[i] = null;
      }

      if (!pool) {
        if (visible) void getPool(this.target, point.texture, blend).catch(reportLoadFailure(`particle sheet ${point.texture}`));
        continue;
      }

      let sprite = this.#sprites[i];

      if (!sprite) {
        if (!visible) continue;
        sprite = acquire(pool);
        if (!sprite) continue;
        this.#sprites[i] = sprite;
        this.#owners[i] = pool;
      }

      sprite.isVisible = visible;
      if (!visible) continue;

      const out = this.#look;
      look(i, out);

      const p = point.node.getAbsolutePosition();
      sprite.position.set(p.x, p.y, p.z);

      const size = (pool.pixelSize * out.scale) / TILE_CM;
      sprite.width = size;
      sprite.height = size * pool.aspect;
      sprite.angle = (out.rotation * Math.PI) / 180;

      // RenderSprite packs the light a byte a channel, held in 0..1 (ZzzOpenglUtil.cpp:918-933, RenderUtils.h:8-18).
      const r = unit(out.r);
      const g = unit(out.g);
      const b = unit(out.b);

      if (blend === 'dark') {
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sprite.color.set(0, 0, 0, Math.min(1, luma * darkGain * pool.cover));
      } else {
        sprite.color.copyFrom(spriteLevel(this.target, this.#color.set(r, g, b, 1)));
      }
    }
  }

  dispose(): void {
    for (let i = 0; i < this.#sprites.length; i++) {
      const sprite = this.#sprites[i];
      const pool = this.#owners[i];

      if (sprite && pool && pools.get(poolKey(this.points[i].texture, this.#blends[i])) === pool) {
        sprite.isVisible = false;
        pool.free.push(sprite);
      }

      this.#sprites[i] = null;
      this.#owners[i] = null;
    }
  }
}

export function disposeEffectParticles(): void {
  for (const p of particles) p.sprite.dispose();
  particles.length = 0;
  releasePools.clear();

  for (const pool of pools.values()) pool.manager.dispose();
  pools.clear();
  loading.clear();

  wind.x = wind.y = wind.vx = wind.vy = wind.due = 0;

  if (tickObserver && scene) {
    scene.onBeforeRenderObservable.remove(tickObserver as never);
  }

  tickObserver = null;
  scene = null;
}
