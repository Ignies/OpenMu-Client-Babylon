import { ENUM_WORLD } from '../common/types';
import { TW_SAFEZONE } from '../common/terrain/consts';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';

/**
 * The object loops: the sounds the original attaches to map objects from a
 * world's per-object sound hook — `PlayBuffer(SOUND_x, o)` re-issued every
 * frame for as long as the object is in the update set (DSPlaySound.cpp:303,
 * a `Play` on an already-playing channel is a no-op, so a long sample reads
 * as a loop). Elbeland's brooks and gates (`GMNewTown::PlayObjectSound`),
 * Kanturu's wheel / waterfall / arc / plant, gear and incubators, the Tower's
 * crystals and field (`Sound_Kanturu2nd_Object`, `M39Kanturu3rd`), Karutan's
 * insects (`CGMKarutan1::PlayObjectSound`), the Barracks' cages, volcano and
 * fire pillar (`CGM3rdChangeUp::PlayEffectSound`).
 *
 * Every instance of a registered type is a candidate; each frame the nearest
 * `MAX_SOURCES` within their row's reach get a slot — an independent looping
 * mixer instance (`SoundsManager.loopInstance`) at the row's gain under the
 * listener's attenuation curve. The older worlds (Lorencia … Icarus) have no
 * such hook in `ZzzObject.cpp`: their only object sounds are the door and
 * gate one-shots, which live with the door system.
 *
 * Driven by: the ECS map-object entities (`modelId` + `worldIndex` +
 * `transform`, read-only, rescanned every `SCAN_SECONDS`), the listener hero
 * and its tile's `TW_SAFEZONE` flag.
 * Read by: `sound.objectLoops` (the verification scripts).
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * A registered object sound: every placed instance of `types` on the map is a
 * source of `sound`.
 */
export type ObjectLoop = {
  /** Object types (`modelId`, the world's `Object<N>` index) that carry it. */
  readonly types: readonly number[];
  readonly sound: Sounds;
  /** Share of the effects track at the source, 0…1 — under the beds' SFX. */
  readonly gain: number;
  /** Tiles inside which the loop is at full `gain`. */
  readonly full: number;
  /** Tiles beyond which the source is silent and does not take a slot. */
  readonly silent: number;
  /**
   * Extra gate evaluated each frame with the hero's state. Omit = always. The
   * Elbeland rows are muted while the hero stands on a `TW_SAFEZONE` tile
   * (`!bSafeZone`); the Barracks fire pillar breathes with the same sine that
   * drives its flame.
   */
  readonly when?: (hero: HeroContext) => boolean;
};

export type HeroContext = {
  /** Whether the tile under the hero carries `TW_SAFEZONE`. */
  inSafeZone: boolean;
  /** Milliseconds since boot, the original's `WorldTime`. */
  time: number;
};

const outsideSafeZone = (h: HeroContext): boolean => !h.inSafeZone;

/**
 * GM3rdChangeUp.cpp:364-367: the pillar sounds only while its flame sine
 * (`(sin(WorldTime * 0.0005) + 1) / 2`) is above 0.9 — a burst every ~12.6 s.
 */
const firePillarBurning = (h: HeroContext): boolean =>
  (Math.sin(h.time * 0.0005) + 1) * 0.5 > 0.9;

/**
 * Reach of a small source (a brook, a gear): full inside a hand's reach,
 * gone at 14 tiles — DirectSound's 3D rolloff on a sample that was set up to
 * be heard from across a courtyard, not across the map.
 */
const SMALL_FULL = 2;
const SMALL_SILENT = 14;
/**
 * Reach of a large source (a waterfall, the great wheel, the volcano): the
 * original plays these unpositioned on Kanturu (`PlayBuffer(sound)` with no
 * object, GM_kanturu_1st.cpp:67-115) so they carry over the whole ruin; here
 * they fade over 30 tiles so two waterfalls do not stack to a roar.
 */
const LARGE_FULL = 6;
const LARGE_SILENT = 30;

const small = (
  types: readonly number[],
  sound: Sounds,
  gain: number,
  when?: ObjectLoop['when']
): ObjectLoop => ({
  types,
  sound,
  gain,
  full: SMALL_FULL,
  silent: SMALL_SILENT,
  when,
});
const large = (
  types: readonly number[],
  sound: Sounds,
  gain: number,
  when?: ObjectLoop['when']
): ObjectLoop => ({
  types,
  sound,
  gain,
  full: LARGE_FULL,
  silent: LARGE_SILENT,
  when,
});

/**
 * THE table: which object types sound on which map. Pure data — the source
 * lines are the original's per-world sound hook.
 */
