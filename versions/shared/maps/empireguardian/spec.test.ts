import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '@/core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';
import type { World } from '@/ecs/world';
import { EMPIRE_GUARDIAN_4_LIGHTS } from '../empireguardian4/spec';
import { EmpireGuardian4WallTorchObject } from '../empireguardian4/wallTorchObject';
import { createEmpireGuardian } from './create';

const DAYS = [ENUM_WORLD.WD_69EMPIREGUARDIAN1, ENUM_WORLD.WD_70EMPIREGUARDIAN2, ENUM_WORLD.WD_71EMPIREGUARDIAN3];

describe('the fortress days 1-3', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  // `MoveObject` only hides 79 and case 79 draws a sprite and its fire: no `AddTerrainLight`
  // (GMEmpireGuardian1.cpp:264-278, :1689-1711, and the copies in 2 and 3).
  it('light no ground under the braziers (79) on Classic, as the original', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const day of DAYS) {
      expect(lightEmittersFor(day, 79)?.[0], ENUM_WORLD[day]).toMatchObject({ sprite: { scale: 2, color: [1, 0.2, 0] } });
      expect(lightEmittersFor(day, 79)?.[0].terrain, ENUM_WORLD[day]).toBeUndefined();
    }
  });

  it('light it on Enhanced (the fortressLights improvement)', () => {
    for (const day of DAYS) expect(lightEmittersFor(day, 79)?.[0].terrain?.range, ENUM_WORLD[day]).toBe(3);
  });

  // Each day's case 80 is day 4's: `CreateSprite(BITMAP_LIGHT, o->Position, 8.0f * o->Scale, ...)` breathing blue
  // (GMEmpireGuardian1.cpp:1713-1721, 2.cpp:698-706, 3.cpp:887-895). Day 2 places it once, day 3 six times.
  it('draw the blue lamp (80) as day 4 does', () => {
    for (const day of DAYS) expect(lightEmittersFor(day, 80), ENUM_WORLD[day]).toBe(EMPIRE_GUARDIAN_4_LIGHTS[80]);
  });

  // Case 37 is day 4's wall torch on every day (GMEmpireGuardian1.cpp:1621-1632, 2.cpp:607-618, 3.cpp:796-807);
  // EncTerrain70-72 place none, so this only keeps the table with the source.
  it('bind the wall torch (37) to day 4\'s', async () => {
    for (const day of DAYS) {
      const tiles: unknown[] = [];
      await createEmpireGuardian({ mapIndex: day, terrain: { MapTileObjects: tiles } } as unknown as World);
      expect(tiles[37], ENUM_WORLD[day]).toBe(EmpireGuardian4WallTorchObject);
    }
  });
});
