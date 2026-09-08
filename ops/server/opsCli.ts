import { readAccountLog } from '../../register/server/db';
import { readCheatWarnings, readOffenders } from './db';
import { ingestOnce, follow } from './reader';

/**
 * The operations console from a terminal.
 *
 * The console's HTTP service and its in-game window come with the identity
 * decision that gates them (`documentation/ops_console/ARCHITECTURE.md`).
 * Until then the data is already being collected, and this is how an operator
 * reads it: over ssh, as the person who already has the box.
 *
 *   bun run ops-ingest              one pass over the log, then stop
 *   bun run ops-follow              keep following the log
 *   bun run ops warnings [n]        the newest cheat warnings
 *   bun run ops who [days] [n]      who tripped the most checks
 *   bun run ops accounts [n]        the newest registrations
 */

const [command, ...args] = process.argv.slice(2);

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const when = (at: number): string => new Date(at).toISOString().replace('T', ' ').slice(0, 19);

switch (command) {
  case 'ingest': {
    const filed = await ingestOnce();
    console.info(`filed ${filed} cheat warning(s)`);
    break;
  }

  case 'follow':
    follow();
    break;

  case 'warnings': {
    const rows = readCheatWarnings(num(args[0], 30));
    if (rows.length === 0) console.info('nothing recorded');
    for (const row of rows) {
      const who = row.character ?? row.account ?? '?';
      console.info(`${when(row.at)}  ${row.severity.padEnd(4)}  ${who.padEnd(14)}  ${row.message}`);
    }
    break;
  }

  case 'who': {
    const since = Date.now() - num(args[0], 7) * 24 * 60 * 60 * 1000;
    const rows = readOffenders(since, num(args[1], 20));
    if (rows.length === 0) console.info('nobody tripped a check in that window');
    for (const row of rows) {
      console.info(
        `${row.who.padEnd(16)}  ${String(row.hits).padStart(4)} hits  ${String(row.hard).padStart(4)} hard  last ${when(row.last_at)}`
      );
    }
    break;
  }

  case 'accounts': {
    const rows = readAccountLog(num(args[0], 30));
    if (rows.length === 0) console.info('no registrations recorded yet');
    for (const row of rows) {
      console.info(`${when(row.at)}  ${row.login_name.padEnd(14)}  ${row.bucket}`);
    }
    break;
  }

  default:
    console.info(
      [
        'usage:',
        '  ops ingest              one pass over the OpenMU log',
        '  ops follow              keep following it',
        '  ops warnings [n]        the newest cheat warnings',
        '  ops who [days] [n]      who tripped the most checks',
        '  ops accounts [n]        the newest registrations',
      ].join('\n')
    );
    process.exitCode = command ? 1 : 0;
}
