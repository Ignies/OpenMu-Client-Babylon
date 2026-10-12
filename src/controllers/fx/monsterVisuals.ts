/**
 * Monster body effects: `MoveCharacterVisual` (ZzzCharacter.cpp:5583), one row per monster folder
 * (`bodyFx`) and one emitter per `CreateParticle` line. Driven by monsterVisualSystem.ts. See fx/readme.md.
 */
import { Vector3, type Scene } from '../render/babylon/exports';
import { ENUM_WORLD } from '../../core/types';
import { MonsterActionType as A } from '@versions/shared/objects/enum';
import { TILE_CM } from '../terrain/consts';
import type { Entity } from '../../ecs/world';
import {
  LiveList,
  bonePos,
  boneLocalPos,
  emitBurst,
  entityGone,
  entityPos,
  inWindow,
  type ParticleRecipe,
  type PointSource,
  type RGB,
} from './core';
import { spawnDebris } from './debris';
import { spawnJoint } from './joint';
import { spawnRing } from './ring';
import { spawnSprite } from './sprite';
import { glowMonster, type GlowTexture, type MonsterGlow } from './monsterGlow';
import { NO_TURN, spawnParticle, type KindName } from './effectParticles';
import {
  BODY_SMOKE,
  ENERGY_CHIPS,
  FIRE_PUFF,
  FLAME_LICK,
  HIT_SPARKS,
  MODEL,
  RGBS,
  SAND_SMOKE,
  SAND_SMOKE_BURST,
  TEX,
} from './recipes';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';
import {
  monsterRegistry,
  type BodyCard,
  type BodyFxEmitter,
  type BodyFxGate,
  type BodyParticle,
  type BodyPuff,
  type BodyTexture,
  type MonsterBodyFx,
} from '../monsters';

// ---- 1. tuning -------------------------------------------------------------

/** One original tick: `MoveCharacterVisual` runs at 25 Hz. */
const TICK = 1 / 25;

/** Ticks one frame may pay out; a hitch never dumps a backlog of puffs. */
const MAX_TICKS_PER_FRAME = 4;

/** `CreatePointer(BITMAP_BLOOD, …, 0.65)`: 0.65 of the 64 px sheet, in tiles. */
const BLOOD_DECAL_TILES = (0.65 * 64) / TILE_CM;

/** The pointer lives 50-80 ticks and fades over its last 50 (ZzzEffectPointer.cpp:41, :85). */
const BLOOD_DECAL_SECONDS: readonly [number, number] = [50 * TICK, 80 * TICK];

/** `MovePointers` writes `Light = (0.1, 0, 0)` on a blood pointer: dark, drying. */
const BLOOD_DECAL_COLOUR: RGB = [0.35, 0.06, 0.05];

/** `CreateJoint(BITMAP_JOINT_THUNDER, …, 7, NULL, 14.f)`: Scale 14 is a 14 cm ribbon. */
const THUNDER_WIDTH = 14 / TILE_CM;

/** ...with 20 tries a tick, each 1/10 a puff and 1/10 a stone (ZzzCharacter.cpp:5641-5651). */
const APPEAR_TRIES = 20;
const APPEAR_EVERY = 10;

/**
 * `BITMAP_JOINT_SPARK` SubType 0 (ZzzEffectJoint.cpp:950): Scale 2, Velocity
 * 6-25 cm a tick, LT 8-15 ticks, MaxTails 2, white; no gravity, no fade.
 */
const SPARK_VELOCITY: readonly [number, number] = [
  (6 * 25) / TILE_CM,
  (25 * 25) / TILE_CM,
];
const SPARK_SECONDS: readonly [number, number] = [8 * TICK, 15 * TICK];
const SPARK_TAILS = 2;
/**
 * Scale 2 is a 2 cm filament. The ribbon is drawn a little wider so it reads
 * at our camera, but 6 cm was three times the original and the anvil threw
 * what looked like ribbons rather than sparks; 3 cm still reads.
 */
const SPARK_WIDTH = 0.03;

// ---- 2. the rows ------------------------------------------------------------

/**
 * Each monster folder writes its own rows (`MonsterDef.bodyFx`, types in
 * `controllers/monsters/bodyFx.ts`); particles and textures there are names, resolved here.
 */
type Resolved<E> = E extends unknown
  ? {
      readonly [K in keyof E]: K extends 'recipe' | 'devias'
        ? ParticleRecipe
        : K extends 'texture'
          ? string
          : E[K];
    }
  : never;

