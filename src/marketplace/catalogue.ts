import type { ApiListing, ListingState } from './api';
import { categoryOf } from './categories';
import type { Listing } from './mockListings';
import type { TextKey } from '../i18n';

/**
 * What the window shows, built from the two lists the service answers with:
 * the catalogue (everything on sale, anyone's) and this player's own rows in
 * every state.
 *
 * Kept apart from the store so it can be tested on its own. The rule it
 * enforces is the one the window got wrong before: a listing is *for sale*
 * only when the service says `active`. A seller's own `pending` row - the
 * game server has not taken the item yet - is theirs to watch on the My
 * Listings tab, and must never sit in the catalogue looking buyable.
 */

export type { ListingState };

function fromApi(row: ApiListing, mine: boolean): Listing {
  return {
    id: row.id,
    item: row.item as Listing['item'],
    category: categoryOf(row.item as Listing['item']),
    seller: row.seller,
    price: row.price,
    listedAt: row.listedAt,
    // No history to compare against yet, so nothing claims to be a deal.
    median: row.price,
    mine: mine || undefined,
    state: row.state,
    proceeds: row.proceeds ?? undefined,
  };
}

/**
 * The catalogue plus this player's own rows. A row that appears in both -
 * the player's own active listing - is taken from the own list, so it is
 * marked as theirs and is never drawn twice.
 */
export function mergeCatalogue(catalogue: ApiListing[], own: ApiListing[]): Listing[] {
  const ownIds = new Set(own.map(row => row.id));
  return [
    ...own.map(row => fromApi(row, true)),
    ...catalogue.filter(row => !ownIds.has(row.id)).map(row => fromApi(row, false)),
  ];
}

/** Buyable right now. Fixtures carry no state and count as on sale. */
export function isOnSale(listing: Listing): boolean {
  return listing.state === undefined || listing.state === 'active';
}

/** The seller may still pull it: the service only allows that before a claim. */
export function cancellable(listing: Listing): boolean {
  if (!listing.mine) return false;
  return listing.state === undefined || listing.state === 'pending' || listing.state === 'active';
}

/** What a seller's own row is doing, in words. Null for a fixture without one. */
export function stateLabelKey(state: ListingState | undefined): TextKey | null {
  switch (state) {
    case 'pending':
      return 'marketplace.state.pending';
    case 'active':
      return 'marketplace.state.active';
    case 'claimed':
      return 'marketplace.state.claimed';
    case 'sold':
      return 'marketplace.state.sold';
    case 'paid':
      return 'marketplace.state.paid';
    case 'returning':
      return 'marketplace.state.returning';
    case 'cancelled':
      return 'marketplace.state.cancelled';
    default:
      return null;
  }
}

/** The same, short enough for a pill; the sentence above is its hover text. */
export function statePillKey(state: ListingState | undefined): TextKey | null {
  switch (state) {
    case 'pending':
      return 'marketplace.pill.pending';
    case 'active':
      return 'marketplace.state.active';
    case 'claimed':
      return 'marketplace.pill.claimed';
    case 'sold':
      return 'marketplace.pill.sold';
    case 'paid':
      return 'marketplace.pill.paid';
    case 'returning':
      return 'marketplace.pill.returning';
    case 'cancelled':
      return 'marketplace.pill.cancelled';
    default:
      return null;
  }
}
