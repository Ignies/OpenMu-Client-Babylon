/**
 * Drives the escrow plugin on a local docker OpenMU with two scripted
 * clients and checks every move in Postgres. Not part of the build.
 *
 *   MARKETPLACE_ESCROW_SECRET=localtestsecret bun run marketplace/probe/escrowPlugin.ts
 */
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { BotConnection } from './connection';
import { BotSession, view } from './session';
import { mintEscrowToken } from '../server/escrowToken';
import {
  ESCROW_CODE,
  ESCROW_RESULT_SUB,
  buildEscrowRequest,
  parseEscrowResult,
  type EscrowResult,
} from '../../src/common/escrowWire';

const HOST = process.env.GAME_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GAME_PORT ?? 55901);
const SECRET = new TextEncoder().encode(process.env.MARKETPLACE_ESCROW_SECRET ?? 'localtestsecret');
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:admin@127.0.0.1:5433/openmu');

const SELLER = { account: process.env.SELLER ?? 'MKT002', password: process.env.SELLER_PW ?? 'mkt' };
const BUYER = { account: process.env.BUYER ?? 'MKT003', password: process.env.BUYER_PW ?? 'mkt' };

type Row = Record<string, unknown>;
const failures: string[] = [];
function check(cond: unknown, what: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
  if (!cond) failures.push(what);
}

async function inventoryOf(character: string): Promise<{ id: string; money: number; items: Row[] }> {
  const [c] = await sql`select "InventoryId" as id from data."Character" where "Name" = ${character}`;
  const [s] = await sql`select "Money" as money from data."ItemStorage" where "Id" = ${c.id}`;
  const items = await sql`select i."Id" as id, i."ItemSlot" as slot, i."Level" as level, i."Durability" as dur, d."Group" as grp, d."Number" as num, d."Name" as name, d."IsBoundToCharacter" as bound
      from data."Item" i join config."ItemDefinition" d on d."Id" = i."DefinitionId" where i."ItemStorageId" = ${c.id} order by i."ItemSlot"`;
  return { id: c.id, money: Number(s.money), items };
}

async function box(id: string): Promise<{ exists: boolean; money: number; items: Row[] }> {
  const rows = await sql`select "Money" as money from data."ItemStorage" where "Id" = ${id}`;
  if (!rows.length) return { exists: false, money: 0, items: [] };
  const items = await sql`select "Id" as id, "ItemSlot" as slot from data."Item" where "ItemStorageId" = ${id}`;
  return { exists: true, money: Number(rows[0].money), items };
}

async function client(identity: { account: string; password: string }) {
  const connection = new BotConnection(HOST, PORT, m => console.log(`  [${identity.account}] ${m}`));
  await connection.connect();
  const session = new BotSession(connection, identity, m => console.log(`  [${identity.account}] ${m}`));
  const character = await session.enterWorld();
  await Bun.sleep(1500);
  const send = async (token: Uint8Array, timeoutMs = 15_000): Promise<EscrowResult> => {
    const answer = connection.expect({ code: ESCROW_CODE, sub: ESCROW_RESULT_SUB }, timeoutMs, 'EscrowResult');
    connection.send(buildEscrowRequest(token));
    const frame = await answer;
    const result = parseEscrowResult(new Uint8Array(view(frame).buffer));
    if (!result) throw new Error('unparseable escrow result');
    console.log(`  [${identity.account}] result ${result.op} ${result.status} amount=${result.amount} item=${result.item ? Buffer.from(result.item).toString('hex') : '-'}`);
    return result;
  };
  return { connection, session, character: character.Name as string, send };
}

