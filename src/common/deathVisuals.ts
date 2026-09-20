import type { Scene, Vector3 } from '../libs/babylon/exports';
import { effects } from '../effects';
import type { RGB } from '../effects/core';
import { BOMB_SPARKS, EXPLOSION_CELLS, FIRE_PUFF, MODEL, SMOKE, TEX } from '../effects/recipes';
import type { Sounds } from '../libs/soundsManager';

/**
 * What a character breaks into when it dies - the effects-layer consumer for
 * the special deaths of `SetPlayerDie` (ZzzCharacter.cpp:1372-1420) and
 * `CreateBlood` (ZzzEffectBlurSpark.cpp:445-450). `deathSystem.ts` asks
 * `shatterDeathFor(monsterModelType)` when the Die clip would start; a row
 * means the body vanishes at once (`o->Live = false`) and the pieces fly
 * instead of the corpse fading and sinking.
 *
 * Keyed by the *monster model type* (`MONSTER_MODEL_*`, `MODEL_MONSTER01 +
 * type` in `OpenMonsterModel`, ZzzOpenData.cpp:2313), which
 * `monsterModelTypeOf(npcType)` reads from `MONSTER_MODEL_TABLE`.
 *
 * Not here: the player transformed by a Skeleton ring (`o->SubType` in
 * `MODEL_SKELETON1..3`, :1383) - the client has no transformation rings yet;
 * it takes the same `boneShatter` when it does.
 */

export interface ShatterDeath {
  /** Spawn the pieces at the body origin with the body's `Light`. */
  spawn(scene: Scene, at: Vector3, light: RGB): void;
  /** `PlayBuffer(SOUND_BONE2, o)`; the Ice Monster is silent. */
  sound?: Sounds;
}

/** `SOUND_BONE2`: mBone2.wav, the bone rattle every shatter plays. */
const BONE_SOUND: Sounds = 'Sound/mBone2';

/** MONSTER_MODEL_ICE_MONSTER / STONE_GOLEM / DEATH_COW (_enum.h:4162, :4172, :4177). */
const MONSTER_MODEL_ICE_MONSTER = 15;
const MONSTER_MODEL_STONE_GOLEM = 25;
const MONSTER_MODEL_DEATH_COW = 30;
/** MONSTER_MODEL_STATUE_OF_SAINT / CASTLE_GATE (_enum.h:4216-4217). */
const MONSTER_MODEL_STATUE_OF_SAINT = 60;
const MONSTER_MODEL_CASTLE_GATE = 61;

/** `SOUND_HIT_GATE2` (eHitGate2): the crack both Blood Castle destructibles die on. */
const GATE_BREAK_SOUND: Sounds = 'Sound/eHitGate2';

/** Death Cow (:1397-1405): one MODEL_BONE1 skull from 150 cm up, ten MODEL_BONE2 from 100 cm. */
export const boneShatter: ShatterDeath = {
  spawn(scene, at, light) {
    effects.spawn('debris', scene, at, { model: MODEL.bone, count: 1, colour: light, liftCm: 150 });
    effects.spawn('debris', scene, at, { model: MODEL.bone2, count: 10, colour: light, liftCm: 100 });
  },
  sound: BONE_SOUND,
};

/**
 * Stone Golem (:1407-1416): 8 × MODEL_BIG_STONE1 + 8 × MODEL_BIG_STONE2, each
 * started in a ±64 cm × 0…180 cm box (ZzzEffect.cpp:2817-2821).
 */
const BIG_STONE_SCATTER_CM = [64, 64, 180] as const;
const stoneShatter: ShatterDeath = {
  spawn(scene, at, light) {
    const scatterCm = BIG_STONE_SCATTER_CM;
    effects.spawn('debris', scene, at, { model: MODEL.bigStone, count: 8, colour: light, scatterCm });
    effects.spawn('debris', scene, at, { model: MODEL.bigStone2, count: 8, colour: light, scatterCm });
  },
  sound: BONE_SOUND,
};

/**
 * Ice Monster (`CreateBlood`, ZzzEffectBlurSpark.cpp:445-450): instead of the
 * two blood splats, ten MODEL_ICE_SMALL shards from 50 cm up, each trailing
 * BITMAP_SMOKE (ZzzEffect.cpp:11017-11018).
 */
const iceShatter: ShatterDeath = {
  spawn(scene, at, light) {
    effects.spawn('debris', scene, at, {
      model: MODEL.ice2,
      count: 10,
      colour: light,
      liftCm: 50,
      puff: SMOKE,
    });
  },
};

/**
 * The Blood Castle gate (`RenderMeshEffect(0, MODEL_GATE)`, ZzzObject.cpp:1402)
 * and the Statue of Saint (`(0, MODEL_STONE_COFFIN)`, :1386). The original
 * rolls a piece at every vertex of mesh 0, so the burst has the shape of the
 * body; scattering over the body's own box is the same burst without a CPU
 * vertex read. Both are drawn dark - `Vector(0.2, 0.2, 0.2, Light)` for the
 * gate (ZzzBMD.cpp:2201), the statue keeps the body light.
 */
