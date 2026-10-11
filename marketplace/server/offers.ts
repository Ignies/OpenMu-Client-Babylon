import { randomUUID } from 'node:crypto';
import { audit, db } from './db';
import type { Item } from './listings';

/**
 * Adverts for items up to negotiate (ours, `schema/004_offers.sql`).
 *
 * Nothing moves and nothing is held: an advert is a picture of an item in the seller's bag and the
 * character to whisper about it. The deal is the game's trade window, where both sides see the
 * real item, so the service need not vouch for the picture; it only keeps the list tidy: a cap per
 * account, a lifetime, and the seller's own way to take one down.
 */

export type Offer = {
  id: string;
  /** The account; never sent to other players. */
  seller: string;
  sellerCharacter: string;
  slot: number;
  item: Item;
  category: string;
  note: string;
  listedAt: number;
  expiresAt: number;
};

/** What other players see: the character to whisper, not the account or the bag slot. */
export type PublicOffer = Omit<Offer, 'seller' | 'slot'>;

type OfferRow = {
  id: string;
  seller: string;
  seller_char: string;
  slot: number;
  item_json: string;
  category: string;
  note: string;
  created_at: number;
  expires_at: number;
};

export const OFFER_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_OFFERS_PER_ACCOUNT = 10;
export const NOTE_MAX = 60;

const toOffer = (row: OfferRow): Offer => ({
  id: row.id,
  seller: row.seller,
  sellerCharacter: row.seller_char,
  slot: row.slot,
  item: JSON.parse(row.item_json) as Item,
  category: row.category,
  note: row.note,
  listedAt: row.created_at,
  expiresAt: row.expires_at,
});

export function publicOffer(offer: Offer): PublicOffer {
  const { seller: _seller, slot: _slot, ...shown } = offer;
  return shown;
}

/** One printable line, cut to what a card has room for. */
export function cleanNote(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
}

export function bySeller(account: string, now: number): Offer[] {
  const rows = db
    .query('SELECT * FROM offers WHERE seller = ? AND expires_at > ? ORDER BY created_at DESC')
    .all(account, now) as OfferRow[];
  return rows.map(toOffer);
}

export function createOffer(
  input: Omit<Offer, 'id' | 'listedAt' | 'expiresAt'>,
  now: number
): Offer {
  // The same bag slot advertised again is the same item: the newer advert replaces the older.
  db.query('DELETE FROM offers WHERE seller = ? AND seller_char = ? AND slot = ?').run(
    input.seller,
    input.sellerCharacter,
    input.slot
  );
  if (bySeller(input.seller, now).length >= MAX_OFFERS_PER_ACCOUNT) {
    throw new Error(`You already have ${MAX_OFFERS_PER_ACCOUNT} items up to negotiate. Take one down first.`);
  }

  const offer: Offer = { ...input, id: randomUUID(), listedAt: now, expiresAt: now + OFFER_TTL_MS };
  db.query(
    `INSERT INTO offers
       (id, seller, seller_char, slot, item_group, item_number, item_json, category, note, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    offer.id,
    offer.seller,
    offer.sellerCharacter,
    offer.slot,
    offer.item.group,
    offer.item.num,
    JSON.stringify(offer.item),
    offer.category,
    offer.note,
    offer.listedAt,
    offer.expiresAt
  );
  audit('offer created', { listing: offer.id, account: offer.seller, detail: { slot: offer.slot, item: [offer.item.group, offer.item.num] } });
  return offer;
}

/** Every advert still up, newest first. */
export function browse(now: number): Offer[] {
  const rows = db
    .query('SELECT * FROM offers WHERE expires_at > ? ORDER BY created_at DESC LIMIT 500')
    .all(now) as OfferRow[];
  return rows.map(toOffer);
}

/** Takes an advert down; only its own seller may. */
export function remove(id: string, account: string): boolean {
  const removed = db.query('DELETE FROM offers WHERE id = ? AND seller = ?').run(id, account).changes > 0;
  if (removed) audit('offer removed', { listing: id, account });
  return removed;
}

/** Drops the adverts past their lifetime; the sweep calls it. */
export function purgeExpired(now: number): number {
  return db.query('DELETE FROM offers WHERE expires_at <= ?').run(now).changes;
}
