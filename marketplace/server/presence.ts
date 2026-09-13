/**
 * Whether an account is logged in, and on which game server, as the proxy's
 * presence server says.
 *
 * The worker asks this before it sets off: a `/trace` at somebody who is not
 * online costs a warp that never comes, ten seconds of waiting for it, three
 * times over - and with a few such listings in the queue the bot spent whole
 * minutes chasing ghosts while a real customer stood waiting. Presence is a
 * loopback call that answers in milliseconds.
 *
 * The ports matter as much as the answer: OpenMU runs a copy of every map
 * per game server, so a bot on one port can only ever reach the players on
 * that port. A player who is online elsewhere is another bot's customer.
 *
 * The answer is `null` when presence cannot be reached, and the caller then
 * tries anyway: an outage of the proxy's side channel must not stop the
 * marketplace, it only takes away the shortcut.
 */

const PRESENCE_URL = process.env.PRESENCE_URL ?? 'http://127.0.0.1:3001';
const PRESENCE_TIMEOUT_MS = Number(process.env.PRESENCE_TIMEOUT_MS ?? 2000);

/** A verdict this fresh is reused rather than asked for again. */
const CACHE_MS = 3000;

export type Seen = {
  online: boolean;
  /** Game server ports the account is on; null from a presence too old to say. */
  ports: number[] | null;
};

const cache = new Map<string, { seen: Seen; at: number }>();

export async function presenceOf(account: string): Promise<Seen | null> {
  const key = account.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.seen;

  try {
    const response = await fetch(`${PRESENCE_URL}/presence/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(PRESENCE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const answer = (await response.json()) as { online?: unknown; ports?: unknown };
    if (typeof answer.online !== 'boolean') return null;
    const ports = Array.isArray(answer.ports)
      ? answer.ports.filter((p): p is number => typeof p === 'number')
      : null;
    const seen: Seen = { online: answer.online, ports };
    cache.set(key, { seen, at: Date.now() });
    return seen;
  } catch {
    return null;
  }
}

/** Whether the account is on this bot's game server; null when nobody can say. */
export function onServer(seen: Seen | null, port: number): boolean | null {
  if (seen === null || seen.ports === null) return null;
  if (!seen.online) return false;
  return seen.ports.includes(port);
}
