/**
 * When the bot should go, wait, or give up on a piece of work.
 *
 * Pure: it is fed the listing, what presence said, and the clock, and it
 * answers. The worker used to walk the queue oldest first and try everything
 * on every poll, which meant one seller who logged off mid-listing cost every
 * customer behind them half a minute of warps at nobody, poll after poll,
 * for ever. This is the policy that stops that.
 */

export type WorkState = 'pending' | 'claimed' | 'returning';

export type Work = {
  id: string;
  state: WorkState;
  /** When the row last changed state. */
  updatedAt: number;
};

export type Decision =
  /** Go and do the handover. */
  | { kind: 'go' }
  /** Not now; the reason is for the log. */
  | { kind: 'wait'; reason: string }
  /** A claim to undo: the buyer is not there to be delivered to. */
  | { kind: 'release'; reason: string }
  /** A listing nobody will ever collect for: drop it. */
  | { kind: 'expire'; reason: string };

/**
 * A listing waits this long for the seller to actually hand the item over.
 * They asked for it; if they walked away, the row would otherwise sit in the
 * queue for ever, and the item never left their bag so nothing is lost.
 */
export const PENDING_TTL_MS = Number(process.env.MARKETPLACE_PENDING_TTL_MS ?? 30 * 60_000);

/**
 * A claim holds the item out of the catalogue. A buyer who claimed and never
 * showed gets this long before somebody else may have it.
 */
export const CLAIM_TTL_MS = Number(process.env.MARKETPLACE_CLAIM_TTL_MS ?? 10 * 60_000);

/**
 * What to do with one piece of work.
 *
 * `online` is presence's answer for the person the bot has to meet - the
 * buyer of a claim, the seller otherwise - or null when presence could not
 * say, in which case the bot goes and finds out the expensive way.
 */
export function decide(work: Work, online: boolean | null, now: number): Decision {
  const age = now - work.updatedAt;

  if (work.state === 'claimed') {
    if (online === false) return { kind: 'release', reason: 'the buyer is not online' };
    if (age > CLAIM_TTL_MS) return { kind: 'release', reason: 'the buyer never came' };
    return { kind: 'go' };
  }

  if (work.state === 'pending') {
    if (age > PENDING_TTL_MS) return { kind: 'expire', reason: 'the seller never handed it over' };
    if (online === false) return { kind: 'wait', reason: 'the seller is not online' };
    return { kind: 'go' };
  }

  // returning: the item is the bot's to give back whenever the seller is
  // next seen. Nothing to expire; it waits.
  if (online === false) return { kind: 'wait', reason: 'the seller is not online' };
  return { kind: 'go' };
}

/** The pause after the first failure; it doubles from there. */
const FIRST_DELAY_MS = 15_000;
const MAX_DELAY_MS = 5 * 60_000;

/**
 * Failed work is retried later and later, so a handover that keeps failing
 * (a customer on another game server, a character the server cannot trace)
 * does not take its full cost out of every poll.
 */
export class Backoff {
  private readonly entries = new Map<string, { failures: number; notBefore: number }>();

  /** True when this id may be tried now. */
  due(id: string, now: number): boolean {
    const entry = this.entries.get(id);
    return !entry || now >= entry.notBefore;
  }

  /** How long until this id may be tried again, for the log. 0 when due. */
  remaining(id: string, now: number): number {
    const entry = this.entries.get(id);
    return entry ? Math.max(0, entry.notBefore - now) : 0;
  }

  failed(id: string, now: number): void {
    const failures = (this.entries.get(id)?.failures ?? 0) + 1;
    const delay = Math.min(MAX_DELAY_MS, FIRST_DELAY_MS * 2 ** (failures - 1));
    this.entries.set(id, { failures, notBefore: now + delay });
  }

  succeeded(id: string): void {
    this.entries.delete(id);
  }

  /** Forgets ids no longer in the queue, so the map does not grow for ever. */
  keepOnly(ids: Iterable<string>): void {
    const keep = new Set(ids);
    for (const id of [...this.entries.keys()]) if (!keep.has(id)) this.entries.delete(id);
  }
}
