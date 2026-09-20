import type { ApiListing, HistoryEntry, Payout, Token } from './api';
import { MarketError } from './api';
import type { Listing } from './mockListings';
import type { MarketDeps, MarketplaceStore } from './state';
import type { EscrowOperationName, EscrowResult } from '../common/escrowWire';

/**
 * A marketplace service and a game server in one object, for the standalone
 * harness (`marketplace.html`). It hands out fake tokens, answers each with a
 * result packet's worth of data, and moves the fixtures the way the real
 * pair would: a listed item leaves the bag, a bought one arrives, collected
 * Zen lands in the wallet. Nothing here is reachable from a live build.
 */

type Row = ApiListing & { mine: boolean };

const FEE = 0.05;

const uuid = () => {
  const b = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`;
};

const hexToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), x => x.toString(16).padStart(2, '0')).join('');

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function createMockMarket(
  store: MarketplaceStore,
  fixtures: { listings: Listing[]; history: HistoryEntry[] },
  options: { latencyMs?: number } = {}
): MarketDeps {
  const latency = options.latencyMs ?? 250;

  const rows: Row[] = fixtures.listings.map(l => ({
    id: l.id,
    seller: l.seller,
    price: l.price,
    item: l.item,
    category: l.category,
    state: l.state ?? 'active',
    buyer: null,
    listedAt: l.listedAt,
    proceeds: l.proceeds ?? null,
    mine: !!l.mine,
  }));

  /** What each token, once relayed, will do to the fixtures. */
  const pending = new Map<Token, { op: EscrowOperationName; row: Row }>();

  const find = (id: string): Row => {
    const row = rows.find(r => r.id === id);
    if (!row) throw new MarketError('no such listing', 404);
    return row;
  };

  const mint = (op: EscrowOperationName, row: Row): Token => {
    const token = hexToken();
    pending.set(token, { op, row });
    return token;
  };

  const strip = ({ mine: _mine, ...row }: Row): ApiListing => row;

  const api: MarketDeps['api'] = {
    async browse() {
      await wait(latency);
      const listings = rows.filter(r => r.state === 'active').map(strip);
      return { total: listings.length, listings };
    },
    async mine() {
      await wait(latency);
      const own = rows.filter(r => r.mine);
      return {
        listings: own.map(strip),
        balance: own.reduce((sum, r) => sum + (r.state === 'sold' ? r.proceeds ?? 0 : 0), 0),
      };
    },
    async history() {
      await wait(latency);
      return { history: fixtures.history };
    },
    async list({ item, price, category }) {
      await wait(latency);
      const row: Row = {
        id: uuid(),
        seller: 'You',
        price,
        item,
        category,
        state: 'pending',
        buyer: null,
        listedAt: Date.now(),
        proceeds: null,
        mine: true,
      };
      rows.unshift(row);
      return { listing: strip(row), token: mint('list', row) };
    },
    async settle(id) {
      await wait(latency);
      const row = find(id);
      if (row.state === 'pending') row.state = 'active';
      else if (row.state === 'claimed') row.state = 'sold';
      else if (row.state === 'returning') row.state = 'cancelled';
      return { listing: strip(row) };
    },
    async claim(id) {
      await wait(latency);
      const row = find(id);
      if (row.state !== 'active') throw new MarketError('already claimed', 409);
      row.state = 'claimed';
      return { listing: strip(row), token: mint('buy', row) };
    },
    async release(id) {
      await wait(latency);
      const row = find(id);
      if (row.state === 'claimed') row.state = 'active';
      return { listing: strip(row) };
    },
    async cancel(id) {
      await wait(latency);
      const row = find(id);
      if (row.state === 'pending') {
        row.state = 'cancelled';
        return { listing: strip(row), token: null };
      }
      if (row.state !== 'active') throw new MarketError('cannot cancel now', 409);
      row.state = 'returning';
      return { listing: strip(row), token: mint('cancel', row) };
    },
    async payout() {
      await wait(latency);
      const payouts: Payout[] = rows
        .filter(r => r.mine && r.state === 'sold' && (r.proceeds ?? 0) > 0)
        .map(r => ({ listingId: r.id, token: mint('collect', r), amount: r.proceeds ?? 0 }));
      return { payouts, total: payouts.reduce((sum, p) => sum + p.amount, 0) };
    },
    async settlePayout() {
      await wait(latency);
      let paid = 0;
      for (const row of rows) {
        if (row.mine && row.state === 'sold' && row.proceeds === 0) {
          row.state = 'paid';
          row.proceeds = null;
          paid++;
        }
      }
      return { paid, remaining: rows.filter(r => r.mine && r.state === 'sold').length };
    },
  };

  /** Plays the game server: the bag and the wallet move as the packets would make them. */
  const bridge: MarketDeps['bridge'] = {
    async send(token, listingId) {
      await wait(latency);
      const job = pending.get(token);
      if (!job) throw new Error('mock: unknown token');
      pending.delete(token);
      const { op, row } = job;
      const result: EscrowResult = { op, status: 'ok', listingId, boxId: uuid(), amount: 0, item: null };

      switch (op) {
        case 'list': {
          const bag = store.inventory.filter(e => e.item !== row.item);
          result.item = new Uint8Array(12);
          store.syncFromGame(store.zen, bag);
          break;
        }
        case 'buy': {
          if (store.zen < row.price) {
            result.status = 'notEnoughMoney';
            break;
          }
          result.amount = row.price;
          store.syncFromGame(store.zen - row.price, [
            ...store.inventory,
            { item: row.item, slot: 12 + store.inventory.length },
          ]);
          break;
        }
        case 'cancel': {
          store.syncFromGame(store.zen, [
            ...store.inventory,
            { item: row.item, slot: 12 + store.inventory.length },
          ]);
          break;
        }
        case 'collect': {
          const amount = row.proceeds ?? 0;
          if (store.zen + amount > 2_000_000_000) {
            result.status = 'moneyCap';
            break;
          }
          result.amount = amount;
          row.proceeds = 0;
          store.syncFromGame(store.zen + amount, store.inventory);
          break;
        }
      }
      return result;
    },
  };

  void FEE;
  return { api, bridge };
}
