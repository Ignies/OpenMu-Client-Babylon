// OpenMU accounts: the rules a login must meet and the one place outside OpenMU that writes `data."Account"`.
import type { Sql } from 'postgres';
import bcrypt from 'bcryptjs';
import { isReservedName } from '../../src/modules/servers/reservedNames';

/** OpenMU's `AccountState` (DataModel/Entities/Account.cs). */
export const AccountState = { Normal: 0, GameMaster: 2, Banned: 4 } as const;
export type AccountState = (typeof AccountState)[keyof typeof AccountState];

const MIN_USERNAME_LENGTH = 4;
/** `data."Account"."LoginName"` is `varchar(10)` - longer would truncate. */
const MAX_USERNAME_LENGTH = 10;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 10;

/**
 * Printable ASCII, space excluded - the same rule the two forms apply.
 *
 * The login packet carries the password one byte per character and the game
 * server reads it back as UTF-8, so a byte of 0x80 or over does not survive
 * the trip. An account signed up with one exists and can never be logged
 * into, so it must not be created in the first place.
 */
const PASSWORD_RE = /^[!-~]+$/;

const USERNAME_RE = /^[A-Za-z0-9]+$/;

/**
 * Everything the form checks, checked again. The form's copy exists to save a
 * round trip; this one is the one that counts, because anything can POST here.
 */
export function validate(body: {
  username?: unknown;
  password?: unknown;
}): string | null {
  const { username, password } = body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Malformed request.';
  }

  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH
  ) {
    return `ID must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters.`;
  }

  if (!USERNAME_RE.test(username)) {
    return 'ID may contain only letters and numbers.';
  }

  if (isReservedName(username)) {
    return 'That ID is reserved.';
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
  }

  if (!PASSWORD_RE.test(password)) {
    return 'Password may contain only letters, numbers and basic symbols.';
  }

  return null;
}

/**
 * OpenMU stores a bare BCrypt string - variant `2a` at cost 11, no wrapper.
 * Both are matched exactly below, because a hash OpenMU cannot verify produces
 * an account that exists but cannot log in, which is far more confusing than a
 * failed registration.
 *
 * To re-confirm this against a live server (after an OpenMU upgrade, say),
 * read the prefix off any existing account - `$2a$11$` is algorithm and cost:
 *
 *   docker exec -i database psql -U postgres -d openmu \
 *     -c 'SELECT "LoginName", left("PasswordHash", 7) FROM data."Account";'
 *
 * `left(...)` deliberately: the prefix answers the question, and the rest is
 * the hash of somebody's password and does not belong in a terminal, a log, or
 * a comment.
 */
const BCRYPT_COST = 11;
const BCRYPT_VARIANT = '$2a$';

/**
 * Async, not `hashSync`: BCrypt at cost 11 takes ~100-300 ms on a shared vCPU,
 * and the sync call would stall every other request in the process for that
 * long. `bcryptjs` chunks the async path so the loop keeps turning.
 */
export async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  if (hash.startsWith(BCRYPT_VARIANT)) return hash;

  // Some `bcryptjs` versions emit `$2b$`. The variants differ only in how
  // passwords of 256 bytes or more are handled, and `validate` caps them at
  // ten characters - so for anything reaching here the digests are identical
  // and only the label differs. Rewrite it so what we store is byte-identical
  // to what OpenMU writes itself.
  return BCRYPT_VARIANT + hash.slice(hash.indexOf('$', 1) + 1);
}

/** Postgres `unique_violation`: the name was taken between the check and the write. */
const UNIQUE_VIOLATION = '23505';

/** Creates the account, or returns why it could not be. */
export async function createAccount(
  sql: Sql,
  username: string,
  password: string,
  state: AccountState = AccountState.Normal
): Promise<string | null> {
  const existing = await sql`
    SELECT 1 FROM data."Account" WHERE lower("LoginName") = lower(${username}) LIMIT 1
  `;

  if (existing.length > 0) return 'That ID is already taken.';

  try {
    const passwordHash = await hashPassword(password);

    // Column list mirrors every NOT NULL column on `data."Account"` that has no
    // default. `VaultId` stays null: OpenMU creates the vault storage itself on
    // first use, and inventing one here would mean writing `ItemStorage` too.
    // `EMail` is NOT NULL but the form does not ask for one, so it takes the
    // empty string.
    await sql`
      INSERT INTO data."Account" (
        "Id", "LoginName", "PasswordHash", "SecurityCode", "EMail",
        "RegistrationDate", "State", "TimeZone", "VaultPassword", "IsVaultExtended"
      ) VALUES (
        gen_random_uuid(), ${username}, ${passwordHash}, '', '',
        now(), ${state}, 0, '', false
      )
    `;
  } catch (err) {
    // The unique index on `LoginName` is what actually prevents duplicates: the
    // check above races, and loses to two submissions of the same name landing
    // together. The loser gets the same answer the check would have given it.
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return 'That ID is already taken.';
    }

    throw err;
  }

  return null;
}

/**
 * The accounts OpenMU's Season 6 seed creates, each with its login as its password
 * (Persistence/Initialization/VersionSeasonSix/TestAccounts); three are Game Masters.
 */
export const SEEDED_TEST_ACCOUNTS = [
  'ancient', 'quest1', 'quest2', 'quest3', 'socket', 'test0', 'test1', 'test2', 'test3', 'test4',
  'test5', 'test6', 'test7', 'test8', 'test9', 'test300', 'test400', 'testgm', 'testgm2', 'testunlock',
] as const;

/**
 * Bans every seeded test account that still has its login as its password, and gives it a random
 * one. An account someone has since given a real password is left alone. Returns the locked names.
 */
export async function lockDefaultTestAccounts(sql: Sql): Promise<string[]> {
  const rows = await sql<{ LoginName: string; PasswordHash: string }[]>`
    SELECT "LoginName", "PasswordHash" FROM data."Account" WHERE "LoginName" IN ${sql([...SEEDED_TEST_ACCOUNTS])}
  `;
  const locked: string[] = [];
  for (const row of rows) {
    if (!(await bcrypt.compare(row.LoginName, row.PasswordHash))) continue;
    const hash = await hashPassword(crypto.randomUUID().slice(0, 10));
    await sql`
      UPDATE data."Account" SET "State" = ${AccountState.Banned}, "PasswordHash" = ${hash}
      WHERE "LoginName" = ${row.LoginName}
    `;
    locked.push(row.LoginName);
  }
  return locked;
}
