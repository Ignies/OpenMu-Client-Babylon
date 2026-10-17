import { afterEach, describe, expect, it } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { gridStallPrice, stallPriceColor } from './stallPrice';

describe('stallPriceColor (ZzzInventory.cpp:2226-2233)', () => {
  it('colours a stall price by its amount', () => {
    expect([99_999, 100_000, 999_999, 1_000_000, 9_999_999, 10_000_000].map(stallPriceColor)).toEqual([
      'white', 'green', 'green', 'yellow', 'yellow', 'red',
    ]);
  });
});

describe('gridStallPrice', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));
  const priceOf = (square: number) => (square === 3 ? 5000 : undefined);

  it('paints the price under the square on Enhanced', () => {
    expect(gridStallPrice(priceOf, 3)).toBe(5000);
  });

  it('paints nothing on Classic: the original shows it only in the tooltip', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(gridStallPrice(priceOf, 3)).toBeUndefined();
  });
});
