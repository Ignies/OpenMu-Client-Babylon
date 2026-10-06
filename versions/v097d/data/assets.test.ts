import { readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { V097D_ASSET_FILES } from './assets';

/**
 * The list is what sends a converted file to Season 6's tree or keeps it on
 * this version's, so it must be the tree. Regenerate with the command in
 * `assets.ts` when `public/game-assets-v097d/` changes.
 */
const ROOT = resolve(__dirname, '../../../public/game-assets-v097d');
const SEASON6 = resolve(__dirname, '../../../public/game-assets');

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    // gzip sidecars are build output (tools/compressAssets.ts), never listed.
    else if (!entry.name.endsWith('.gz')) out.push(rel);
  }

  return out;
}

/** Same bytes at the same path, in its case, in Season 6's tree, which `borrows` already serves. */
function season6Copy(rel: string): boolean {
  const own = join(ROOT, rel);
  const theirs = join(SEASON6, rel);
  let names: string[];
  try {
    names = readdirSync(dirname(theirs));
  } catch {
    return false;
  }
  return (
    names.includes(basename(rel)) &&
    statSync(theirs).size === statSync(own).size &&
    readFileSync(own, 'latin1') === readFileSync(theirs, 'latin1')
  );
}

describe('v097d converted asset list', () => {
  it('lists exactly what public/game-assets-v097d contains', () => {
    expect([...V097D_ASSET_FILES].sort()).toEqual(walk(ROOT).map(f => f.toLowerCase()).sort());
  });

  it('ships no file Season 6 already serves byte for byte', () => {
    expect(walk(ROOT).filter(season6Copy)).toEqual([]);
  });
});
