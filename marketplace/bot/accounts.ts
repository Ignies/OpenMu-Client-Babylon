import bcrypt from 'bcryptjs';
import postgres from 'postgres';

/**
 * The marketplace's bot accounts, made and kept by the service itself.
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
 * A character only exists once the bot has logged in and made one, so
 * promoting characters to game master is a step of its own, run again after
 * that first login.
 */

export const PREFIX = 'MKT';

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
export const MAX_PASSWORD_LENGTH = 9;
const MAX_ACCOUNT_LENGTH = 10;

const BCRYPT_COST = 11;
const BCRYPT_VARIANT = '$2a$';

/** `AccountState.GameMaster` and `CharacterStatus.GameMaster` in OpenMU. */
const ACCOUNT_GAME_MASTER = 2;
export const CHARACTER_GAME_MASTER = 32;

/** The all-in-one compose publishes Postgres on 5433, not the default. */
export const DEFAULT_DATABASE_URL = 'postgres://postgres:admin@127.0.0.1:5433/openmu';

/** `MKT001`, `MKT002`, ... the convention every bot follows. */
export function botName(n: number): string {
  const name = `${PREFIX}${String(n).padStart(3, '0')}`;
  if (name.length > MAX_ACCOUNT_LENGTH) throw new Error(`bot name ${name} is too long`);
  return name;
}

async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  if (hash.startsWith(BCRYPT_VARIANT)) return hash;
  return BCRYPT_VARIANT + hash.slice(hash.indexOf('$', 1) + 1);
}

export type Provisioned = {
  created: string[];
  updated: string[];
  skipped: string[];
  promoted: string[];
};

/** What a fresh bot character is given, so it can work from its first login. */
export type Outfit = {
  /** OpenMU refuses a shop below level 6; twelve leaves room. */
  level: number;
  /** The float a bot pays sellers from before its own sales have filled it. */
  zen: number;
};

export const DEFAULT_OUTFIT: Outfit = { level: 12, zen: 1_000_000 };

/**
 * Makes sure every named account exists as a game master, and that every
 * character on an MKT account is one too. Safe to run as often as wanted.
 * `reset` changes the password on accounts that already exist.
 */
export async function ensureBotAccounts(options: {
  databaseUrl: string;
  names: string[];
  password: string;
  reset?: boolean;
  outfit?: Outfit;
}): Promise<Provisioned> {
  const { databaseUrl, names, password, reset = false } = options;
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`the bot password must be 1 to ${MAX_PASSWORD_LENGTH} characters`);
  }

  const sql = postgres(databaseUrl);
  const result: Provisioned = { created: [], updated: [], skipped: [], promoted: [] };

  try {
    for (const login of names) {
      if (!login.startsWith(PREFIX) || login.length > MAX_ACCOUNT_LENGTH) {
        throw new Error(`"${login}" is not a bot account name`);
      }

      const existing = await sql`
        SELECT 1 FROM data."Account" WHERE lower("LoginName") = lower(${login}) LIMIT 1
      `;
      if (existing.length > 0) {
        if (!reset) {
          result.skipped.push(login);
          continue;
        }
        await sql`
          UPDATE data."Account"
          SET "PasswordHash" = ${await hashPassword(password)}
          WHERE lower("LoginName") = lower(${login})
        `;
        result.updated.push(login);
        continue;
      }

      await sql`
        INSERT INTO data."Account" (
          "Id", "LoginName", "PasswordHash", "SecurityCode", "EMail",
          "RegistrationDate", "State", "TimeZone", "VaultPassword", "IsVaultExtended"
        ) VALUES (
          gen_random_uuid(), ${login}, ${await hashPassword(password)}, '', '',
          now(), ${ACCOUNT_GAME_MASTER}, 0, '', false
        )
      `;
      result.created.push(login);
    }

    result.promoted = await outfitWith(sql, options.outfit ?? DEFAULT_OUTFIT);
  } finally {
    await sql.end();
  }

  return result;
}

/**
 * Every character on an MKT account becomes a game master, is at least the
 * outfit's level, and - the first time, while it is still an ordinary
 * character - carries the outfit's Zen. Needed once per character, after the
 * bot has made it: `/hide`, `/skin` and `/trace` are game master commands,
 * a shop needs level 6, and a payout needs a float.
 *
 * Written only while the bot is logged out: OpenMU keeps a logged-in
 * character in memory and writes it back on save, which would undo all of
 * this. The fleet logs a fresh bot out, calls this, and logs it in again.
 */
export async function outfitBotCharacters(
  databaseUrl: string,
  outfit: Outfit = DEFAULT_OUTFIT
): Promise<string[]> {
  const sql = postgres(databaseUrl);
  try {
    return await outfitWith(sql, outfit);
  } finally {
    await sql.end();
  }
}

async function outfitWith(sql: ReturnType<typeof postgres>, outfit: Outfit): Promise<string[]> {
  // The float first, while "not yet a game master" still marks a new
  // character: an existing bot's Zen is its own books and is left alone.
  await sql`
    UPDATE data."ItemStorage" i
    SET "Money" = ${outfit.zen}
    FROM data."Character" c JOIN data."Account" a ON c."AccountId" = a."Id"
    WHERE i."Id" = c."InventoryId"
      AND a."LoginName" LIKE ${PREFIX + '%'}
      AND c."CharacterStatus" <> ${CHARACTER_GAME_MASTER}
      AND i."Money" < ${outfit.zen}
  `;

  // The level is a stat attribute row, found by its definition's name.
  await sql`
    UPDATE data."StatAttribute" s
    SET "Value" = ${outfit.level}
    FROM config."AttributeDefinition" d, data."Character" c
      JOIN data."Account" a ON c."AccountId" = a."Id"
    WHERE s."DefinitionId" = d."Id" AND d."Designation" = 'Level'
      AND s."CharacterId" = c."Id"
      AND a."LoginName" LIKE ${PREFIX + '%'}
      AND s."Value" < ${outfit.level}
  `;

  const promoted = await sql`
    UPDATE data."Character" c
    SET "CharacterStatus" = ${CHARACTER_GAME_MASTER}
    FROM data."Account" a
    WHERE c."AccountId" = a."Id"
      AND a."LoginName" LIKE ${PREFIX + '%'}
      AND c."CharacterStatus" <> ${CHARACTER_GAME_MASTER}
    RETURNING c."Name"
  `;
  return promoted.map(row => row.Name as string);
}
