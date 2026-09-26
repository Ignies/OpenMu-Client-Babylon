import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sound } from '@babylonjs/core/Audio/sound';
import { ENUM_WORLD } from '../common/types';
import { KALIMA_WORLDS } from '../common/worldAssets';
import type { World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import { attachListener } from './listener';
import {
  OBJECT_LOOPS,
  objectLoopSources,
  objectLoopsLayer,
} from './objectLoops';
import { SOUND_FILES } from './recipes';

describe('object loop table', () => {
  it('names a catalogue key in every row', () => {
    const missing = [...OBJECT_LOOPS.values()]
      .flat()
      .filter(row => !(row.sound in SOUND_FILES))
      .map(row => row.sound);
    expect(missing).toEqual([]);
  });

  // `CGM3rdChangeUp::MoveObject` runs `PlayEffectSound` on both maps.
  it('gives Balgass Refuge the Barracks cages, volcano and fire pillar', () => {
    const barracks = OBJECT_LOOPS.get(ENUM_WORLD.WD_41CHANGEUP3RD_1ST);
    const refuge = OBJECT_LOOPS.get(ENUM_WORLD.WD_42CHANGEUP3RD_2ND);

    expect(refuge).toBeDefined();
    expect(refuge).toBe(barracks);
    expect(refuge!.flatMap(row => row.types).sort((a, b) => a - b)).toEqual([
      74, 75, 79, 92,
    ]);
  });
});

describe('object loop copies', () => {
  const K1 = ENUM_WORLD.WD_37KANTURU_1ST;
  const WATERFALL = 'Sound/w37/kan_ruin_waterfall';
  const WHEEL = 'Sound/w37/kan_ruin_wheel';

  type Stub = { isPlaying: boolean; starts: number };
  const hero = { transform: { pos: { x: 100, z: 100 } } };
  let objects: {
    modelId: number;
    worldIndex: number;
    transform: { pos: { x: number; z: number } };
  }[] = [];
  const instances = new Map<string, Stub>();

  const place = (map: ENUM_WORLD, type: number, x: number, z = 100) =>
    objects.push({
      modelId: type,
      worldIndex: map,
      transform: { pos: { x, z } },
    });
  // dt past SCAN_SECONDS, so every step also rescans.
  const step = (map: ENUM_WORLD) => objectLoopsLayer.update!(map, 1);
  const sounding = () =>
    [...instances]
      .filter(([, s]) => s.isPlaying)
      .map(([id]) => id)
      .sort();

  beforeEach(() => {
    objects = [];
    instances.clear();
    hero.transform.pos.x = 100;
    SoundsManager.pageInteracted = true;
    attachListener({
      playerEntity: hero,
      getTerrainFlag: () => 0,
      with: () => objects,
    } as unknown as World);
    vi.spyOn(SoundsManager, 'loopInstance').mockImplementation((key, slot) => {
      const id = `${key}#${slot}`;
      let s = instances.get(id);
      if (!s) {
        const stub: Stub = { isPlaying: false, starts: 0 };
        s = Object.assign(stub, {
          play: () => {
            stub.isPlaying = true;
            stub.starts++;
          },
          setVolume: () => {},
        });
        instances.set(id, s);
      }
      return s as unknown as Sound;
    });
    vi.spyOn(SoundsManager, 'stopLoopInstance').mockImplementation(
      (key, slot) => {
        const s = instances.get(`${key}#${slot}`);
        if (s) s.isPlaying = false;
      }
    );
  });

  afterEach(() => {
    objectLoopsLayer.reset!();
    vi.restoreAllMocks();
    SoundsManager.pageInteracted = false;
  });

  // 1 channel (MapManager.cpp:380-383), no object (GM_Kanturu_1st.cpp:69, :97).
  it('holds a one-channel sound to one copy however many sources are near', () => {
    for (let i = 0; i < 12; i++) place(K1, 77, 100 + i * 0.5);
    place(K1, 46, 103);
    step(K1);
    expect(sounding()).toEqual([`${WATERFALL}#0`, `${WHEEL}#0`]);
    expect(objectLoopSources().map(s => s.sound)).toEqual([WATERFALL, WHEEL]);
  });

  // MapManager.cpp:994: aKalimaWaterFall has 3 channels.
  it('plays the Kalima waterfall on its three channels', () => {
    const map = KALIMA_WORLDS[0];
    for (let i = 0; i < 6; i++) place(map, 37, 100 + i);
    step(map);
    const key = 'Sound/aKalimaWaterFall';
    expect(sounding()).toEqual([`${key}#0`, `${key}#1`, `${key}#2`]);
  });

  it('hands a copy to the nearer source without restarting it', () => {
    place(K1, 77, 95);
    place(K1, 46, 102);
    place(K1, 77, 110);
    step(K1);
    expect(objectLoopSources().map(s => s.x)).toEqual([102, 95]);

    hero.transform.pos.x = 108;
    step(K1);
    expect(objectLoopSources().map(s => s.x)).toEqual([110, 102]);
    expect(sounding()).toEqual([`${WATERFALL}#0`, `${WHEEL}#0`]);
    for (const s of instances.values()) expect(s.starts).toBe(1);
  });

  it('stops a copy once its last source is out of reach', () => {
    place(K1, 92, 101);
    step(K1);
    expect(sounding()).toEqual(['Sound/w37/kan_ruin_elec#0']);
    hero.transform.pos.x = 120;
    step(K1);
    expect(sounding()).toEqual([]);
  });
});
