import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ProductLine } from './catalog';
import type { Roll } from './gacha';

/**
 * The shop's own storage: the order queue, the account-lock journal and the
 * audit log.
 *
 * Deliberately not OpenMU's database, for the same reason the register
 * service keeps its signup log apart: nothing here is game state, and a
 * service that adds tables to a schema EF Core owns and migrates is a service
 * that breaks on the next OpenMU upgrade. The only writes to OpenMU happen
 * inside the fulfilment transaction, one order at a time.
 *
 * Every piece of SQL the shop runs against its own database lives in this
 * file. The rest of the service sees typed `Order`s, never rows.
 */

/**
 * Where the file lives. The default is outside the repo on purpose: the
 * production update runs `git clean -fdx` in the checkout
 * (`update_server_igniesDOTnet.md`), which would take a database kept under
 * `cashshop/` with it, orders and all. The path is logged at boot so an
 * operator can find their orders without reading this.
 */
export const DB_PATH = process.env.CASHSHOP_DB || path.join(os.homedir(), '.mu-cashshop', 'shop.sqlite');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { create: true });

// WAL so a CLI can read the queue and the audit log while the server serves.
db.run('PRAGMA journal_mode = WAL');

db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    account      TEXT NOT NULL,
    product_id   TEXT NOT NULL,
    product_name TEXT NOT NULL,
    line         TEXT NOT NULL,
    chaos        INTEGER NOT NULL,
    state        TEXT NOT NULL,
    reason       TEXT,
    seed         INTEGER,
    roll_json    TEXT,
    item_id      TEXT,
    placed_at    INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    delivered_at INTEGER
  )
`);
// The delivery tab, the committed-chaos sum and the daily caps all ask by account.
db.run('CREATE INDEX IF NOT EXISTS orders_account_placed ON orders (account, placed_at)');
// The worker asks for the queue in placement order.
db.run('CREATE INDEX IF NOT EXISTS orders_state_placed ON orders (state, placed_at)');

db.run(`
  CREATE TABLE IF NOT EXISTS state_locks (
    account_id     TEXT PRIMARY KEY,
    original_state INTEGER NOT NULL,
    locked_at      INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    at       INTEGER NOT NULL,
    account  TEXT,
    order_id TEXT,
    event    TEXT NOT NULL,
    detail   TEXT
  )
