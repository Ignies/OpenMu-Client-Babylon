import type { ENUM_WORLD } from '../common/types';
import { lighting } from '../lighting';
import type { LightSource } from '../lighting/lightSource';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero } from './listener';

/**
 * The torch crackle: a looping fire sound under every flickering flame the
 * lighting layer has lit — the Lorencia street braziers, the 120 Dungeon
 * wall torches, Noria's and Lost Tower's — attenuated by its distance to the
 * hero, capped to the nearest few so a corridor of torches is one warm
 * chorus rather than a hundred copies of the same file.
 *
 * The original never did this: there is no `SOUND_FIRE` (only the skill's
 * `SOUND_FIRE_SCREAM`), `CreateFire` plays nothing, and a torch was silent.
 * The bed is the clone's own; it borrows the Flame skill's `sFlame` file
 * because it is the one continuous burning sound in the catalogue.
 *
 * Driven by: the lighting layer's live sources (`lighting.emitters(map)`,
 * read-only — a flame is any source whose recipe flickers) and the listener.
 * Read by: `sound.crackling` (the verification scripts).
 */

// ---- 1. tuning -------------------------------------------------------------

/** The looping fire file. */
const CRACKLE: Sounds = 'Sound/sFlame';

/**
 * Simultaneous crackle sources per map. Four covers a Dungeon corridor (a
 * torch every few tiles both sides) without turning it into a roar; beyond
 * the fourth-nearest the attenuation has already taken the rest below notice.
 */
const MAX_SOURCES = 4;

/** Share of the effects track a flame at the hero's feet sits at. */
const VOLUME = 0.3;

/** Tiles inside which a flame is at full crackle volume — a hand's reach. */
const FULL_VOLUME_TILES = 1.5;

/**
 * Tiles beyond which a flame is silent. A torch is a small source; the
 * generic `playSfx` 28-tile reach would have every torch in Lorencia's
 * market square audible from the pub.
 */
const SILENT_TILES = 12;

/**
 * Seconds between re-reading the lighting layer's source list. The list is
 * built fresh each call (an allocation), and torches do not move: the scan
 * only has to catch a map load or a candle being lit.
 */
const SCAN_SECONDS = 0.5;

/**
 * Playback-rate spread across the slots so four copies of one short file do
 * not phase-lock into a single louder loop. ±5 % keeps it a fire.
 */
const RATE_SPREAD = 0.05;

// ---- 2. state + readers ----------------------------------------------------

export type CrackleSource = {
  readonly x: number;
  readonly z: number;
  /** Share of the effects track after attenuation, 0…1. */
  readonly volume: number;
};

/** Every flickering source on the map, refreshed each `SCAN_SECONDS`. */
let flames: readonly LightSource[] = [];
let untilScan = 0;

/** The nearest flames, slot by slot; entries past `sounding` are stale. */
const slots: { x: number; z: number; volume: number }[] = Array.from(
  { length: MAX_SOURCES },
  () => ({ x: 0, z: 0, volume: 0 })
);
let sounding = 0;

/** Scratch: the chosen sources' squared distances, ascending. */
const slotDist2 = new Float64Array(MAX_SOURCES);

const sources: CrackleSource[] = [];

/** The flames crackling right now (nearest first) with their volumes. */
export function crackleSources(): readonly CrackleSource[] {
  sources.length = 0;
  for (let i = 0; i < sounding; i++) sources.push(slots[i]);
  return sources;
}

/** Attenuation by distance to the hero, 0…1. */
function gainAt(d: number): number {
  if (d >= SILENT_TILES) return 0;
  if (d <= FULL_VOLUME_TILES) return 1;
  return 1 - (d - FULL_VOLUME_TILES) / (SILENT_TILES - FULL_VOLUME_TILES);
}

function rescan(map: ENUM_WORLD): void {
  flames = lighting.emitters(map).filter(s => s.alive && s.recipe.flicker);
}

/** Insert (d2, source) into the k-nearest scratch, keeping it sorted. */
function offer(d2: number, source: LightSource): void {
  if (sounding === MAX_SOURCES && d2 >= slotDist2[MAX_SOURCES - 1]) return;

  let i = Math.min(sounding, MAX_SOURCES - 1);
  while (i > 0 && slotDist2[i - 1] > d2) {
    slotDist2[i] = slotDist2[i - 1];
    slots[i].x = slots[i - 1].x;
    slots[i].z = slots[i - 1].z;
    i--;
  }
  slotDist2[i] = d2;
  slots[i].x = source.position.x;
  slots[i].z = source.position.z;
  if (sounding < MAX_SOURCES) sounding++;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!SoundsManager.pageInteracted) return;

  const hero = listenerHero();
  if (!hero) return;

  untilScan -= dt;
  if (untilScan <= 0) {
    untilScan = SCAN_SECONDS;
    rescan(map);
  }

  const hx = hero.transform.pos.x;
  const hz = hero.transform.pos.z;
  const silent2 = SILENT_TILES * SILENT_TILES;

  sounding = 0;
  for (const flame of flames) {
    if (!flame.alive) continue;
    const dx = flame.position.x - hx;
    const dz = flame.position.z - hz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= silent2) continue;
    offer(d2, flame);
  }

  for (let i = 0; i < MAX_SOURCES; i++) {
    if (i < sounding) {
      const slot = slots[i];
      slot.volume = VOLUME * gainAt(Math.sqrt(slotDist2[i]));

      const s = SoundsManager.loopInstance(CRACKLE, i);
      if (!s) continue;
      s.setVolume(slot.volume);
      if (!s.isPlaying) {
        s.setPlaybackRate(1 + (i / (MAX_SOURCES - 1) - 0.5) * 2 * RATE_SPREAD);
        s.play();
      }
    } else {
      slots[i].volume = 0;
      SoundsManager.stopLoopInstance(CRACKLE, i);
    }
  }
}

/** Leaving a map: the flames are gone, so is their sound. */
function reset(): void {
  for (let i = 0; i < MAX_SOURCES; i++) SoundsManager.stopLoopInstance(CRACKLE, i);
  flames = [];
  sounding = 0;
  untilScan = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const crackleLayer: SoundLayer = { name: 'crackle', update, reset };
