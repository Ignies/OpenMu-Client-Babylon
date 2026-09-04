import { Database } from 'bun:sqlite';

/**
 * The register service's own storage: the signup log the rate limiter reads.
 *
 * Deliberately *not* OpenMU's database. Nothing here is game state — it is the
 * gate in front of account creation — and keeping it separate means this
 * service never adds tables to a schema OpenMU owns and migrates.
 */

const DB_PATH =
  process.env.RATE_DB_PATH || '/var/lib/mu-register/signups.sqlite';

export const db = new Database(DB_PATH, { create: true });

// WAL so a reader can look at the log while the server is serving.
db.run('PRAGMA journal_mode = WAL');

db.run(
  `CREATE TABLE IF NOT EXISTS signups (bucket TEXT NOT NULL, at INTEGER NOT NULL)`
);
db.run('CREATE INDEX IF NOT EXISTS signups_bucket_at ON signups (bucket, at)');

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
