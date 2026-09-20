import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiListing, Payout } from './api';
import { MarketError } from './api';
import { displayName } from './categories';
import type { EscrowResult, EscrowStatusName } from '../common/escrowWire';
import { t } from '../i18n';
import { MarketplaceStore, escrowStatusText, formatZen, type MarketApi } from './state';

/**
 * The three-step commits, against a scripted service and a scripted game
 * server: what the store asks for, in which order, and what it tells the
 * player at the end. No packets and no store are involved; `gameBridge.ts`
 * owns those.
 */

const ID = '11111111-2222-3333-4444-555555555555';
const OTHER = '66666666-7777-8888-9999-aaaaaaaaaaaa';

const item = { group: 14, num: 13 } as ApiListing['item'];

const listing = (state: ApiListing['state'], id = ID): ApiListing => ({
  id,
  seller: 'alice',
  price: 1000,
  item,
  category: 'jewels',
  state,
  buyer: null,
  listedAt: 1,
});

const result = (
  op: EscrowResult['op'],
  status: EscrowStatusName,
  extra: Partial<EscrowResult> = {}
): EscrowResult => ({ op, status, listingId: ID, boxId: OTHER, amount: 0, item: null, ...extra });

function scriptedApi() {
  const api = {
    browse: vi.fn(async () => ({ total: 1, listings: [listing('active', OTHER)] })),
    mine: vi.fn(async () => ({ listings: [] as ApiListing[], balance: 0 })),
    history: vi.fn(async () => ({ history: [] })),
    list: vi.fn(async () => ({ listing: listing('pending'), token: 'aa' })),
    settle: vi.fn(async () => ({ listing: listing('active') })),
    claim: vi.fn(async () => ({ listing: listing('claimed'), token: 'bb' })),
    release: vi.fn(async () => ({ listing: listing('active') })),
    cancel: vi.fn(async () => ({ listing: listing('returning'), token: 'cc' as string | null })),
    payout: vi.fn(async () => ({ payouts: [] as Payout[], total: 0 })),
    settlePayout: vi.fn(async () => ({ paid: 0, remaining: 0 })),
  };
  return api as typeof api & MarketApi;
}

function scriptedBridge(...answers: (EscrowResult | Error)[]) {
  const send = vi.fn(async () => {
    const next = answers.shift();
    if (!next) throw new Error('bridge: nothing scripted');
    if (next instanceof Error) throw next;
    return next;
  });
  return { send };
}

let store: MarketplaceStore;
let api: ReturnType<typeof scriptedApi>;

beforeEach(() => {
  store = new MarketplaceStore();
  api = scriptedApi();
  store.attach({ api });
  // Fixtures may have been seeded by a dev build; the tests want the service's word.
  store.listings = [];
  store.mode = 'live';
  store.syncFromGame(5000, [{ item, slot: 20 }], 'Tester');
});

describe('listing an item', () => {
  it('asks, relays the token, settles with the item bytes, and moves to My Listings', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const bridge = scriptedBridge(result('list', 'ok', { item: bytes }));
    store.attach({ bridge });
    store.pickForSale(0);
    store.setSellPrice('2500');

    await store.listForSale();

    expect(api.list).toHaveBeenCalledWith({
      character: 'Tester',
      slot: 20,
      price: 2500,
      category: 'jewels',
      item,
    });
    expect(bridge.send).toHaveBeenCalledWith('aa', ID);
    expect(api.settle).toHaveBeenCalledWith(ID, Array.from(bytes));
    expect(store.tab).toBe('mine');
    expect(store.sellPick).toBeNull();
    expect(store.flash).toBe(t('marketplace.listedFlash', { name: displayName(item) }));
    expect(api.browse).toHaveBeenCalled();
  });

  it('settles even when the game server refused, and says why', async () => {
    store.attach({ bridge: scriptedBridge(result('list', 'notTradable')) });
    store.pickForSale(0);
    store.setSellPrice('10');

    await store.listForSale();

    expect(api.settle).toHaveBeenCalledWith(ID, undefined);
    expect(store.tab).toBe('browse');
    expect(store.flash).toBe(escrowStatusText('notTradable'));
  });

  it('reports a game that does not answer without settling', async () => {
    store.attach({ bridge: scriptedBridge(new Error('The game did not answer.')) });
    store.pickForSale(0);
    store.setSellPrice('10');

    await store.listForSale();

    expect(api.settle).not.toHaveBeenCalled();
    expect(store.flash).toBe('The game did not answer.');
    expect(store.busy).toBe(false);
  });
});

