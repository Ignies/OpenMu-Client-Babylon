import { describe, expect, it, afterEach } from 'vitest';
import { setZenRandomTable, zenCoinCount, zenCoinScatter } from './zenPile';

afterEach(() => setZenRandomTable(null));

describe('zenCoinCount', () => {
  it('floors at three coins for a small purse', () => {
    expect(zenCoinCount(0)).toBe(3);
    expect(zenCoinCount(1)).toBe(3);
    expect(zenCoinCount(35)).toBe(3);
  });

  it('grows with the square root of the amount', () => {
    // sqrt(100) / 2, sqrt(196) / 2, sqrt(400) / 2.
    expect(zenCoinCount(100)).toBe(5);
    expect(zenCoinCount(196)).toBe(7);
    expect(zenCoinCount(400)).toBe(10);
  });

  it('caps at twelve from 576 zen up', () => {
    expect(zenCoinCount(575)).toBe(11);
    expect(zenCoinCount(576)).toBe(12);
    expect(zenCoinCount(10_000_000)).toBe(12);
  });
});

describe('zenCoinScatter', () => {
  it('lays every coin inside the pile radius', () => {
    setZenRandomTable(Array.from({ length: 100 }, (_, i) => i * 3));

    const count = zenCoinCount(1000);
    const coins = zenCoinScatter(7, count);

    expect(coins).toHaveLength(count);
    for (const coin of coins) {
      expect(Math.hypot(coin.x, coin.y)).toBeLessThan(count + 20);
    }
  });

  it('gives one drop the same pile every time it is asked', () => {
    setZenRandomTable(Array.from({ length: 100 }, (_, i) => (i * 37) % 360));

    expect(zenCoinScatter(12, 6)).toEqual(zenCoinScatter(12, 6));
    expect(zenCoinScatter(12, 6)).not.toEqual(zenCoinScatter(13, 6));
  });
});
