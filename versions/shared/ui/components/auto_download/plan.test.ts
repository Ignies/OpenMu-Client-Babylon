import { describe, expect, it } from 'vitest';
import type { AssetGroup } from '@/controllers/assets/assetDownload';
import { currentGroup, firstRunDue, isEssential } from './plan';

const group = (id: string, kind: AssetGroup['kind'], bytes = 10, bundle?: number): AssetGroup =>
  ({ id, kind, name: id, files: 1, bytes, transfer: bytes, dirs: [], ...(bundle ? { bundle: { url: '', bytes: bundle } } : {}) }) as AssetGroup;

describe('the first-run plan', () => {
  it('waits for the interface, creatures, icons and the main towns, not the music or far maps', () => {
    expect(isEssential(group('core', 'core'))).toBe(true);
    expect(isEssential(group('monsters', 'monsters'))).toBe(true);
    expect(isEssential(group('icons', 'icons'))).toBe(true);
    expect(isEssential(group('map:1', 'map'))).toBe(true);
    expect(isEssential(group('audio', 'audio'))).toBe(false);
    expect(isEssential(group('map:38', 'map'))).toBe(false);
  });

  it('runs once per build', () => {
    expect(firstRunDue(null, 'b1')).toBe(true);
    expect(firstRunDue('b1', 'b1')).toBe(false);
    expect(firstRunDue('b1', 'b2')).toBe(true);
  });

  it('names the group the run is in, counting bundles by their size', () => {
    const groups = [group('core', 'core', 10, 6), group('audio', 'audio', 50), group('map:1', 'map', 20)];
    const chosen = (g: AssetGroup) => g.id !== 'audio';
    expect(currentGroup(groups, chosen, 0)?.id).toBe('core');
    expect(currentGroup(groups, chosen, 7)?.id).toBe('map:1');
    expect(currentGroup(groups, chosen, 26)).toBeUndefined();
  });
});