export const OBJECT_LOOPS: ReadonlyMap<ENUM_WORLD, readonly ObjectLoop[]> =
  new Map<ENUM_WORLD, readonly ObjectLoop[]>([
    // GMNewTown.cpp:193-232 (`PlayObjectSound`).
    [
      ENUM_WORLD.WD_51ELBELAND,
      [
        small([2], 'Sound/w52/SE_Obj_watersmall01', 0.35, outsideSafeZone),
        large([53], 'Sound/w52/SE_Amb_ravine01', 0.35, outsideSafeZone),
        large([56], 'Sound/w52/SE_Amb_enteratlance01', 0.35),
        large([59], 'Sound/w52/SE_Obj_waterfallsmall01', 0.4, outsideSafeZone),
        large([85], 'Sound/w52/SE_Obj_enterdevias01', 0.35),
        small([89], 'Sound/w52/SE_Obj_waterway01', 0.35, outsideSafeZone),
        large([110], 'Sound/w52/SE_Obj_villageprotection01', 0.35),
      ],
    ],
    // GM_kanturu_1st.cpp:60-115 (`MoveKanturu1stObject`).
    [
      ENUM_WORLD.WD_37KANTURU_1ST,
      [
        large([46], 'Sound/w37/kan_ruin_wheel', 0.35),
        large([77], 'Sound/w37/kan_ruin_waterfall', 0.4),
        small([92], 'Sound/w37/kan_ruin_elec', 0.35),
        small([98], 'Sound/w37/kan_ruin_plant', 0.3),
      ],
    ],
    // GM_Kanturu_2nd.cpp:194-210 (`Sound_Kanturu2nd_Object`).
    [
      ENUM_WORLD.WD_38KANTURU_2ND,
      [
        small([9], 'Sound/w38/kan_relic_gear', 0.35),
        small([31, 35, 36, 37], 'Sound/w38/kan_relic_incubator', 0.3),
      ],
    ],
    // GM_Kanturu_3rd.cpp:120-195 (`Sound_Kanturu3rd_Object`, idle map).
    [
      ENUM_WORLD.WD_39KANTURU_3RD,
      [
        small([25], 'Sound/w39/kan_boss_incubator', 0.3),
        small([40, 41, 42], 'Sound/w39/kan_boss_crystal', 0.3),
        small([71], 'Sound/w39/kan_boss_gear', 0.35),
        large([73], 'Sound/w39/kan_boss_field', 0.35),
      ],
    ],
    // GMKarutan1.cpp:349-357 (`PlayObjectSound`).
    [
      ENUM_WORLD.WD_80KARUTAN1,
      [small([58, 66], 'Sound/Karutan/Karutan_insect_env', 0.3)],
    ],
    // GM3rdChangeUp.cpp:352-371 (`PlayEffectSound`); cage01/02 are the
    // original's coin flip per call — one file per cage type here so the
    // two never fight for one channel.
    [
      ENUM_WORLD.WD_41CHANGEUP3RD_1ST,
      [
        small([74], 'Sound/w42/cage01', 0.3),
        small([75], 'Sound/w42/cage02', 0.3),
        large([79], 'Sound/w42/volcano', 0.4),
        small([92], 'Sound/w42/firepillar', 0.35, firePillarBurning),
      ],
    ],
  ]);

/** Maps this exists on: the keys of the table. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set(OBJECT_LOOPS.keys());

/**
 * Simultaneous object loops. Six covers Elbeland's brook-lined square (three
 * brooks, the waterway, a gate) with a slot to spare; past the sixth-nearest
 * the attenuation has the rest below notice.
 */
const MAX_SOURCES = 6;

/**
 * Seconds between re-reading the ECS for instances. Map objects do not move;
 * the scan only has to catch a map load.
 */
const SCAN_SECONDS = 0.5;

// ---- 2. state + readers ----------------------------------------------------

export type ObjectLoopSource = {
  readonly x: number;
  readonly z: number;
  readonly sound: Sounds;
  /** Share of the effects track after attenuation, 0…1. */
  readonly volume: number;
};

type Candidate = { x: number; z: number; row: ObjectLoop };

/** Every registered instance on the map, refreshed each `SCAN_SECONDS`. */
let candidates: Candidate[] = [];
let scannedMap: ENUM_WORLD | null = null;
let untilScan = 0;

/** The nearest sources, slot by slot; `sound` is what the slot is playing. */
const slots: {
  x: number;
  z: number;
  volume: number;
  row: ObjectLoop | null;
  /** The key the mixer instance in this slot was started with. */
  playing: Sounds | null;
}[] = Array.from({ length: MAX_SOURCES }, () => ({
  x: 0,
  z: 0,
  volume: 0,
  row: null,
  playing: null,
}));
let sounding = 0;