type Emitter = Resolved<BodyFxEmitter>;
type Gate = BodyFxGate;
/** A box in the original's centimetres: `rand() % (2x) - x` each way, `z` up. */
type Cm3 = readonly [number, number, number];

type MonsterVisual = readonly Emitter[];

const PARTICLES: Readonly<Record<BodyParticle, ParticleRecipe>> = {
  bodySmoke: BODY_SMOKE,
  energyChips: ENERGY_CHIPS,
  firePuff: FIRE_PUFF,
  flameLick: FLAME_LICK,
  sandSmoke: SAND_SMOKE,
  sandSmokeBurst: SAND_SMOKE_BURST,
};

const TEXTURES: Readonly<Record<BodyTexture, string>> = {
  flare: TEX.flare,
  magicGround2: TEX.magicGround2,
  gmAurora: TEX.gmAurora,
};

const CARDS: Readonly<Record<BodyCard, GlowTexture>> = {
  light: 'flare',
  lightRed: 'lightRed',
  lightMarks: 'lightMarks',
  shockWave: 'shockWave',
  shiny2: 'wisp',
  shiny6: 'shiny6',
  energy: 'energy',
  flareBlue: 'flareBlue',
  flareRed: 'flareRed',
  flare2: 'flare2',
  eventCloud: 'eventCloud',
};

const PUFFS: Readonly<Record<BodyPuff, KindName>> = {
  fire1: 'fire1',
  fire2: 'fire2',
  fire3: 'fire3',
  smoke1: 'smoke1',
  smoke13: 'smoke13',
  smoke17: 'smoke17',
  smoke21: 'smoke21',
  smoke50: 'smoke50',
  smokeLine1: 'smokeLine1',
  smokeLine2: 'smokeLine2',
  smokeLine3: 'smokeLine3',
  trueFire: 'trueFire',
};

type CardsRow = Extract<BodyFxEmitter, { kind: 'cards' }>;

/** A `cards` row as the glow entry draws it: each spot its own sheet, scale and offset (cm to tiles). */
function cardGlow(em: CardsRow): MonsterGlow {
  return {
    bones: [],
    spots: em.spots.map(s => ({
      bone: s.bone,
      tex: CARDS[s.card],
      scale: s.scale,
      local: s.local && [s.local[0] / TILE_CM, s.local[1] / TILE_CM, s.local[2] / TILE_CM],
      spin: s.spin,
    })),
    cards: [],
    colour: em.colour,
    breathe: !!em.pulse,
    breathSpeed: em.pulse?.speed,
    breathAmount: em.pulse?.amount,
    breathBase: em.pulse?.base,
    swellSpeed: em.swell?.speed,
    swellAmount: em.swell?.amount,
    liftSpeed: em.lift?.speed,
    liftAmount: em.lift?.amount,
    liftBase: em.lift?.base,
    luminosity: 1,
  };
}

/** A row with its names swapped for the recipes and textures they name; keys keep their order. */
function resolve(e: BodyFxEmitter): Emitter {
  const out: Record<string, unknown> = { ...e };
  if ('recipe' in e) out.recipe = PARTICLES[e.recipe];
  if ('devias' in e && e.devias) out.devias = PARTICLES[e.devias];
  if ('texture' in e) out.texture = TEXTURES[e.texture];
  return out as Emitter;
}

const resolved = new WeakMap<MonsterBodyFx, MonsterVisual>();

/** The body effects a character type carries (its folder's `bodyFx`), if any. */
export function monsterVisualFor(npcType: number): MonsterVisual | undefined {
  const fx = monsterRegistry.def(npcType)?.bodyFx;
  if (!fx) return undefined;
  let row = resolved.get(fx);
  if (!row) {
    row = fx.map(resolve);
    resolved.set(fx, row);
  }
  return row;
}

// ---- 3. state + readers ----------------------------------------------------

/**
 * A recipe re-coloured or re-sized for one row. The particle pool is keyed
 * by recipe identity, so each (base, colour, scale) gets one stable object.
 */
const variants = new WeakMap<ParticleRecipe, Map<string, ParticleRecipe>>();

