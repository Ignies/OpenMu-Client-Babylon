import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the model.ts files instead of running them (the golden in src/controllers/actors runs them):
 * every registration names a class its own file defines, and together they cover the types the old
 * ModelFactoryPerId map gave a class of its own.
 */
const DIR = 'versions/shared/monsters';
const MONSTERS = [1, 2, 3, 14, 15, 16, 35, 43, 53, 54, 55, 56, 78, 79, 80, 81, 82, 83, 131, 132, 133, 134, 275, 349, 459, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502];
const NPCS = [34, 230, 232, 233, 236, 248, 250, 253, 255, 257, 258, 371, 414];

const files = readdirSync(DIR)
  .filter(d => existsSync(join(DIR, d, 'model.ts')))
  .map(d => join(DIR, d, 'model.ts'));

const registrations = files.flatMap(file => {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/registerModelClass\(\s*(\[[^\]]*\]|\d+)\s*,\s*(\w+)\s*\)/g)].map(m => ({
    file,
    types: JSON.parse(m[1].startsWith('[') ? m[1] : `[${m[1]}]`) as number[],
    cls: m[2],
    defined: new RegExp(`export (abstract )?(class ${m[2]}\\b|const ${m[2]} =)`).test(text),
  }));
});

describe('monster and NPC model classes', () => {
  it('register classes their own file defines', () => {
    expect(registrations.filter(r => !r.defined)).toEqual([]);
  });

  it('cover every type that has its own look, once', () => {
    const types = registrations.flatMap(r => r.types).sort((a, b) => a - b);
    expect(types).toEqual([...MONSTERS, ...NPCS].sort((a, b) => a - b));
  });

  it('are all loaded at boot', () => {
    const models = readFileSync(join(DIR, 'models.ts'), 'utf8');
    expect(models).toContain("'./*/model.ts'");
  });
});