/** Scratch: the chosen sources' squared distances, ascending. */
const slotDist2 = new Float64Array(MAX_SOURCES);

const sources: ObjectLoopSource[] = [];

/** This frame's hero state for the `when` gates; one object, rewritten each frame. */
const ctx: HeroContext = { inSafeZone: false, time: 0 };

/** The object loops sounding right now (nearest first) with their volumes. */
export function objectLoopSources(): readonly ObjectLoopSource[] {
  sources.length = 0;
  for (let i = 0; i < sounding; i++) {
    const s = slots[i];
    if (!s.row) continue;
    sources.push({ x: s.x, z: s.z, sound: s.row.sound, volume: s.volume });
  }
  return sources;
}

/** Attenuation by distance to the hero for a row, 0…1. */
function gainAt(row: ObjectLoop, d: number): number {
  if (d >= row.silent) return 0;
  if (d <= row.full) return 1;
  return 1 - (d - row.full) / (row.silent - row.full);
}

function rescan(map: ENUM_WORLD): void {
  candidates = [];
  scannedMap = map;
  const rows = OBJECT_LOOPS.get(map);
  const world = listenerWorld();
  if (!rows || !world) return;

  const byType = new Map<number, ObjectLoop>();
  for (const row of rows) for (const t of row.types) byType.set(t, row);

  for (const e of world.with('transform', 'modelId', 'worldIndex')) {
    if (e.worldIndex !== map) continue;
    const row = byType.get(e.modelId);
    if (!row) continue;
    candidates.push({ x: e.transform.pos.x, z: e.transform.pos.z, row });
  }
}

/** Insert (d2, candidate) into the k-nearest scratch, keeping it sorted. */
function offer(d2: number, c: Candidate): void {
  if (sounding === MAX_SOURCES && d2 >= slotDist2[MAX_SOURCES - 1]) return;

  let i = Math.min(sounding, MAX_SOURCES - 1);
  while (i > 0 && slotDist2[i - 1] > d2) {
    slotDist2[i] = slotDist2[i - 1];
    slots[i].x = slots[i - 1].x;
    slots[i].z = slots[i - 1].z;
    slots[i].row = slots[i - 1].row;
    i--;
  }
  slotDist2[i] = d2;
  slots[i].x = c.x;
  slots[i].z = c.z;
  slots[i].row = c.row;
  if (sounding < MAX_SOURCES) sounding++;
}

function stopSlot(i: number): void {
  const slot = slots[i];
  if (slot.playing) SoundsManager.stopLoopInstance(slot.playing, i);
  slot.playing = null;
  slot.volume = 0;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!SoundsManager.pageInteracted) return;

  const hero = listenerHero();
  const world = listenerWorld();
  if (!hero || !world) return;

  untilScan -= dt;
  if (untilScan <= 0 || scannedMap !== map) {
    untilScan = SCAN_SECONDS;
    rescan(map);
  }

  const hx = hero.transform.pos.x;
  const hz = hero.transform.pos.z;
  ctx.inSafeZone = (world.getTerrainFlag(~~hx, ~~hz) & TW_SAFEZONE) !== 0;
  ctx.time = performance.now();

  sounding = 0;
  for (const c of candidates) {
    const dx = c.x - hx;
    const dz = c.z - hz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= c.row.silent * c.row.silent) continue;
    if (c.row.when && !c.row.when(ctx)) continue;
    offer(d2, c);
  }

  for (let i = 0; i < MAX_SOURCES; i++) {
    const slot = slots[i];
    const row = i < sounding ? slot.row : null;
    if (!row) {
      stopSlot(i);
      continue;
    }

    // A slot that changes file stops the old instance first: the mixer keys
    // instances by (file, slot), so the two would otherwise both sound.
    if (slot.playing && slot.playing !== row.sound) stopSlot(i);

    slot.volume = row.gain * gainAt(row, Math.sqrt(slotDist2[i]));

    const s = SoundsManager.loopInstance(row.sound, i);
    if (!s) continue;
    s.setVolume(slot.volume);
    if (!s.isPlaying) s.play();
    slot.playing = row.sound;
  }
}

/** Leaving a map: its objects are gone, so are their loops. */
function reset(): void {
  for (let i = 0; i < MAX_SOURCES; i++) {
    stopSlot(i);
    slots[i].row = null;
  }
  candidates = [];
  scannedMap = null;
  sounding = 0;
  untilScan = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const objectLoopsLayer: SoundLayer = {
  name: 'objectLoops',
  maps: MAPS,
  update,
  reset,
};
