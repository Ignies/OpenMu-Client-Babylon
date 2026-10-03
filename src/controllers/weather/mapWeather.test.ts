import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';
import { LORENCIA_LEAVES, NORIA_PETALS, ambientLeavesFor } from './ambientWeather';
import { alwaysRains } from './rainState';

describe("a map's weather row", () => {
  it('picks the leaves the map names', () => {
    expect(ambientLeavesFor(ENUM_WORLD.WD_0LORENCIA)).toBe(LORENCIA_LEAVES);
    expect(ambientLeavesFor(ENUM_WORLD.WD_3NORIA)).toBe(NORIA_PETALS);
    expect(ambientLeavesFor(ENUM_WORLD.WD_2DEVIAS)).toBeNull();
  });

  it('rains for good where the map says so, on every world it serves', () => {
    for (const w of maps.worldsOf('devilsquare')) expect(alwaysRains(w)).toBe(true);
    expect(alwaysRains(ENUM_WORLD.WD_10ICARUS)).toBe(true);
    expect(alwaysRains(ENUM_WORLD.WD_0LORENCIA)).toBe(false);
  });
});