function variant(
  base: ParticleRecipe,
  colour?: RGB,
  scale?: number
): ParticleRecipe {
  if (!colour && !scale) return base;
  let mine = variants.get(base);
  if (!mine) {
    mine = new Map();
    variants.set(base, mine);
  }
  const key = `${colour?.join(',') ?? ''}|${scale ?? ''}`;
  let r = mine.get(key);
  if (!r) {
    r = { ...base };
    if (colour) {
      r.colour = colour;
      if (base.colourEnd) {
        const k =
          (base.colourEnd[0] + base.colourEnd[1] + base.colourEnd[2]) /
          Math.max(1e-3, base.colour[0] + base.colour[1] + base.colour[2]);
        r.colourEnd = [colour[0] * k, colour[1] * k, colour[2] * k];
      }
    }
    if (scale) r.size = base.size * scale;
    mine.set(key, r);
  }
  return r;
}

/** The map the entries are stepping for; `body` reads it for the Devias sheet. */
let currentMap: ENUM_WORLD = ENUM_WORLD.WD_0LORENCIA;

const live = new LiveList();

const tmp = new Vector3();
const tmpLocal = new Vector3();
const ZERO_CM: Cm3 = [0, 0, 0];

const scatter = (v: number) => (Math.random() * 2 - 1) * v;

function boxed(e: Entity, box: Cm3, out: Vector3): Vector3 {
  entityPos(e, 0, out);
  out.x += scatter(box[0] / TILE_CM);
  out.z += scatter(box[1] / TILE_CM);
  out.y += scatter(box[2] / TILE_CM);
  return out;
}

function boneSource(e: Entity, at: number): PointSource {
  return out => bonePos(e, at, out);
}

type Frame = {
  readonly action: A | undefined;
  readonly frame: number;
  readonly prevFrame: number;
  readonly alive: boolean;
  readonly buffs: ReadonlySet<number> | undefined;
};

function open(gate: Gate | undefined, f: Frame): boolean {
  if (!gate) return true;
  if (gate.alive && !f.alive) return false;
  if (gate.buff !== undefined && !f.buffs?.has(gate.buff)) return false;
  if (
    gate.action &&
    (f.action === undefined || !gate.action.includes(f.action))
  )
    return false;
  if (
    gate.frames &&
    !gate.frames.some(([a, b]) => inWindow(f.prevFrame, f.frame, a, b))
  ) {
    return false;
  }
  return true;
}

