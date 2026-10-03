import { describe, expect, it } from 'vitest';
import { dropModelProxy } from './dropModelProxy';

const POTION = 14;

describe('dropModelProxy', () => {
  it('shows every Box of Kundun as the small MagicBox08', () => {
    for (let lvl = 8; lvl <= 12; lvl++) {
      const proxy = dropModelProxy(POTION, 11, lvl);
      expect(proxy?.modelFilePath).toBe('Item/MagicBox08.glb');
      expect(proxy?.pose?.scale).toBe(0.2);
    }
  });

  it('keeps the plain Box of Luck model where the original does', () => {
    expect(dropModelProxy(POTION, 11, 0)).toBeNull();
    expect(dropModelProxy(POTION, 11, 7)).toBeNull();
  });

  it('lays the medals on their side', () => {
    expect(dropModelProxy(POTION, 11, 5)?.modelFilePath).toBe('Item/MagicBox06.glb');
    expect(dropModelProxy(POTION, 11, 6)?.pose?.angle).toEqual([270, 0, 45]);
  });

  it('swaps the level 1 chocolate boxes and Rena +1/+2', () => {
    expect(dropModelProxy(POTION, 33, 1)?.modelFilePath).toBe('Item/obox02.glb');
    expect(dropModelProxy(POTION, 33, 0)).toBeNull();
    expect(dropModelProxy(POTION, 21, 2)?.modelFilePath).toBe('Item/EventBloodCastle03.glb');
  });

  it('still maps the level 1 quest items', () => {
    expect(dropModelProxy(POTION, 23, 1)?.modelFilePath).toBe('Item/QuestItem3rd00.glb');
  });
});
