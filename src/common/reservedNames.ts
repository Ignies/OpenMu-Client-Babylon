/**
 * Names nobody may sign up with or name a character after.
 *
 * The marketplace's trading bots are the `MKT` accounts (`MKT001` and so on,
 * made by `marketplace/bot/createAccounts.ts`), and a player who could call
 * themselves `MKT006` would be a stranger wearing the market's name. The
 * register service and the character form both refuse the prefix.
 */
const RESERVED = /^mkt/i;

export function isReservedName(name: string): boolean {
  return RESERVED.test(name);
}
