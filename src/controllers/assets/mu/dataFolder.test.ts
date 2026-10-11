import { describe, expect, it } from 'vitest';
import type { VersionData } from '../../../version/contract';
import { dataUrl, hasData } from './dataFolder';

const season6: VersionData = { folder: './Data/', assets: './game-assets/', locale: 'Eng', worlds: [] };

const period: VersionData = {
  folder: './Data-v097d/',
  assets: './game-assets-v097d/',
  locale: '',
  worlds: [],
  inventory: new Set(['gate.bmd', 'interface/cursor.ozt']),
  borrows: {
    assets: './game-assets/',
    ownAssets: new Set(),
    folder: './Data/',
    folderPaths: ['interface/', 'object1/notice.ozj'],
  },
};

describe('the original Data/ tree a path is read from', () => {
  it('is the version folder for everything when it keeps no inventory', () => {
    expect(dataUrl(season6, 'Interface/newui_menu01.OZJ')).toBe('./Data/Interface/newui_menu01.OZJ');
    expect(hasData(season6, 'Object1/notice.OZJ')).toBe(true);
  });

  it('is the version folder for a file it ships, even under a borrowed path', () => {
    expect(dataUrl(period, '/gate.bmd')).toBe('./Data-v097d/gate.bmd');
    expect(dataUrl(period, 'Interface/Cursor.ozt')).toBe('./Data-v097d/Interface/Cursor.ozt');
    expect(hasData(period, 'Interface/Cursor.ozt')).toBe(true);
  });

  it('is the borrowed folder for a missing file under a borrowed path', () => {
    expect(dataUrl(period, 'Interface/newui_menu01.OZJ')).toBe('./Data/Interface/newui_menu01.OZJ');
    expect(dataUrl(period, 'Object1/notice.OZJ')).toBe('./Data/Object1/notice.OZJ');
    expect(hasData(period, 'Object1/notice.OZJ')).toBe(true);
  });

  it('answers absent for a missing file nobody lends', () => {
    expect(hasData(period, 'Effect/firehik_mono03.OZJ')).toBe(false);
    expect(dataUrl(period, 'Effect/firehik_mono03.OZJ')).toBe('./Data-v097d/Effect/firehik_mono03.OZJ');
  });
});
