import { describe, expect, it } from 'vitest';
import { canBindItemHotkey } from './itemHotkeys';

describe('binding a potion slot', () => {
  it('binds any slot of a bindable belt', () => {
    const season6 = { slots: 4, bindable: true };
    expect([0, 1, 2, 3].map(slot => canBindItemHotkey(season6, slot))).toEqual([true, true, true, true]);
    expect(canBindItemHotkey(season6, 4)).toBe(false);
  });

  it('binds nothing on fixed slots, and never a slot the bar does not draw', () => {
    // 0.97d: Q / W / E always reach for healing, mana and antidote.
    expect([0, 1, 2, 3].map(slot => canBindItemHotkey({ slots: 3, bindable: false }, slot))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(canBindItemHotkey({ slots: 3, bindable: true }, 3)).toBe(false);
  });
});
