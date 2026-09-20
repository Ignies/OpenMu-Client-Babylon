/**
 * Monster body effects - what a monster draws on and around itself for as
 * long as it is in scope: the dust haze a Dark Knight stands in, a Yeti's
 * breath, a Bull Fighter's snort, a Death Knight's burning chest, the sand
 * a Tarkan monster raises walking and dying, the blood a Cursed King drips,
 * the lightning between Queen Rainer's limbs.
 *
 * The original draws all of it from `MoveCharacterVisual`
 * (ZzzCharacter.cpp:5583) once per 25 Hz tick, in a switch on the model, and
 * nearly every arm is one `CreateParticle` line behind `rand_fps_check(n)` -
 * true on one tick in `n`. `MONSTER_VISUALS` is that switch as a table: one
 * row per npc, one emitter per line, and a tick bank per monster rolling the
 * same 1/n each tick.
 *
 * Spawns go straight into the pools the other entries own (`emitBurst`,
 * `spawnJoint`, `spawnRing`, `spawnDebris`); this entry keeps only the
 * handles and the banks.
 *
 * Driven by: `ecs/systems/monsterVisualSystem.ts`. Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import { MonsterActionType as A } from '../common/objects/enum';
import { TILE_CM } from '../common/terrain/consts';
import type { Entity } from '../ecs/world';
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

/** The Chain Scorpion's lamp `Light` `(L, 0.4L, 0.2L)`, `L` 0.2-0.9 a tick, at its mean. */
const SCORPION_LAMP: RGB = [0.55, 0.22, 0.11];

/**
 * The game master's aura (ZzzCharacter.cpp:9441-9462). The outer light is
 * `CreateSprite(BITMAP_LIGHT, …, 6.0f, (0.4,0.6,0.8), o, 0.5f)` and the one
 * inside it rides `sin(WorldTime * 0.05) * 0.4 + 0.9` on (0.3,0.5,0.8) -
 * taken at its mean, as the sines here are. `RenderAurora`'s own
 * `sin(t*0.0015)*0.3+0.7` and the marks' `*0.3+0.5` likewise. The outer
 * light's `Alpha` of 0.5 is folded into its colour: the card is additive,
 * so the two are the same thing.
 */
const GM_HALO_OUTER: RGB = [0.2, 0.3, 0.4];
const GM_HALO_INNER: RGB = [0.27, 0.45, 0.72];
const GM_AURORA: RGB = [0.21, 0.14, 0.7];
const GM_MARK: RGB = [0.5, 0.5, 0.5];
/** Both pairs turn on `WorldTime * 0.01`: degrees per millisecond. */
const GM_SPIN = 10;

/** Beam Knight's flame `(L, 0.5L, 0.5L)`, `L = sin(t*0.002)*0.3+0.7`, at its mean. */
const BEAM_KNIGHT_FLAME: RGB = [0.7, 0.35, 0.35];

/** `c->Appear = 60` (WSclient.cpp:2856): ticks the golden bosses' arrival dust runs. */
const APPEAR_TICKS = 60;

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
/** Scale 2 is a 2 cm filament; the ribbon is drawn a little wider so it reads. */
const SPARK_WIDTH = 0.06;

// ---- 2. the table ----------------------------------------------------------

/** A box in the original's centimetres: `rand() % (2x) - x` each way, `z` up. */
type Cm3 = readonly [number, number, number];

type Gate = {
  /** `o->CurrentAction` is one of these. */
  readonly action?: readonly A[];
  /** ...and `o->AnimationFrame` sits in one of these `[from, to)` windows. */
  readonly frames?: readonly (readonly [number, number])[];
  /** `c->Dead == 0`. */
  readonly alive?: boolean;
};

