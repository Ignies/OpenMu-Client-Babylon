import type { BoxState } from './boxes';
import type { ListingState } from './db';

/**
 * What a listing's box says the listing should be.
 *
 * Pure: it is fed the row's state and age and the box as Postgres has it,
 * and it answers with the next state or null for "leave it". The same table
 * serves the settle routes, where the client reports an outcome, and the
 * sweep, where nobody did.
 *
 *   pending   + box holds an item                      -> active
 *   pending   + no box, past PENDING_TTL               -> cancelled
 *   claimed   + box empty with money                   -> sold
 *   claimed   + box still holds the item, past CLAIM_TTL -> active
 *   returning + box gone                               -> cancelled
 *   returning + box still holds the item, past RETURN_TTL -> active
 *   sold      + box gone                               -> paid
 *   active    + box gone or empty                      -> cancelled (logged)
 */

/** A seller who never sent the list token; nothing left their bag. */
export const PENDING_TTL_MS = Number(process.env.MARKETPLACE_PENDING_TTL_MS ?? 5 * 60_000);
/** A buyer who never sent the buy token; the item goes back on sale. */
export const CLAIM_TTL_MS = Number(process.env.MARKETPLACE_CLAIM_TTL_MS ?? 3 * 60_000);
/** A seller who never sent the cancel token, or whose bag was full. */
export const RETURN_TTL_MS = Number(process.env.MARKETPLACE_RETURN_TTL_MS ?? 3 * 60_000);

export type Reconcilable = {
  state: ListingState;
  itemId: string | null;
  /** When the state last changed; what the deadlines count from. */
  updatedAt: number;
};

export type Verdict = {
  state: ListingState;
  /** Recorded on pending -> active. */
  itemId?: string;
  /** Recorded on -> sold: the box's Money, what the seller collects. */
  proceeds?: number;
  why: string;
  /** Something the table says should not happen; worth a line in the log. */
  anomaly?: boolean;
};

export function verdict(listing: Reconcilable, box: BoxState, now: number): Verdict | null {
  const age = now - listing.updatedAt;
  const held = box.exists ? box.item : null;
  const holdsItem = held !== null;
  const holdsMoney = box.exists && box.item === null && box.money > 0;

  switch (listing.state) {
    case 'pending':
      if (held) return { state: 'active', itemId: held.id, why: 'the box holds the item' };
      if (!box.exists && age > PENDING_TTL_MS) {
        return { state: 'cancelled', why: 'the seller never listed it' };
      }
      return null;

    case 'claimed':
      if (holdsMoney) return { state: 'sold', proceeds: box.money, why: 'the box holds the money' };
      if (holdsItem && age > CLAIM_TTL_MS) return { state: 'active', why: 'the buyer never came' };
      if (!box.exists) return { state: 'cancelled', why: 'the box is gone', anomaly: true };
      return null;

    case 'returning':
      if (!box.exists) return { state: 'cancelled', why: 'returned to the seller' };
      if (holdsMoney) return { state: 'sold', proceeds: box.money, why: 'the box holds the money', anomaly: true };
      if (holdsItem && age > RETURN_TTL_MS) return { state: 'active', why: 'the seller never took it back' };
      return null;

    case 'sold':
      if (!box.exists) return { state: 'paid', why: 'the seller collected' };
      return null;

    case 'active':
      if (holdsMoney) return { state: 'sold', proceeds: box.money, why: 'the box holds the money', anomaly: true };
      if (!holdsItem) {
        return { state: 'cancelled', why: box.exists ? 'the box is empty' : 'the box is gone', anomaly: true };
      }
      return null;

    default:
      return null;
  }
}
