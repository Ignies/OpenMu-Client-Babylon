import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { migrate } from '../../tools/sqliteMigrate';

/**
 * The register service's own storage: the signup log the rate limiter reads,
 * and the account creation log an operator can query.
 *
 * Deliberately *not* OpenMU's database. Nothing here is game state — it is the
 * gate in front of account creation, and the record of what came through it —
 * and keeping it separate means this service never adds tables to a schema
 * OpenMU owns and migrates.
 *
 * The schema lives in `migrations/`, not in this file: those are the exact
 * statements to run against the production database, and running them here too
 * means a fresh box and a live one end up with the same thing.
 */

const DB_PATH =
  process.env.RATE_DB_PATH || '/var/lib/mu-register/signups.sqlite';

export const db = new Database(DB_PATH, { create: true });

// WAL so a reader can look at the log while the server is serving.
db.run('PRAGMA journal_mode = WAL');

const applied = migrate(db, join(import.meta.dir, 'migrations'));
if (applied.length > 0) {
  console.info(`applied ${applied.length} migration(s): ${applied.join(', ')}`);
}

/* ------------------------------------------------------------------ signups */

const countRecent = db.query<{ n: number }, [string, number]>(
  'SELECT COUNT(*) AS n FROM signups WHERE bucket = ? AND at > ?'
);
const insertSignup = db.query<unknown, [string, number]>(
  'INSERT INTO signups (bucket, at) VALUES (?, ?)'
);
const deleteExpired = db.query<unknown, [number]>(
  'DELETE FROM signups WHERE at <= ?'
);

export function signupsSince(bucket: string, since: number): number {
  return countRecent.get(bucket, since)?.n ?? 0;
}

export function recordSignup(bucket: string): void {
  insertSignup.run(bucket, Date.now());
}

export function forgetSignupsBefore(cutoff: number): void {
  deleteExpired.run(cutoff);
}

/* -------------------------------------------------------------- account log */

export type AccountLogEntry = {
  id: number;
  login_name: string;
  bucket: string;
  at: number;
};

const insertAccount = db.query<unknown, [string, string, number]>(
  'INSERT INTO account_log (login_name, bucket, at) VALUES (?, ?, ?)'
);

const recentAccounts = db.query<AccountLogEntry, [number]>(
  'SELECT id, login_name, bucket, at FROM account_log ORDER BY at DESC LIMIT ?'
);

const accountsSince = db.query<AccountLogEntry, [number, number]>(
  'SELECT id, login_name, bucket, at FROM account_log WHERE at > ? ORDER BY at DESC LIMIT ?'
);

/**
 * One created account. Never called before the row exists in OpenMU's own
 * database, so this log lists accounts that were made, not attempts.
 */
export function recordAccount(loginName: string, bucket: string): void {
  insertAccount.run(loginName, bucket, Date.now());
}

export function readAccountLog(limit: number, since?: number): AccountLogEntry[] {
  return since === undefined
    ? recentAccounts.all(limit)
    : accountsSince.all(since, limit);
}
