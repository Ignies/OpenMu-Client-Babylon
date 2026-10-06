import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VersionData } from '../../version/contract';

let data: VersionData = { folder: './Data/', assets: './game-assets/', locale: 'Eng' };
vi.mock('../../version', () => ({
  get gameVersion() {
    return { data };
  },
}));

// The setup file's maps already loaded the catalogue against the real version.
vi.resetModules();
const { soundUrl } = await import('./recipes');

describe('soundUrl', () => {
  beforeEach(() => {
    data = { folder: './Data/', assets: './game-assets/', locale: 'Eng' };
  });

  it('is the catalogue file under the version assets', () => {
    expect(soundUrl('Sound/aTower')).toBe('./game-assets/Sound/aTower.ogg');
  });

  it('is the file a version ships itself when it names one for the key', () => {
    data = {
      folder: './Data-v097d/',
      assets: './game-assets-v097d/',
      locale: '',
      sounds: { 'Sound/aTower': 'Sound/aTower.wav' },
      borrows: { assets: './game-assets/', ownAssets: new Set(['sound/atower.wav']) },
    };

    expect(soundUrl('Sound/aTower')).toBe('./game-assets-v097d/Sound/aTower.wav');
    // A key it does not name keeps the catalogue file, from the borrowed tree.
    expect(soundUrl('Sound/eBow')).toBe('./game-assets/Sound/eBow.ogg');
  });
});
