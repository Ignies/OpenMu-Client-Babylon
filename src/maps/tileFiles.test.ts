import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../common/types';
import { maps } from './index';

/**
 * A tile slot naming a file its world folder does not have kills the warp:
 * the terrain files go out in one `Promise.all` (`getTerrainData.ts`), so one
 * 404 rejects the load and the client stays on the map it was on. World7 had
 * that for TileGround01 and the arena was unreachable. Each entry substitutes
 * a tile its folder does have (`src/maps/<name>/index.ts`); this checks it.
 */
const ASSETS = path.join(process.cwd(), 'public', 'game-assets');

describe('map tile slots', () => {
  it('name a file that exists in the world folder', () => {
    const missing: string[] = [];

    for (const layer of maps.all) {
      for (const world of layer.worlds) {
        const worldNum = maps.assetWorldNum(world);
        const folder = path.join(ASSETS, `World${worldNum}`);
        // A world whose art is not in this tree at all: nothing to check.
        if (!fs.existsSync(folder)) continue;

        for (const tile of layer.tiles) {
          if (fs.existsSync(path.join(folder, `${tile}.OZJ`))) continue;
          missing.push(`${ENUM_WORLD[world]}: World${worldNum}/${tile}.OZJ`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
