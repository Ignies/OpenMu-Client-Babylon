import { ENUM_WORLD } from '../common/types';
import { rainStrength } from '../weather/rainState';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import {
  listenerHero,
  listenerWorld,
  playSfx,
  type SfxPosition,
} from './listener';
import { bloodCastleTimer } from '../events/bloodCastle';
import { chaosCastleTimer } from '../events/chaosCastle';
import {
  BLOOD_CASTLE_WORLDS,
  CHAOS_CASTLE_WORLDS,
  KALIMA_WORLDS,
  DEVIL_SQUARE_WORLDS,
  onWorlds,
} from '../common/worldAssets';

/**
 * `PlayWorldAmbientSounds` / `StopInactiveAmbientSounds`
 * (Scenes/SceneManager.cpp:564-700), the environmental bed under each map.
 *
 * The original calls `PlayBuffer(..., true)` on the current world's bed every
 * frame and `StopBuffer` on every other world's, which is idempotent in
 * DirectSound. This keeps the shape — a table of beds per world, everything
 * not in the current world's list stopped — because that is what makes the
 * mute gates work: Lorencia's wind is not stopped on a map change, it is
 * stopped the moment the hero steps under a roof.
 *
 * The wildlife one-shots (birds, bats, rats) are the original's boids
 * (GOBoid.cpp:1478-1495, 1873-1876): flocks spawned within ±512 units of the
 * hero that each roll `rand_fps_check` and `PlayBuffer(sound, o)` at their
 * own position while within 600 units. The clone has no boid simulation, so
 * a row here stands in for the flock: the same roll, played at a random
 * point `spread` tiles around the hero so the attenuation and the sense of
 * "somewhere over there" survive. Doors and gates stay with their objects.
 *
 * Driven by: the map, the tile under the hero, and `weather` (rain).
 * Read by: nothing — it only plays.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Reference frame rate the original's `rand_fps_check` counts against. */
const REFERENCE_FPS = 25;

export type AmbientBed = {
  readonly sound: Sounds;
  /** Share of the effects volume. Beds sit under the SFX, never on top. */
  readonly volume: number;
  /**
   * Silences the bed for the tile the hero is standing on. The original uses
   * this to cut the wind the moment the hero walks indoors — the tile under
   * their feet is the only "am I inside" test it has, and the two maps that
   * use it test open-ended ranges, so this is a predicate rather than a list.
   */
  readonly mutedOn?: (heroTile: number) => boolean;
  /** Extra condition, e.g. Lorencia's rain only while it is raining. */
  readonly when?: () => boolean;
};

/** A `rand_fps_check(oneIn)` one-shot layered over the bed. */
export type AmbientOneShot = {
  readonly sound: Sounds;
  readonly oneIn: number;
  /** Share of the effects track before distance attenuation. */
  readonly volume: number;
  /**
   * Tiles around the hero the sound is placed within, for the wildlife the
   * original voiced from a boid's position. Omit for an unpositioned call
   * (`PlayBuffer(SOUND_FOREST01)` with no object) — full volume, no place.
   */
  readonly spread?: number;
};

/**
 * The original's boids spawn within `rand() % 1024 - 512` units of the hero
 * (GOBoid.cpp:1300, 1678) — ±5.12 tiles — and only voice within 600 units.
 */
const BOID_SPREAD_TILES = 5;
/** Nearest a stand-in call is placed: the flock is never in the hero's ear. */
const BOID_MIN_TILES = 2;

const WIND: AmbientBed = { sound: 'Sound/aWind', volume: 0.35 };

