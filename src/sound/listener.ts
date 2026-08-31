import type { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';

/**
 * The listener: where the hero's ears are, and the one-shot `playSfx` every
 * positioned effect goes through (the original's `PlayBuffer(sound, object)`
 * — DirectSound's 3D listener sits on the hero, so a sound played "at" an
 * object is attenuated by its distance to the hero; a sound with no position
 * is UI / hero-local and full volume).
 *
 * Driven by: the ECS world attached once by `ecs/systems/soundSystem.ts`
 * (`attachListener`) and the hero entity each frame; `CombatSfxSystem` also
 * pins it explicitly (`setSfxListener`).
 * Read by: `ambientBeds` / `footsteps` (the hero and its tile), and every
 * entry or consumer that calls `playSfx`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Tiles inside which a positioned sound plays at full volume. */
const FULL_VOLUME_TILES = 6;
/** Tiles beyond which a positioned sound is skipped entirely. */
const SILENT_TILES = 28;
/**
 * Per-key throttle: the same buffer is never restarted twice within this
 * window, so a pack of monsters flinching in one frame reads as one hit
 * instead of a chorus (DirectSound did the same through its channel count).
 */
const MIN_REPEAT_MS = 40;

// ---- 2. state + readers ----------------------------------------------------

let world: World | null = null;
let listenerX = 0;
let listenerZ = 0;
let hasListener = false;

const lastPlayed = new Map<Sounds, number>();

export type SfxPosition = { x: number; z: number };

/**
 * The ECS world the sound layer listens in. Attached once per client by
 * `ecs/systems/soundSystem.ts`; it outlives maps, so `reset` keeps it.
 */
export function attachListener(w: World): void {
  world = w;
}

/** The attached world, or null before the ECS is up. */
export function listenerWorld(): World | null {
  return world;
}

/** The hero entity, or null before login / after leaving the world. */
export function listenerHero(): World['playerEntity'] | null {
  return world?.playerEntity ?? null;
}

/** Terrain tile under the listener, -1 without a hero or terrain. */
export function listenerTile(): number {
  const hero = listenerHero();
  if (!hero || !world?.terrain) return -1;
  return world.getTerrainTile(~~hero.transform.pos.x, ~~hero.transform.pos.z);
}

/** Pin the listener to tile coordinates (the hero's position). */
export function setSfxListener(x: number, z: number): void {
  listenerX = x;
  listenerZ = z;
  hasListener = true;
}

/** Forget the listener: positioned sounds play at full volume again. */
export function clearSfxListener(): void {
  hasListener = false;
}

/**
 * Plays `key` once; `at` (tile coordinates) attenuates it by distance to the
 * hero. `gain` is the caller's share of the effects track (0…1) under that
 * attenuation — a bed's one-shot sits under the SFX, a hit sits on top.
 */
export function playSfx(
  key: Sounds,
  at?: SfxPosition | null,
  gain = 1
): void {
  let volume = gain;
  if (at && hasListener) {
    const dx = at.x - listenerX;
    const dz = at.z - listenerZ;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= SILENT_TILES) return;
    if (d > FULL_VOLUME_TILES) {
      volume *=
        1 - (d - FULL_VOLUME_TILES) / (SILENT_TILES - FULL_VOLUME_TILES);
    }
  }

  const now = performance.now();
  const last = lastPlayed.get(key);
  if (last !== undefined && now - last < MIN_REPEAT_MS) return;

  const sound = SoundsManager.loadAndPlaySoundEffect(key);
  if (!sound) return;

  lastPlayed.set(key, now);
  sound.setVolume(volume);
}

function update(_map: ENUM_WORLD, _dt: number): void {
  const hero = listenerHero();
  if (!hero) return;
  setSfxListener(hero.transform.pos.x, hero.transform.pos.z);
}

function reset(): void {
  hasListener = false;
  lastPlayed.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const listenerLayer: SoundLayer = { name: 'listener', update, reset };
