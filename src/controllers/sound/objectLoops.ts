import type { ENUM_WORLD } from '../../core/types';
import { TW_SAFEZONE } from '../terrain/consts';
import { SoundsManager } from './soundsManager';
import { busGain, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';
import { maps, type MapLayer } from '../maps';

/**
 * Map-object loops: a world's per-object hook re-issuing `PlayBuffer(SOUND_x, o)` each frame (DSPlaySound.cpp:303;
 * `GMNewTown::PlayObjectSound`, `Sound_Kanturu2nd_Object`, `M39Kanturu3rd`, `CGMKarutan1::PlayObjectSound`,
 * `CGM3rdChangeUp::PlayEffectSound`). The rows are each map's own (`MapSound.objectLoops` in
 * `versions/shared/maps/<map>/sound.ts`); this file is the engine. Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Brooks, gears and gates are part of the place, so ambience (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'ambient';

/**
 * A registered object sound as a map writes it: every placed instance of
 * `types` on the map is a source of `sound`.
 */
export type MapObjectLoop = {
  /** Object types (`modelId`, the world's `Object<N>` index) that carry it. */
  readonly types: readonly number[];
  readonly sound: Sounds;
  /** Share of the effects track at the source, 0…1 - under the beds' SFX. */
  readonly gain: number;
  /**
   * How far it carries: a `small` source (a brook, a gear), a `large` one (a
   * waterfall, the great wheel, the volcano), or its own reach in tiles.
   */
  readonly reach: 'small' | 'large' | { readonly full: number; readonly silent: number };
  /**
   * The original's `LoadWaveFile` channel count: its `PlayBuffer` does nothing
   * while that many copies play, so at most this many sources sound. Omit = 1.
   */
  readonly channels?: number;
  /**
   * Extra gate evaluated each frame with the hero's state. Omit = always. The
   * Elbeland rows are muted while the hero stands on a `TW_SAFEZONE` tile
   * (`!bSafeZone`); the Barracks fire pillar breathes with the same sine that
   * drives its flame.
   */
  readonly when?: (hero: HeroContext) => boolean;
};

/** A row as this engine plays it: the reach in tiles. */
export type ObjectLoop = Omit<MapObjectLoop, 'reach'> & {
  /** Tiles inside which the loop is at full `gain`. */
  readonly full: number;
  /** Tiles beyond which the source is silent and does not take a slot. */
  readonly silent: number;
};

export type HeroContext = {
  /** Whether the tile under the hero carries `TW_SAFEZONE`. */
  inSafeZone: boolean;
  /** Milliseconds since boot, the original's `WorldTime`. */
  time: number;
};

/**
 * Reach of a small source (a brook, a gear): full inside a hand's reach,
 * gone at 14 tiles - DirectSound's 3D rolloff on a sample that was set up to
 * be heard from across a courtyard, not across the map.
 */
const SMALL = { full: 2, silent: 14 } as const;
/**
 * Reach of a large source (a waterfall, the great wheel, the volcano): the
 * original plays these unpositioned on Kanturu (`PlayBuffer(sound)` with no
 * object, GM_kanturu_1st.cpp:67-115) so they carry over the whole ruin; here
 * the nearest one fades over 30 tiles.
 */
const LARGE = { full: 6, silent: 30 } as const;

const NONE: readonly ObjectLoop[] = [];

const loopsOf = (l: MapLayer) => l.sound?.objectLoops;

/** Rows with their reach in tiles, once per row list. */
const resolved = new WeakMap<readonly MapObjectLoop[], readonly ObjectLoop[]>();

/** The object loops a world runs, empty for none. */
export function objectLoopsFor(map: ENUM_WORLD): readonly ObjectLoop[] {
  const rows = maps.rowFor(map, loopsOf);
  if (!rows) return NONE;
  let out = resolved.get(rows);
  if (!out) {
    out = rows.map(({ reach, ...row }) => ({
      ...row,
      ...(reach === 'small' ? SMALL : reach === 'large' ? LARGE : reach),
    }));
    resolved.set(rows, out);
  }
  return out;
}

/** Which object types sound on which map: a live view over the map rows. */
export const OBJECT_LOOPS: ReadonlyMap<ENUM_WORLD, readonly ObjectLoop[]> =
  maps.worldMap(w => (maps.rowFor(w, loopsOf) ? objectLoopsFor(w) : undefined));

/** Maps this exists on: the ones with rows. */
const MAPS: ReadonlySet<ENUM_WORLD> = maps.worldSet(
  (_layer, world) => maps.rowFor(world, loopsOf) !== undefined
);

/** Simultaneous object loops; past the sixth-nearest the rest are faint. */
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

/** The nearest sources, slot by slot. */
const slots: {
  x: number;
  z: number;
  volume: number;
  row: ObjectLoop | null;
  /** Copy of `row.sound` this slot plays, 0 = that sound's nearest source. */
  ch: number;
}[] = Array.from({ length: MAX_SOURCES }, () => ({
  x: 0,
  z: 0,
  volume: 0,
  row: null,
  ch: 0,
}));
let sounding = 0;

/** Scratch: the chosen sources' squared distances, ascending. */
const slotDist2 = new Float64Array(MAX_SOURCES);

/** The (sound, copy) mixer instances started last frame. */
const liveSound: (Sounds | null)[] = new Array(MAX_SOURCES).fill(null);
const liveCh = new Uint8Array(MAX_SOURCES);
let liveCount = 0;

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
  const rows = objectLoopsFor(map);
  const world = listenerWorld();
  if (rows.length === 0 || !world) return;

  const byType = new Map<number, ObjectLoop>();
  for (const row of rows) for (const t of row.types) byType.set(t, row);

  for (const e of world.with('transform', 'modelId', 'worldIndex')) {
    if (e.worldIndex !== map) continue;
    const row = byType.get(e.modelId);
    if (!row) continue;
    candidates.push({ x: e.transform.pos.x, z: e.transform.pos.z, row });
  }
}

