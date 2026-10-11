import { describe, expect, it } from 'vitest';
import {
  MAX_CHARACTERS,
  hasFreeSlot,
  listStatus,
  rosterRows,
  selectedCharacter,
  type ListedCharacter,
} from './roster';

const char = (Name: string, SlotIndex: number, Level = 1) =>
  ({ Name, SlotIndex, Level }) as ListedCharacter;

describe('selectedCharacter', () => {
  const list = [char('Alpha', 0), char('Beta', 1)];

  it('is the listed character named by the focus', () => {
    expect(selectedCharacter(list, 'Beta')).toBe(list[1]);
  });

  it('is nothing when the focus is empty or not on the list', () => {
    expect(selectedCharacter(list, '')).toBeUndefined();
    expect(selectedCharacter(list, 'Gamma')).toBeUndefined();
    expect(selectedCharacter([], 'Alpha')).toBeUndefined();
  });
});

describe('hasFreeSlot', () => {
  it('allows a new character while fewer than five are listed', () => {
    expect(MAX_CHARACTERS).toBe(5);
    for (let n = 0; n <= 6; n++) {
      const list = Array.from({ length: n }, (_, i) => char(`C${i}`, i));
      expect(hasFreeSlot(list)).toBe(n < 5);
    }
  });
});

describe('listStatus', () => {
  // Every input: loading x list size (0, 2) x something selected.
  const grid = (prompt: 'pick' | 'empty') =>
    [true, false].flatMap(loading =>
      [0, 2].flatMap(count =>
        [false, true].map(
          selected => `${loading}/${count}/${selected}: ${listStatus({ loading, count, selected }, prompt)}`
        )
      )
    );

  it("'pick' (the line-up): only while nothing is selected; asks to pick once there are characters", () => {
    expect(grid('pick')).toEqual([
      'true/0/false: loading',
      'true/0/true: null',
      'true/2/false: loading',
      'true/2/true: null',
      'false/0/false: null',
      'false/0/true: null',
      'false/2/false: select',
      'false/2/true: null',
    ]);
  });

  it("'empty' (the 0.97d list): loading whenever it loads; the prompt over an empty list", () => {
    expect(grid('empty')).toEqual([
      'true/0/false: loading',
      'true/0/true: loading',
      'true/2/false: loading',
      'true/2/true: loading',
      'false/0/false: select',
      'false/0/true: select',
      'false/2/false: null',
      'false/2/true: null',
    ]);
  });
});

describe('rosterRows', () => {
  const ROW = { x: 20, y: 40, width: 216, height: 26 };

  it("keeps the server's order and stacks one row per character", () => {
    const list = [char('Late', 4), char('Early', 0), char('Mid', 2)];

    expect(rosterRows(list, ROW)).toEqual([
      { character: list[0], left: 20, top: 40, width: 216, height: 26 },
      { character: list[1], left: 20, top: 66, width: 216, height: 26 },
      { character: list[2], left: 20, top: 92, width: 216, height: 26 },
    ]);
  });

  it('leaves no rows for empty slots', () => {
    expect(rosterRows([], ROW)).toEqual([]);
  });
});