describe('buying', () => {
  const onSale = () => {
    store.listings = [{ id: ID, item, category: 'jewels', seller: 'alice', price: 1000, listedAt: 1, median: 1000, state: 'active' }];
    store.askBuy(store.listings[0]);
  };

  it('claims, relays, settles', async () => {
    onSale();
    const bridge = scriptedBridge(result('buy', 'ok', { amount: 1000 }));
    store.attach({ bridge });

    await store.confirmBuy();

    expect(api.claim).toHaveBeenCalledWith(ID, 'Tester');
    expect(bridge.send).toHaveBeenCalledWith('bb', ID);
    expect(api.settle).toHaveBeenCalledWith(ID, undefined);
    expect(api.release).not.toHaveBeenCalled();
    expect(store.flash).toBe(t('marketplace.bought', { name: displayName(item) }));
  });

  it('gives the claim back when the game server refuses', async () => {
    onSale();
    store.attach({ bridge: scriptedBridge(result('buy', 'noRoom')) });

    await store.confirmBuy();

    expect(api.settle).toHaveBeenCalledWith(ID, undefined);
    expect(api.release).toHaveBeenCalledWith(ID);
    expect(store.flash).toBe(escrowStatusText('noRoom'));
  });

  it('says so when somebody else got it first', async () => {
    onSale();
    api.claim.mockRejectedValueOnce(new MarketError('claimed', 409));
    const bridge = scriptedBridge();
    store.attach({ bridge });

    await store.confirmBuy();

    expect(bridge.send).not.toHaveBeenCalled();
    expect(store.flash).toBe(t('marketplace.claimedByOther'));
  });

  it('never buys what the player cannot afford', async () => {
    onSale();
    store.syncFromGame(10, [], 'Tester');

    await store.confirmBuy();

    expect(api.claim).not.toHaveBeenCalled();
  });
});

describe('cancelling', () => {
  const own = (state: ApiListing['state']) => {
    store.listings = [{ id: ID, item, category: 'jewels', seller: 'You', price: 1000, listedAt: 1, median: 1000, state, mine: true }];
  };

  it('is outright when the row was still pending', async () => {
    own('pending');
    api.cancel.mockResolvedValueOnce({ listing: listing('cancelled'), token: null });
    const bridge = scriptedBridge();
    store.attach({ bridge });

    await store.cancelListing(ID);

    expect(bridge.send).not.toHaveBeenCalled();
    expect(api.settle).not.toHaveBeenCalled();
    expect(store.flash).toBe(t('marketplace.cancelled', { name: displayName(item) }));
  });

  it('brings an active listing back through the game server', async () => {
    own('active');
    const bridge = scriptedBridge(result('cancel', 'ok'));
    store.attach({ bridge });

    await store.cancelListing(ID);

    expect(api.cancel).toHaveBeenCalledWith(ID, 'Tester');
    expect(bridge.send).toHaveBeenCalledWith('cc', ID);
    expect(api.settle).toHaveBeenCalledWith(ID, undefined);
    expect(store.flash).toBe(t('marketplace.cancelled', { name: displayName(item) }));
  });

  it('tells the player to make room when the bag is full', async () => {
    own('active');
    store.attach({ bridge: scriptedBridge(result('cancel', 'noRoom')) });

    await store.cancelListing(ID);

    expect(api.settle).toHaveBeenCalledWith(ID, undefined);
    expect(store.flash).toBe(escrowStatusText('noRoom'));
  });
});

describe('collecting', () => {
  const owed = (...amounts: number[]) => {
    store.payoutOwed = amounts.reduce((a, b) => a + b, 0);
    api.payout.mockResolvedValueOnce({
      payouts: amounts.map((amount, i) => ({ listingId: `${ID.slice(0, -1)}${i}`, token: `d${i}`, amount })),
      total: store.payoutOwed,
    });
  };

  it('sends every token and sums what the game server paid', async () => {
    owed(300, 700);
    const bridge = scriptedBridge(
      result('collect', 'ok', { amount: 300 }),
      result('collect', 'ok', { amount: 700 })
    );
    store.attach({ bridge });

    await store.collectPayout();

    expect(bridge.send).toHaveBeenCalledTimes(2);
    expect(bridge.send).toHaveBeenNthCalledWith(1, 'd0', `${ID.slice(0, -1)}0`);
    expect(api.settlePayout).toHaveBeenCalledTimes(1);
    expect(store.flash).toBe(t('marketplace.collected', { amount: formatZen(1000) }));
  });

  it('stops at the Zen cap and says so, keeping what was paid', async () => {
    owed(300, 700, 900);
    const bridge = scriptedBridge(
      result('collect', 'ok', { amount: 300 }),
      result('collect', 'moneyCap')
    );
    store.attach({ bridge });

    await store.collectPayout();

    expect(bridge.send).toHaveBeenCalledTimes(2);
    expect(api.settlePayout).toHaveBeenCalledTimes(1);
    expect(store.flash).toBe(
      `${t('marketplace.collected', { amount: formatZen(300) })} ${escrowStatusText('moneyCap')}`
    );
  });

  it('skips a box that is not paid but goes on with the rest', async () => {
    owed(300, 700);
    store.attach({
      bridge: scriptedBridge(result('collect', 'notSold'), result('collect', 'ok', { amount: 700 })),
    });

    await store.collectPayout();

    expect(store.flash).toBe(
      `${t('marketplace.collected', { amount: formatZen(700) })} ${escrowStatusText('notSold')}`
    );
  });

  it('does nothing when nothing is owed', async () => {
    store.payoutOwed = 0;
    await store.collectPayout();
    expect(api.payout).not.toHaveBeenCalled();
  });
});
