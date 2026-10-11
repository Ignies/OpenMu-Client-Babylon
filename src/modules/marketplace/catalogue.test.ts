import { describe, expect, it } from 'vitest';
import type { ApiListing, ApiOffer, ListingState } from './api';
import { cancellable, isOnSale, mergeCatalogue, stateLabelKey, statePillKey } from './catalogue';

/**
 * The window's reading of the service's two lists. The bug these guard
 * against: a seller's own `pending` row - the game server has not taken the
 * item yet - showing in the catalogue with a Buy button, as if it were for
 * sale.
 */

const STATES: ListingState[] = ['pending', 'active', 'claimed', 'sold', 'paid', 'returning', 'cancelled'];

const row = (id: string, state: ListingState, seller = 'alice'): ApiListing => ({
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

  it('carries the Zen a sold row is holding', () => {
    const merged = mergeCatalogue([], [{ ...row('s', 'sold'), proceeds: 950 }, row('p', 'paid')]);
    expect(merged.map(l => l.proceeds)).toEqual([950, undefined]);
  });
});

describe('what is for sale', () => {
  it('is only what the service calls active', () => {
    const merged = mergeCatalogue([], STATES.map(state => row(state, state)));
    expect(merged.filter(isOnSale).map(l => l.id)).toEqual(['active']);
  });

  it('counts a fixture without a state as on sale', () => {
    expect(isOnSale({ id: 'f', mine: undefined } as never)).toBe(true);
  });
});

describe('what a seller may still cancel', () => {
  it('is an own pending or active row, and nothing claimed, sold or on its way back', () => {
    const merged = mergeCatalogue([], STATES.map(state => row(state, state)));
    expect(merged.filter(cancellable).map(l => l.id)).toEqual(['pending', 'active']);
  });

  it('is never somebody else\'s listing', () => {
    expect(cancellable(mergeCatalogue([row('x', 'active', 'bob')], [])[0])).toBe(false);
  });
});

describe('state labels', () => {
  it('has words for every state the service can answer with', () => {
    for (const state of STATES) {
      expect(stateLabelKey(state)).toMatch(/^marketplace\.state\./);
    }
  });

  it('has none for a fixture', () => {
    expect(stateLabelKey(undefined)).toBeNull();
    expect(statePillKey(undefined)).toBeNull();
  });

  it('has a short pill for every state too', () => {
    for (const state of STATES) {
      expect(statePillKey(state)).toMatch(/^marketplace\.(pill|state)\./);
    }
  });
});

// Adverts to negotiate (ours): no price, the buyer whispers the seller's character.
describe('adverts to negotiate', () => {
  const advert = (id: string, seller: string): ApiOffer => ({
    id,
    sellerCharacter: seller,
    item: { group: 0, num: 5 } as ApiOffer['item'],
    category: 'weapons',
    note: 'for wings',
    listedAt: 2,
    expiresAt: 9,
  });

  it('come in beside the listings, an own one once and marked mine, all on sale and priceless', () => {
    const merged = mergeCatalogue([row('x', 'active', 'bob')], [], [advert('o1', 'Seller'), advert('mine', 'Me')], [advert('mine', 'Me')]);
    const adverts = merged.filter(l => l.negotiate);
    expect(adverts.map(l => [l.offerId, l.mine, l.seller, l.price, l.note])).toEqual([
      ['mine', true, 'Me', 0, 'for wings'],
      ['o1', undefined, 'Seller', 0, 'for wings'],
    ]);
    expect(adverts.every(isOnSale)).toBe(true);
    expect(adverts.map(cancellable)).toEqual([true, false]);
  });
});
