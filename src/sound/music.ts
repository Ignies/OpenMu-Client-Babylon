import {
  BLOOD_CASTLE_WORLDS,
  CHAOS_CASTLE_WORLDS,
  KALIMA_WORLDS,
  CURSED_TEMPLE_WORLDS,
  EMPIRE_GUARDIAN_WORLDS,
  DOPPELGANGER_WORLDS,
  DEVIL_SQUARE_WORLDS,
  onWorlds,
} from '../common/worldAssets';
import { ENUM_WORLD } from '../common/types';
import { TW_SAFEZONE } from '../common/terrain/consts';
import {
  KanturuStateChangePacket,
  KanturuStateChangeStateTypeEnum as KanturuState,
} from '../common/packets/ServerToClientPackets';
import type { World } from '../ecs/world';
import { EventBus } from '../libs/eventBus';
import { SoundsManager } from '../libs/soundsManager';
import { busSilent, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';

/**
 * Background music: `ManageBackgroundMusic` (Scenes/SceneManager.cpp:1027-1175)
 * - one track per world, started a beat after the warp completes. The three
 * towns pick theirs by where the hero stands and only start it in the safe
 * zone; the Kanturu tower follows the event state. The login theme
 * (`libs/loginMusic.ts`) goes through the same `playMusic` / `stopMusic`
 * commands, so the mixer only ever has one track up.
 *
 * Driven by: the map index each frame (a town is judged once per tile the
 * hero steps onto, nothing else per frame), `requestWarp` / `warpCompleted`
 * and the `KanturuStateChange` packet.
 * Read by: `libs/loginMusic.ts` (`currentMusic`).
 */

// ---- 1. tuning -------------------------------------------------------------

/** The tracks ride their own slider, not the effects one (`sound/buses.ts`). */
const BUS: SoundBus = 'music';

/** Seconds after `warpCompleted` before the map's track starts. */
const MUSIC_DELAY_SECONDS = 1;

/**
 * Track per world. A world with no row is silent: `ManageBackgroundMusic`
 * has no fallback track. The `null` rows are worlds checked and found to
 * have no case, kept so they do not read as gaps.
 */
const MAP_MUSIC: Partial<Record<ENUM_WORLD, Sounds | null>> = {
  // The towns' outdoor tracks; `TOWNS` below picks the spot and holds the
  // start until the safe zone.
  [ENUM_WORLD.WD_0LORENCIA]: 'Music/main_theme',
  [ENUM_WORLD.WD_3NORIA]: 'Music/Noria',
  [ENUM_WORLD.WD_2DEVIAS]: 'Music/Devias',
  [ENUM_WORLD.WD_4LOSTTOWER]: 'Music/lost_tower_a',
  [ENUM_WORLD.WD_7ATLANSE]: 'Music/atlans',
  [ENUM_WORLD.WD_8TARKAN]: 'Music/tarkan',
  // `WD_1DUNGEON || WD_5UNKNOWN` (SceneManager.cpp:1076).
  [ENUM_WORLD.WD_1DUNGEON]: 'Music/Dungeon',
  [ENUM_WORLD.WD_5UNKNOWN]: 'Music/Dungeon',
  [ENUM_WORLD.WD_10ICARUS]: 'Music/icarus',
  // No case in `ManageBackgroundMusic` and no ambient bed either.
  [ENUM_WORLD.WD_6STADIUM]: null,
  // `MUSIC_LOGIN_THEME` (LoginScene.cpp:300): the login backdrop and the
  // character select are one scene under one theme - `libs/loginMusic.ts`
  // starts it before the world exists; this row keeps the map loop from
  // stopping it once the backdrop's terrain loads.
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: 'Music/login_theme',
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: 'Music/login_theme',
  // The three event maps have no `ManageBackgroundMusic` case either: their
  // soundscape is the event loop (`iBloodCastle` / `iChaosCastle`, the Devil
  // Square rain) in ambientBeds.ts.
  ...onWorlds(DEVIL_SQUARE_WORLDS, null),
  ...onWorlds(BLOOD_CASTLE_WORLDS, null),
  ...onWorlds(CHAOS_CASTLE_WORLDS, null),

  // ---- Season 2-6 worlds ("Later worlds"), from
  // `ManageBackgroundMusic` and the per-map `PlayBGM`s it calls; file names
  // from _enum.h:173-217.
  ...onWorlds(KALIMA_WORLDS, 'Music/kalima' as Sounds),
  // `MUSIC_CASTLE_PEACE`. `charge` while `IsBattleCastleStart()`
  // (GMBattleCastle.cpp:716-733) needs the siege start/end packet
  // (0xB2 0x17), which nothing here tracks and OpenMU never sends.
  [ENUM_WORLD.WD_30BATTLECASTLE]: 'Music/castle',
  [ENUM_WORLD.WD_31HUNTING_GROUND]: 'Music/huntingground',
  [ENUM_WORLD.WD_33AIDA]: 'Music/Aida',
  // `M34CryWolf1st::ChangeBackGroundMusic`'s peace state.
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: 'Music/crywolf1st',
  [ENUM_WORLD.WD_37KANTURU_1ST]: 'Music/kanturu_1st',
  [ENUM_WORLD.WD_38KANTURU_2ND]: 'Music/kanturu_2nd',
  // WD_39KANTURU_3RD follows the event: `kanturuMusic` below.
  // No case anywhere for the GM area.
  [ENUM_WORLD.WD_40AREA_FOR_GM]: null,
  [ENUM_WORLD.WD_41CHANGEUP3RD_1ST]: 'Music/BalgasBarrack',
  [ENUM_WORLD.WD_42CHANGEUP3RD_2ND]: 'Music/BalgasRefuge',
  // `g_CursedTemple->PlayBGM()` (w_CursedTemple.cpp:1115-1136) turns on the
  // temple state from 0xBF 0x09, a packet neither this client nor OpenMU
  // has; the waiting track stands in for it.
  ...onWorlds(CURSED_TEMPLE_WORLDS, 'Music/cursedtemplewait' as Sounds),
  [ENUM_WORLD.WD_51ELBELAND]: 'Music/elbeland',
  [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: 'Music/SwampOfCalmness',
  [ENUM_WORLD.WD_57ICECITY]: 'Music/Raklion',
  // `CGM_Raklion::PlayBGM` (GM_Raklion.cpp:2938-2945) plays it only between
  // RAKLION_STATE_READY and _END, from 0xD1 0x10-0x12; neither this client
  // nor OpenMU has those packets, so it plays unconditionally.
  [ENUM_WORLD.WD_58ICECITY_BOSS]: 'Music/Raklion_Hatchery',
  [ENUM_WORLD.WD_62SANTA_TOWN]: 'Music/Santa_Village',
  [ENUM_WORLD.WD_63PK_FIELD]: 'Music/PK_Field',
  [ENUM_WORLD.WD_64DUELARENA]: 'Music/DuelArena',
  // `CGMDoppelGanger1::PlayBGM` (GMDoppelGanger1.cpp:669-693) only plays
  // while the event frame is enabled; outside it the arenas are silent.
  ...onWorlds(DOPPELGANGER_WORLDS, null),
  ...onWorlds(EMPIRE_GUARDIAN_WORLDS, 'Music/ImperialGuardianFort' as Sounds),
  // `GMUnitedMarketPlace::PlayBGM` is commented out in the source.
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE]: null,
  [ENUM_WORLD.WD_80KARUTAN1]: 'Music/Karutan_A',
  [ENUM_WORLD.WD_81KARUTAN2]: 'Music/Karutan_B',
};

/**
 * `HeroTile == 4` (ZzzInterface.cpp:3315-3318): the plank floor of the
 * Lorencia pub and of the cabin at (75-81, 146-157).
 */
const PUB_TILE = 4;

/** `PositionX` 205-214, `PositionY` 13-31 (SceneManager.cpp:1050-1051). */
const CHURCH = { minX: 205, maxX: 214, minY: 13, maxY: 31 } as const;

type Town = {
  /** Every track the town plays, so a warp across it keeps the one up. */
  readonly tracks: readonly Sounds[];
  /** The track for the hero on tile (x, y), whose layer-1 texture is `tile`. */
  readonly at: (x: number, y: number, tile: number) => Sounds;
};

/**
 * The three towns only start a track while the hero stands in the safe zone
 * (`if (Hero->SafeZone)`, SceneManager.cpp:1031, 1048, 1068). Outside it the
 * track already playing keeps looping; only leaving the world stops it.
 */
const TOWNS: Partial<Record<ENUM_WORLD, Town>> = {
  [ENUM_WORLD.WD_0LORENCIA]: {
    tracks: ['Music/main_theme', 'Music/Pub'],
    at: (_x, _y, tile) =>
      tile === PUB_TILE ? 'Music/Pub' : 'Music/main_theme',
  },
  [ENUM_WORLD.WD_2DEVIAS]: {
    tracks: ['Music/Devias', 'Music/Church'],
    at: (x, y) =>
      x >= CHURCH.minX &&
      x <= CHURCH.maxX &&
      y >= CHURCH.minY &&
      y <= CHURCH.maxY
        ? 'Music/Church'
        : 'Music/Devias',
  },
  [ENUM_WORLD.WD_3NORIA]: {
    tracks: ['Music/Noria'],
    at: () => 'Music/Noria',
  },
};

const KANTURU_3RD = ENUM_WORLD.WD_39KANTURU_3RD;

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
  return MAP_MUSIC[map] ?? null;
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
  return TOWNS[map]?.at(x, y, tile);
}

/** Whether `key` is one of the tracks world `map` plays. */
export function worldPlays(map: ENUM_WORLD, key: Sounds): boolean {
  return mapMusic(map) === key || (TOWNS[map]?.tracks.includes(key) ?? false);
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

  const town = TOWNS[map];
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

function updateTown(world: World, map: ENUM_WORLD, town: Town): void {
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
