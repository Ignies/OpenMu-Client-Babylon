import { afterEach, describe, expect, it } from 'vitest';
import { itemIconPackChain } from './itemIconPack';
import { resetLiteAssets, setLiteAssetsGate, setLiteVariants } from './liteAssets';

afterEach(() => resetLiteAssets());

describe('itemIconPackChain with lighter copies', () => {
  const kris = { group: 0, num: 0, lvl: 0 } as Parameters<typeof itemIconPackChain>[0];

  it('tries the WebP copy before its PNG only where it is wanted and listed', () => {
    const plain = itemIconPackChain(kris);
    expect(plain[0]).toBe('/items/item_0_0_0.png');

    setLiteVariants(['./items/item_0_0_0.webp']);
    expect(itemIconPackChain(kris)).toEqual(plain);

    setLiteAssetsGate(() => true);
    // The PNG stays next in the chain: a copy that fails to load falls back to it.
    expect(itemIconPackChain(kris)).toEqual(['/items/item_0_0_0.webp', ...plain]);
  });
});