type Emitter =
  | {
      /** `CreateParticle` at the body origin plus a random box. */
      readonly kind: 'body';
      readonly every: number;
      readonly recipe: ParticleRecipe;
      readonly box: Cm3;
      /** Puffs per passing tick (the `for (i < 20)` of the sand cloud). */
      readonly count?: number;
      readonly colour?: RGB;
      /** The sheet Devias uses instead (`WorldActive == WD_2DEVIAS`). */
      readonly devias?: ParticleRecipe;
      readonly gate?: Gate;
    }
  | {
      /** `CreateParticle` at `TransformPosition(BoneTransform[bone], local)`. */
      readonly kind: 'bone';
      readonly every: number;
      readonly recipe: ParticleRecipe;
      readonly bone: number;
      readonly local?: Cm3;
      /** The call's `Scale`, on the recipe's card. */
      readonly scale?: number;
      readonly colour?: RGB;
      readonly gate?: Gate;
    }
  | {
      /** `count` x `CreateParticle` at `BoneTransform[rand() % NumBones]`. */
      readonly kind: 'bones';
      readonly every: number;
      readonly count: number;
      readonly recipe: ParticleRecipe;
      readonly colour?: RGB;
      readonly gate?: Gate;
    }
  | {
      /** `CreatePointer(BITMAP_BLOOD, origin ± scatter)` on the floor. */
      readonly kind: 'blood';
      readonly every: number;
      readonly scatterCm: number;
    }
  | {
      /** `CreateJoint(BITMAP_JOINT_THUNDER, bone, bone)` pairs, kept alive. */
      readonly kind: 'bolts';
      readonly pairs: readonly (readonly [number, number])[];
    }
  | {
      /** `c->Appear`: the arrival dust and stones for the first ticks in scope. */
      readonly kind: 'appear';
      readonly ticks: number;
    }
  | {
      /**
       * `CreateSprite(BITMAP_*, o->Position + (0,0,height), size, Light, o)`:
       * a card the body carries rather than a puff it throws off. The
       * original re-makes it every render frame, which is a card that
       * follows its owner for as long as the owner is there.
       */
      readonly kind: 'halo';
      readonly texture: string;
      readonly colour: RGB;
      /** `Scale` of the call, in the card edge the sprite layer takes. */
      readonly size: number;
      /** Height over the character's feet, in cm. */
      readonly heightCm: number;
    }
  | {
      /**
       * `RenderTerrainAlphaBitmap(BITMAP_*, x, y, sx, sy, Light, angle)` -
       * a mark redrawn under the character every frame, so it turns with
       * `WorldTime` and goes where the character goes. Lives as long as the
       * body does rather than being re-made on a tick.
       */
      readonly kind: 'mark';
      readonly texture: string;
      readonly colour: RGB;
      /** `sx` of the call, which is already in tiles. */
      readonly tiles: number;
      /** Degrees a second. The original's marks turn on `WorldTime * 0.01`. */
      readonly spin: number;
    }
  | {
      /**
       * The smith's and the trader's anvil: `tries` x per tick, each
       * `CreateJoint(BITMAP_JOINT_SPARK, p, p, Angle)` and, with `chip`
       * odds, a `BITMAP_SPARK` chip. `Angle` is `(pitch, 0, yaw)` in the
       * original's degrees.
       */
      readonly kind: 'sparks';
      readonly every: number;
      readonly tries: number;
      readonly bone: number;
      readonly local?: Cm3;
      readonly pitch: readonly [number, number];
      readonly yaw: readonly [number, number];
      readonly chip: number;
      readonly gate?: Gate;
    };

export type MonsterVisual = readonly Emitter[];

const body = (
  every: number,
  recipe: ParticleRecipe,
  box: Cm3,
  extra: Partial<Extract<Emitter, { kind: 'body' }>> = {}
): Emitter => ({ kind: 'body', every, recipe, box, ...extra });

const bone = (
  every: number,
  recipe: ParticleRecipe,
  at: number,
  extra: Partial<Extract<Emitter, { kind: 'bone' }>> = {}
): Emitter => ({ kind: 'bone', every, recipe, bone: at, ...extra });

const bones = (
  every: number,
  count: number,
  recipe: ParticleRecipe,
  extra: Partial<Extract<Emitter, { kind: 'bones' }>> = {}
): Emitter => ({ kind: 'bones', every, count, recipe, ...extra });

const halo = (
  texture: string,
  colour: RGB,
  size: number,
  heightCm: number
): Emitter => ({ kind: 'halo', texture, colour, size, heightCm });

const mark = (
  texture: string,
  colour: RGB,
  tiles: number,
  spin: number
): Emitter => ({ kind: 'mark', texture, colour, tiles, spin });

/** `MonsterMoveSandSmoke` (:5570): walking, one `SMOKE + 1` a tick within ±100 cm. */
const walkSand = body(1, SAND_SMOKE, [100, 100, 0], {
  gate: { action: [A.Walk] },
});

