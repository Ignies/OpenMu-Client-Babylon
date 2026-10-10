import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_ICON_FIT } from './itemIconFit';

describe('the icon fit table', () => {
  // Box of Luck shows a picture per level (Box of Kundun +1..+5 among them); each needs its zoom.
  it('zooms every Box of Luck level at the box scale', () => {
    for (let lvl = 1; lvl <= 15; lvl++) {
      if (existsSync(`public/items/item_14_11_${lvl}.png`)) expect(ITEM_ICON_FIT[`14_11_${lvl}`], `14_11_${lvl}`).toBeDefined();
    }
  });

  it('covers the items whose icons came after it was last built', () => {
    for (const key of ['7_59', '12_50', '13_106', '13_123']) {
      if (existsSync(`public/items/item_${key}_0.png`)) expect(ITEM_ICON_FIT[key], key).toBeDefined();
    }
  });
});
