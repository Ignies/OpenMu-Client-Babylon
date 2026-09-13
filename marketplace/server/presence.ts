/**
 * Whether an account is logged in, as the proxy's presence server says.
 *
 * The worker asks this before it sets off: a `/trace` at somebody who is not
 * online costs a warp that never comes, ten seconds of waiting for it, three
 * times over - and with a few such listings in the queue the bot spent whole
 * minutes chasing ghosts while a real customer stood waiting. Presence is a
 * loopback call that answers in milliseconds.
 *
 * The answer is `null` when presence cannot be reached, and the caller then
 * tries anyway: an outage of the proxy's side channel must not stop the
 * marketplace, it only takes away the shortcut.
 */

const PRESENCE_URL = process.env.PRESENCE_URL ?? 'http://127.0.0.1:3001';
const PRESENCE_TIMEOUT_MS = Number(process.env.PRESENCE_TIMEOUT_MS ?? 2000);

/** A verdict this fresh is reused rather than asked for again. */
const CACHE_MS = 3000;

const cache = new Map<string, { online: boolean; at: number }>();

export async function isOnline(account: string): Promise<boolean | null> {
  const key = account.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.online;

  try {
    const response = await fetch(`${PRESENCE_URL}/presence/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(PRESENCE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const answer = (await response.json()) as { online?: unknown };
    if (typeof answer.online !== 'boolean') return null;
    cache.set(key, { online: answer.online, at: Date.now() });
    return answer.online;
  } catch {
    return null;
  }
}
