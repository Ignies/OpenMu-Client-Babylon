import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { shipsDataFile } from './copyData';

/** The effect texture registry: every sprite it names is fetched from Data/ at run time. */
function namedDataFiles(): string[] {
  const text = readFileSync('src/controllers/fx/recipes.ts', 'utf8');
  return [...new Set([...text.matchAll(/'([A-Za-z]+\/[\w./-]+\.(?:OZJ|OZT))'/g)].map(m => m[1]))].sort();
}

describe('copyData', () => {
  it('ships every effect texture the client loads', () => {
    const named = namedDataFiles();
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('follows the rules', () => {
    expect(shipsDataFile('Skill/magic_a01.OZJ')).toBe(true);
    expect(shipsDataFile('World74/mini_map.OZT')).toBe(true);
    expect(shipsDataFile('World74/EncTerrain74.att')).toBe(false);
    expect(shipsDataFile('gate.bmd')).toBe(true);
  });
});