/** `MonsterDieSandSmoke` (:5551): Die frame 8, twenty `SMOKE + 1` SubType 1 in a ±32 x ±16 box. */
const dieSand = body(1, SAND_SMOKE_BURST, [32, 32, 16], {
  count: 20,
  gate: { action: [A.Die], frames: [[8, 9]] },
});

/**
 * The Dark Knight / Larva / Chain Scorpion arm (:6157-6166): alive, one puff
 * in four ticks, `BITMAP_SMOKE` on Devias and `SMOKE + 1` elsewhere.
 */
const haze = (colour?: RGB): Emitter =>
  body(4, SAND_SMOKE, [32, 32, 16], {
    devias: BODY_SMOKE,
    colour,
    gate: { alive: true },
  });

/** Bali's attack (:6021-6045): `BITMAP_ENERGY` (0.6, 1, 0.8) and `BITMAP_FIRE` (1, 0.6, 1) on one bone. */
const baliStrike = (action: A, at: number): Emitter[] => [
  bone(1, ENERGY_CHIPS, at, {
    colour: [0.6, 1, 0.8],
    gate: { action: [action] },
  }),
  bone(1, FIRE_PUFF, at, { colour: [1, 0.6, 1], gate: { action: [action] } }),
];

/**
 * Death Beam Knight's wing (:5843-5904): the 35 bones of `vec_list`
 * (ZzzCharacter.cpp:137) as the `wingLeft` / `wingRight` pair starts (scale
 * 1, then 0.5 from pair 11), the four `arm_leg_*` starts at 0.6, and on
 * even ticks the body (bone 2 of the list) at 1.3 and the head (bone 1) at
 * 0.5. A bone index here is the list's entry, not the pair's.
 */
const VEC_LIST = [
  5, 6, 33, 53, 35, 49, 50, 45, 46, 41, 42, 37, 38, 11, 31, 13, 27, 28, 23, 24,
  19, 20, 15, 16, 54, 55, 62, 69, 70, 77, 2, 79, 81, 84, 86,
] as const;
const WING_LEFT = [0, 2, 2, 4, 5, 4, 7, 4, 9, 4, 11, 6, 8, 10, 12] as const;
const WING_RIGHT = [
  0, 13, 13, 15, 16, 15, 18, 15, 20, 15, 22, 17, 19, 21, 23,
] as const;
const ARM_LEG_LEFT = [29, 28, 34, 33] as const;
const ARM_LEG_RIGHT = [26, 25, 32, 31] as const;

const deathBeamKnightWings = (): Emitter[] => {
  const out: Emitter[] = [];
  const lick = (entry: number, scale: number, every = 1) =>
    out.push(bone(every, FLAME_LICK, VEC_LIST[entry], { scale }));
  WING_LEFT.forEach((entry, i) => lick(entry, i >= 11 ? 0.5 : 1));
  WING_RIGHT.forEach((entry, i) => lick(entry, i >= 11 ? 0.5 : 1));
  for (const entry of ARM_LEG_LEFT) lick(entry, 0.6);
  for (const entry of ARM_LEG_RIGHT) lick(entry, 0.6);
  lick(30, 1.3, 2);
  lick(1, 0.5, 2);
  return out;
};

/**
 * Keyed by NPC/monster type number (`MonstersDatabase`). Every row is a
 * transcription; the file:line is the original's site in ZzzCharacter.cpp.
 */
