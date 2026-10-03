import type { ENUM_WORLD } from '../../core/types';
import { GameOptions } from '../../features/options/gameOptions';
import { SoundsManager } from './soundsManager';
import { busGain, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import {
  listenerHero,
  listenerWorld,
  playSfx,
  type SfxPosition,
} from './listener';
import { bloodCastleTimer } from '../../features/events/bloodCastle';
import { chaosCastleTimer } from '../../features/events/chaosCastle';
import { maps, type MapLayer } from '../maps';

/**
 * The environmental bed under each map: `PlayWorldAmbientSounds` /
 * `StopInactiveAmbientSounds` (Scenes/SceneManager.cpp:564-700). The rows are
 * each map's own (`MapSound.beds` / `oneShots` / `timed` in
 * `versions/shared/maps/<map>/sound.ts`); this file is the engine. Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** The beds and their wildlife are ambience (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'ambient';

/** Reference frame rate the original's `rand_fps_check` counts against. */
const REFERENCE_FPS = 25;

/**
 * A condition a map row names instead of carrying code: the event timers and
 * the option a bed or a one-shot waits on. Answered by `GATES` below.
 */
export type AmbientGate =
  | 'bloodCastleRunning'
  | 'chaosCastleWaiting'
  | 'chaosCastleRunning'
  | 'ambientParticles';

const GATES: Readonly<Record<AmbientGate, () => boolean>> = {
  bloodCastleRunning: () => bloodCastleTimer().running,
  chaosCastleWaiting: () => !chaosCastleTimer().running,
  chaosCastleRunning: () => chaosCastleTimer().running,
  ambientParticles: () => GameOptions.ambientParticles,
};

/** A bed as a map writes it (`MapSound.beds`). */
export type MapAmbientBed = {
  readonly sound: Sounds;
  /** Share of the effects volume. Beds sit under the SFX, never on top. */
  readonly volume: number;
  /**
   * Silences the bed for the tile the hero is standing on. The original uses
   * this to cut the wind the moment the hero walks indoors - the tile under
   * their feet is the only "am I inside" test it has, and the two maps that
   * use it test open-ended ranges, so this is a predicate rather than a list.
   */
  readonly mutedOn?: (heroTile: number) => boolean;
  /** Extra condition, e.g. Blood Castle's loop only while the match runs. */
  readonly when?: AmbientGate;
};

/** A bed as this engine plays it: the row with its gate answered. */
export type AmbientBed = Omit<MapAmbientBed, 'when'> & {
  readonly when?: () => boolean;
};

/** A one-shot the map fires on a clock rather than on a roll. */
export type AmbientTimed = {
  readonly sound: Sounds;
  /** Share of the effects track, like a bed's. */
  readonly volume: number;
  /** Seconds between plays; the first one fires as soon as the map runs. */
  readonly every: number;
};

/** A `rand_fps_check(oneIn)` one-shot layered over the bed (`MapSound.oneShots`). */
export type MapAmbientOneShot = {
  readonly sound: Sounds;
  readonly oneIn: number;
  /** Share of the effects track before distance attenuation. */
  readonly volume: number;
  /**
   * Tiles around the hero the sound is placed within, for the wildlife the
   * original voiced from a boid's position. Omit for an unpositioned call
   * (`PlayBuffer(SOUND_FOREST01)` with no object) - full volume, no place.
   */
  readonly spread?: number;
  /** The wave's channel count when it is not the usual one. */
  readonly channels?: number;
  /** Extra condition, like a bed's. */
  readonly when?: AmbientGate;
};

/** A one-shot as this engine plays it. */
export type AmbientOneShot = Omit<MapAmbientOneShot, 'when'> & {
  readonly when?: () => boolean;
};

/** Nearest a stand-in call is placed: the flock is never in the hero's ear. */
const BOID_MIN_TILES = 2;

/**
 * The one-shots' waves are loaded on one channel unless a row says otherwise
 * (ZzzOpenData.cpp:4746, 4759; MapManager.cpp:295, 992-993): a play while it
 * still sounds is dropped.
 */
const ONE_CHANNEL = 1;

const NONE: readonly never[] = [];

// ---- 2. state + readers ----------------------------------------------------

const bedsOf = (l: MapLayer) => l.sound?.beds;
const oneShotsOf = (l: MapLayer) => l.sound?.oneShots;
const timedOf = (l: MapLayer) => l.sound?.timed;

/** Rows with their gates answered, once per row list. */
const resolved = new WeakMap<object, readonly (AmbientBed | AmbientOneShot)[]>();

function answer<R extends { readonly when?: AmbientGate }>(
  rows: readonly R[] | undefined
): readonly (Omit<R, 'when'> & { readonly when?: () => boolean })[] {
  if (!rows) return NONE;
  let out = resolved.get(rows);
  if (!out) {
    out = rows.map(r => (r.when ? { ...r, when: GATES[r.when] } : r)) as never;
    resolved.set(rows, out);
  }
  return out as never;
}

/** The beds a world runs, empty for none. */
export function ambientBedsFor(map: ENUM_WORLD): readonly AmbientBed[] {
  return answer(maps.rowFor(map, bedsOf));
}

/** The rolled one-shots a world runs, empty for none. */
export function ambientOneShotsFor(map: ENUM_WORLD): readonly AmbientOneShot[] {
  return answer(maps.rowFor(map, oneShotsOf));
}

/** The clocked one-shots a world runs, empty for none. */
export function ambientTimedFor(map: ENUM_WORLD): readonly AmbientTimed[] {
  return maps.rowFor(map, timedOf) ?? NONE;
}

/** Maps with anything to play: `layer.maps`, read off the map rows. */
const MAPS: ReadonlySet<ENUM_WORLD> = maps.worldSet(
  (layer, world) =>
    maps.rowFor(world, bedsOf) !== undefined ||
    maps.rowFor(world, oneShotsOf) !== undefined ||
    maps.rowFor(world, timedOf) !== undefined
);

/** Every timed one-shot any map has: a map's own ambience, cut when it is left. */
function allTimed(): Sounds[] {
  const out: Sounds[] = [];
  for (const layer of maps.all) {
    for (const world of layer.worlds) {
      for (const shot of ambientTimedFor(world)) out.push(shot.sound);
    }
  }
  return out;
}

const playing = new Set<Sounds>();
/** Scratch: this frame's beds. Module-level so the update allocates nothing. */
const wanted = new Set<Sounds>();
/** `performance.now()` of each timed one-shot's last play; kept across maps. */
const timedAt = new Map<Sounds, number>();

function update(map: ENUM_WORLD, dt: number): void {
  const world = listenerWorld();
  if (!SoundsManager.pageInteracted || !world?.terrain) return;

  const hero = listenerHero();
  if (!hero) return;

  // The ambience slider at 0 leaves `wanted` empty, so the pass below stops
  // every bed rather than looping them at silence.
  const gain = busGain(BUS);
  const beds = gain > 0 ? ambientBedsFor(map) : NONE;

  const heroTile = world.getTerrainTile(
    ~~hero.transform.pos.x,
    ~~hero.transform.pos.z
  );

  // The beds live on the effects track, so the master volume is already
  // applied to them; `bed.volume` is only the mix under the SFX, and `gain`
  // the ambience category. (`playAmbientLoop` only touches the gain when it
  // changed.)
  wanted.clear();

  for (const bed of beds) {
    if (bed.mutedOn?.(heroTile)) continue;
    if (bed.when && !bed.when()) continue;

    wanted.add(bed.sound);
    SoundsManager.playAmbientLoop(bed.sound, bed.volume * gain);
  }

  // Everything playing that this map does not want right now - including a
  // bed this map owns but has just muted - goes quiet.
  for (const sound of playing) {
    if (wanted.has(sound)) continue;

    SoundsManager.stopAmbientLoop(sound);
  }

  playing.clear();
  for (const sound of wanted) playing.add(sound);

  for (const shot of gain > 0 ? ambientOneShotsFor(map) : NONE) {
    if (shot.when && !shot.when()) continue;

    // rand_fps_check(n) is a 1-in-n roll per reference frame; at any other
    // frame rate the same expected rate is dt * REFERENCE_FPS / n.
    if (Math.random() >= (dt * REFERENCE_FPS) / shot.oneIn) continue;

    // Through `playSfx`, the streaming path: the buffer is fetched on first
    // use, so a one-shot sounds the first time it is rolled rather than only
    // after an eager preload nobody runs.
    playSfx(shot.sound, shot.spread ? boidPosition(hero, shot.spread) : null, {
      gain: shot.volume,
      bus: BUS,
      channels: shot.channels ?? ONE_CHANNEL,
    });
  }

  const timed = gain > 0 ? ambientTimedFor(map) : NONE;
  if (timed.length === 0) return;

  const now = performance.now();
  for (const shot of timed) {
    const last = timedAt.get(shot.sound);
    if (last !== undefined && now - last < shot.every * 1000) continue;

    const ms = playSfx(shot.sound, null, {
      gain: shot.volume,
      bus: BUS,
      channels: ONE_CHANNEL,
    });
    if (ms > 0) timedAt.set(shot.sound, now);
  }
}

/** Somewhere a boid would be: `BOID_MIN_TILES`…`spread` tiles from the hero. */
function boidPosition(
  hero: NonNullable<ReturnType<typeof listenerHero>>,
  spread: number
): SfxPosition {
  const angle = Math.random() * Math.PI * 2;
  const r = BOID_MIN_TILES + Math.random() * (spread - BOID_MIN_TILES);
  return {
    x: hero.transform.pos.x + Math.cos(angle) * r,
    z: hero.transform.pos.z + Math.sin(angle) * r,
  };
}

/** Leaving a map: its beds stop now rather than a frame into the next one. */
function reset(): void {
  for (const sound of playing) SoundsManager.stopAmbientLoop(sound);
  playing.clear();
  // A timed one-shot is as long as a bed; it does not follow the hero out.
  // Unguarded: one still decoding has only `autoplay` set, and would start
  // on the next map once the buffer lands.
  for (const sound of allTimed()) SoundsManager.stopSoundEffect(sound);
}

// ---- 3. the layer ----------------------------------------------------------

export const ambientBedsLayer: SoundLayer = {
  name: 'ambientBeds',
  maps: MAPS,
  update,
  reset,
};
