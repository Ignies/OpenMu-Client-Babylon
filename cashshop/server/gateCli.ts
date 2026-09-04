import postgres from 'postgres';
import { SafetyGate, loadGateConfig, resolveSchema } from './gate';

/**
 * Prints the safety gate's verdict for an account, so the gate can be checked
 * against real players long before any shop code exists.
 *
 *   bun run cashshop-gate <account>       the verdict, one line per signal
 *   bun run cashshop-gate <account> -w    re-check every 10s until interrupted
 *   bun run cashshop-gate --schema        what it resolved OpenMU's columns to
 *
 * Read-only from end to end: it never writes to OpenMU's database.
 */

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:admin@127.0.0.1:5432/openmu';

const WATCH_INTERVAL_MS = Number(process.env.GATE_WATCH_INTERVAL_MS ?? 10_000);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function usage(): never {
  console.error('usage: bun run cashshop-gate <account> [--watch] | --schema');
  process.exit(2);
}

async function printSchema(sql: postgres.Sql): Promise<void> {
  const schema = await resolveSchema(sql);

  console.info(`${BOLD}Resolved OpenMU columns${RESET}`);
  for (const [logical, table] of Object.entries(schema)) {
    console.info(`  ${logical} -> ${table.schema}."${table.table}"`);
    for (const [name, column] of Object.entries(table.columns)) {
      console.info(`      ${name.padEnd(20)} "${column}"`);
    }
  }
}

async function printVerdict(gate: SafetyGate, account: string): Promise<void> {
  const verdict = await gate.check(account);
  const stamp = new Date(verdict.checkedAt).toISOString().slice(11, 19);
  const headline = verdict.safe
    ? `${GREEN}SAFE${RESET}    the shop may write to ${account}`
    : `${RED}REFUSED${RESET} the shop must not write to ${account}`;

  console.info(`\n${DIM}${stamp}${RESET} ${headline}`);

  for (const signal of verdict.signals) {
    const mark = signal.safe ? `${GREEN}ok  ${RESET}` : `${RED}no  ${RESET}`;
    console.info(`  ${mark} ${signal.name.padEnd(14)} ${signal.reason}`);

    if (signal.detail) {
      console.info(`       ${DIM}${JSON.stringify(signal.detail)}${RESET}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantsSchema = args.includes('--schema');
  const watch = args.includes('--watch') || args.includes('-w');
  const account = args.find(arg => !arg.startsWith('-'));

  if (!wantsSchema && !account) usage();

  const sql = postgres(DATABASE_URL);

  try {
    if (wantsSchema) {
      await printSchema(sql);
      return;
    }

    if (account === undefined) usage();

    const config = loadGateConfig();

    if (!config.gameHost || !config.gamePort) {
      console.warn(
        `${DIM}GAME_PROBE_HOST / GAME_PROBE_PORT are unset, so the port probe will refuse.` +
          ` Set them to the address a player's client would dial.${RESET}`
      );
    }

    const gate = new SafetyGate(sql, config);

    await printVerdict(gate, account);

    if (!watch) return;

    console.info(`${DIM}watching every ${Math.round(WATCH_INTERVAL_MS / 1000)}s, ctrl-c to stop${RESET}`);

    for (;;) {
      await new Promise(resolve => setTimeout(resolve, WATCH_INTERVAL_MS));
      await printVerdict(gate, account);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(error => {
  console.error(`${RED}gate check failed:${RESET}`, error instanceof Error ? error.message : error);
  process.exit(1);
});
