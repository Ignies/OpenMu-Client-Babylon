import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '../common/types';
import {
  KanturuStateChangePacket,
  KanturuStateChangeStateTypeEnum as KanturuState,
} from '../common/packets/ServerToClientPackets';
import { EventBus } from '../libs/eventBus';
import {
  kanturuMusic,
  mapMusic,
  musicLayer,
  townMusic,
  worldPlays,
} from './music';

// The mixer, the map registry and the listener stand in as fakes: the real
// ones reach Babylon and every map module.
const mixer = vi.hoisted(() => {
  const m = {
    currentMusic: null as string | null,
    pageInteracted: true,
    starts: [] as string[],
    stops: 0,
    playMusic(key: string) {
      if (m.currentMusic !== key) m.starts.push(key);
      m.currentMusic = key;
    },
    stopAllMusic() {
      m.stops++;
      m.currentMusic = null;
    },
  };
  return m;
});

const bus = vi.hoisted(() => ({ silent: false }));

const scene = vi.hoisted(() => {
  const world = {
    mapIndex: 0,
    terrain: {} as object | null,
    playerEntity: { transform: { pos: { x: 0, y: 0, z: 0 } } },
    safe: (_x: number, _y: number) => false,
    tileAt: (_x: number, _y: number) => 0,
    flagReads: 0,
    getTerrainFlag(x: number, y: number) {
      world.flagReads++;
      return world.safe(x, y) ? 1 : 0;
    },
    getTerrainTile(x: number, y: number) {
      return world.tileAt(x, y);
    },
  };
  return { world };
});

vi.mock('../libs/soundsManager', () => ({ SoundsManager: mixer }));
vi.mock('./buses', () => ({ busSilent: () => bus.silent }));
vi.mock('./listener', () => ({
  listenerWorld: () => scene.world,
  listenerHero: () => scene.world.playerEntity,
}));
vi.mock('../common/worldAssets', () => ({
  DEVIL_SQUARE_WORLDS: [9],
  BLOOD_CASTLE_WORLDS: [11],
  CHAOS_CASTLE_WORLDS: [18],
  KALIMA_WORLDS: [24, 25],
  CURSED_TEMPLE_WORLDS: [45, 46],
  EMPIRE_GUARDIAN_WORLDS: [69],
  DOPPELGANGER_WORLDS: [65],
  onWorlds: (worlds: number[], value: unknown) =>
    Object.fromEntries(worlds.map(w => [w, value])),
}));

const world = scene.world;

function place(x: number, y: number): void {
  world.playerEntity.transform.pos.x = x + 0.5;
  world.playerEntity.transform.pos.z = y + 0.5;
}

function step(map: ENUM_WORLD, dt = 0.016): void {
  musicLayer.update!(map, dt);
}

/** A warp to `map` at (x, y) that runs to the end of the start delay. */
function arrive(map: ENUM_WORLD, x = 0, y = 0): void {
  // boot.tsx's handler sets the index before any other sees the warp.
  world.mapIndex = map;
  EventBus.emit('requestWarp', { map });
  musicLayer.reset!();
  place(x, y);
  EventBus.emit('warpCompleted', { map });
  step(map, 2);
  step(map);
}

function kanturuState(state: KanturuState): void {
  const p = KanturuStateChangePacket.createPacket();
  p.State = state;
  EventBus.emit('KanturuStateChange', p.buffer);
}

beforeEach(() => {
  mixer.currentMusic = null;
  mixer.starts = [];
  mixer.stops = 0;
  bus.silent = false;
  world.safe = () => false;
  world.tileAt = () => 0;
});

