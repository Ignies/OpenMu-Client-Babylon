import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { migrate } from '../../tools/sqliteMigrate';
import type { CheatEvent } from './ingest';

/**
 * The operations console's own storage.
 *
 * Deliberately not OpenMU's database and not the register service's: this
 * holds what was *observed*, which is neither game state nor a gate, and
 * keeping it separate means nothing here can corrupt an account.
 *
 * The schema lives in `migrations/`. Those files are the exact statements to
 * run against the production database, and the same ones this applies on a
 * fresh box, so the two cannot drift.
 */

const DB_PATH = process.env.OPS_DB_PATH || '/var/lib/mu-ops/ops.sqlite';

export const db = new Database(DB_PATH, { create: true });

db.run('PRAGMA journal_mode = WAL');

const applied = migrate(db, join(import.meta.dir, 'migrations'));
if (applied.length > 0) {
  console.info(`applied ${applied.length} migration(s): ${applied.join(', ')}`);
}

/* ---------------------------------------------------------- cheat warnings */

export type CheatWarningRow = CheatEvent & { id: number };

const insertWarning = db.query<
  unknown,
  [number, string, string, string | null, string | null, string, string, string]
>(`
  INSERT INTO cheat_warnings (at, signal, severity, account, character, message, template, properties)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

export function recordCheatWarnings(events: readonly CheatEvent[]): number {
  if (events.length === 0) return 0;

  // One transaction for the batch: a log read either lands whole or not at
  // all, which is what makes the saved offset safe to trust.
  db.transaction(() => {
    for (const event of events) {
      insertWarning.run(
        event.at,
        event.signal,
        event.severity,
        event.account,
        event.character,
        event.message,
        event.template,
        event.properties
      );
    }
  })();

  return events.length;
}

const recentWarnings = db.query<CheatWarningRow, [number]>(
  'SELECT * FROM cheat_warnings ORDER BY at DESC LIMIT ?'
);

const warningsBySignal = db.query<CheatWarningRow, [string, number]>(
  'SELECT * FROM cheat_warnings WHERE signal = ? ORDER BY at DESC LIMIT ?'
);

const warningsByWho = db.query<CheatWarningRow, [string, string, number]>(`
  SELECT * FROM cheat_warnings
  WHERE lower(account) = lower(?) OR lower(character) = lower(?)
  ORDER BY at DESC LIMIT ?
`);

export function readCheatWarnings(
  limit: number,
  filter?: { signal?: string; who?: string }
): CheatWarningRow[] {
  if (filter?.who) return warningsByWho.all(filter.who, filter.who, limit);
  if (filter?.signal) return warningsBySignal.all(filter.signal, limit);
  return recentWarnings.all(limit);
}

/** Who tripped the most checks lately - the question an operator actually asks. */
const offenders = db.query<
  { who: string; hits: number; hard: number; last_at: number },
  [number, number]
>(`
  SELECT
    COALESCE(character, account) AS who,
    COUNT(*) AS hits,
    SUM(CASE WHEN severity = 'hard' THEN 1 ELSE 0 END) AS hard,
    MAX(at) AS last_at
  FROM cheat_warnings
  WHERE at > ? AND COALESCE(character, account) IS NOT NULL
  GROUP BY who
  ORDER BY hard DESC, hits DESC
  LIMIT ?
`);

export function readOffenders(since: number, limit: number) {
  return offenders.all(since, limit);
}

/* -------------------------------------------------------- ingest progress */

const readProgress = db.query<{ offset: number }, [string]>(
  'SELECT offset FROM ingest_progress WHERE file = ?'
);

const writeProgress = db.query<unknown, [string, number, number]>(`
  INSERT INTO ingest_progress (file, offset, seen_at) VALUES (?, ?, ?)
  ON CONFLICT (file) DO UPDATE SET offset = excluded.offset, seen_at = excluded.seen_at
`);

export function offsetOf(file: string): number {
  return readProgress.get(file)?.offset ?? 0;
}

export function rememberOffset(file: string, offset: number): void {
  writeProgress.run(file, offset, Date.now());
}
