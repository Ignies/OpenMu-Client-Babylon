import { BaseClass, getBaseClass } from './characterStats';
import { ENUM_WORLD, type CharacterClassNumber } from './types';
import type { Item } from '../ecs/world';
import { REFERENCE_FPS } from './playSpeed';
import { isFastWing } from './wings';

/**
 * The locomotion half of `SetPlayerStop` / `SetPlayerWalk`
 * (ZzzCharacter.cpp:157-679) and `CharacterMoveSpeed` (:6165-6250): the
 * `c->Run` accumulator, the maps that swim, and the movement speed the two
 * states imply.
 *
 * Everything here is expressed in the original's units and converted at the
 * call site: `c->Run` counts `FPS_ANIMATION_FACTOR` per frame, which is
 * `clamp(REFERENCE_FPS / FPS, 0, 1)` (ZzzAI.cpp:729) — i.e. it climbs by
 * REFERENCE_FPS (25) per second whenever the frame rate is at or above the
 * reference, and slower below it. Time-stepping it is the frame-rate
 * independent form of the same thing.
 */

/** `c->Run >= 40` is the run threshold (ZzzCharacter.cpp:387, :544). */
export const RUN_THRESHOLD = 40;

/** A Fenrir rider breaks into the run clips at 20 (`FENRIR_RUN_DELAY`). */
export const FENRIR_RUN_DELAY = 20;

/** `c->Run += FPS_ANIMATION_FACTOR` once per frame → 25 units per second. */
export const RUN_UNITS_PER_SECOND = REFERENCE_FPS;

/** Seconds of continuous walking before the run clips take over. */
export const RUN_DELAY_SECONDS = RUN_THRESHOLD / RUN_UNITS_PER_SECOND;

/** `gMapManager.InChaosCastle()` (MapManager.cpp:1564). */
export function inChaosCastle(world: number): boolean {
  return (
    (world >= ENUM_WORLD.WD_18CHAOS_CASTLE &&
      world <= ENUM_WORLD.WD_18CHAOS_CASTLE_END) ||
    world === ENUM_WORLD.WD_53CAOSCASTLE_MASTER_LEVEL
  );
}

/**
 * `gMapManager.InDevilSquare()` (MapManager.cpp:1596) plus OpenMU's map 32
 * (Devil Square 5-7), which the original folds into `WD_9DEVILSQUARE` on
 * load (`LoadWorld`, MapManager.cpp:1177) and which draws the same world.
 */
export function inDevilSquare(world: number): boolean {
  return (
    world === ENUM_WORLD.WD_9DEVILSQUARE ||
    world === ENUM_WORLD.WD_32DEVILSQUARE_5_7
  );
}

/** `gMapManager.InBloodCastle()` (MapManager.cpp:1579). */
export function inBloodCastle(world: number): boolean {
  return (
    (world >= ENUM_WORLD.WD_11BLOODCASTLE1 &&
      world <= ENUM_WORLD.WD_11BLOODCASTLE_END) ||
    world === ENUM_WORLD.WD_52BLOODCASTLE_MASTER_LEVEL
  );
}

/** `gMapManager.InHellas()` (MapManager.cpp:1599). */
export function inHellas(world: number): boolean {
  return (
    (world >= ENUM_WORLD.WD_24HELLAS && world <= ENUM_WORLD.WD_24HELLAS_END) ||
    world === ENUM_WORLD.WD_24HELLAS_7
  );
}

/**
 * The three underwater worlds the original tests for together every time it
 * picks a locomotion clip: Atlans, Hellas (Tarkan 2 / Kalima-side maps) and
 * Doppelganger 3 (ZzzCharacter.cpp:218, :396, :535, :14965).
 */
export function isSwimWorld(world: number): boolean {
  return (
    world === ENUM_WORLD.WD_7ATLANSE ||
    inHellas(world) ||
    world === ENUM_WORLD.WD_67DOPPLEGANGER3
  );
}

