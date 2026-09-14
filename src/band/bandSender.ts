import { BAND_LIMITS, encodeBatch, type BandMidiEvent } from '../common/bandProtocol';

/**
 * Turns the sequencer's send windows into wire batches: numbers them,
 * splits one that outgrows a frame, re-bases each piece's `dt`, and keeps
 * the rate under what the proxy allows - so only a modified client ever
 * meets the relay's limits.
 */
export class BandSender {
  private seq = 0;
  private readonly stamps: number[] = [];
  private droppedForRate = 0;

  constructor(
    private readonly send: (frame: Uint8Array) => void,
    private readonly now: () => number = () => performance.now()
  ) {}

  /** A new performance: the sequence starts over. */
  reset(): void {
    this.seq = 0;
    this.stamps.length = 0;
  }

  /** Batches the sender refused to send in this performance because they would have breached the rate. */
  get dropped(): number {
    return this.droppedForRate;
  }

  /** One send window: `dt`s are relative to `baseMs`. */
  push(baseMs: number, events: readonly BandMidiEvent[]): void {
    for (let i = 0; i < events.length; i += BAND_LIMITS.maxEventsPerBatch) {
      const chunk = events.slice(i, i + BAND_LIMITS.maxEventsPerBatch);
      const first = chunk[0].dt;
      const rebased = chunk.map(e => ({ ...e, dt: Math.min(1000, Math.max(0, e.dt - first)) }));
      this.sendBatch(baseMs + first, rebased);
    }
  }

  private sendBatch(baseMs: number, events: BandMidiEvent[]): void {
    const now = this.now();
    while (this.stamps.length && now - this.stamps[0] > 1000) this.stamps.shift();
    if (this.stamps.length >= BAND_LIMITS.clientBatchesPerSecond) {
      this.droppedForRate++;
      return;
    }
    this.stamps.push(now);
    this.send(encodeBatch(this.seq, baseMs, events));
    this.seq = (this.seq + 1) & 0xffff;
  }
}
