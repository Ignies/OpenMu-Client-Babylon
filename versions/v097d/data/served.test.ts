import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { assetUrl } from '@/controllers/assets/resolveUrlToDataFolder';
import { SOUND_FILES } from '@/controllers/sound/recipes';
import { v097dData } from './index';
import { V097D_SOUNDS } from './sounds';

/**
 * What the 0.97d client asks for is a file that exists, in the case it is
 * asked for, in the tree it is resolved to: its own `public/game-assets-v097d/`
 * or Season 6's `public/game-assets/`. A miss there is the dev server's
 * index.html decoded as a sound or a model.
 */
const PUBLIC = resolve(__dirname, '../../../public');
const listings = new Map<string, Set<string>>();

function listing(dir: string): Set<string> {
  let names = listings.get(dir);
  if (!names) {
    try {
      names = new Set(readdirSync(dir));
    } catch {
      names = new Set();
    }
    listings.set(dir, names);
  }
  return names;
}

/** Exact-case existence of a served url (`./game-assets-v097d/Sound/x.wav`). */
function served(url: string): boolean {
  let dir = PUBLIC;
  for (const part of url.replace(/^\.\//, '').split('/')) {
    if (!listing(dir).has(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

describe('0.97d sounds', () => {
  it('ships its own file for the 42 sounds and 1 track that differ from Season 6', () => {
    const files = Object.values(V097D_SOUNDS);
    expect(files.filter(f => f.startsWith('Sound/'))).toHaveLength(42);
    expect(files.filter(f => f.startsWith('Music/'))).toEqual(['Music/MuTheme.mp3']);

    for (const [key, file] of Object.entries(V097D_SOUNDS)) {
      expect(SOUND_FILES[key], key).toBeDefined();
      expect(assetUrl(v097dData, file)).toBe(`./game-assets-v097d/${file}`);
    }
  });

  it('serves every catalogue key from a file that exists', () => {
    const missing = Object.entries(SOUND_FILES)
      .map(([key, file]) => assetUrl(v097dData, v097dData.sounds?.[key] ?? file))
      .filter(url => !served(url));

    expect(missing).toEqual([]);
  });
});
