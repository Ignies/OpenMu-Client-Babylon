import { afterEach, describe, expect, it } from 'vitest';
import type { ENUM_WORLD } from '../../core/types';
import { forWorld, maps, type MapLayer } from './index';

// Two worlds no real entry claims, served by one test entry.
const A = 200 as ENUM_WORLD;
const B = 201 as ENUM_WORLD;

const entry = (over: Partial<MapLayer> = {}): MapLayer => ({
  name: 'zzTest',
  worlds: [A, B],
  tiles: [],
  ...over,
});

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe('a map row', () => {
  it('is one value for every world the entry serves', () => {
    unregister = maps.register(entry({ sound: { music: 'Music/Noria' } }));
    expect(maps.rowFor(A, l => l.sound?.music)).toBe('Music/Noria');
    expect(maps.rowFor(B, l => l.sound?.music)).toBe('Music/Noria');
  });

  it('can differ per world, and a world left out has none', () => {
    unregister = maps.register(entry({ sound: { music: { byWorld: { [A]: null } } } }));
    expect(maps.rowFor(A, l => l.sound?.music)).toBeNull();
    expect(maps.rowFor(B, l => l.sound?.music)).toBeUndefined();
  });

  it('is undefined where no entry claims the world', () => {
    expect(maps.rowFor(202 as ENUM_WORLD, l => l.sound?.music)).toBeUndefined();
  });

  it('resolves through forWorld the same way', () => {
    expect(forWorld({ byWorld: { [A]: 1 } }, A)).toBe(1);
    expect(forWorld({ byWorld: { [A]: 1 } }, B)).toBeUndefined();
    expect(forWorld(2, B)).toBe(2);
    expect(forWorld<number>(undefined, A)).toBeUndefined();
  });
});

describe('the live views', () => {
  it('a worldSet made before the entry follows register and unregister', () => {
    const wet = maps.worldSet(l => l.weather?.wetGround === true);
    expect(wet.has(A)).toBe(false);

    unregister = maps.register(entry({ weather: { wetGround: true } }));
    expect(wet.has(A)).toBe(true);
    expect([...wet]).toEqual(expect.arrayContaining([A, B]));
    expect(wet.size).toBe([...wet].length);

    unregister();
    unregister = null;
    expect(wet.has(A)).toBe(false);
  });

  it('a worldMap answers only the claimed worlds it has a value for', () => {
    const music = maps.worldMap(w => maps.rowFor(w, l => l.sound?.music) ?? undefined);
    unregister = maps.register(entry({ sound: { music: { byWorld: { [B]: 'Music/Noria' } } } }));
    expect(music.get(B)).toBe('Music/Noria');
    expect(music.has(A)).toBe(false);
    expect(music.get(202 as ENUM_WORLD)).toBeUndefined();
    expect([...music.keys()]).toContain(B);
  });
});
