import { describe, expect, it } from 'vitest';
import { itemNameColor } from './itemTooltip';

// RenderItemInfo name colour (ZzzInventory.cpp:2104-2160).
describe('the tooltip name colour', () => {
  it('is green for any excellent item, with or without an option or a high level', () => {
    expect(itemNameColor({ group: 0, num: 0, isExcellent: true, excellentFlags: 1 })).toBe('green');
    expect(itemNameColor({ group: 0, num: 0, lvl: 9, isExcellent: true, excellentFlags: 1 })).toBe('green');
  });
});
