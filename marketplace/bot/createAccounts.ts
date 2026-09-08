import bcrypt from 'bcryptjs';
import postgres from 'postgres';

/**
 * Creates the marketplace's bot accounts.
 *
 * Bot accounts are named `MKT###` so they are obvious in the admin panel and
 * in any audit of the account table. They are the only accounts the service
 * ever owns, and the only ones it is ever safe for it to write to directly -
 * because it is the only thing that logs them in, they have no live state in
 * the game server to contradict.
 *
 * The insert mirrors `register/server/main.ts` exactly, including the `$2a$`
 * rewrite: what lands here has to be byte-identical to what OpenMU writes
 * itself, or the login it accepts from a person would not be the login it
 * accepts from a bot.
 *
 *   bun run marketplace/bot/createAccounts.ts --count 5 --password <10 chars>
 *
 * Re-running is safe: an account that already exists is left alone.
 */

const DATABASE_URL =
  process.env.DATABASE_URL ||
  // The all-in-one compose publishes Postgres on 5433, not the default.
  'postgres://postgres:admin@127.0.0.1:5433/openmu';

const BCRYPT_COST = 11;
const BCRYPT_VARIANT = '$2a$';

/**
 * Nine, not ten, and the reason is a real trap.
 *
 * The client sends `LoginShortPassword`, which is 50 bytes. OpenMU dispatches
 * on the packet length (`LogInHandlerPlugIn`): anything 42 bytes or longer is
 * parsed as `LoginLongPassword`, whose password field is 20 bytes from offset
 * 14 rather than 10. It survives only because `ExtractString` stops at the
 * first zero byte, and a password shorter than ten leaves one in the padding.
 *
 * A password of exactly ten characters has no terminator, so the server reads
 * on into the client version and serial that follow it and the password never
 * matches. Nine keeps the terminator inside the field.
 */
const MAX_PASSWORD_LENGTH = 9;
const MAX_ACCOUNT_LENGTH = 10;

const PREFIX = 'MKT';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  if (hash.startsWith(BCRYPT_VARIANT)) return hash;
  // `bcryptjs` may emit `$2b$`; the variants differ only for passwords of 256
  // bytes or more, and these are capped at ten, so only the label differs.
  return BCRYPT_VARIANT + hash.slice(hash.indexOf('$', 1) + 1);
}

async function main(): Promise<void> {
  const count = Number(arg('count', '5'));
  const password = arg('password');
  const reset = process.argv.includes('--reset');

  if (!password) {
    console.error('--password is required (max 10 characters)');
    process.exit(1);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    console.error(`--password must be at most ${MAX_PASSWORD_LENGTH} characters`);
    process.exit(1);
  }
  if (!Number.isInteger(count) || count < 1 || count > 99) {
    console.error('--count must be between 1 and 99');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL);
  const created: string[] = [];
  const skipped: string[] = [];
  const updated: string[] = [];

  try {
    for (let i = 1; i <= count; i++) {
      const login = `${PREFIX}${String(i).padStart(3, '0')}`;
      if (login.length > MAX_ACCOUNT_LENGTH) {
        throw new Error(`account name ${login} is longer than ${MAX_ACCOUNT_LENGTH}`);
      }

      const existing = await sql`
        SELECT 1 FROM data."Account" WHERE lower("LoginName") = lower(${login}) LIMIT 1
      `;
      if (existing.length > 0) {
        if (!reset) {
          skipped.push(login);
          continue;
        }
        await sql`
          UPDATE data."Account"
          SET "PasswordHash" = ${await hashPassword(password)}
          WHERE lower("LoginName") = lower(${login})
        `;
        updated.push(login);
        continue;
      }

      // Every NOT NULL column without a default. `VaultId` stays null: OpenMU
      // creates the vault storage itself on first use.
      await sql`
        INSERT INTO data."Account" (
          "Id", "LoginName", "PasswordHash", "SecurityCode", "EMail",
          "RegistrationDate", "State", "TimeZone", "VaultPassword", "IsVaultExtended"
        ) VALUES (
          gen_random_uuid(), ${login}, ${await hashPassword(password)}, '', '',
          now(), 0, 0, '', false
        )
      `;
      created.push(login);
    }
  } finally {
    await sql.end();
  }

  if (created.length > 0) console.log(`created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`password reset: ${updated.join(', ')}`);
  if (skipped.length > 0) console.log(`already existed, left alone: ${skipped.join(', ')}`);
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
