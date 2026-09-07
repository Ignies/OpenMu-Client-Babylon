import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { canonicalAssetPath, expectedModelPaths } from './assetCase';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSETS = join(ROOT, 'public/game-assets');
const SRC = join(ROOT, 'src');

/**
 * NPC 68 (monster model 49) has no row in `monsters.json` and `Data/` ships no
 * `Monster50.bmd`, so nothing can spawn it. An unreachable table row, not a
 * missing conversion.
 */
const NO_SOURCE_BMD = new Set(['Monster/Monster50.glb']);

function filesUnder(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, base));
    else out.push(relative(base, path).split('\\').join('/'));
  }
  return out;
}

const onDisk = new Map(filesUnder(ASSETS).map(f => [f.toLowerCase(), f]));

/** Quoted `<folder>/<name>.glb` literals in the client. */
function glbLiteralsInSource(): string[] {
  const found = new Set<string>();
  for (const file of filesUnder(SRC)) {
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(join(SRC, file), 'utf8');
    for (const [, path] of text.matchAll(
      /['"]([A-Za-z0-9_-]+\/[A-Za-z0-9_/-]+\.glb)['"]/g
    )) {
      found.add(path);
    }
  }
  return [...found].sort();
}

function soundCatalogue(): string[] {
  const json = JSON.parse(
    readFileSync(join(SRC, 'sound/recipes.json'), 'utf8')
  ) as Record<string, string>;
  return [...new Set(Object.values(json))].sort();
}

/**
 * A model whose name is spelled differently on disk than the client spells it
 * is served fine by Windows and 404s on the Linux host, where the loader
 * stands a magenta placeholder in the monster's place. Nothing in the app
 * catches that, so it is caught here.
 */
describe('asset filename case', () => {
  const expected = [
    ...expectedModelPaths(),
    ...glbLiteralsInSource(),
    ...soundCatalogue().map(p => p.replace(/^[./]+/, '')),
  ];

  it('spells every asset the client asks for the way the client asks', () => {
    const wrong: string[] = [];
    for (const path of expected) {
      if (NO_SOURCE_BMD.has(path)) continue;
      const actual = onDisk.get(path.toLowerCase());
      if (actual === undefined) wrong.push(`${path}: not converted`);
      else if (actual !== path) wrong.push(`${path}: on disk as ${actual}`);
    }
    expect(wrong).toEqual([]);
  });

  it('leaves nothing for the converter to rename', () => {
    const drifted = [...onDisk.values()]
      .filter(f => canonicalAssetPath(f) !== f)
      .map(f => `${f} -> ${canonicalAssetPath(f)}`);
    expect(drifted).toEqual([]);
  });
});
