import { auditFor, deliveringOrders, orderById, ordersFor, queuedOrders, settle, DB_PATH } from './db';

/**
 * The operator's view of the order store, for the one case the worker is
 * built not to decide on its own: an order left `delivering` because the
 * process died mid-transaction or Postgres went away around COMMIT. Whether
 * that write landed is a fact in OpenMU's database, not in this one, so a
 * person looks (`\d data."Item"` for the slot and definition the audit row
 * names) and then says which it was.
 *
 *   bun run cashshop-orders                     what is queued and what is stuck
 *   bun run cashshop-orders show <id>           one order and every audit line about it
 *   bun run cashshop-orders account <name>      one account's orders, newest first
 *   bun run cashshop-orders requeue <id>        it did not commit: let the worker try again
 *   bun run cashshop-orders fail <id> <reason>  it did not commit and must not: tell the player why
 *   bun run cashshop-orders delivered <id> <itemId>
 *                                               it did commit: record the item row it left
 *
 * Reads and writes the shop's own SQLite only; it never touches OpenMU.
 */

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function usage(): never {
  console.error(
    'usage: bun run cashshop-orders ' +
      '[show <id> | account <name> | requeue <id> | fail <id> <reason> | delivered <id> <itemId>]'
  );
  process.exit(2);
}

function stamp(at: number): string {
  return new Date(at).toISOString().replace('T', ' ').slice(0, 19);
}

function line(order: ReturnType<typeof orderById>): string {
  if (!order) return '';
  const roll = order.roll ? ` ${order.roll.tier} ${order.roll.name} +${order.roll.level}` : '';
  return (
    `${DIM}${stamp(order.placedAt)}${RESET} ${order.id} ${order.state.padEnd(10)} ` +
    `${order.productName}${roll} ${DIM}${order.chaos} chaos${RESET}`
  );
}

function overview(): void {
  const stuck = deliveringOrders();
  const queued = queuedOrders();

  console.info(`${BOLD}orders in ${DB_PATH}${RESET}`);

  if (stuck.length) {
    console.info(
      `\n${RED}${stuck.length} delivering - interrupted, a person has to settle each one:${RESET}`
    );
    for (const order of stuck) console.info(`  ${order.account.padEnd(10)} ${line(order)}`);
  } else {
    console.info(`\nnothing stuck in delivering`);
  }

  console.info(`\n${queued.length} queued:`);
  for (const order of queued) console.info(`  ${order.account.padEnd(10)} ${line(order)}`);
}

function show(id: string): void {
  const order = orderById(id);

  if (!order) {
    console.error(`no order ${id}`);
    process.exit(1);
  }

  console.info(line(order));
  if (order.reason) console.info(`  ${order.reason}`);
  if (order.roll) console.info(`  roll ${JSON.stringify(order.roll)}`);

  for (const entry of auditFor(id)) {
    console.info(`\n${DIM}${stamp(entry.at)}${RESET} ${BOLD}${entry.event}${RESET}`);
    if (entry.detail !== null) console.info(`  ${JSON.stringify(entry.detail)}`);
  }
}

function resolve(
  id: string,
  state: 'queued' | 'failed' | 'delivered',
  reason: string,
  itemId: string | null
): void {
  const order = orderById(id);

  if (!order) {
    console.error(`no order ${id}`);
    process.exit(1);
  }

  if (order.state !== 'delivering') {
    console.error(
      `order ${id} is ${order.state}, not delivering; only a delivering order can be settled by hand`
    );
    process.exit(1);
  }

  const settled = settle(id, state, reason, itemId);

  if (!settled) {
    console.error(`order ${id} could not be settled`);
    process.exit(1);
  }

  console.info(line(settled));
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case undefined:
    overview();
    break;
  case 'show':
    if (!rest[0]) usage();
    show(rest[0]);
    break;
  case 'account':
    if (!rest[0]) usage();
    for (const order of ordersFor(rest[0].toLowerCase())) console.info(line(order));
    break;
  case 'requeue':
    if (!rest[0]) usage();
    resolve(rest[0], 'queued', 'Checked by hand: not delivered yet, and queued again.', null);
    break;
  case 'fail':
    if (!rest[0] || !rest[1]) usage();
    resolve(rest[0], 'failed', rest.slice(1).join(' '), null);
    break;
  case 'delivered':
    if (!rest[0] || !rest[1]) usage();
    resolve(rest[0], 'delivered', 'Checked by hand: delivered.', rest[1]);
    break;
  default:
    usage();
}
