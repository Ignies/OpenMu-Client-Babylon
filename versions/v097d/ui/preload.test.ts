import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { dataUrl, hasData } from '@/controllers/assets/mu/dataFolder';
import { v097dData } from '../data';

// The window layouts behind Season 6's list read `location` when they load.
vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { v097dPreload } = await import('./preload');

const REPO = resolve(__dirname, '../../..');

/** Exact-case existence of a `./Data/...` or `./Data-v097d/...` url. */
function onDisk(url: string): boolean {
  let dir = REPO;
  for (const part of url.replace(/^\.\//, '').split('/')) {
    if (!readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

describe('0.97d world sprites', () => {
  it('are the Season 6 HUD sheets, each read from a tree that has it', () => {
    const sheets = v097dPreload.worldSprites.map(file => `Interface/${file}`);

    expect(sheets).toContain('Interface/newui_menu01.OZJ');
    expect(sheets.filter(sheet => !hasData(v097dData, sheet) || !onDisk(dataUrl(v097dData, sheet)))).toEqual([]);
  });
});