const GATE_SCATTER_CM = [140, 90, 300] as const;
const GATE_CHUNKS = 26;
const GATE_CHIPS = 14;
const GATE_LIGHT: RGB = [0.2, 0.2, 0.2];

const gateShatter: ShatterDeath = {
  spawn(scene, at) {
    const scatterCm = GATE_SCATTER_CM;
    effects.spawn('debris', scene, at, { model: MODEL.gateChunk, count: GATE_CHUNKS, colour: GATE_LIGHT, scatterCm, puff: SMOKE });
    effects.spawn('debris', scene, at, { model: MODEL.gateChunk2, count: GATE_CHIPS, colour: GATE_LIGHT, scatterCm, scale: 0.6 });
  },
  sound: GATE_BREAK_SOUND,
};

/** The statue is half the gate's footprint and twice as tall (its bounding box, ZzzCharacter.cpp:11827). */
const STATUE_SCATTER_CM = [90, 50, 200] as const;
const STATUE_CRYSTALS = 12;
const STATUE_SHARDS = 20;

const crystalShatter: ShatterDeath = {
  spawn(scene, at, light) {
    const scatterCm = STATUE_SCATTER_CM;
    effects.spawn('debris', scene, at, { model: MODEL.crystal, count: STATUE_CRYSTALS, colour: light, scatterCm });
    effects.spawn('debris', scene, at, { model: MODEL.crystal2, count: STATUE_SHARDS, colour: light, scatterCm, scale: 0.6 });
  },
  sound: GATE_BREAK_SOUND,
};

/**
 * The crystal the statue is made of, for the handful thrown when it is hit
 * and the storm it assembles out of - `CreateEffect(MODEL_STONE_COFFIN + 1)`
 * (ZzzCharacter.cpp:4877, ZzzBMD.cpp:2176-2180).
 */
export function spawnCrystalShards(
  scene: Scene,
  at: Vector3,
  count: number,
  light: RGB
): void {
  effects.spawn('debris', scene, at, { model: MODEL.crystal2, count, colour: light, scale: 0.6 });
}

/** `o->SubType` in MODEL_SKELETON1..3 (:1383-1390): the player-rig skeleton monsters
 *  (`common/monsters/skeletonWarrior.ts`) take the same bone shatter. */
export const skeletonShatter: ShatterDeath = boneShatter;

const SPECIAL_DEATHS: Readonly<Record<number, ShatterDeath>> = {
  [MONSTER_MODEL_DEATH_COW]: boneShatter,
  [MONSTER_MODEL_STONE_GOLEM]: stoneShatter,
  [MONSTER_MODEL_ICE_MONSTER]: iceShatter,
  [MONSTER_MODEL_CASTLE_GATE]: gateShatter,
  [MONSTER_MODEL_STATUE_OF_SAINT]: crystalShatter,
};

/** The shatter this monster model dies with, or undefined for the Die clip. */
export function shatterDeathFor(monsterModelType: number): ShatterDeath | undefined {
  return SPECIAL_DEATHS[monsterModelType];
}

/**
 * Small stone chips (MODEL_STONE1/2, `SubType 0`) with their fire puffs
 * (ZzzEffect.cpp:11019-11022) - what a breaking prop or a stone skill throws.
 * Exposed for the next consumer; no death uses it.
 */
export function spawnStoneChips(scene: Scene, at: Vector3, count: number, light: RGB): void {
  effects.spawn('debris', scene, at, { model: MODEL.stone, count: Math.ceil(count / 2), colour: light, puff: FIRE_PUFF });
  effects.spawn('debris', scene, at, { model: MODEL.stone2, count: Math.floor(count / 2), colour: light, puff: FIRE_PUFF });
}

/** `CreateBomb(pos, true)` (ZzzEffect.cpp:6394-6466, SubType 0): 20 sparks + one grey explosion card. */
const BOMB_SPARK_COUNT = 20;
const BOMB_LIGHT: RGB = [0.7, 0.7, 0.7];
/** BITMAP_EXPLOTION at its default 20-tick life and Scale 1: `Width = 256 cm`, its 10 cells played once. */
const BOMB_CARD_TILES = 2.56;
const BOMB_CARD_SECONDS = 0.8;

export function spawnBomb(scene: Scene, at: Vector3): void {
  effects.spawn('particles', scene, at, { recipe: BOMB_SPARKS, count: BOMB_SPARK_COUNT });
  effects.spawn('sprite', scene, at, {
    texture: TEX.explosion,
    colour: BOMB_LIGHT,
    size: BOMB_CARD_TILES,
    seconds: BOMB_CARD_SECONDS,
    cells: EXPLOSION_CELLS,
  });
}
