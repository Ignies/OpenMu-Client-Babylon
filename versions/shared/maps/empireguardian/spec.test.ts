import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';
import type { World } from '@/ecs/world';
import { EMPIRE_GUARDIAN_4_LIGHTS } from '../empireguardian4/spec';
import { EmpireGuardian4WallTorchObject } from '../empireguardian4/wallTorchObject';
import { createEmpireGuardian } from './create';

const DAYS = [ENUM_WORLD.WD_69EMPIREGUARDIAN1, ENUM_WORLD.WD_70EMPIREGUARDIAN2, ENUM_WORLD.WD_71EMPIREGUARDIAN3];

describe('the fortress days 1-3', () => {
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
