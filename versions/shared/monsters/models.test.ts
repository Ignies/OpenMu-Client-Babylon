import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Model classes load browser code (PlayerObject reaches the Store), so this reads the model.ts files
 * instead of running them: every registration names a class its own file defines, and together they
 * cover the types the old ModelFactoryPerId map gave a monster class.
 */
const DIR = 'versions/shared/monsters';
const EXPECTED = [1, 2, 3, 14, 15, 16, 35, 43, 53, 54, 55, 56, 78, 79, 80, 81, 82, 83, 131, 132, 133, 134, 275, 349, 459, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502];

const registrations = readdirSync(DIR)
  .filter(d => existsSync(join(DIR, d, 'model.ts')))
  .flatMap(d => {
    const text = readFileSync(join(DIR, d, 'model.ts'), 'utf8');
    return [...text.matchAll(/registerModelClass\(\s*(\[[^\]]*\]|\d+)\s*,\s*(\w+)\s*\)/g)].map(m => ({
      folder: d,
      types: JSON.parse(m[1].startsWith('[') ? m[1] : `[${m[1]}]`) as number[],
      cls: m[2],
      defined: new RegExp(`export (abstract )?class ${m[2]}\\b`).test(text),
    }));
  });

describe('monster model classes', () => {
  it('register classes their own file defines', () => {
    expect(registrations.filter(r => !r.defined)).toEqual([]);
  });

  it('cover every monster type that has its own look, once', () => {
    const types = registrations.flatMap(r => r.types).sort((a, b) => a - b);
    expect(types).toEqual(EXPECTED);
  });
});