async function main(): Promise<void> {
  const seller = await client(SELLER);
  const buyer = await client(BUYER);
  const sellerChar = seller.character;
  const buyerChar = buyer.character;

  const before = await inventoryOf(sellerChar);
  const tradable = before.items
    .filter(i => !i.bound && Number(i.slot) >= 12 && Number(i.slot) < 204)
    .sort((a, b) => Number(b.level) - Number(a.level));
  console.log(`seller ${sellerChar} zen=${before.money} bag=`, tradable.map(i => `${i.slot}:${i.name}+${i.level} x${i.dur}`));
  if (tradable.length < 2) throw new Error('seller needs two tradable bag items');
  const [first, second] = tradable;
  const buyerBefore = await inventoryOf(buyerChar);

  // 1. list
  const listingA = randomUUID();
  const boxA = randomUUID();
  const listed = await seller.send(mintEscrowToken({ op: 'list', listingId: listingA, boxId: boxA, slot: Number(first.slot), amount: 5000, fee: 50, account: SELLER.account, character: sellerChar }, SECRET));
  check(listed.status === 'ok', 'list answered ok');
  check(listed.item?.length === 12, 'list result carries 12 item bytes');
  let b = await box(boxA);
  check(b.exists && b.items.length === 1 && b.items[0].id === first.id, 'item row moved into the box');
  let inv = await inventoryOf(sellerChar);
  check(!inv.items.some(i => i.id === first.id), 'item row no longer under the seller inventory');
  check(inv.money === before.money - 50, `listing fee taken (${before.money} -> ${inv.money})`);

  // 2. negatives
  const forged = await seller.send(mintEscrowToken({ op: 'cancel', listingId: listingA, boxId: boxA, itemId: first.id as string, account: SELLER.account, character: sellerChar }, new TextEncoder().encode('wrong')));
  check(forged.status === 'badToken', 'forged signature refused');
  const expired = await seller.send(mintEscrowToken({ op: 'cancel', listingId: listingA, boxId: boxA, itemId: first.id as string, account: SELLER.account, character: sellerChar, expiresAt: Math.floor(Date.now() / 1000) - 5 }, SECRET));
  check(expired.status === 'expired', 'expired token refused');
  const wrong = await buyer.send(mintEscrowToken({ op: 'cancel', listingId: listingA, boxId: boxA, itemId: first.id as string, account: SELLER.account, character: sellerChar }, SECRET));
  check(wrong.status === 'wrongPlayer', 'token for another player refused');
  const poor = await buyer.send(mintEscrowToken({ op: 'buy', listingId: listingA, boxId: boxA, itemId: first.id as string, amount: 2_000_000_000, fee: 0, account: BUYER.account, character: buyerChar }, SECRET));
  check(poor.status === 'notEnoughMoney', 'buy above the wallet refused');
  b = await box(boxA);
  check(b.exists && b.items.length === 1, 'box untouched by refusals');

  // 3. buy
  const bought = await buyer.send(mintEscrowToken({ op: 'buy', listingId: listingA, boxId: boxA, itemId: first.id as string, amount: 5000, fee: 500, account: BUYER.account, character: buyerChar }, SECRET));
  check(bought.status === 'ok', 'buy answered ok');
  check(bought.item && listed.item && Buffer.from(bought.item).toString('hex') === Buffer.from(listed.item).toString('hex'), 'bought item bytes equal the listed bytes (options survived the move)');
  b = await box(boxA);
  check(b.exists && b.items.length === 0 && b.money === 4500, `box empty with proceeds 4500 (got exists=${b.exists} items=${b.items.length} money=${b.money})`);
  let binv = await inventoryOf(buyerChar);
  check(binv.items.some(i => i.id === first.id), 'item row now under the buyer inventory');
  check(binv.money === buyerBefore.money - 5000, `price taken from buyer (${buyerBefore.money} -> ${binv.money})`);

  // 4. buy again (box empty) must fail
  const again = await buyer.send(mintEscrowToken({ op: 'buy', listingId: listingA, boxId: boxA, itemId: first.id as string, amount: 5000, fee: 500, account: BUYER.account, character: buyerChar }, SECRET));
  check(again.status === 'boxGone', 'second buy of the same box refused');

  // 5. collect
  const sellerMid = await inventoryOf(sellerChar);
  const collected = await seller.send(mintEscrowToken({ op: 'collect', listingId: listingA, boxId: boxA, itemId: first.id as string, account: SELLER.account, character: sellerChar }, SECRET));
  check(collected.status === 'ok' && collected.amount === 4500, 'collect answered ok with 4500');
  b = await box(boxA);
  check(!b.exists, 'box deleted after collect');
  inv = await inventoryOf(sellerChar);
  check(inv.money === sellerMid.money + 4500, `proceeds in seller wallet (${sellerMid.money} -> ${inv.money})`);

  // 6. list + cancel
  const listingB = randomUUID();
  const boxB = randomUUID();
  const listed2 = await seller.send(mintEscrowToken({ op: 'list', listingId: listingB, boxId: boxB, slot: Number(second.slot), amount: 100, fee: 0, account: SELLER.account, character: sellerChar }, SECRET));
  check(listed2.status === 'ok', 'second list ok');
  b = await box(boxB);
  check(b.exists && b.items.length === 1 && b.items[0].id === second.id, 'second item in its box');
  const cancelled = await seller.send(mintEscrowToken({ op: 'cancel', listingId: listingB, boxId: boxB, itemId: second.id as string, account: SELLER.account, character: sellerChar }, SECRET));
  check(cancelled.status === 'ok', 'cancel answered ok');
  b = await box(boxB);
  check(!b.exists, 'box deleted after cancel');
  inv = await inventoryOf(sellerChar);
  check(inv.items.some(i => i.id === second.id), 'item back under the seller inventory');

  // 7. seller stayed online through the sale: log both out and look again.
  seller.session.logOut();
  buyer.session.logOut();
  await Bun.sleep(4000);
  binv = await inventoryOf(buyerChar);
  inv = await inventoryOf(sellerChar);
  check(binv.items.some(i => i.id === first.id), 'after logout: sold item still with the buyer');
  check(!inv.items.some(i => i.id === first.id), 'after logout: sold item not duplicated at the seller');
  check(inv.items.some(i => i.id === second.id), 'after logout: cancelled item still with the seller');
  const orphan = await sql`select count(*)::int as n from data."ItemStorage" where "Id" in (${boxA}, ${boxB})`;
  check(orphan[0].n === 0, 'no box rows left behind');

  console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS');
  await sql.end();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async e => {
  console.error('probe crashed:', e);
  await sql.end();
  process.exit(2);
});
