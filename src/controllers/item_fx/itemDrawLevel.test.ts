import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { GameOptions } from '@/controllers/settings';
import { itemVisualTier } from './itemVisualTier';

GameOptions.effectLevel = 4;

/** The level an item is drawn at, in the bag (or worn), or on the ground. */
function drawn(group: number, num: number, lvl: number, ground = false): number {
  return itemVisualTier({ group, num, lvl } as never, ground).level;
}

// RenderPartObjectEffect's switch on the model (ZzzObject.cpp:9419-9563), before the render-level cap.
describe('the per-item draw level', () => {
  it('draws the jewels, compressed ones too, as +8', () => {
    for (const [g, n] of [[14, 13], [14, 14], [14, 16], [14, 22], [14, 31], [12, 15], [12, 30], [12, 31], [12, 136], [12, 137], [12, 138], [12, 141]]) {
      expect(drawn(g, n, 0), `${g}/${n}`).toBe(8);
    }
    expect(drawn(14, 25, 0)).toBe(8); // Tear of Elf
    expect(drawn(14, 26, 0)).toBe(8); // Soul Shard of Wizard
  });

  it('draws the transformation rings as +13, the plain one and the Horn of Dinorant as +8', () => {
    for (const n of [39, 40, 41, 42]) expect(drawn(13, n, 0)).toBe(13);
    expect(drawn(14, 51, 0)).toBe(13); // Christmas Star
    expect(drawn(13, 10, 2)).toBe(8);
    expect(drawn(13, 3, 0)).toBe(8);
  });

  it('draws wings, capes, harmony, refine stones and the gemstone at +0', () => {
    for (const [g, n] of [[12, 0], [12, 3], [12, 36], [12, 50], [13, 30], [12, 49], [14, 41], [14, 42], [14, 43], [14, 44], [12, 139], [12, 140], [13, 52], [13, 53], [14, 64]]) {
      expect(drawn(g, n, 11), `${g}/${n}`).toBe(0);
    }
  });

  it('draws the orbs and crystals as +9, the summoning orb at +0', () => {
    expect(drawn(12, 7, 0)).toBe(9);
    expect(drawn(12, 14, 0)).toBe(9);
    expect(drawn(12, 44, 0)).toBe(9);
    expect(drawn(12, 11, 3)).toBe(0);
  });

  it('halves the Devil Square tickets up to +6 and draws +7 as +13', () => {
    expect(drawn(14, 17, 5)).toBe(2);
    expect(drawn(14, 19, 6)).toBe(3);
    expect(drawn(14, 18, 7)).toBe(13);
  });

  it('draws arrows and bolts at twice their level plus one', () => {
    expect(drawn(4, 15, 0)).toBe(0);
    expect(drawn(4, 15, 1)).toBe(3);
    expect(drawn(4, 7, 2)).toBe(5);
  });

  it('draws the Heart at +8 and the Remedy of Love at +9 at any level', () => {
    expect(drawn(14, 12, 0)).toBe(8);
    expect(drawn(14, 12, 2)).toBe(8);
    expect(drawn(14, 20, 0)).toBe(9);
  });

  it('draws the ground models CreateItem swaps in by their own rule', () => {
    // Box of Luck: +1 / +2 / +5 at 0, +3 at 9, +6 at 8, +8..+12 at (L - 8) * 2 + 1, +13 at 13 (ZzzObject.cpp:6014-6047).
    expect([1, 2, 3, 5, 6, 8, 12, 13, 14].map(l => drawn(14, 11, l, true))).toEqual([0, 0, 9, 0, 8, 1, 9, 13, 0]);
    expect(drawn(14, 11, 3)).toBe(3); // the bag keeps the Box of Luck's own model
    expect(drawn(14, 21, 2, true)).toBe(1); // Rena +2 as the Stone: Level - 1
    expect(drawn(14, 23, 1, true)).toBe(0); // Ring of Honor
    expect(drawn(14, 24, 1, true)).toBe(0); // Dark Stone
    expect(drawn(13, 20, 0, true)).toBe(8); // Wizards Ring +0
    expect(drawn(13, 20, 2, true)).toBe(9); // Ring of Lord: Level + 7
    expect(drawn(14, 9, 1, true)).toBe(0); // Ale +1
    expect(drawn(13, 14, 1, true)).toBe(0); // Loch's Feather +1
  });

  it('leaves every other item at its own level, then caps it', () => {
    expect(drawn(0, 0, 11)).toBe(11);
    GameOptions.effectLevel = 1;
    expect(drawn(14, 51, 0)).toBe(7);
    GameOptions.effectLevel = 4;
  });
});
