import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { shipsDataFile } from './copyData';

/** The sprites a registry names: each is fetched from Data/ at run time. */
function namedDataFiles(registry: string): string[] {
  const text = readFileSync(registry, 'utf8');
  return [...new Set([...text.matchAll(/'([A-Za-z0-9]+\/[\w./-]+\.(?:OZJ|OZT))'/g)].map(m => m[1]))].sort();
}

describe('copyData', () => {
  it('ships every effect texture the client loads', () => {
    const named = namedDataFiles('src/controllers/fx/recipes.ts');
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every flare card sheet', () => {
    const named = namedDataFiles('src/controllers/lighting/effectLights.ts');
    expect(named.length).toBeGreaterThan(7);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every bitmap a dropped body part is drawn with', () => {
    const named = namedDataFiles('src/controllers/actors/skinTexture.ts');
    expect(named.length).toBe(4);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('follows the rules', () => {
    expect(shipsDataFile('Skill/magic_a01.OZJ')).toBe(true);
    expect(shipsDataFile('World74/mini_map.OZT')).toBe(true);
    expect(shipsDataFile('World74/EncTerrain74.att')).toBe(false);
    expect(shipsDataFile('gate.bmd')).toBe(true);
  });
});
