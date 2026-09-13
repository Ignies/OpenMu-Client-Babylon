/**
 * Which bot does a piece of work. Pure, so it can be tested without a game
 * server behind it.
 *
 * A fleet is several bots in one process on one game server. Any idle bot
 * can collect a listing; a claim or a return is finished only by the bot
 * holding the item, because only it has the item; a payout goes to an idle
 * bot that actually carries the Zen, the richest first, so the float is
 * spent where it is.
 */

export type Runner = {
  name: string;
  busy: boolean;
  /** Zen the server last reported for this bot, null until it said. */
  zen: number | null;
};

/** The bot to send for a listing, or null with the reason nobody can go. */
export function pickForListing(
  bots: Runner[],
  holder: string | null
): { bot: Runner } | { bot: null; reason: string } {
  if (holder !== null) {
    const own = bots.find(b => b.name === holder);
    if (!own) return { bot: null, reason: `bot ${holder} holds the item and is not online` };
    if (own.busy) return { bot: null, reason: `bot ${holder} holds the item and is busy` };
    return { bot: own };
  }
  const idle = bots.find(b => !b.busy);
  return idle ? { bot: idle } : { bot: null, reason: 'every bot is busy' };
}

/** The bot to send with `amount` Zen, or null with the reason nobody can. */
export function pickForPayout(
  bots: Runner[],
  amount: number
): { bot: Runner } | { bot: null; reason: string } {
  const able = bots
    .filter(b => !b.busy && b.zen !== null && b.zen >= amount)
    .sort((a, b) => (b.zen ?? 0) - (a.zen ?? 0));
  if (able.length > 0) return { bot: able[0] };

  const richest = Math.max(0, ...bots.map(b => b.zen ?? 0));
  if (richest < amount) {
    return { bot: null, reason: `no bot holds ${amount} Zen (the richest has ${richest})` };
  }
  return { bot: null, reason: 'every bot with enough Zen is busy' };
}
