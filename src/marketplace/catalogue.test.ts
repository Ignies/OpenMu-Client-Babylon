import { describe, expect, it } from 'vitest';
import type { ApiListing } from './api';
import { cancellable, isOnSale, mergeCatalogue, stateLabelKey, statePillKey } from './catalogue';

/**
 * The window's reading of the service's two lists. The bug these guard
 * against: a seller's own `pending` row - the trader has not collected it -
 * showing in the catalogue with a Buy button, as if it were for sale.
 */

const row = (id: string, state: ApiListing['state'], seller = 'alice'): ApiListing => ({
  id,
  seller,
  price: 1000,
  item: { group: 14, num: 13 } as ApiListing['item'],
  category: 'jewels',
  state,
  buyer: null,
  listedAt: 1,
});

describe('mergeCatalogue', () => {
  it('marks every own row as mine, whatever its state', () => {
    const merged = mergeCatalogue([], [row('a', 'pending'), row('b', 'active'), row('c', 'claimed')]);
    expect(merged.map(l => l.mine)).toEqual([true, true, true]);
  });

  it('never marks a stranger listing as mine', () => {
    const merged = mergeCatalogue([row('x', 'active', 'bob')], []);
    expect(merged[0].mine).toBeUndefined();
  });

  it('draws an own active listing once, as mine, not twice', () => {
    const merged = mergeCatalogue([row('a', 'active'), row('x', 'active', 'bob')], [row('a', 'active')]);
    expect(merged.map(l => l.id)).toEqual(['a', 'x']);
    expect(merged[0].mine).toBe(true);
  });
});

describe('what is for sale', () => {
  it('is only what the service calls active', () => {
    const merged = mergeCatalogue([], [
      row('p', 'pending'),
      row('a', 'active'),
      row('c', 'claimed'),
      row('r', 'returning'),
      row('s', 'stuck'),
    ]);
    expect(merged.filter(isOnSale).map(l => l.id)).toEqual(['a']);
  });

  it('counts a fixture without a state as on sale', () => {
    expect(isOnSale({ id: 'f', mine: undefined } as never)).toBe(true);
  });
});

describe('what a seller may still cancel', () => {
  it('is an own pending or active row, and nothing claimed or returning', () => {
    const [p, a, c, r, s] = mergeCatalogue([], [
      row('p', 'pending'),
      row('a', 'active'),
      row('c', 'claimed'),
      row('r', 'returning'),
      row('s', 'stuck'),
    ]);
    expect([p, a, c, r, s].map(cancellable)).toEqual([true, true, false, false, false]);
  });

  it('is never somebody else\'s listing', () => {
    expect(cancellable(mergeCatalogue([row('x', 'active', 'bob')], [])[0])).toBe(false);
  });
});

describe('state labels', () => {
  it('has words for every state the service can answer with', () => {
    for (const state of ['pending', 'active', 'claimed', 'returning', 'stuck'] as const) {
      expect(stateLabelKey(state)).toMatch(/^marketplace\.state\./);
    }
  });

  it('has none for a fixture', () => {
    expect(stateLabelKey(undefined)).toBeNull();
    expect(statePillKey(undefined)).toBeNull();
  });

  it('has a short pill for every state too', () => {
    for (const state of ['pending', 'active', 'claimed', 'returning', 'stuck'] as const) {
      expect(statePillKey(state)).toMatch(/^marketplace\.(pill|state)\./);
    }
  });
});
