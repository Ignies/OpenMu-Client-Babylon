import { afterEach, describe, expect, it } from 'vitest';
import type { ENUM_WORLD } from '../../core/types';
import { maps, type MapLayer } from '../maps';
import { DEFAULT_PROFILE, areaProfile, profileFor } from './profiles';
import { lightEmittersFor } from './mapObjectLights';
import { skyLayer } from './sky';

// Two worlds no real entry claims, served by one test entry.
const A = 220 as ENUM_WORLD;
const B = 221 as ENUM_WORLD;

const entry = (over: Partial<MapLayer> = {}): MapLayer => ({
  name: 'zzLighting',
  worlds: [A, B],
  tiles: [],
  ...over,
});

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe("a map's lighting rows", () => {
  it('lay the look over the open default, or the enclosed one', () => {
    unregister = maps.register(
      entry({
        outdoor: true,
        lighting: { look: { byWorld: { [A]: { ev: 0.5 }, [B]: { over: 'enclosed', ev: 0.7 } } } },
      })
    );
    const open = profileFor(A);
    expect(open.ev).toBe(0.5);
    expect(open.sky).toBe(DEFAULT_PROFILE.sky);
    const enclosed = profileFor(B);
    expect(enclosed.ev).toBe(0.7);
    expect(enclosed.sky).toBeNull();
    // Composed once per row.
    expect(profileFor(A)).toBe(open);
  });

  it('fall back to the default the sky picks when the map has no look', () => {
    unregister = maps.register(entry({ outdoor: true }));
    expect(profileFor(A)).toBe(DEFAULT_PROFILE);
  });

  it('name room looks, light object types and mark thunder', () => {
    unregister = maps.register(
      entry({
        lighting: {
          areas: { zzRoom: { keyLevel: 1.2, candles: 2 } },
          objectLights: { 7: [{ terrain: { range: 2, color: [1, 1, 1] } }] },
          thunder: true,
        },
      })
    );
    expect(areaProfile('zzRoom')?.keyLevel).toBe(1.2);
    expect(areaProfile('zzRoom')?.candles).toBe(2);
    expect(areaProfile('zzNoSuchRoom')).toBeUndefined();
    expect(lightEmittersFor(B, 7)).toHaveLength(1);
    expect(lightEmittersFor(B, 8)).toBeUndefined();
    expect(skyLayer.maps?.has(A)).toBe(true);
  });
});