/**
 * `SetPlayerWalk`'s gate on the run accumulator (ZzzCharacter.cpp:387-408).
 * Knights, Dark Lords, Rage Fighters and anyone on a Fenrir always run;
 * everyone else needs +5 boots — or +5 gloves in the swim worlds, where the
 * "run" is a swim stroke driven by the arms.
 *
 * The original ORs the equipped-item level with the *rendered* body-part
 * level; here there is one source for both, so a single check covers it.
 */
export function canAccumulateRun(
  cls: CharacterClassNumber,
  boots: Item | null | undefined,
  gloves: Item | null | undefined,
  world: number,
  ridingFenrir = false
): boolean {
  if (ridingFenrir) return true;

  const base = getBaseClass(cls);
  if (
    base === BaseClass.Knight ||
    base === BaseClass.DarkLord ||
    base === BaseClass.RageFighter
  ) {
    return true;
  }

  const swim = isSwimWorld(world);
  const gate = swim ? gloves : boots;

  return !!gate && (gate.lvl ?? 0) >= 5;
}

/** Movement speeds `CharacterMoveSpeed` returns, in the original's units. */
const SPEED_WALK = 12;
const SPEED_RUN = 15;
const SPEED_WINGS = 15;
const SPEED_FAST_WINGS = 16;

/**
 * `MoveSpeed` units are per 25 Hz frame at `TERRAIN_SCALE` 100, so one tile
 * per second is 4 units (ZzzCharacter.cpp:11530, MoveCharacterPosition:6259).
 */
export const MOVE_SPEED_UNITS_PER_TILE_PER_SECOND = 4;

export type MoveSpeedInput = {
  /** `c->Run`, in the original's 0…40 units. */
  run: number;
  inSafeZone: boolean;
  /** `c->Wing` — the equipped wing item, or null. */
  wings: Item | null | undefined;
  /** `c->Helper` is a Horn of Uniria / Dinorant (they move at wing speed). */
  riding: boolean;
  /** `c->Helper` is a Horn of Fenrir: its own walk-up and speed ladder. */
  fenrir?: boolean;
  /** A Fenrir with an option (`Helper.ExcellentFlags > 0`) tops out at 19. */
  fenrirUpgraded?: boolean;
  world: number;
};

/**
 * States in which `CharacterMoveSpeed` writes `c->Run = 40` outright, so the
 * character never walks up to running: wings, a Uniria / Dinorant, and Chaos
 * Castle (ZzzCharacter.cpp:6200-6215, :6232-6236).
 */
export function forcesRun(
  input: Pick<
    MoveSpeedInput,
    'wings' | 'riding' | 'fenrir' | 'inSafeZone' | 'world'
  >
): boolean {
  // A Fenrir keeps the walk-up: its branch of CharacterMoveSpeed (:6182-6194)
  // reads c->Run instead of pinning it to 40.
  if (input.fenrir && !input.inSafeZone) return inChaosCastle(input.world);
  if ((input.wings || input.riding) && !input.inSafeZone) return true;
  return inChaosCastle(input.world);
}

/**
 * `CharacterMoveSpeed` (ZzzCharacter.cpp:6165-6250) minus the Dark Horse and
 * the Cursed Temple holy item, in tiles per second.
 */
export function characterMoveSpeed(input: MoveSpeedInput): number {
  let speed: number;

  if (input.fenrir && !input.inSafeZone) {
    // The Fenrir ladder (:6182-6194): 15 while walking, 16 through the
    // walk-up's back half, then 17 - or 19 on a coloured one.
    if (input.run < FENRIR_RUN_DELAY / 2) speed = 15;
    else if (input.run < FENRIR_RUN_DELAY) speed = 16;
    else speed = input.fenrirUpgraded ? 19 : 17;
  } else if ((input.wings || input.riding) && !input.inSafeZone) {
    speed = isFastWing(input.wings) ? SPEED_FAST_WINGS : SPEED_WINGS;
  } else {
    speed = input.run >= RUN_THRESHOLD ? SPEED_RUN : SPEED_WALK;
  }

  if (inChaosCastle(input.world)) speed = SPEED_RUN;

  return speed / MOVE_SPEED_UNITS_PER_TILE_PER_SECOND;
}