`);
db.run('CREATE INDEX IF NOT EXISTS audit_order ON audit (order_id)');
db.run('CREATE INDEX IF NOT EXISTS audit_at ON audit (at)');

console.info(`cash shop orders in ${DB_PATH}`);

/* ------------------------------------------------------------------- types */

export type OrderState = 'queued' | 'delivering' | 'delivered' | 'failed' | 'cancelled';

export interface Order {
  id: string;
  productId: string;
  productName: string;
  line: ProductLine;
  /**
   * The price paid, copied from the catalogue at placement so a later
   * repricing never changes an order already placed.
   */
  chaos: number;
  state: OrderState;
  reason: string | null;
  /**
   * Committed at placement for the gacha (`roll.seed` is the replay key);
   * null for a fixed product.
   */
  roll: Roll | null;
  placedAt: number;
  updatedAt: number;
}

/** An order as the worker needs it: the wire shape plus whose it is. */
export type QueuedOrder = Order & { account: string };

/** What the placement route knows; everything else in the row is derived here. */
export interface NewOrder {
  account: string;
  productId: string;
  productName: string;
  line: ProductLine;
  chaos: number;
  roll: Roll | null;
}

export interface StateLock {
  accountId: string;
  originalState: number;
  lockedAt: number;
}

interface OrderRow {
  id: string;
  account: string;
  product_id: string;
  product_name: string;
  line: string;
  chaos: number;
  state: string;
  reason: string | null;
  seed: number | null;
  roll_json: string | null;
  item_id: string | null;
  placed_at: number;
  updated_at: number;
  delivered_at: number | null;
}

/** The row-to-order boundary: the one place `roll_json` is parsed. */
function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    line: row.line as ProductLine,
    chaos: row.chaos,
    state: row.state as OrderState,
    reason: row.reason,
    roll: row.roll_json === null ? null : (JSON.parse(row.roll_json) as Roll),
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
  };
}

/* -------------------------------------------------------------- statements */

const ORDER_COLUMNS =
  'id, account, product_id, product_name, line, chaos, state, reason, seed, roll_json, ' +
  'item_id, placed_at, updated_at, delivered_at';

const selectOrder = db.query<OrderRow, [string]>(
  `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`
);

const selectOrdersFor = db.query<OrderRow, [string]>(
  `SELECT ${ORDER_COLUMNS} FROM orders WHERE account = ? ORDER BY placed_at DESC, id DESC`
);

const selectQueued = db.query<OrderRow, []>(
  `SELECT ${ORDER_COLUMNS} FROM orders WHERE state = 'queued' ORDER BY placed_at ASC, id ASC`
);

const selectDelivering = db.query<OrderRow, []>(
  `SELECT ${ORDER_COLUMNS} FROM orders WHERE state = 'delivering' ORDER BY updated_at ASC, id ASC`
);

interface AuditRow {
  id: number;
  at: number;
  account: string | null;
  event: string;
  detail: string | null;
}

const selectAuditFor = db.query<AuditRow, [string]>(
  'SELECT id, at, account, event, detail FROM audit WHERE order_id = ? ORDER BY id ASC'
);

const insertOrder = db.query<
  unknown,
  [string, string, string, string, string, number, number | null, string | null, number, number]
>(
  `INSERT INTO orders (id, account, product_id, product_name, line, chaos, state,
                       seed, roll_json, placed_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`
);

const sumCommitted = db.query<{ n: number | null }, [string]>(
  `SELECT SUM(chaos) AS n FROM orders WHERE account = ? AND state IN ('queued', 'delivering')`
);

const countSpentSince = db.query<{ product_id: string; n: number }, [string, number]>(
  `SELECT product_id, COUNT(*) AS n FROM orders
    WHERE account = ? AND placed_at >= ? AND state NOT IN ('cancelled', 'failed')
    GROUP BY product_id`
);

const claimQueued = db.query<unknown, [number, string]>(
  `UPDATE orders SET state = 'delivering', updated_at = ? WHERE id = ? AND state = 'queued'`
);

const settleDelivering = db.query<
  unknown,
  [string, string | null, string | null, number, number | null, string]
>(
  `UPDATE orders SET state = ?, reason = ?, item_id = ?, updated_at = ?, delivered_at = ?
    WHERE id = ? AND state = 'delivering'`
);

const annotateDelivering = db.query<unknown, [string, number, string]>(
  `UPDATE orders SET reason = ?, updated_at = ? WHERE id = ? AND state = 'delivering'`
);

const cancelQueued = db.query<unknown, [string, number, string]>(
  `UPDATE orders SET state = 'cancelled', reason = ?, updated_at = ? WHERE id = ? AND state = 'queued'`
);

const insertAudit = db.query<unknown, [number, string | null, string | null, string, string | null]>(
  'INSERT INTO audit (at, account, order_id, event, detail) VALUES (?, ?, ?, ?, ?)'
);

const insertLock = db.query<unknown, [string, number, number]>(
  'INSERT OR REPLACE INTO state_locks (account_id, original_state, locked_at) VALUES (?, ?, ?)'
);

const deleteLock = db.query<unknown, [string]>('DELETE FROM state_locks WHERE account_id = ?');

interface LockRow {
  account_id: string;
  original_state: number;
  locked_at: number;
}

const selectLock = db.query<LockRow, [string]>(
  'SELECT account_id, original_state, locked_at FROM state_locks WHERE account_id = ?'
);

const selectStaleLocks = db.query<LockRow, [number]>(
  `SELECT account_id, original_state, locked_at FROM state_locks
    WHERE locked_at <= ? ORDER BY locked_at ASC`
);

const changes = db.query<{ n: number }, []>('SELECT changes() AS n');

function changed(): boolean {
  return (changes.get()?.n ?? 0) === 1;
}

/* ------------------------------------------------------------------- audit */

/**
 * One line per thing that happened. `detail` is kept as JSON so a review can
 * read the gate verdict or the wallet that was seen, not just that a step
 * ran.
 */
export function audit(
  event: string,
  fields: { account?: string | null; orderId?: string | null; detail?: unknown } = {}
): void {
  insertAudit.run(
    Date.now(),
    fields.account ?? null,
    fields.orderId ?? null,
    event,
    fields.detail === undefined ? null : JSON.stringify(fields.detail)
  );
}

/* ------------------------------------------------------------------ orders */

export function orderById(id: string): Order | null {
  const row = selectOrder.get(id);
  return row ? toOrder(row) : null;
}

/** Newest first: the delivery tab reads top-down. */
export function ordersFor(account: string): Order[] {
  return selectOrdersFor.all(account).map(toOrder);
}

/** Oldest first: the worker delivers in the order people paid. */
export function queuedOrders(): QueuedOrder[] {
  return selectQueued.all().map(row => ({ ...toOrder(row), account: row.account }));
}

/**
 * Orders a worker claimed and never settled. Nothing here happens while the
 * service runs - a claim is settled in the same pass - so a row in this state
 * at boot was interrupted, and whether its transaction committed is exactly
 * what nobody knows. They are listed for a person, never requeued by code:
 * see `Fulfilment.start`.
 */
export function deliveringOrders(): QueuedOrder[] {
  return selectDelivering.all().map(row => ({ ...toOrder(row), account: row.account }));
}

export type AuditLine = Omit<AuditRow, 'detail'> & { detail: unknown };

/** Every audit line written about one order, oldest first, for the operator's look. */
export function auditFor(orderId: string): AuditLine[] {
  return selectAuditFor.all(orderId).map(row => ({
    ...row,
    detail: row.detail === null ? null : (JSON.parse(row.detail) as unknown),
  }));
}

/**
 * Chaos this account has paid for but not yet had taken out of its bag.
 * Counted while `delivering` too, not only `queued`: the jewels are still in
 * the wallet the placement route reads until the fulfilment transaction
 * commits, so a placement racing a delivery must see them as spoken for.
 */
export function chaosCommittedBy(account: string): number {
  return sumCommitted.get(account)?.n ?? 0;
}

/** Midnight on the service's clock: the caps are per calendar day, not per 24 hours. */
export function startOfToday(now = Date.now()): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/**
 * Orders placed today per product, for the daily caps. A cancelled or failed
 * order delivered nothing and so gives its slot back; queued, delivering and
 * delivered ones all count, since the cap is on what enters the game.
 */
export function spentTodayBy(account: string, now = Date.now()): Record<string, number> {
  const spent: Record<string, number> = {};

  for (const row of countSpentSince.all(account, startOfToday(now))) {
    spent[row.product_id] = row.n;
  }

  return spent;
}

export type Placement = { ok: true; order: Order } | { ok: false; reason: string };

/** What placement has to bound against, read inside the same transaction that would write. */
export interface PlacementView {
  /** Chaos already committed by this account's open orders. */
  committed: number;
  /** Orders of this product placed today, cancellations and failures excluded. */
  spentToday: number;
}

const placeInTransaction = db.transaction(
  (input: NewOrder, admit: (seen: PlacementView) => string | null): Placement => {
    const seen: PlacementView = {
      committed: chaosCommittedBy(input.account),
      spentToday: spentTodayBy(input.account)[input.productId] ?? 0,
    };

    const refusal = admit(seen);

    if (refusal !== null) {
      audit('placement refused', {
        account: input.account,
        detail: { productId: input.productId, refusal, ...seen },
      });
      return { ok: false, reason: refusal };
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    insertOrder.run(
      id,
      input.account,
      input.productId,
      input.productName,
      input.line,
      input.chaos,
      input.roll ? input.roll.seed : null,
      input.roll ? JSON.stringify(input.roll) : null,
      now,
      now
    );

    audit('placed', {
      account: input.account,
      orderId: id,
      detail: { productId: input.productId, chaos: input.chaos, seed: input.roll?.seed ?? null, ...seen },
    });

    const row = selectOrder.get(id);

    if (!row) throw new Error(`order ${id} vanished inside its own transaction`);

    return { ok: true, order: toOrder(row) };
  }
);

/**
 * Places an order, or refuses it, in one transaction.
 *
 * The bounds are the caller's - the wallet is in OpenMU's database, which this
 * file never reads - but the numbers they are compared against come from this
 * database, and they are read inside the transaction so two requests from the
 * same account cannot both see the jewels as unspent. `admit` gets those
 * numbers and answers with a reason to refuse or null.
 *
 * A gacha order arrives with its roll already made: the seed and the outcome
 * are written in the same statement that creates the order, which is what
 * stops outcome-shopping now that the roll no longer waits for fulfilment.
 */
export function placeOrder(input: NewOrder, admit: (seen: PlacementView) => string | null): Placement {
  return placeInTransaction(input, admit);
}

/**
 * Takes one queued order for delivery. Atomic: two workers cannot both claim
 * it, because the UPDATE is conditional on the state it is leaving. Null when
 * it was not queued any more.
 */
export function claimForDelivery(id: string): Order | null {
  claimQueued.run(Date.now(), id);
  return changed() ? orderById(id) : null;
}

/**
 * The worker's verdict on an order it claimed: `delivered` with the id of the
 * item row it inserted, `failed` with why, or back to `queued` for the one
 * failure that is nobody's fault - no room in the bag - because a gacha roll
 * is committed at placement and a player whose roll was voided for space would
 * rightly be furious. Only a `delivering` order can be settled, and only by
 * a worker that knows what happened: an order whose transaction may or may
 * not have committed is not settled at all (`explainDelivering`).
 */
export function settle(
  id: string,
  state: 'delivered' | 'failed' | 'queued',
  reason: string | null,
  itemId: string | null = null
): Order | null {
  const now = Date.now();

  settleDelivering.run(state, reason, itemId, now, state === 'delivered' ? now : null, id);

  if (!changed()) return null;

  const order = orderById(id);

  audit(`settled ${state}`, { orderId: id, detail: { reason, itemId } });

  return order;
}

/**
 * Words on an order that stays `delivering` because its outcome is unknown -
 * the process died mid-transaction, or Postgres went away between COMMIT and
 * its reply. The state does not move: `queued` could deliver twice, `failed`
 * could tell a player nothing was spent when it was. The player reads this,
 * the audit row has the rest, and `cashshop-orders` is how a person settles it.
 */
export function explainDelivering(id: string, reason: string): void {
  annotateDelivering.run(reason, Date.now(), id);
}

export type Cancellation =
  | { ok: true; order: Order }
  | { ok: false; reason: 'notFound' | 'notQueued' | 'gacha' };

const cancelInTransaction = db.transaction((id: string, account: string): Cancellation => {
  const row = selectOrder.get(id);

  // An order that belongs to someone else reads as absent: the id is not a
  // secret, but whether it exists is nobody else's business.
  if (!row || row.account !== account) return { ok: false, reason: 'notFound' };
  if (row.line === 'gacha') return { ok: false, reason: 'gacha' };
  if (row.state !== 'queued') return { ok: false, reason: 'notQueued' };

  cancelQueued.run('Cancelled by the player.', Date.now(), id);

  if (!changed()) return { ok: false, reason: 'notQueued' };

  audit('cancelled', { account, orderId: id });

  const order = orderById(id);

  if (!order) throw new Error(`order ${id} vanished inside its own transaction`);

  return { ok: true, order };
});

/**
 * The player changing their mind, while the order is still only a promise.
 * Never a gacha: its roll was committed when it was paid for, and a cancel
 * would be the outcome-shopping the placement-time roll exists to prevent.
 */
export function cancel(id: string, account: string): Cancellation {
  return cancelInTransaction(id, account);
}

/* ------------------------------------------------------------- state locks */

/**
 * How long a lock may stand before the sweep treats its holder as dead. A
 * delivery is one short write per order, so a lock older than this that no
 * running worker owns (`Fulfilment.sweep` knows its own) belongs to a process
 * that was killed with the account still set to TemporarilyBanned
 * (`LoginAction.ValidateAccountStateAsync` refuses it at login), and the
 * sweep runs at this interval so that costs a player about a minute.
 */
export const LOCK_STALE_MS = 30_000;

/**
 * Written before `Account.State` is changed, so a crash between the two
 * leaves a journal entry and not a mystery. `INSERT OR REPLACE` rather than a
 * plain insert: the worker journals in a `try` whose `finally` clears, so a
 * stale entry only exists if that `finally` never ran, and the sweep is what
 * clears those.
 */
export function journalLock(accountId: string, originalState: number): void {
  insertLock.run(accountId, originalState, Date.now());
}

export function clearLock(accountId: string): void {
  deleteLock.run(accountId);
}

function toLock(row: LockRow): StateLock {
  return { accountId: row.account_id, originalState: row.original_state, lockedAt: row.locked_at };
}

export function lockFor(accountId: string): StateLock | null {
  const row = selectLock.get(accountId);
  return row ? toLock(row) : null;
}

/** Locks older than `LOCK_STALE_MS`, oldest first, for the sweep to restore. */
export function staleLocks(now = Date.now()): StateLock[] {
  return selectStaleLocks.all(now - LOCK_STALE_MS).map(toLock);
}
