import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';
import {
  HEARTH_DUST,
  HOUSE_HEARTH_DUST,
  LORENCIA_LEAVES,
  NORIA_PETALS,
  TAVERN_DUST,
  allDustRooms,
  ambientDustFor,
  ambientLeavesFor,
} from './ambientWeather';
import { alwaysRains } from './rainState';

describe("a map's weather row", () => {
  it('picks the leaves the map names', () => {
    expect(ambientLeavesFor(ENUM_WORLD.WD_0LORENCIA)).toBe(LORENCIA_LEAVES);
    expect(ambientLeavesFor(ENUM_WORLD.WD_3NORIA)).toBe(NORIA_PETALS);
    expect(ambientLeavesFor(ENUM_WORLD.WD_2DEVIAS)).toBeNull();
  });

  it('names its dust rooms, and every map lists them in map order', () => {
    expect(ambientDustFor(ENUM_WORLD.WD_2DEVIAS).map(r => r.recipe)).toEqual([
      HEARTH_DUST,
      TAVERN_DUST,
      HOUSE_HEARTH_DUST,
      HOUSE_HEARTH_DUST,
    ]);
    expect(ambientDustFor(ENUM_WORLD.WD_3NORIA)).toEqual([]);
    expect(allDustRooms().map(r => r.world)).toEqual([
      ENUM_WORLD.WD_0LORENCIA,
      ...Array(4).fill(ENUM_WORLD.WD_2DEVIAS),
    ]);
  });

  it('rains for good where the map says so, on every world it serves', () => {
    for (const w of maps.worldsOf('devilsquare')) expect(alwaysRains(w)).toBe(true);
    expect(alwaysRains(ENUM_WORLD.WD_10ICARUS)).toBe(true);
    expect(alwaysRains(ENUM_WORLD.WD_0LORENCIA)).toBe(false);
  });
});
