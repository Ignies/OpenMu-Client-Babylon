/**
 * End to end: the real service (tokens, settle, payout) plus the real game
 * server plugin, driven by two scripted clients through the HTTP API and the
 * game socket. Needs the local docker OpenMU with the plugin and Postgres on
 * 5433. Not part of the build.
 *
 *   bun run marketplace/probe/escrowEndToEnd.ts
 */
import postgres from 'postgres';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BotConnection } from './connection';
import { BotSession, view } from './session';
import {
  ESCROW_CODE,
  ESCROW_RESULT_SUB,
  buildEscrowRequest,
  parseEscrowResult,
  type EscrowResult,
} from '../../src/common/escrowWire';

const GAME_HOST = '127.0.0.1';
const GAME_PORT = Number(process.env.GAME_PORT ?? 55901);
const API_PORT = 3388;
const PRESENCE_PORT = 3399;
const SECRET = 'localtestsecret';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:admin@127.0.0.1:5433/openmu';
const sql = postgres(DATABASE_URL);

const SELLER = { account: 'MKT002', password: 'mkt', nonce: 'a'.repeat(32) };
const BUYER = { account: 'MKT003', password: 'mkt', nonce: 'b'.repeat(32) };

const failures: string[] = [];
function check(cond: unknown, what: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
  if (!cond) failures.push(what);
}

// The proxy's presence server, reduced to what the service asks it.
const presence = Bun.serve({
  port: PRESENCE_PORT,
  fetch(req) {
    const m = new URL(req.url).pathname.match(/^\/ticket\/([0-9a-f]{32})$/);
    const who = m && [SELLER, BUYER].find(p => p.nonce === m[1]);
    return who ? Response.json({ account: who.account }) : new Response('', { status: 404 });
  },
});

const dbDir = mkdtempSync(path.join(tmpdir(), 'mkt-e2e-'));
const service = Bun.spawn(['bun', 'run', 'marketplace/server/main.ts'], {
  env: {
    ...process.env,
    MARKETPLACE_API_PORT: String(API_PORT),
    PRESENCE_URL: `http://127.0.0.1:${PRESENCE_PORT}`,
    DATABASE_URL,
    MARKETPLACE_ESCROW_SECRET: SECRET,
    MARKETPLACE_DB: path.join(dbDir, 'market.sqlite'),
    MARKETPLACE_LISTING_FEE: '50',
    MARKETPLACE_COMMISSION_PERCENT: '10',
  },
  stdout: 'inherit',
  stderr: 'inherit',
});

async function api<T>(pathname: string, body?: Record<string, unknown>, ticket?: string): Promise<{ status: number; body: T }> {
  const url = `http://127.0.0.1:${API_PORT}${pathname}${body ? '' : `?ticket=${encodeURIComponent(ticket ?? '')}`}`;
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: (await response.json().catch(() => ({}))) as T };
}

