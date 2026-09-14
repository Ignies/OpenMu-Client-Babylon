/**
 * A count over the last second, kept as a ring of buckets: O(1) to add and
 * to read, no per-event allocation. `src/common/rateLimit.ts` filters a
 * timestamp array per call, which is right for a login form and wrong for a
 * thousand notes a second.
 */
export class SlidingWindow {
  private readonly counts: number[];
  private readonly stamps: number[];

  constructor(
    private readonly bucketMs = 100,
    buckets = 10
  ) {
    this.counts = new Array<number>(buckets).fill(0);
    this.stamps = new Array<number>(buckets).fill(-1);
  }

  /** The window's span in milliseconds. */
  get spanMs(): number {
    return this.bucketMs * this.counts.length;
  }

  private slot(now: number): number {
    const bucket = Math.floor(now / this.bucketMs);
    const i = bucket % this.counts.length;
    if (this.stamps[i] !== bucket) {
      this.stamps[i] = bucket;
      this.counts[i] = 0;
    }
    return i;
  }

  add(now: number, n = 1): number {
    this.counts[this.slot(now)] += n;
    return this.sum(now);
  }

  /** Everything counted within the last span. */
  sum(now: number): number {
    const bucket = Math.floor(now / this.bucketMs);
    const oldest = bucket - this.counts.length + 1;
    let total = 0;
    for (let i = 0; i < this.counts.length; i++) {
      if (this.stamps[i] >= oldest && this.stamps[i] <= bucket) total += this.counts[i];
    }
    return total;
  }

  reset(): void {
    this.counts.fill(0);
    this.stamps.fill(-1);
  }
}
