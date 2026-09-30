/**
 * Server round trip, measured on request/answer pairs the client already
 * exchanges.
 *
 * OpenMU never answers the keep-alive `Ping` (see the comment by the ping
 * interval in `logic.ts`), so there is nothing to time directly. Instead the
 * three requests that always draw exactly one answer mark themselves sent
 * here, and the handler of that answer closes the pair: a chat line and its
 * echo, an item move and `ItemMoved`, a warp and `MapChanged`. Nothing new
 * goes on the wire.
 *
 * One writer for the figure the performance readout prints. Deliberately not
 * observable: the readout polls it twice a second, so a sample can never cost
 * a React render.
 */

export type NetSampleKind = 'chat' | 'itemMove' | 'warp';

/** Slower than this is a stalled request, not a round trip. */
const MAX_SAMPLE_MS = 5000;

/** Unanswered requests remembered per kind; the oldest falls off. */
const MAX_PENDING = 4;

/** How many samples the printed figure is the median of. */
const WINDOW = 7;

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export const NetStats = new (class _NetStats {
  private pending = new Map<NetSampleKind, number[]>();
  private samples: number[] = [];
  private smoothed: number | null = null;

  /** Median of the recent samples, null until the first pair closes. */
  get roundTripMs(): number | null {
    return this.smoothed;
  }

  /** How many samples the median currently stands on. */
  get sampleCount(): number {
    return this.samples.length;
  }

  markSent(kind: NetSampleKind): void {
    let queue = this.pending.get(kind);

    if (!queue) {
      queue = [];
      this.pending.set(kind, queue);
    }

    queue.push(performance.now());

    // Answers arrive in the order the requests were made, so the queue is a
    // FIFO; a request nobody ever answered drops off the front.
    while (queue.length > MAX_PENDING) queue.shift();
  }

  markAnswered(kind: NetSampleKind): void {
    const sentAt = this.pending.get(kind)?.shift();
    if (sentAt === undefined) return;

    const elapsed = performance.now() - sentAt;
    if (elapsed < 0 || elapsed > MAX_SAMPLE_MS) return;

    this.samples.push(elapsed);
    if (this.samples.length > WINDOW) this.samples.shift();

    this.smoothed = medianOf(this.samples);
  }

  /** A new socket is a new set of numbers. */
  reset(): void {
    this.pending.clear();
    this.samples.length = 0;
    this.smoothed = null;
  }
})();