async function waitForService(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${API_PORT}/api/market/listings`);
      if (r.status < 500) return;
    } catch {
      // not up yet
    }
    await Bun.sleep(200);
  }
  throw new Error('service did not come up');
}

async function client(who: { account: string; password: string; nonce: string }) {
  const log = (m: string) => console.log(`  [${who.account}] ${m}`);
  const connection = new BotConnection(GAME_HOST, GAME_PORT, log);
  await connection.connect();
  const session = new BotSession(connection, who, log);
  const entry = await session.enterWorld();
  await Bun.sleep(1200);
  const exchange = await api<{ ticket: string; account: string }>('/api/market/session', { session: who.nonce });
  if (exchange.status !== 200) throw new Error(`session refused: ${JSON.stringify(exchange.body)}`);
  const ticket = exchange.body.ticket;
  const character = entry.Name as string;
  const send = async (tokenHex: string): Promise<EscrowResult> => {
    const answer = connection.expect({ code: ESCROW_CODE, sub: ESCROW_RESULT_SUB }, 15_000, 'EscrowResult');
    connection.send(buildEscrowRequest(Uint8Array.from(Buffer.from(tokenHex, 'hex'))));
    const result = parseEscrowResult(new Uint8Array(view(await answer).buffer));
    if (!result) throw new Error('unparseable escrow result');
    log(`result ${result.op} ${result.status} amount=${result.amount}`);
    return result;
  };
  const commit = (body: Record<string, unknown>) => ({ ...body, ticket, session: who.nonce, character });
  return { session, character, ticket, send, commit };
}

type Listing = { id: string; state: string; proceeds?: number | null; price: number; itemId?: string | null };

async function bagOf(character: string) {
  const [c] = await sql`select "InventoryId" as id from data."Character" where "Name" = ${character}`;
  const [s] = await sql`select "Money" as money from data."ItemStorage" where "Id" = ${c.id}`;
  const items = await sql`select i."Id" as id, i."ItemSlot" as slot, i."Level" as lvl, d."Group" as grp, d."Number" as num, d."Name" as name, d."IsBoundToCharacter" as bound
      from data."Item" i join config."ItemDefinition" d on d."Id" = i."DefinitionId" where i."ItemStorageId" = ${c.id} order by i."ItemSlot"`;
  return { money: Number(s.money), items };
}

async function main(): Promise<void> {
  await waitForService();
  const seller = await client(SELLER);
  const buyer = await client(BUYER);

  const bag = await bagOf(seller.character);
  const tradable = bag.items.filter(i => !i.bound && Number(i.slot) >= 12 && Number(i.slot) < 204).sort((a, b) => Number(b.lvl) - Number(a.lvl));
  if (tradable.length < 2) throw new Error('seller needs two tradable bag items');
  const [first, second] = tradable;
  const buyerBag = await bagOf(buyer.character);

  // list
  const listed = await api<{ listing: Listing; token: string }>('/api/market/listings', seller.commit({
    slot: Number(first.slot), price: 5000, category: 'misc', item: { group: Number(first.grp), num: Number(first.num), lvl: Number(first.lvl) },
  }));
  check(listed.status === 201 && listed.body.listing.state === 'pending' && typeof listed.body.token === 'string', 'service answered a pending listing with a token');
  const id = listed.body.listing.id;
  const r1 = await seller.send(listed.body.token);
  check(r1.status === 'ok', 'game server accepted the list token');
  const settled1 = await api<{ listing: Listing }>(`/api/market/listings/${id}/settle`, { ticket: seller.ticket, item: Array.from(r1.item ?? []) });
  check(settled1.status === 200 && settled1.body.listing.state === 'active', `listing active after settle (got ${settled1.body.listing?.state})`);
  const browse = await api<{ listings: Listing[] }>('/api/market/listings', undefined, buyer.ticket);
  check(browse.body.listings.some(l => l.id === id), 'buyer sees the listing in the catalogue');

  // buyer claims and buys
  const own = await api<{ error?: string }>(`/api/market/listings/${id}/claim`, seller.commit({}));
  check(own.status === 400, 'seller cannot claim their own listing');
  const claimed = await api<{ listing: Listing; token: string }>(`/api/market/listings/${id}/claim`, buyer.commit({}));
  check(claimed.status === 200 && claimed.body.listing.state === 'claimed', 'buyer claimed');
  const twice = await api<{ error?: string }>(`/api/market/listings/${id}/claim`, buyer.commit({}));
  check(twice.status === 409, 'second claim refused');
  const r2 = await buyer.send(claimed.body.token);
  check(r2.status === 'ok' && r2.amount === 5000, 'game server delivered for the price');
  const settled2 = await api<{ listing: Listing }>(`/api/market/listings/${id}/settle`, { ticket: buyer.ticket });
  check(settled2.body.listing.state === 'sold' && settled2.body.listing.proceeds === 4500, `sold with proceeds 4500 (got ${settled2.body.listing.state} ${settled2.body.listing.proceeds})`);
  const buyerAfter = await bagOf(buyer.character);
  check(buyerAfter.items.some(i => i.id === first.id) && buyerAfter.money === buyerBag.money - 5000, 'buyer holds the item and paid');

  // seller collects
  const mine = await api<{ listings: Listing[]; balance: number }>('/api/market/mine', undefined, seller.ticket);
  check(mine.body.balance === 4500, `mine shows balance 4500 (got ${mine.body.balance})`);
  const sellerMid = await bagOf(seller.character);
  const payout = await api<{ payouts: { listingId: string; token: string; amount: number }[]; total: number }>('/api/market/payout', seller.commit({}));
  check(payout.status === 200 && payout.body.payouts.length === 1 && payout.body.total === 4500, 'payout minted one collect token for 4500');
  const r3 = await seller.send(payout.body.payouts[0].token);
  check(r3.status === 'ok' && r3.amount === 4500, 'game server paid 4500');
  const paid = await api<{ paid: number; remaining: number }>('/api/market/payout/settle', { ticket: seller.ticket });
  check(paid.body.paid === 1 && paid.body.remaining === 0, `payout settled (got ${JSON.stringify(paid.body)})`);
  const sellerAfter = await bagOf(seller.character);
  check(sellerAfter.money === sellerMid.money + 4500, 'seller wallet up by 4500');
  const mine2 = await api<{ listings: Listing[]; balance: number }>('/api/market/mine', undefined, seller.ticket);
  check(!mine2.body.listings.some(l => l.id === id) && mine2.body.balance === 0, 'paid listing left the Mine tab, balance zero');

  // list and cancel
  const listed2 = await api<{ listing: Listing; token: string }>('/api/market/listings', seller.commit({
    slot: Number(second.slot), price: 100, category: 'misc', item: { group: Number(second.grp), num: Number(second.num), lvl: Number(second.lvl) },
  }));
  const id2 = listed2.body.listing.id;
  const r4 = await seller.send(listed2.body.token);
  await api(`/api/market/listings/${id2}/settle`, { ticket: seller.ticket, item: Array.from(r4.item ?? []) });
  const cancel = await api<{ listing: Listing; token: string | null }>(`/api/market/listings/${id2}/cancel`, seller.commit({}));
  check(cancel.status === 200 && cancel.body.listing.state === 'returning' && cancel.body.token, 'cancel answered a returning listing with a token');
  const r5 = await seller.send(cancel.body.token as string);
  check(r5.status === 'ok', 'game server returned the item');
  const settled5 = await api<{ listing: Listing }>(`/api/market/listings/${id2}/settle`, { ticket: seller.ticket });
  check(settled5.body.listing.state === 'cancelled', `cancelled after settle (got ${settled5.body.listing.state})`);
  const sellerEnd = await bagOf(seller.character);
  check(sellerEnd.items.some(i => i.id === second.id), 'item back in the seller bag');

  // pending listing the seller walks away from: cancel without a token
  const listed3 = await api<{ listing: Listing; token: string }>('/api/market/listings', seller.commit({
    slot: Number(second.slot), price: 100, category: 'misc', item: { group: Number(second.grp), num: Number(second.num), lvl: Number(second.lvl) },
  }));
  const cancel3 = await api<{ listing: Listing; token: string | null }>(`/api/market/listings/${listed3.body.listing.id}/cancel`, seller.commit({}));
  check(cancel3.body.listing.state === 'cancelled' && cancel3.body.token === null, 'pending listing cancelled outright');

  const history = await api<{ history: { kind: string; status: string }[] }>('/api/market/history', undefined, seller.ticket);
  check(history.status === 200 && Array.isArray(history.body.history), 'history answers');

  seller.session.logOut();
  buyer.session.logOut();
  await Bun.sleep(2500);
  const leftover = await sql`select count(*)::int as n from data."ItemStorage" s where s."Id" not in (select "InventoryId" from data."Character" where "InventoryId" is not null) and s."Id" not in (select "VaultId" from data."Account" where "VaultId" is not null) and s."Id" not in (select "MerchantStoreId" from config."MonsterDefinition" where "MerchantStoreId" is not null)`;
  check(leftover[0].n === 0, 'no box rows left behind');

  console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS');
}

main()
  .catch(e => {
    console.error('probe crashed:', e);
    failures.push('crash');
  })
  .finally(async () => {
    service.kill();
    presence.stop(true);
    await sql.end();
    process.exit(failures.length ? 1 : 0);
  });
