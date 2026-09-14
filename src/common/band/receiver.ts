import type { BatchEvent } from './sequencer';

/**
 * One remote performer's stream, turned back into notes on this client's
 * audio clock. The first batch fixes the offset between the performer's
 * `baseMs` and local audio time, with `delaySec` of slack so the next batch
 * is already scheduled when it lands (SS14: 0.2 s + sqrt(ping)). A batch
 * that arrives late anyway moves the offset and plays on the new timeline
 * (nothing is dropped: a skipped note-off would hang a flute); a gap in the
 * sequence numbers silences everything for the same reason; and a stream
 * that goes quiet is silenced too, which covers a proxy restart with no stop
 * frame.
 *
 * Pure: clock and sink injected.
 */

export type ReceiverClock = { now(): number };

export type ReceiverSink = {
  /** A note at audio time `when`. */
  schedule(ev: BatchEvent, when: number): void;
  /** Every voice of this performer off, now. */
  allOff(): void;
};

export type ReceiverOptions = {
  /** Seconds of slack behind the performer. */
  delaySec?: number;
  /** A batch this late re-fixes the offset. */
  resyncSec?: number;
  /** Seconds without a batch before the voice is silenced. */
  quietSec?: number;
};

const RESYNC_SEC = 0.05;
const QUIET_SEC = 3;

/** SS14's receiver delay: 0.2 s plus the square root of the ping in seconds, kept sane. */
export function receiverDelay(roundTripMs: number | null): number {
  const rtt = (roundTripMs ?? 150) / 1000;
  return Math.max(0.3, Math.min(1.0, 0.2 + Math.sqrt(rtt)));
}

export class Receiver {
  private offset: number | null = null;
  private lastSeq: number | null = null;
  private lastBatchAt = 0;
  private resyncs = 0;
  private readonly delaySec: number;
  private readonly resyncSec: number;
  private readonly quietSec: number;

  constructor(
    private readonly clock: ReceiverClock,
    private readonly sink: ReceiverSink,
    options: ReceiverOptions = {}
  ) {
    this.delaySec = options.delaySec ?? receiverDelay(null);
    this.resyncSec = options.resyncSec ?? RESYNC_SEC;
    this.quietSec = options.quietSec ?? QUIET_SEC;
  }

  /** How many times the stream arrived late enough to move the offset (debug). */
  get resyncCount(): number {
    return this.resyncs;
  }

  onBatch(seq: number, baseMs: number, events: BatchEvent[]): void {
    const now = this.clock.now();
    this.lastBatchAt = now;

    if (this.lastSeq !== null && ((this.lastSeq + 1) & 0xffff) !== seq) {
      // Something was lost in between; whatever was sounding may never get its off.
      this.sink.allOff();
    }
    this.lastSeq = seq;

    if (this.offset === null) {
      this.offset = now + this.delaySec - baseMs / 1000;
    } else {
      const firstAt = this.offset + baseMs / 1000;
      const late = now - firstAt;
      if (late > this.resyncSec) {
        this.offset += late + this.resyncSec;
        this.resyncs++;
      }
    }

    for (const ev of events) {
      const when = this.offset + (baseMs + ev.dt) / 1000;
      this.sink.schedule(ev, Math.max(when, now));
    }
  }

  /** Call once a frame or so: silences a stream that stopped arriving. */
  tick(): void {
    if (this.lastBatchAt > 0 && this.clock.now() - this.lastBatchAt > this.quietSec) {
      this.lastBatchAt = 0;
      this.offset = null;
      this.sink.allOff();
    }
  }

  stop(): void {
    this.offset = null;
    this.lastSeq = null;
    this.lastBatchAt = 0;
    this.sink.allOff();
  }
}