/** Remove slot `j` from the k-nearest scratch, closing the gap. */
function dropSlot(j: number): void {
  for (let i = j + 1; i < sounding; i++) {
    slotDist2[i - 1] = slotDist2[i];
    slots[i - 1].x = slots[i].x;
    slots[i - 1].z = slots[i].z;
    slots[i - 1].row = slots[i].row;
  }
  sounding--;
}

/**
 * Insert (d2, candidate) into the k-nearest scratch, keeping it sorted and
 * holding each sound to its row's `channels` nearest sources.
 */
function offer(d2: number, c: Candidate): void {
  const sound = c.row.sound;
  let held = 0;
  let farthest = -1;
  for (let i = 0; i < sounding; i++) {
    if (slots[i].row?.sound !== sound) continue;
    held++;
    farthest = i;
  }
  if (held >= (c.row.channels ?? 1)) {
    if (d2 >= slotDist2[farthest]) return;
    dropSlot(farthest);
  } else if (sounding === MAX_SOURCES && d2 >= slotDist2[MAX_SOURCES - 1]) {
    return;
  }

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

/** Whether this frame's slots still play copy `ch` of `sound`. */
function chosen(sound: Sounds, ch: number): boolean {
  for (let i = 0; i < sounding; i++) {
    if (slots[i].row?.sound === sound && slots[i].ch === ch) return true;
  }
  return false;
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

  // The ambience slider at 0 leaves nothing sounding, so the pass below
  // stops every slot rather than looping them at silence.
  const gain = busGain(BUS);

  sounding = 0;
  for (let k = 0; gain > 0 && k < candidates.length; k++) {
    const c = candidates[k];
    const dx = c.x - hx;
    const dz = c.z - hz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= c.row.silent * c.row.silent) continue;
    if (c.row.when && !c.row.when(ctx)) continue;
    offer(d2, c);
  }

  // Copies are numbered per sound, nearest first, and the mixer keys its
  // instances by (sound, copy): a reorder moves a volume, never restarts.
  for (let i = 0; i < sounding; i++) {
    let ch = 0;
    for (let j = 0; j < i; j++) {
      if (slots[j].row?.sound === slots[i].row?.sound) ch++;
    }
    slots[i].ch = ch;
  }

  for (let k = 0; k < liveCount; k++) {
    const sound = liveSound[k];
    if (sound && !chosen(sound, liveCh[k])) {
      SoundsManager.stopLoopInstance(sound, liveCh[k]);
    }
  }

  liveCount = 0;
  for (let i = 0; i < sounding; i++) {
    const slot = slots[i];
    const row = slot.row;
    if (!row) continue;
    slot.volume = row.gain * gain * gainAt(row, Math.sqrt(slotDist2[i]));

    const s = SoundsManager.loopInstance(row.sound, slot.ch);
    if (!s) continue;
    s.setVolume(slot.volume);
    if (!s.isPlaying) s.play();
    liveSound[liveCount] = row.sound;
    liveCh[liveCount++] = slot.ch;
  }
}

/** Leaving a map: its objects are gone, so are their loops. */
function reset(): void {
  for (let k = 0; k < liveCount; k++) {
    const sound = liveSound[k];
    if (sound) SoundsManager.stopLoopInstance(sound, liveCh[k]);
    liveSound[k] = null;
  }
  liveCount = 0;
  for (let i = 0; i < MAX_SOURCES; i++) {
    slots[i].row = null;
    slots[i].volume = 0;
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
