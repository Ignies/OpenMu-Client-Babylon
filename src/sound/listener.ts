import type { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import { busGain, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';

/**
 * The listener: where the hero's ears are, and the one-shot `playSfx` every
 * positioned effect goes through (the original's `PlayBuffer(sound, object)`
 * - DirectSound's 3D listener sits on the hero, so a sound played "at" an
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
export const SILENT_TILES = 28;

/**
 * The attenuation curve every positioned sound shares: 1 up to
 * `FULL_VOLUME_TILES`, a straight line down to 0 at `SILENT_TILES`.
 */
export function distanceGain(d: number): number {
  if (d >= SILENT_TILES) return 0;
  if (d <= FULL_VOLUME_TILES) return 1;
  return 1 - (d - FULL_VOLUME_TILES) / (SILENT_TILES - FULL_VOLUME_TILES);
}
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

export type SfxOptions = {
  /**
   * The caller's own share of the effects track (0…1), before the bus - a
   * bed's one-shot sits under the SFX, a hit sits on top.
   */
  gain?: number;
  /** Which mixer category this sound belongs to (`buses.ts`). */
  bus?: SoundBus;
  /**
   * The original's per-wave channel count (`LoadWaveFile(..., Channel)`): a
   * play is dropped while that many copies of the key are still sounding.
   * Unset means no cap.
   */
  channels?: number;
};

/** Until a wave is decoded its length is unknown; hold a channel this long. */
const UNDECODED_HOLD_MS = 1000;

/** Per capped key, the time each of its channels frees up. */
const channelEnds = new Map<Sounds, number[]>();

function freeChannel(key: Sounds, channels: number, now: number): number {
  let ends = channelEnds.get(key);
  if (!ends || ends.length !== channels) {
    ends = new Array<number>(channels).fill(0);
    channelEnds.set(key, ends);
  }
  for (let i = 0; i < channels; i++) if (ends[i] <= now) return i;
  return -1;
}

/**
 * Plays `key` once; `at` (tile coordinates) attenuates it by distance to the
 * hero, and the bus slider scales what is left. A sound that names no bus is
 * `world`: it rides the effects slider and nothing else.
 *
 * Returns how many ms the started sound lasts (an estimate until its wave is
 * decoded), or 0 when nothing started.
 */
export function playSfx(
  key: Sounds,
  at?: SfxPosition | null,
  opts?: SfxOptions
): number {
  const bus = opts?.bus ?? 'world';
  const category = busGain(bus);
  if (category <= 0) return 0;

  let volume = (opts?.gain ?? 1) * category;
  if (at && hasListener) {
    const dx = at.x - listenerX;
    const dz = at.z - listenerZ;
    const g = distanceGain(Math.sqrt(dx * dx + dz * dz));
    if (g <= 0) return 0;
    volume *= g;
  }

  const now = performance.now();
  const last = lastPlayed.get(key);
  if (last !== undefined && now - last < MIN_REPEAT_MS) return 0;

  const channels = opts?.channels;
  const channel = channels ? freeChannel(key, channels, now) : -1;
  if (channels && channel < 0) return 0;

  const sound = SoundsManager.loadAndPlaySoundEffect(key);
  if (!sound) return 0;

  lastPlayed.set(key, now);
  sound.setVolume(volume);

  // Optional call: the verification probes stand a stub in for the Sound.
  const seconds = sound.getAudioBuffer?.()?.duration;
  const ms = seconds ? seconds * 1000 : UNDECODED_HOLD_MS;
  if (channel >= 0) channelEnds.get(key)![channel] = now + ms;
  return ms;
}

function update(_map: ENUM_WORLD, _dt: number): void {
  const hero = listenerHero();
  if (!hero) return;
  setSfxListener(hero.transform.pos.x, hero.transform.pos.z);
}

function reset(): void {
  hasListener = false;
  lastPlayed.clear();
  channelEnds.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const listenerLayer: SoundLayer = { name: 'listener', update, reset };