describe('map music table', () => {
  it('leaves a world with no case silent instead of falling back to a theme', () => {
    expect(mapMusic(ENUM_WORLD.WD_35CRYWOLF_2ND)).toBeNull();
    expect(mapMusic(ENUM_WORLD.WD_6STADIUM)).toBeNull();
  });

  it('gives world 5 the dungeon track with world 1', () => {
    expect(mapMusic(ENUM_WORLD.WD_5UNKNOWN)).toBe('Music/Dungeon');
  });

  it('follows the Kanturu tower state', () => {
    expect(kanturuMusic(KanturuState.None)).toBe('Music/KanturuTower');
    expect(kanturuMusic(KanturuState.Standby)).toBe('Music/KanturuMayaBattle');
    expect(kanturuMusic(KanturuState.MayaBattle)).toBe(
      'Music/KanturuMayaBattle'
    );
    expect(kanturuMusic(KanturuState.NightmareBattle)).toBe(
      'Music/KanturuNightmareBattle'
    );
    expect(kanturuMusic(KanturuState.Tower)).toBe('Music/KanturuTower');
    expect(kanturuMusic(KanturuState.End)).toBe('Music/KanturuTower');
  });
});

describe('town music', () => {
  const L = ENUM_WORLD.WD_0LORENCIA;
  const D = ENUM_WORLD.WD_2DEVIAS;

  it('plays the pub on tile 4 and the theme elsewhere in the Lorencia safe zone', () => {
    expect(townMusic(L, 125, 130, 4, true)).toBe('Music/Pub');
    expect(townMusic(L, 78, 150, 4, true)).toBe('Music/Pub');
    expect(townMusic(L, 130, 130, 0, true)).toBe('Music/main_theme');
  });

  it('starts nothing outside the safe zone', () => {
    expect(townMusic(L, 125, 130, 4, false)).toBeUndefined();
    expect(townMusic(D, 210, 20, 0, false)).toBeUndefined();
    expect(townMusic(ENUM_WORLD.WD_3NORIA, 1, 1, 0, false)).toBeUndefined();
  });

  it('plays the church on 205-214 x 13-31 and Devias elsewhere, never the pub', () => {
    expect(townMusic(D, 205, 13, 0, true)).toBe('Music/Church');
    expect(townMusic(D, 214, 31, 0, true)).toBe('Music/Church');
    expect(townMusic(D, 204, 20, 0, true)).toBe('Music/Devias');
    expect(townMusic(D, 215, 20, 0, true)).toBe('Music/Devias');
    expect(townMusic(D, 210, 12, 0, true)).toBe('Music/Devias');
    expect(townMusic(D, 210, 32, 0, true)).toBe('Music/Devias');
    expect(townMusic(D, 230, 24, 4, true)).toBe('Music/Devias');
    expect(worldPlays(D, 'Music/Pub')).toBe(false);
  });
});

