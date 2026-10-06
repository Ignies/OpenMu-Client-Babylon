import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { V097D_ASSET_FILES } from './assets';

/**
 * The list is what sends a converted file to Season 6's tree or keeps it on
 * this version's, so it must be the tree. Regenerate with the command in
 * `assets.ts` when `public/game-assets-v097d/` changes.
 */
const ROOT = resolve(__dirname, '../../../public/game-assets-v097d');

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    // gzip sidecars are build output (tools/compressAssets.ts), never listed.
    else if (!entry.name.endsWith('.gz')) out.push(rel.toLowerCase());
  }

  return out;
}

describe('v097d converted asset list', () => {
  it('lists exactly what public/game-assets-v097d contains', () => {
    expect([...V097D_ASSET_FILES].sort()).toEqual(walk(ROOT).sort());
  });
});