function boneCount(e: Entity): number {
  // The GLB adds a root above the MU bones (core.ts bonePos).
  return Math.max(0, (e.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1);
}

/** One tick of one emitter, the 1/every roll already won. */
function emit(scene: Scene, e: Entity, em: Emitter, f: Frame): void {
  switch (em.kind) {
    case 'body': {
      if (!open(em.gate, f)) return;
      const recipe = variant(
        em.devias && currentMap === ENUM_WORLD.WD_2DEVIAS
          ? em.devias
          : em.recipe,
        em.colour
      );
      for (let i = 0; i < (em.count ?? 1); i++) {
        emitBurst(scene, recipe, boxed(e, em.box, tmp), 1);
      }
      return;
    }
    case 'bone': {
      if (!open(em.gate, f)) return;
      const local = em.local ?? [0, 0, 0];
      tmpLocal.set(local[0] / TILE_CM, local[1] / TILE_CM, local[2] / TILE_CM);
      boneLocalPos(e, em.bone, tmpLocal, tmp);
      emitBurst(scene, variant(em.recipe, em.colour, em.scale), tmp, 1);
      return;
    }
    case 'bones': {
      if (!open(em.gate, f)) return;
      const n = boneCount(e);
      if (n <= 0) return;
      const recipe = variant(em.recipe, em.colour);
      for (let i = 0; i < em.count; i++) {
        emitBurst(
          scene,
          recipe,
          bonePos(e, Math.floor(Math.random() * n), tmp),
          1
        );
      }
      return;
    }
    case 'blood': {
      entityPos(e, 0, tmp);
      tmp.x += scatter(em.scatterCm / TILE_CM);
      tmp.z += scatter(em.scatterCm / TILE_CM);
      const [lo, hi] = BLOOD_DECAL_SECONDS;
      const seconds = lo + Math.random() * (hi - lo);
      spawnRing(scene, tmp, {
        texture: TEX.blood,
        colour: BLOOD_DECAL_COLOUR,
        seconds,
        scale: BLOOD_DECAL_TILES,
        // `Scale += 0.004` a tick: barely spreads.
        grow: 1.1,
        blend: 'alpha',
        fadeTail: (50 * TICK) / seconds,
      });
      return;
    }
    case 'appear': {
      for (let i = 0; i < APPEAR_TRIES; i++) {
        if (Math.random() < 1 / APPEAR_EVERY) {
          emitBurst(scene, SAND_SMOKE_BURST, boxed(e, [32, 32, 16], tmp), 1);
        }
        if (Math.random() < 1 / APPEAR_EVERY) {
          spawnDebris(scene, entityPos(e, 0, tmp), {
            model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2,
            count: 1,
            colour: RGBS.white,
            puff: FIRE_PUFF,
          });
        }
      }
      return;
    }
    case 'sparks': {
      if (!open(em.gate, f)) return;
      const local = em.local ?? [0, 0, 0];
      tmpLocal.set(local[0] / TILE_CM, local[1] / TILE_CM, local[2] / TILE_CM);
      boneLocalPos(e, em.bone, tmpLocal, tmp);
      for (let i = 0; i < em.tries; i++) {
        if (Math.random() >= 1 / em.every) continue;
        const pitch =
          ((em.pitch[0] + Math.random() * (em.pitch[1] - em.pitch[0])) *
            Math.PI) /
          180;
        const yaw =
          ((em.yaw[0] + Math.random() * (em.yaw[1] - em.yaw[0])) * Math.PI) /
          180;
        // `AngleMatrix((pitch, 0, yaw))` on the joint's forward (0, 1, 0):
        // the original's y is horizontal and z is up.
        const fwd = Math.cos(pitch);
        const up = Math.sin(pitch);
        const heading = new Vector3(
          -fwd * Math.sin(yaw),
          up,
          fwd * Math.cos(yaw)
        );
        spawnJoint(scene, tmp, {
          velocity:
            SPARK_VELOCITY[0] +
            Math.random() * (SPARK_VELOCITY[1] - SPARK_VELOCITY[0]),
          heading,
          seconds:
            SPARK_SECONDS[0] +
            Math.random() * (SPARK_SECONDS[1] - SPARK_SECONDS[0]),
          maxTails: SPARK_TAILS,
          width: SPARK_WIDTH,
          colour: RGBS.white,
          texture: TEX.spark,
        });
        if (Math.random() < em.chip) emitBurst(scene, HIT_SPARKS, tmp, 1);
      }
      return;
    }
    case 'puff': {
      if (!open(em.gate, f)) return;
      const local = em.local ?? ZERO_CM;
      for (const at of em.bones) {
        if (em.rollEach && Math.random() >= 1 / em.every) continue;
        tmpLocal.set(local[0] / TILE_CM, local[1] / TILE_CM, local[2] / TILE_CM);
        boneLocalPos(e, at, tmpLocal, tmp);
        for (let i = 0; i < em.particles.length; i++) {
          const p = em.particles[i];
          const name = typeof p === 'string' ? p : p[Math.floor(Math.random() * p.length)];
          const scale = em.scales?.[i] ?? em.scale ?? 1;
          void spawnParticle(scene, PUFFS[name], tmp, NO_TURN, scale, em.colour, em.jitterCm);
        }
      }
      return;
    }
    case 'bolts':
    case 'cards':
    case 'trail':
      // Spawned once at start; nothing per tick.
      return;
  }
}

/**
 * Start the row's effects on one monster. The handle lives until the entity
 * leaves the world or the map resets; a death does not end it, because the
 * sand cloud and Bali's fire are die effects.
 */
export function visualMonster(
  scene: Scene,
  e: Entity,
  row: MonsterVisual
): EffectHandle {
  const model = e.modelObject;
  if (!model) return DEAD_HANDLE;

  let bank = 0;
  let ticks = 0;
  let prevFrame = -1;
  let stopped = false;
  const children: EffectHandle[] = [];
  /** The ones that end with its life (`gate.alive`). */
  const mortal: EffectHandle[] = [];

  for (const em of row) {
    if (em.kind === 'cards') {
      const card = glowMonster(scene, e, cardGlow(em));
      children.push(card);
      if (em.gate?.alive) mortal.push(card);
      continue;
    }
    if (em.kind === 'trail') {
      const ribbon = spawnJoint(scene, bonePos(e, em.bone, tmp), {
        head: boneSource(e, em.bone),
        maxTails: em.maxTails,
        width: em.widthCm / TILE_CM,
        colour: em.colour,
        texture: em.ribbon === 'flare' ? TEX.flareBig : TEX.jointLaser,
        seconds: Infinity,
        fadeTail: 0,
        until: () => stopped || entityGone(e),
      });
      children.push(ribbon);
      if (em.gate?.alive) mortal.push(ribbon);
      continue;
    }
    if (em.kind === 'halo') {
      children.push(
        spawnSprite(scene, entityPos(e, em.heightCm / TILE_CM, tmp), {
          texture: em.texture,
          colour: em.colour,
          size: em.size,
          seconds: Infinity,
          fadeTail: 0,
          height: em.heightCm / TILE_CM,
          follow: out => entityPos(e, 0, out),
        })
      );
      continue;
    }
    if (em.kind === 'mark') {
      // The original turns these off `WorldTime`, so one that has been under
      // a character since it came into scope is already part-way round.
      children.push(
        spawnRing(scene, entityPos(e, 0, tmp), {
          texture: em.texture,
          colour: em.colour,
          scale: em.tiles,
          spin: em.spin,
          spinFrom: (performance.now() * em.spin) / 1000,
          seconds: Infinity,
          fadeTail: 0,
          follow: out => entityPos(e, 0, out),
          until: () => stopped || entityGone(e),
        })
      );
      continue;
    }
    if (em.kind !== 'bolts') continue;
    for (const [a, b] of em.pairs) {
      children.push(
        spawnJoint(scene, bonePos(e, a, tmp), {
          from: boneSource(e, a),
          to: boneSource(e, b),
          colour: RGBS.arc,
          seconds: Infinity,
          width: THUNDER_WIDTH,
          segments: 8,
          forks: 1,
          jitter: 0.1,
          texture: TEX.jointThunder,
          textureRepeats: 2,
          textureScroll: 1,
          until: () => stopped || entityGone(e),
        })
      );
    }
  }

  return live.push({
    update(dt) {
      if (entityGone(e)) return false;

      if (e.dying && mortal.length) {
        for (const h of mortal) h.stop();
        mortal.length = 0;
      }

      bank += dt;
      let due = 0;
      while (bank >= TICK && due < MAX_TICKS_PER_FRAME) {
        bank -= TICK;
        due++;
      }
      if (bank >= TICK) bank = 0;
      if (due === 0) return true;

      // Off screen it costs nothing, and the bank has already been paid.
      if (!model.Ready || model.OutOfView) return true;

      const frame = model.actionFrame();
      const f: Frame = {
        // An NPC has no `monsterAnimation`; its idle is the model's action 0.
        action: e.monsterAnimation?.action ?? (model.CurrentAction as A),
        frame,
        prevFrame,
        alive: !e.dying,
        buffs: e.buffs,
      };
      prevFrame = frame;

      for (let t = 0; t < due; t++) {
        ticks++;
        for (const em of row) {
          if (em.kind === 'appear') {
            if (ticks <= em.ticks) emit(scene, e, em, f);
            continue;
          }
          // A mark, cards and a trail are not re-made on a tick: they were started with the body.
          if (em.kind === 'mark' || em.kind === 'cards' || em.kind === 'trail') continue;
          // A halo is, but on every one of them rather than a roll.
          if (em.kind === 'halo') {
            emit(scene, e, em, f);
            continue;
          }
          if (em.kind === 'bolts' || em.kind === 'blood') {
            if (em.kind === 'blood' && Math.random() < 1 / em.every)
              emit(scene, e, em, f);
            continue;
          }
          if ((em.kind === 'puff' && em.rollEach) || Math.random() < 1 / em.every) emit(scene, e, em, f);
        }
      }
      return true;
    },
    release() {
      stopped = true;
      for (const c of children) c.stop();
      children.length = 0;
    },
  });
}

function update(map: ENUM_WORLD, dt: number): void {
  currentMap = map;
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 4. the layer ----------------------------------------------------------

interface MonsterVisualsOptions {
  entity: Entity;
  row?: MonsterVisual;
}

export const monsterVisualsLayer: EffectLayer<
  MonsterVisualsOptions,
  'monsterVisuals'
> = {
  name: 'monsterVisuals',
  update,
  reset,
  spawn(scene, _at, opts) {
    const row = opts.row ?? monsterVisualFor(opts.entity.npcType ?? -1);
    return row ? visualMonster(scene, opts.entity, row) : DEAD_HANDLE;
  },
};
