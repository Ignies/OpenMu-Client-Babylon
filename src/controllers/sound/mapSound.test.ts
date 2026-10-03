import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ENUM_WORLD } from '../../core/types';
import { maps, type MapLayer } from '../maps';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { chaosCastleTimer } from '../../modules/events/chaosCastle';
import { ambientBedsFor, ambientBedsLayer, ambientOneShotsFor } from './ambientBeds';
import { objectLoopsFor, OBJECT_LOOPS } from './objectLoops';
import { mapMonsterCues } from './mapMonsters';
import { mapMusic } from './music';

// A world no real entry claims, served by a test entry with every kind of row.
const W = 210 as ENUM_WORLD;
const OTHER = 0 as ENUM_WORLD;

const entry: MapLayer = {
  name: 'zzSound',
  worlds: [W],
  tiles: [],
  sound: {
    beds: [{ sound: 'Sound/aWind', volume: 0.35, when: 'chaosCastleRunning' }],
    oneShots: [{ sound: 'Sound/aForest', oneIn: 512, volume: 0.45 }],
    music: 'Music/Noria',
    objectLoops: [
      { types: [1], sound: 'Sound/aWater', gain: 0.3, reach: 'small' },
      { types: [2], sound: 'Sound/aTower', gain: 0.3, reach: { full: 3, silent: 9 } },
    ],
    monsterCues: { 900: [{ on: [A.Die], play: 'Sound/aWind' }] },
    monsterCuesAnyMap: { 901: [{ on: [A.Die], play: 'Sound/aRain' }] },
  },
};

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe("a map's sound rows", () => {
  it('are read when asked, so an entry added later is heard', () => {
    expect(ambientBedsLayer.maps?.has(W)).toBe(false);
    unregister = maps.register(entry);
    expect(ambientBedsLayer.maps?.has(W)).toBe(true);
    expect(mapMusic(W)).toBe('Music/Noria');
    expect(ambientOneShotsFor(W)).toHaveLength(1);
  });

  it('answer a named gate with the event state', () => {
    unregister = maps.register(entry);
    const [bed] = ambientBedsFor(W);
    const timer = chaosCastleTimer() as { running: boolean };
    timer.running = false;
    expect(bed.when?.()).toBe(false);
    timer.running = true;
    expect(bed.when?.()).toBe(true);
    timer.running = false;
    // Resolved once per row list.
    expect(ambientBedsFor(W)).toBe(ambientBedsFor(W));
  });

  it('turn an object loop reach into tiles', () => {
    unregister = maps.register(entry);
    const [small, own] = objectLoopsFor(W);
    expect([small.full, small.silent]).toEqual([2, 14]);
    expect([own.full, own.silent]).toEqual([3, 9]);
    expect(OBJECT_LOOPS.get(W)).toBe(objectLoopsFor(W));
  });

  it('voice a monster on the map, and an unguarded hook on every map', () => {
    unregister = maps.register(entry);
    expect(mapMonsterCues(W, 900)).toHaveLength(1);
    expect(mapMonsterCues(OTHER, 900)).toBeNull();
    expect(mapMonsterCues(OTHER, 901)).toBe(mapMonsterCues(W, 901));
    expect(mapMonsterCues(OTHER, 901)).toHaveLength(1);
  });
});
