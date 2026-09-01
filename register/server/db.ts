import { Database } from 'bun:sqlite';

/**
 * The register service's own storage: invite keys, and the signup log the rate
 * limiter reads.
 *
 * Deliberately *not* OpenMU's database. Nothing here is game state — it is the
 * gate in front of account creation — and keeping it separate means this
 * service never adds tables to a schema OpenMU owns and migrates.
 *
 * Shared by `main.ts` (the endpoint) and `keys.ts` (the CLI), which is the only
 * reason it is a module rather than living in the server.
 */

const DB_PATH =
  process.env.RATE_DB_PATH || '/var/lib/mu-register/signups.sqlite';

export const db = new Database(DB_PATH, { create: true });

// WAL so the CLI can mint keys while the server is serving.
db.run('PRAGMA journal_mode = WAL');

db.run(
  `CREATE TABLE IF NOT EXISTS signups (bucket TEXT NOT NULL, at INTEGER NOT NULL)`
);
db.run('CREATE INDEX IF NOT EXISTS signups_bucket_at ON signups (bucket, at)');

db.run(`
  CREATE TABLE IF NOT EXISTS keys (
    key        TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    used_at    INTEGER,
    used_by    TEXT
  )
`);

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

/* --------------------------------------------------------------------- keys */

/**
 * No `0/O`, `1/I/L` or `U`: these get read off a screen, typed by hand, and
 * sometimes relayed out loud, and the pairs that look alike cause more support
 * than the extra entropy is worth.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUPS = 3;
const GROUP_LENGTH = 5;

/**
 * `MU-XXXXX-XXXXX-XXXXX`. Fifteen characters of a 30-symbol alphabet is a bit
 * over 73 bits — far past guessable, and still short enough to read out.
 *
 * Rejection sampling keeps the draw uniform: 256 is not a multiple of 30, so
 * taking a raw byte modulo the alphabet would favour its first 16 symbols.
 */
export function generateKey(): string {
  const chars: string[] = [];
  const limit = 256 - (256 % ALPHABET.length);

  while (chars.length < GROUPS * GROUP_LENGTH) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= limit) continue;
      chars.push(ALPHABET[byte % ALPHABET.length]);
      if (chars.length === GROUPS * GROUP_LENGTH) break;
    }
  }

  const groups: string[] = [];

  for (let i = 0; i < GROUPS; i++) {
    groups.push(chars.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH).join(''));
  }

  return `MU-${groups.join('-')}`;
}

const insertKey = db.query<unknown, [string, number]>(
  'INSERT OR IGNORE INTO keys (key, created_at) VALUES (?, ?)'
);

/** Mints `count` keys and returns them. */
export function mintKeys(count: number): string[] {
  const now = Date.now();
  const minted: string[] = [];

  const write = db.transaction((keys: string[]) => {
    for (const key of keys) insertKey.run(key, now);
  });

  while (minted.length < count) minted.push(generateKey());
  write(minted);

  return minted;
}

const claim = db.query<unknown, [number, string, string]>(
  'UPDATE keys SET used_at = ?, used_by = ? WHERE key = ? AND used_by IS NULL'
);
const release = db.query<unknown, [string]>(
  'UPDATE keys SET used_at = NULL, used_by = NULL WHERE key = ?'
);

/**
 * Takes the key for `username`, or returns false if it does not exist or is
 * already spent.
 *
 * `used_by` is what marks a key spent — it names the account the key became,
 * which is the fact worth keeping; `used_at` is only when. The
 * `used_by IS NULL` in the UPDATE is what makes one key mean one account: two
 * requests arriving together both run it, SQLite serialises them, and the
 * second matches no rows. A SELECT to check followed by an UPDATE to claim
 * would let both through.
 */
export function claimKey(key: string, username: string): boolean {
  claim.run(Date.now(), username, key);

  return db.query<{ n: number }, []>('SELECT changes() AS n').get()?.n === 1;
}

/** Puts a claimed key back, for when account creation fails after the claim. */
export function releaseKey(key: string): void {
  release.run(key);
}

/**
 * Mints the opening batch the first time the service runs, and does nothing
 * ever after — the emptiness check is what makes it safe to call on every
 * start. Returns the new keys so the caller can print them; an empty array
 * means the table was already seeded.
 *
 * To issue more later, delete nothing and mint by hand:
 *   bun --eval 'import("./register/server/db.ts").then(d => console.log(d.mintKeys(20).join("\n")))'
 */
export function seedKeys(count: number): string[] {
  const existing =
    db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM keys').get()?.n ?? 0;

  return existing > 0 ? [] : mintKeys(count);
}
