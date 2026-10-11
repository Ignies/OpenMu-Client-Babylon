import { ENUM_WORLD } from '../../core/types';
import { TW_SAFEZONE } from '../terrain/consts';
import {
  KanturuStateChangePacket,
  KanturuStateChangeStateTypeEnum as KanturuState,
} from '@versions/shared/packets/ServerToClientPackets';
import type { World } from '../../ecs/world';
import { EventBus } from '../../core/eventBus';
import { SoundsManager } from './soundsManager';
import { busSilent, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';
import { maps, type MapLayer } from '../maps';

/**
 * Background music: `ManageBackgroundMusic` (Scenes/SceneManager.cpp:1027-1175)
 * - one track per world, started a beat after the warp completes. The three
 * towns pick theirs by where the hero stands and only start it in the safe
 * zone; the Kanturu tower follows the event state. The login theme
 * (`controllers/sound/loginMusic.ts`) goes through the same `playMusic` / `stopMusic`
 * commands, so the mixer only ever has one track up.
 *
 * The tracks are each map's own (`MapSound.music` / `town` in
 * `versions/shared/maps/<map>/sound.ts`); this file is the engine.
 *
 * Driven by: the map index each frame (a town is judged once per tile the
 * hero steps onto, nothing else per frame), `requestWarp` / `warpCompleted`
 * and the `KanturuStateChange` packet.
 * Read by: `controllers/sound/loginMusic.ts` (`currentMusic`).
 */

// ---- 1. tuning -------------------------------------------------------------

/** The tracks ride their own slider, not the effects one (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'music';

/** Seconds after `warpCompleted` before the map's track starts. */
const MUSIC_DELAY_SECONDS = 1;

/**
 * Worlds no map entry claims, so they have no folder to carry a row:
 * `WD_1DUNGEON || WD_5UNKNOWN` (SceneManager.cpp:1076).
 */
const UNCLAIMED: Partial<Record<ENUM_WORLD, Sounds>> = {
  [ENUM_WORLD.WD_5UNKNOWN]: 'Music/Dungeon',
};

/**
 * A town's tracks (`MapSound.town`). The three towns only start a track
 * while the hero stands in the safe zone (`if (Hero->SafeZone)`,
 * SceneManager.cpp:1031, 1048, 1068). Outside it the track already playing
 * keeps looping; only leaving the world stops it.
 */
export type MapTown = {
  /** Every track the town plays, so a warp across it keeps the one up. */
  readonly tracks: readonly Sounds[];
  /** The track for the hero on tile (x, y), whose layer-1 texture is `tile`. */
  readonly at: (x: number, y: number, tile: number) => Sounds;
};

/** The tower whose track follows the Kanturu event, not a map row. */
const KANTURU_3RD = ENUM_WORLD.WD_39KANTURU_3RD;

const musicOf = (l: MapLayer) => l.sound?.music;
const townOf = (l: MapLayer) => l.sound?.town;

// ---- 2. state + readers ----------------------------------------------------

/**
 * Seconds until the map track may start. Infinity while a warp is loading:
 * until `warpCompleted` the hero and the terrain are still the old map's.
 */
let delay = 0;
/** The track has to be chosen again: a warp, an event state, the slider. */
let dirty = true;
/** The tile a town was last judged on. */
let lastX = -1;
let lastY = -1;
/**
 * `g_Direction.m_CKanturu.m_iKanturuState`. The original zeroes it in the
 * world load itself (MapManager.cpp:1197), ahead of any later packet; here
 * that is the warp request into the tower, since `reset()` only runs after
 * the terrain download and would drop a state that landed meanwhile.
 */
let kanturuState: number = KanturuState.None;
/** The world the last frame ran on, to tell a warp into the tower. */
let lastMap = -1;
let wired = false;

/** The track the mixer is playing, or null. */
export function currentMusic(): Sounds | null {
  return SoundsManager.currentMusic;
}

/** `M39Kanturu3rd::ChangeBackGroundMusic` (GM_Kanturu_3rd.cpp:1744-1777). */
export function kanturuMusic(state: number): Sounds {
  if (state === KanturuState.MayaBattle || state === KanturuState.Standby) {
    return 'Music/KanturuMayaBattle';
  }
  if (state === KanturuState.NightmareBattle) {
    return 'Music/KanturuNightmareBattle';
  }
  return 'Music/KanturuTower';
}

/** Track a world plays (a town's outdoor one), `null` for a silent world. */
export function mapMusic(map: ENUM_WORLD): Sounds | null {
  if (map === KANTURU_3RD) return kanturuMusic(kanturuState);
  const own = maps.rowFor(map, musicOf);
  return own !== undefined ? own : (UNCLAIMED[map] ?? null);
}

/**
 * The track a town wants for the hero on tile (x, y): `undefined` outside
 * the safe zone, where whatever is playing carries on.
 */
export function townMusic(
  map: ENUM_WORLD,
  x: number,
  y: number,
  tile: number,
  safeZone: boolean
): Sounds | undefined {
  if (!safeZone) return undefined;
  return maps.rowFor(map, townOf)?.at(x, y, tile);
}

/** Whether `key` is one of the tracks world `map` plays. */
export function worldPlays(map: ENUM_WORLD, key: Sounds): boolean {
  return (
    mapMusic(map) === key ||
    (maps.rowFor(map, townOf)?.tracks.includes(key) ?? false)
  );
}

/** Start a track (no-op if it is already the one playing). */
export function playMusic(key: Sounds): void {
  SoundsManager.playMusic(key);
}

/** Stop whatever track is playing. */
export function stopMusic(): void {
  SoundsManager.stopAllMusic();
}

function wire(): void {
  if (wired) return;
  wired = true;
  // Each world stops only the tracks it does not play (the `else StopMp3`
  // arms), so a track two worlds share - the Kalima floors, the temple
  // levels, a town warped across - carries through the load.
  EventBus.on('requestWarp', ({ map }) => {
    if (map === KANTURU_3RD && lastMap !== KANTURU_3RD) {
      kanturuState = KanturuState.None;
    }
    const key = currentMusic();
    if (key && !worldPlays(map, key)) stopMusic();
    delay = Infinity;
  });
  EventBus.on('warpCompleted', () => {
    delay = MUSIC_DELAY_SECONDS;
    dirty = true;
  });
  // The old map is still up.
  EventBus.on('warpFailed', () => {
    delay = 0;
    dirty = true;
  });
  // `ReceiveKanturu3rdState` only takes the state inside the tower.
  EventBus.on('KanturuStateChange', packet => {
    if (listenerWorld()?.mapIndex !== KANTURU_3RD) return;
    const state = new KanturuStateChangePacket(packet).State as number;
    if (state === kanturuState) return;
    kanturuState = state;
    dirty = true;
  });
}

function update(map: ENUM_WORLD, dt: number): void {
  wire();
  lastMap = map;

  // The music slider at 0 stops the track rather than streaming it at
  // silence, and re-arms the start so raising the slider brings it back.
  if (busSilent(BUS)) {
    if (SoundsManager.currentMusic) stopMusic();
    dirty = true;
    return;
  }

  if (delay > 0) {
    delay -= dt;
    return;
  }

  if (!SoundsManager.pageInteracted) return;
  const world = listenerWorld();
  if (!world?.terrain) return;

  const town = maps.rowFor(map, townOf);
  if (town) {
    updateTown(world, map, town);
    return;
  }

  if (!dirty) return;
  dirty = false;

  const key = mapMusic(map);
  if (key) playMusic(key);
  else stopMusic();
}

function updateTown(world: World, map: ENUM_WORLD, town: MapTown): void {
  const hero = listenerHero();
  if (!hero) return;

  const x = ~~hero.transform.pos.x;
  const y = ~~hero.transform.pos.z;
  if (!dirty && x === lastX && y === lastY) return;

  if (dirty) {
    dirty = false;
    const current = currentMusic();
    if (current && !town.tracks.includes(current)) stopMusic();
  }
  lastX = x;
  lastY = y;

  const safeZone = (world.getTerrainFlag(x, y) & TW_SAFEZONE) !== 0;
  const key = townMusic(map, x, y, world.getTerrainTile(x, y), safeZone);
  if (key) playMusic(key);
}

/**
 * A map change holds the track until the load ends: every load that gets
 * this far finishes in `warpCompleted` or `warpFailed`, however it started.
 */
function reset(): void {
  wire();
  delay = Infinity;
  dirty = true;
  lastX = -1;
  lastY = -1;
}

// ---- 3. the layer ----------------------------------------------------------

export const musicLayer: SoundLayer = { name: 'music', update, reset };
