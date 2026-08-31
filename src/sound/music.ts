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
import { EventBus } from '../libs/eventBus';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerWorld } from './listener';

/**
 * Background music: `ManageBackgroundMusic` (Scenes/SceneManager.cpp:711-839)
 * — one track per world, started a beat after the warp completes. Area
 * overrides (the Lorencia / Devias taverns) and the login theme
 * (`libs/loginMusic.ts`) go through the same `playMusic` / `stopMusic`
 * commands, so the mixer only ever has one track up.
 *
 * Driven by: the map index each frame plus `requestWarp` / `warpCompleted`.
 * Read by: `libs/loginMusic.ts` (`currentMusic`).
 */

// ---- 1. tuning -------------------------------------------------------------

/** Seconds after `warpCompleted` before the map's track starts. */
const MUSIC_DELAY_SECONDS = 1;

/** Worlds with no row in `ManageBackgroundMusic` fall back to the theme. */
const DEFAULT_MUSIC: Sounds = 'Music/MuTheme';

/**
 * Track per world. `null` is a world the original deliberately leaves
 * silent, not one we forgot: the arena has no case in `ManageBackgroundMusic`
 * and no ambient bed in `PlayWorldAmbientSounds` either, so the MuTheme
 * fallback would be our invention.
 */
const MAP_MUSIC: Partial<Record<ENUM_WORLD, Sounds | null>> = {
  [ENUM_WORLD.WD_0LORENCIA]: 'Music/main_theme',
  [ENUM_WORLD.WD_3NORIA]: 'Music/Noria',
  [ENUM_WORLD.WD_2DEVIAS]: 'Music/Devias',
  [ENUM_WORLD.WD_4LOSTTOWER]: 'Music/lost_tower_a',
  [ENUM_WORLD.WD_7ATLANSE]: 'Music/atlans',
  [ENUM_WORLD.WD_8TARKAN]: 'Music/tarkan',
  [ENUM_WORLD.WD_1DUNGEON]: 'Music/Dungeon',
  [ENUM_WORLD.WD_10ICARUS]: 'Music/icarus',
  [ENUM_WORLD.WD_6STADIUM]: null,
  // `MUSIC_LOGIN_THEME` (LoginScene.cpp:300): the login backdrop and the
  // character select are one scene under one theme — `libs/loginMusic.ts`
  // starts it before the world exists; this row keeps the map loop from
  // swapping it for the MuTheme fallback once the backdrop's terrain loads.
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: 'Music/login_theme',
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: 'Music/login_theme',
  // The three event maps have no `ManageBackgroundMusic` case either: their
  // soundscape is the event loop (`iBloodCastle` / `iChaosCastle`, the Devil
  // Square rain) in ambientBeds.ts, and the theme would be ours.
  ...onWorlds(DEVIL_SQUARE_WORLDS, null),
  ...onWorlds(BLOOD_CASTLE_WORLDS, null),
  ...onWorlds(CHAOS_CASTLE_WORLDS, null),

  // ---- Season 2-6 worlds ("Later worlds"), from
  // `ManageBackgroundMusic` (SceneManager.cpp:711-857) and the per-map
  // `PlayBGM`s it calls; file names from _enum.h:180-216.
  ...onWorlds(KALIMA_WORLDS, 'Music/kalima' as Sounds),
  // `MUSIC_CASTLE_PEACE` — the siege tracks need the siege state.
  [ENUM_WORLD.WD_30BATTLECASTLE]: 'Music/castle',
  [ENUM_WORLD.WD_31HUNTING_GROUND]: 'Music/huntingground',
  [ENUM_WORLD.WD_33AIDA]: 'Music/Aida',
  // `M34CryWolf1st::ChangeBackGroundMusic`'s peace state.
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: 'Music/crywolf1st',
  [ENUM_WORLD.WD_37KANTURU_1ST]: 'Music/kanturu_1st',
  [ENUM_WORLD.WD_38KANTURU_2ND]: 'Music/kanturu_2nd',
  // `M39Kanturu3rd::ChangeBackGroundMusic` outside the Maya/Nightmare fights.
  [ENUM_WORLD.WD_39KANTURU_3RD]: 'Music/KanturuTower',
  // No case anywhere for the GM area.
  [ENUM_WORLD.WD_40AREA_FOR_GM]: null,
  [ENUM_WORLD.WD_41CHANGEUP3RD_1ST]: 'Music/BalgasBarrack',
  [ENUM_WORLD.WD_42CHANGEUP3RD_2ND]: 'Music/BalgasRefuge',
  // `g_CursedTemple->PlayBGM()` starts on the waiting track.
  ...onWorlds(CURSED_TEMPLE_WORLDS, 'Music/cursedtemplewait' as Sounds),
  [ENUM_WORLD.WD_51ELBELAND]: 'Music/elbeland',
  [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: 'Music/SwampOfCalmness',
  [ENUM_WORLD.WD_57ICECITY]: 'Music/Raklion',
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

// ---- 2. state + readers ----------------------------------------------------

/** Seconds until the map track is (re)started; Infinity once it has been. */
let delay = 0;
let wired = false;

/** The track the mixer is playing, or null. */
export function currentMusic(): Sounds | null {
  return SoundsManager.currentMusic;
}

/** Track a world plays, `null` for a deliberately silent one. */
export function mapMusic(map: ENUM_WORLD): Sounds | null {
  const entry = MAP_MUSIC[map];
  return entry === undefined ? DEFAULT_MUSIC : entry;
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
  EventBus.on('requestWarp', () => stopMusic());
  EventBus.on('warpCompleted', () => {
    delay = MUSIC_DELAY_SECONDS;
  });
}

function update(map: ENUM_WORLD, dt: number): void {
  wire();

  delay -= dt;
  if (delay > 0) return;

  if (!SoundsManager.pageInteracted) return;
  if (!listenerWorld()?.terrain) return;

  delay = Infinity;

  const key = mapMusic(map);
  if (key) playMusic(key);
  else stopMusic();
}

/**
 * A map change re-arms the track the same way `warpCompleted` does, so a map
 * reached without the warp events (the offline `?map=` boot, a dev reload)
 * still gets its music a beat after the terrain lands.
 */
function reset(): void {
  delay = MUSIC_DELAY_SECONDS;
}

// ---- 3. the layer ----------------------------------------------------------

export const musicLayer: SoundLayer = { name: 'music', update, reset };
