import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parseTerrainMapping } from '@/controllers/terrain/parseTerrainMapping';
import { TERRAIN_SIZE } from '@/controllers/terrain/consts';
import { bloodcastleLayer } from './index';
import { BLOOD_CASTLE_MOAT } from './spec';

const WORLD = 'public/game-assets/World12';

// The deck the bridge lays over the moat is the moat tiles' own texture: slot 8, TileRock02.jpg
// (MapManager.cpp:1408-1409), drawn once the tiles lose TW_NOGROUND (ZzzLodTerrain.cpp:1588).
describe('the Blood Castle bridge deck', () => {
  it('is World12/TileRock02 on every moat tile, and the file ships', async () => {
    const map = await parseTerrainMapping(new Uint8Array(readFileSync(`${WORLD}/EncTerrain12.map`)));
    const { x, y, w, h } = BLOOD_CASTLE_MOAT;
    const slots = new Set<string>();
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        const i = ty * TERRAIN_SIZE + tx;
        slots.add(`${map.layer1[i]}/${map.alpha[i]}`);
      }
    }

    expect([...slots]).toEqual(['8/0']);
    expect(bloodcastleLayer.tiles[8]).toBe('TileRock02');
    expect(existsSync(`${WORLD}/TileRock02.OZJ`)).toBe(true);
  });
});
