import { DEFAULT_DATABASE_URL, MAX_PASSWORD_LENGTH, botName, ensureBotAccounts } from './accounts';

/**
 * Creates the marketplace's bot accounts by hand.
 *
 *   bun run marketplace/bot/createAccounts.ts --count 5 --password <9 chars>
 *
 * The worker does the same on its own at startup when `DATABASE_URL` is set,
 * for as many bots as `MARKETPLACE_BOTS` asks for; this is for a box where
 * it is not, or to change the password (`--reset`). Re-running is safe and
 * is expected: a character only exists after the bot has logged in once, so
 * running this again afterwards promotes the characters too.
 */

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const count = Number(arg('count', '5'));
  const first = Number(arg('first', '1'));
  const password = arg('password');
  const reset = process.argv.includes('--reset');

  if (!password) {
    console.error(`--password is required (max ${MAX_PASSWORD_LENGTH} characters)`);
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

  const names = Array.from({ length: count }, (_, i) => botName(first + i));
  const result = await ensureBotAccounts({
    databaseUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    names,
    password,
    reset,
  });

  if (result.promoted.length > 0) console.log(`outfitted and made game master: ${result.promoted.join(", ")}`);
  if (result.created.length > 0) console.log(`created: ${result.created.join(', ')}`);
  if (result.updated.length > 0) console.log(`password reset: ${result.updated.join(', ')}`);
  if (result.skipped.length > 0) console.log(`already existed, left alone: ${result.skipped.join(', ')}`);
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