export const BEDS: Partial<Record<ENUM_WORLD, readonly AmbientBed[]>> = {
  // Lorencia: wind outdoors, cut inside the buildings (tile 4);
  // rain layered on while the weather byte says so (SceneManager.cpp:571-578).
  [ENUM_WORLD.WD_0LORENCIA]: [
    { ...WIND, mutedOn: tile => tile === 4 },
    // `if (RainCurrent > 0) PlayBuffer(SOUND_RAIN01, NULL, true)`
    // (SceneManager.cpp:577) — the sound follows the *current* rain, not the
    // packet, so it fades in with the first drops and keeps going while the
    // last shower falls out.
    { sound: 'Sound/aRain', volume: 0.4, when: () => rainStrength() > 0 },
  ],

  [ENUM_WORLD.WD_1DUNGEON]: [{ sound: 'Sound/aDungeon', volume: 0.4 }],

  // Devias: the same wind, muted on the interior floor tiles. The original's
  // test is `HeroTile == 3 || HeroTile >= 10`, the same one `footsteps.ts`
  // uses to decide snow underfoot.
  [ENUM_WORLD.WD_2DEVIAS]: [
    { ...WIND, mutedOn: tile => tile === 3 || tile >= 10 },
  ],

  // Noria: wind with no gate at all, plus the forest one-shot below.
  [ENUM_WORLD.WD_3NORIA]: [WIND],

  [ENUM_WORLD.WD_4LOSTTOWER]: [{ sound: 'Sound/aTower', volume: 0.4 }],

  [ENUM_WORLD.WD_7ATLANSE]: [{ sound: 'Sound/aWater', volume: 0.4 }],

  [ENUM_WORLD.WD_8TARKAN]: [{ sound: 'Sound/desert', volume: 0.4 }],

  // Devil Square: `PlayWorldAmbientSounds` has no case for it, but the rain
  // loop is the one bed `StopInactiveAmbientSounds` never stops here
  // (SceneManager.cpp:658: `WorldActive != WD_0LORENCIA && InDevilSquare() == false`),
  // so whatever rain was playing keeps playing — and `MoveLeaves` gives the
  // square the full `MAX_LEAVES` rain budget (ZzzEffectFireLeave.cpp:422).
  ...onWorlds(DEVIL_SQUARE_WORLDS, [{ sound: 'Sound/aRain', volume: 0.4 }]),

  // Blood Castle: `iBloodCastle` starts looping on state 0 (`SetMatchGameCommand`,
  // NewBloodCastleSystem.cpp:42) and is the only sound the castle has.
  ...onWorlds(BLOOD_CASTLE_WORLDS, [
    { sound: 'Sound/iBloodCastle', volume: 0.4, when: () => bloodCastleTimer().running },
  ] as readonly AmbientBed[]),

  // Chaos Castle: `aChaos` (SOUND_CHAOS_ENVIR) while the arena waits, swapped
  // for the `iChaosCastle` loop on state 5 and back on state 7
  // (NewChaosCastleSystem.cpp:66-82).
  ...onWorlds(CHAOS_CASTLE_WORLDS, [
    { sound: 'Sound/aChaos', volume: 0.4, when: () => !chaosCastleTimer().running },
    { sound: 'Sound/iChaosCastle', volume: 0.4, when: () => chaosCastleTimer().running },
  ] as readonly AmbientBed[]),

  [ENUM_WORLD.WD_10ICARUS]: [{ sound: 'Sound/aHeaven', volume: 0.4 }],

  // ---- Season 2-6 worlds ("Later worlds"). Most of these are not
  // in `PlayWorldAmbientSounds` at all: their map code `PlayBuffer`s a
  // looping sample from its own `MoveObject` every frame, which is the same
  // thing as a bed.

  // Kalima: `MoveHellasObjectSetting` (GMHellas.cpp:309), plus the two
  // one-shots and the falling stone below.
  ...onWorlds(KALIMA_WORLDS, [
    { sound: 'Sound/aKalima', volume: 0.4 },
  ] as readonly AmbientBed[]),
  // Valley of Loren: `SOUND_BC_AMBIENT` (GMBattleCastle.cpp:729), loaded looping.
  [ENUM_WORLD.WD_30BATTLECASTLE]: [
    { sound: 'Sound/battlecastle/aSiegeAmbi', volume: 0.4 },
  ],
  // Land of Trials: fired once per 300 s (GMHuntingGround.cpp:109-112); the
  // sample is a long ambience loop, so it runs as a bed.
  [ENUM_WORLD.WD_31HUNTING_GROUND]: [
    { sound: 'Sound/w31/aW31', volume: 0.4 },
  ],
  // Aida: `PlayBuffer(SOUND_AIDA_AMBIENT)` every frame (GMAida.cpp:92).
  [ENUM_WORLD.WD_33AIDA]: [{ sound: 'Sound/w34/aida_ambi', volume: 0.4 }],
  // Crywolf: `SOUND_CRY1ST_AMBIENT`, loaded looping (MapManager.cpp:193).
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: [
    { sound: 'Sound/w35/crywolf_ambi', volume: 0.4 },
  ],
  // The three Kanturu "global" loops (GM_kanturu_1st.cpp:122,
  // GM_Kanturu_2nd.cpp:196, GM_Kanturu_3rd.cpp:192).
  [ENUM_WORLD.WD_37KANTURU_1ST]: [
    { sound: 'Sound/w37/kan_ruin_global', volume: 0.4 },
  ],
  [ENUM_WORLD.WD_38KANTURU_2ND]: [
    { sound: 'Sound/w38/kan_relic_global', volume: 0.4 },
  ],
  [ENUM_WORLD.WD_39KANTURU_3RD]: [
    { sound: 'Sound/w39/kan_boss_global', volume: 0.4 },
  ],
  // Raklion's hatchery: wind (SceneManager.cpp:620-622).
  [ENUM_WORLD.WD_58ICECITY_BOSS]: [WIND],
  // Loren Market: wind and rain, both unconditional (:623-628) and both
  // spared by `StopInactiveAmbientSounds` — it always rains here.
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE]: [
    WIND,
    { sound: 'Sound/aRain', volume: 0.4 },
  ],
  // Karutan (:630-645, ASG_ADD_MAP_KARUTAN): the desert loop; on Karutan 2
  // it gives way to the Kardamahal entrance loop on tile 12.
  [ENUM_WORLD.WD_80KARUTAN1]: [
    { sound: 'Sound/Karutan/Karutan_desert_env', volume: 0.4 },
  ],
  [ENUM_WORLD.WD_81KARUTAN2]: [
    {
      sound: 'Sound/Karutan/Karutan_desert_env',
      volume: 0.4,
      mutedOn: tile => tile === 12,
    },
    {
      sound: 'Sound/Karutan/Kardamahal_entrance_env',
      volume: 0.4,
      mutedOn: tile => tile !== 12,
    },
  ],

  // Stadium has no bed in the original — the arena is deliberately silent.
};