export const MONSTER_VISUALS: Partial<Record<number, MonsterVisual>> = {
  // 0 Bull Fighter, 4 Elite Bull Fighter, 8 Poison Bull (MODEL_BULL_FIGHTER):
  // the snort from bone 24, (0, -4, 0) cm, one tick in two, on Stop1 frames
  // 15-20, Stop2 20-25 and Walk 2-3 / 5-6 (:6189-6205).
  0: [
    bone(2, BODY_SMOKE, 24, {
      local: [0, -4, 0],
      gate: { action: [A.Stop1], frames: [[15, 20]] },
    }),
    bone(2, BODY_SMOKE, 24, {
      local: [0, -4, 0],
      gate: { action: [A.Stop2], frames: [[20, 25]] },
    }),
    bone(2, BODY_SMOKE, 24, {
      local: [0, -4, 0],
      gate: {
        action: [A.Walk],
        frames: [
          [2, 3],
          [5, 6],
        ],
      },
    }),
  ],
  // 2 Budge Dragon (MODEL_BUDGE_DRAGON): its case has no `break` (:6138) and
  // falls into the Dark Knight haze below.
  2: [haze()],
  // 7 Giant (MODEL_GIANT): the sand cloud when it falls (:6177).
  7: [dieSand],
  // 10 Dark Knight (MODEL_DARK_KNIGHT) (:6147).
  10: [haze()],
  // 12 Larva (MODEL_LARVA) (:6148).
  12: [haze()],
  // 19 Yeti (MODEL_YETI): breath, `BITMAP_SMOKE` from bone 22, one tick in four (:6180).
  19: [bone(4, BODY_SMOKE, 22)],
  // 20 Elite Yeti (MODEL_ELITE_YETI): the same (:6181).
  20: [bone(4, BODY_SMOKE, 22)],
  // 27 Chain Scorpion (MODEL_CHAIN_SCORPION): the haze, in the tail lamp's amber (:6149-6166).
  27: [haze(SCORPION_LAMP)],
  // 35 Death Gorgon (MODEL_GORGON, `c->Level == 2`): ten `BITMAP_FIRE` on
  // random bones every tick (:6060-6072). The floor light is
  // `lighting/characters.ts`.
  35: [bones(1, 10, FIRE_PUFF)],
  // 40 Death Knight (MODEL_DEATH_KNIGHT): `BITMAP_FIRE` from bone 2, one tick in two (:6002-6010).
  40: [bone(2, FIRE_PUFF, 2)],
  // 51 Great Bahamut (MODEL_BAHAMUT, `c->Level == 1`): the haze, `SMOKE + 1` everywhere (:6168-6175).
  51: [body(4, SAND_SMOKE, [32, 32, 16], { gate: { alive: true } })],
  // 53 Golden Titan, 54 Golden Soldier: `c->Appear = 60` on arrival (WSclient.cpp:2856, :5639-5652).
  53: [{ kind: 'appear', ticks: APPEAR_TICKS }],
  54: [{ kind: 'appear', ticks: APPEAR_TICKS }],
  // 57 Iron Wheel, 83 Golden Wheel (MODEL_GOLDEN_WHEEL) (:5980-5984).
  57: [walkSand, dieSand],
  // 58 Tantallos, 82 Golden Tantallos (MODEL_TANTALLOS `SubType 0`) (:5975-5978).
  58: [walkSand, dieSand],
  // 59 Tantallos (`SubType 1`, :13752): `BITMAP_FIRE` on bones 6 and 13 every tick (:5961-5972).
  // Its negative terrain light (-1.3, range 3) has no sink to carry it.
  59: [bone(1, FIRE_PUFF, 6), bone(1, FIRE_PUFF, 13)],
  // 60 Bloody Wolf (MODEL_BLOODY_WOLF) (:5954-5957).
  60: [walkSand],
  // 61 Beam Knight (MODEL_BEAM_KNIGHT): two small flames, bones 62 and 77,
  // Scale 0.2, breathing `(L, 0.5L, 0.5L)`; the sand walking and dying (:5924-5952).
  61: [
    bone(1, FLAME_LICK, 62, { scale: 0.2, colour: BEAM_KNIGHT_FLAME }),
    bone(1, FLAME_LICK, 77, { scale: 0.2, colour: BEAM_KNIGHT_FLAME }),
    walkSand,
    dieSand,
  ],
  // 63 Death Beam Knight (MONSTER_DEATH_BEAM_KNIGHT): the burning wings (:5843-5922).
  63: deathBeamKnightWings(),
  // 62 Mutant (MODEL_MUTANT) (:5834-5838).
  62: [walkSand],
  // 66 Cursed King (MODEL_CURSED_KING): a blood pointer within ±14 cm, one tick in five (:5826-5833).
  66: [{ kind: 'blood', every: 5, scatterCm: (10 * TILE_CM) / 70 }],
  // 70 Queen Rainer (MODEL_QUEEN_RAINER): fourteen thunder joints between her bones (:5767-5824).
  70: [
    {
      kind: 'bolts',
      pairs: [
        [2, 3],
        [3, 4],
        [4, 5],
        [2, 10],
        [10, 11],
        [2, 18],
        [18, 22],
        [22, 23],
        [23, 24],
        [24, 25],
        [18, 31],
        [31, 32],
        [32, 33],
        [33, 34],
      ],
    },
  ],
  // 150 Bali (MODEL_BALI): energy and fire on the striking limb per attack;
  // dying, twenty `BITMAP_FIRE` (0.1, 0.8, 0.6) on random bones while the
  // Die clip is under frame 12 (:6018-6058).
  150: [
    ...baliStrike(A.Attack1, 33),
    ...baliStrike(A.Attack2, 20),
    ...baliStrike(A.Attack3, 41),
    ...baliStrike(A.Attack4, 49),
    bones(1, 20, FIRE_PUFF, {
      colour: [0.1, 0.8, 0.6],
      gate: { action: [A.Die], frames: [[0, 12]] },
    }),
  ],
  // 251 Hanzo the Blacksmith (MODEL_SMITH): on the idle clip's frames 5-6,
  // four sparks off the anvil at bone 17, `Angle (150-210, 0, 0-30)`, each
  // with a chip (:6096-6109). The forge light is `lighting/characters.ts`.
  251: [
    {
      kind: 'sparks',
      every: 1,
      tries: 4,
      bone: 17,
      pitch: [150, 210],
      yaw: [0, 30],
      chip: 1,
      gate: { action: [A.Stop1], frames: [[5, 6.001]] },
    },
  ],
  // 231 Devias trader (MODEL_DEVIAS_TRADER): while idle, four tries a tick
  // at bone 37 + (0, 5, 10) cm, `Angle (90-150, 0, 0-30)`, a chip one time
  // in two (:6111-6127).
  231: [
    {
      kind: 'sparks',
      every: 1,
      tries: 4,
      bone: 37,
      local: [0, 5, 10],
      pitch: [90, 150],
      yaw: [0, 30],
      chip: 0.5,
      gate: { action: [A.Stop1] },
    },
  ],

  // 378 Game Master (MODEL_GM_CHARACTER), which is also what the Game Master
  // Transformation Ring puts a character in: a light over the head, and two
  // pairs of counter-turning marks on the ground - the blue `RenderAurora`
  // pair and the `BITMAP_GM_AURORA` pair inside it
  // (ZzzCharacter.cpp:9436-9462). The two sines the original runs the
  // brightness on are taken at their mean, as everything else here is. The
  // physics-cloth hair of the same branch has no equivalent and is not here.
  378: [
    halo(TEX.flare, GM_HALO_OUTER, 4.2, 100),
    halo(TEX.flare, GM_HALO_INNER, 1.4, 100),
    mark(TEX.magicGround2, GM_AURORA, 2.5, GM_SPIN),
    mark(TEX.magicGround2, GM_AURORA, 2.5, -GM_SPIN),
    mark(TEX.gmAurora, GM_MARK, 1.5, GM_SPIN),
    mark(TEX.gmAurora, GM_MARK, 1.0, -GM_SPIN),
  ],
};
// The variants that share a model share its case.
MONSTER_VISUALS[4] = MONSTER_VISUALS[0];
MONSTER_VISUALS[8] = MONSTER_VISUALS[0];
MONSTER_VISUALS[364] = MONSTER_VISUALS[0];
MONSTER_VISUALS[43] = MONSTER_VISUALS[2];
MONSTER_VISUALS[493] = MONSTER_VISUALS[10];
MONSTER_VISUALS[532] = MONSTER_VISUALS[12];
MONSTER_VISUALS[83] = MONSTER_VISUALS[57];
MONSTER_VISUALS[82] = MONSTER_VISUALS[58];
MONSTER_VISUALS[300] = MONSTER_VISUALS[62];
MONSTER_VISUALS[135] = MONSTER_VISUALS[66];

/** The body effects a character type carries, if any. */
export function monsterVisualFor(npcType: number): MonsterVisual | undefined {
  return MONSTER_VISUALS[npcType];
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

/** How many monsters are drawing their effects (debug). */
export function monsterVisualCount(): number {
  return live.size;
}

const tmp = new Vector3();
const tmpLocal = new Vector3();

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
};

function open(gate: Gate | undefined, f: Frame): boolean {
  if (!gate) return true;
  if (gate.alive && !f.alive) return false;
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
    case 'bolts':
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

  for (const em of row) {
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
      };
      prevFrame = frame;

      for (let t = 0; t < due; t++) {
        ticks++;
        for (const em of row) {
          if (em.kind === 'appear') {
            if (ticks <= em.ticks) emit(scene, e, em, f);
            continue;
          }
          // A mark is not re-made on a tick: it was started with the body.
          if (em.kind === 'mark') continue;
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
          if (Math.random() < 1 / em.every) emit(scene, e, em, f);
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

export interface MonsterVisualsOptions {
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