describe('the music layer', () => {
  it('holds a town track until the hero reaches the safe zone and never stops it for leaving', () => {
    const L = ENUM_WORLD.WD_0LORENCIA;
    world.safe = x => x >= 100;
    world.tileAt = (x, y) =>
      x >= 121 && x <= 128 && y >= 121 && y <= 136 ? 4 : 0;

    arrive(L, 50, 50);
    expect(mixer.currentMusic).toBeNull();

    place(110, 110);
    step(L);
    expect(mixer.currentMusic).toBe('Music/main_theme');

    place(125, 130);
    step(L);
    expect(mixer.currentMusic).toBe('Music/Pub');

    place(50, 50);
    step(L);
    expect(mixer.currentMusic).toBe('Music/Pub');
    expect(mixer.stops).toBe(0);
  });

  it('judges a town once per tile, not once per frame', () => {
    const N = ENUM_WORLD.WD_3NORIA;
    world.safe = () => true;
    arrive(N, 10, 10);
    const reads = world.flagReads;
    for (let i = 0; i < 100; i++) step(N);
    expect(world.flagReads).toBe(reads);
    place(11, 10);
    step(N);
    expect(world.flagReads).toBe(reads + 1);
  });

  it('keeps a track across a warp to a world that plays it and stops it otherwise', () => {
    arrive(ENUM_WORLD.WD_24HELLAS);
    expect(mixer.currentMusic).toBe('Music/kalima');

    arrive(ENUM_WORLD.WD_24HELLAS + 1);
    expect(mixer.stops).toBe(0);
    expect(mixer.starts).toEqual(['Music/kalima']);

    arrive(ENUM_WORLD.WD_1DUNGEON);
    expect(mixer.stops).toBe(1);
    expect(mixer.currentMusic).toBe('Music/Dungeon');
  });

  it('stops a foreign track on reaching a town outside its safe zone', () => {
    arrive(ENUM_WORLD.WD_1DUNGEON);
    world.safe = () => false;
    arrive(ENUM_WORLD.WD_2DEVIAS, 50, 50);
    expect(mixer.currentMusic).toBeNull();
  });

  it('is silent in a world with no row', () => {
    arrive(ENUM_WORLD.WD_1DUNGEON);
    arrive(ENUM_WORLD.WD_35CRYWOLF_2ND);
    expect(mixer.currentMusic).toBeNull();
  });

  it('does not judge the town while the warp is loading', () => {
    const L = ENUM_WORLD.WD_0LORENCIA;
    arrive(ENUM_WORLD.WD_1DUNGEON);
    world.safe = () => true;
    EventBus.emit('requestWarp', { map: L });
    world.mapIndex = L;
    place(3, 3);
    step(L, 5);
    step(L);
    expect(mixer.currentMusic).toBeNull();
    EventBus.emit('warpCompleted', { map: L });
    step(L, 2);
    step(L);
    expect(mixer.currentMusic).toBe('Music/main_theme');
  });

  it('switches the Kanturu tower track on the event state, only inside the tower', () => {
    const K = ENUM_WORLD.WD_39KANTURU_3RD;
    arrive(K);
    expect(mixer.currentMusic).toBe('Music/KanturuTower');

    kanturuState(KanturuState.MayaBattle);
    step(K);
    expect(mixer.currentMusic).toBe('Music/KanturuMayaBattle');

    kanturuState(KanturuState.NightmareBattle);
    step(K);
    expect(mixer.currentMusic).toBe('Music/KanturuNightmareBattle');

    kanturuState(KanturuState.Tower);
    step(K);
    expect(mixer.currentMusic).toBe('Music/KanturuTower');

    arrive(ENUM_WORLD.WD_38KANTURU_2ND);
    kanturuState(KanturuState.MayaBattle);
    step(ENUM_WORLD.WD_38KANTURU_2ND);
    expect(mixer.currentMusic).toBe('Music/kanturu_2nd');
    expect(mapMusic(K)).toBe('Music/KanturuTower');
  });

  it('keeps a Kanturu state that lands while the warp into the tower loads', () => {
    const K = ENUM_WORLD.WD_39KANTURU_3RD;
    const K2 = ENUM_WORLD.WD_38KANTURU_2ND;
    arrive(K2);
    world.mapIndex = K;
    EventBus.emit('requestWarp', { map: K });
    kanturuState(KanturuState.MayaBattle);
    musicLayer.reset!();
    EventBus.emit('warpCompleted', { map: K });
    step(K, 2);
    step(K);
    expect(mixer.currentMusic).toBe('Music/KanturuMayaBattle');

    // A warp within the tower keeps it; coming back in from outside zeroes it.
    EventBus.emit('requestWarp', { map: K });
    EventBus.emit('warpCompleted', { map: K });
    step(K, 2);
    step(K);
    expect(mixer.currentMusic).toBe('Music/KanturuMayaBattle');

    arrive(K2);
    arrive(K);
    expect(mixer.currentMusic).toBe('Music/KanturuTower');
  });

  it('stops on the music slider at 0 and comes back when it is raised', () => {
    arrive(ENUM_WORLD.WD_7ATLANSE);
    bus.silent = true;
    step(ENUM_WORLD.WD_7ATLANSE);
    expect(mixer.currentMusic).toBeNull();
    bus.silent = false;
    step(ENUM_WORLD.WD_7ATLANSE);
    expect(mixer.currentMusic).toBe('Music/atlans');
  });
});