/** A Lorencia bird (`MODEL_BIRD01`): two 1-in-512 rolls a frame, one per call. */
const BIRDS: readonly AmbientOneShot[] = [
  { sound: 'Sound/aBird1', oneIn: 512, volume: 0.5, spread: BOID_SPREAD_TILES },
  { sound: 'Sound/aBird2', oneIn: 512, volume: 0.5, spread: BOID_SPREAD_TILES },
];
/** A bat (`MODEL_BAT01`, Dungeon and Lost Tower): 1-in-256 (GOBoid.cpp:1491). */
const BAT: AmbientOneShot = {
  sound: 'Sound/aBat',
  oneIn: 256,
  volume: 0.45,
  spread: BOID_SPREAD_TILES,
};
/** A Dungeon rat (`MODEL_RAT01`, `aMouse.wav`): 1-in-256 (GOBoid.cpp:1875). */
const RAT: AmbientOneShot = {
  sound: 'Sound/aMouse',
  oneIn: 256,
  volume: 0.4,
  spread: BOID_SPREAD_TILES,
};

export const ONE_SHOTS: Partial<Record<ENUM_WORLD, readonly AmbientOneShot[]>> =
  {
    // The fields: the Lorencia boids are birds (GOBoid.cpp:1330).
    [ENUM_WORLD.WD_0LORENCIA]: BIRDS,

    // Bats overhead and rats underfoot (GOBoid.cpp:1332, 1717).
    [ENUM_WORLD.WD_1DUNGEON]: [BAT, RAT],

    // `if (rand_fps_check(512)) PlayBuffer(SOUND_FOREST01);` — birdsong over
    // the wind, roughly every 20 s (SceneManager.cpp:592). Noria's own boids
    // are butterflies, which are silent.
    [ENUM_WORLD.WD_3NORIA]: [
      { sound: 'Sound/aForest', oneIn: 512, volume: 0.45 },
    ],

    // The second home of the bats (GOBoid.cpp:1332).
    [ENUM_WORLD.WD_4LOSTTOWER]: [BAT],

    // Kalima (GMHellas.cpp:311-315, :340-352): one of `aKalima01`/`02` every
    // 4 s (`AmbientSoundInterval`), i.e. one roll in 100 ticks split over
    // two rows, and the falling stone's `aKalimaStone` on
    // `rand_fps_check(5) && rand_fps_check(15)` = one in 75.
    ...onWorlds(KALIMA_WORLDS, [
      { sound: 'Sound/aKalima01', oneIn: 200, volume: 0.45 },
      { sound: 'Sound/aKalima02', oneIn: 200, volume: 0.45 },
      { sound: 'Sound/aKalimaStone', oneIn: 75, volume: 0.4, spread: 4 },
    ] as readonly AmbientOneShot[]),

    // Atlans, Tarkan, Icarus, Stadium: the original's boids there are fish,
    // bugs and dragons, none with a voice.
  };

