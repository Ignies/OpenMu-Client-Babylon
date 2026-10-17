import { isOn } from '@/controllers/fidelity';

/** A stall price's colour: red from 10M, yellow from 1M, green from 100k, else white (ZzzInventory.cpp:2226-2233). */
export function stallPriceColor(price: number): 'red' | 'yellow' | 'green' | 'white' {
  if (price >= 10_000_000) return 'red';
  if (price >= 1_000_000) return 'yellow';
  if (price >= 100_000) return 'green';
  return 'white';
}

/** Ours: the price painted under a stall square (`stallGridPrices`); the original shows it only in the tooltip. */
export function gridStallPrice(
  priceOf: ((square: number) => number | undefined) | undefined,
  square: number
): number | undefined {
  return isOn('stallGridPrices') ? priceOf?.(square) : undefined;
}
