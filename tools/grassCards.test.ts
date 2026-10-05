import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'Data');
const ASSETS = join(ROOT, 'public/game-assets');

/**
 * The terrain reads a world's grass cards (`TileGrass01/02/03.OZT`) from the converted assets, and a
 * missing card means "no grass in this slot" (terrainGrassCards.ts). So every card the original
 * ships for a converted world has to be there, or that grass silently never grows.
 */
describe.skipIf(!existsSync(DATA) || !existsSync(ASSETS))('grass cards', () => {
  it('ship with every converted world that has them in Data/', () => {
    const missing: string[] = [];
    for (const world of readdirSync(DATA).filter(d => /^World\d+$/.test(d))) {
      if (!existsSync(join(ASSETS, world))) continue;
      for (const card of ['TileGrass01.OZT', 'TileGrass02.OZT', 'TileGrass03.OZT']) {
        if (existsSync(join(DATA, world, card)) && !existsSync(join(ASSETS, world, card))) missing.push(`${world}/${card}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