/** Maps with a bed: `layer.maps`, derived from the table. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set(
  Object.keys(BEDS).map(k => Number(k) as ENUM_WORLD)
);

/** Every bed any map can ask for, so leaving a map can silence the lot. */
const ALL_BEDS: readonly Sounds[] = [
  ...new Set(Object.values(BEDS).flatMap(beds => beds.map(bed => bed.sound))),
];

// ---- 2. state + readers ----------------------------------------------------

const playing = new Set<Sounds>();
/** Scratch: this frame's beds. Module-level so the update allocates nothing. */
const wanted = new Set<Sounds>();

/** The beds sounding right now (after the tile / weather gates). */
export function ambientBedsPlaying(): ReadonlySet<Sounds> {
  return playing;
}

function update(map: ENUM_WORLD, dt: number): void {
  const world = listenerWorld();
  if (!SoundsManager.pageInteracted || !world?.terrain) return;

  const hero = listenerHero();
  if (!hero) return;

  const beds = BEDS[map] ?? [];

  const heroTile = world.getTerrainTile(
    ~~hero.transform.pos.x,
    ~~hero.transform.pos.z
  );

  // The beds live on the effects track, so the user's volume setting is
  // already applied to them; `bed.volume` is only the mix under the SFX.
  // (`playAmbientLoop` only touches the gain when it changed.)
  wanted.clear();

  for (const bed of beds) {
    if (bed.mutedOn?.(heroTile)) continue;
    if (bed.when && !bed.when()) continue;

    wanted.add(bed.sound);
    SoundsManager.playAmbientLoop(bed.sound, bed.volume);
  }

  // Everything this map does not want right now — including a bed this
  // map owns but has just muted — goes quiet.
  for (const sound of ALL_BEDS) {
    if (wanted.has(sound)) continue;
    if (!playing.has(sound)) continue;

    SoundsManager.stopAmbientLoop(sound);
  }

  playing.clear();
  for (const sound of wanted) playing.add(sound);

  for (const shot of ONE_SHOTS[map] ?? []) {
    // rand_fps_check(n) is a 1-in-n roll per reference frame; at any other
    // frame rate the same expected rate is dt * REFERENCE_FPS / n.
    if (Math.random() >= (dt * REFERENCE_FPS) / shot.oneIn) continue;

    // Through `playSfx`, the streaming path: the buffer is fetched on first
    // use, so a one-shot sounds the first time it is rolled rather than only
    // after an eager preload nobody runs.
    playSfx(
      shot.sound,
      shot.spread ? boidPosition(hero, shot.spread) : null,
      shot.volume
    );
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
}

// ---- 3. the layer ----------------------------------------------------------

export const ambientBedsLayer: SoundLayer = {
  name: 'ambientBeds',
  maps: MAPS,
  update,
  reset,
};
