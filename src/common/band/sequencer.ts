import type { MidiEvent, ParsedMidi } from './midiFile';

/**
 * The performer's scheduler. Walks the song on the audio clock and, once a
 * tick, hands out every event whose time has come into the send window: to
 * the sampler for the performer's own ears, and to the transport as one
 * batch for everyone else's. The two share the timeline, so what the
 * performer hears is what the room hears, later by the receivers' delay.
 *
 * "A tale of two clocks": the tick runs on a timer, the notes are stamped
 * on `AudioContext.currentTime`. Events go out `leadMs` ahead of local
 * playback (SS14 sends 200 ms early), so a receiver on a normal connection
 * never gets a note after its time.
 *
 * `baseMs` in a batch counts from `t0`, the audio time the performance
 * started - the proxy compares it with its own clock to spot a client
 * pre-buffering a flood, and receivers only ever use the differences.
 *
 * Pure: the clock and the sink are injected, so the unit tests drive it.
 */

export type BatchEvent = { dt: number; status: number; d1: number; d2: number };

export type SequencerClock = {
  /** Audio time, seconds. */
  now(): number;
};

export type SequencerSink = {
  /** A note for the performer's own sampler, at audio time `when`. */
  schedule(ev: MidiEvent, when: number): void;
  /** One send window's events for the transport. */
  batch(baseMs: number, events: BatchEvent[]): void;
  /** The song ran out with `loop` off. */
  ended?(): void;
};

export type SequencerOptions = {
  tickMs?: number;
  leadMs?: number;
  localDelayMs?: number;
  /** Silence between one pass of the song and the next when looping. */
  loopGapMs?: number;
};

/** Milliseconds between ticks; a window's worth of events per batch. */
const TICK_MS = 100;

/** How far ahead of local playback a batch leaves. */
const LEAD_MS = 200;

/** Lookahead of the local schedule over the clock - jitter cover for the timer. */
const LOCAL_DELAY_MS = 250;

const LOOP_GAP_MS = 400;

const ALL_NOTES_OFF = 123;

export class Sequencer {
  private song: ParsedMidi | null = null;
  private cursor = 0;
  /** Audio time (s) that song ms 0 maps to while playing. */
  private origin = 0;
  private t0 = 0;
  private started = false;
  private _playing = false;
  private _paused = false;
  private _loop = false;
  private pausedAtMs = 0;
  /**
   * Channels voiced locally; every channel is still sent. Percussion is out
   * until the facade says the instrument renders it.
   */
  localMask = 0xffff & ~(1 << 9);
  private readonly tickMs: number;
  private readonly leadMs: number;
  private readonly localDelayMs: number;
  private readonly loopGapMs: number;

  constructor(
    private readonly clock: SequencerClock,
    private readonly sink: SequencerSink,
    options: SequencerOptions = {}
  ) {
    this.tickMs = options.tickMs ?? TICK_MS;
    this.leadMs = options.leadMs ?? LEAD_MS;
    this.localDelayMs = options.localDelayMs ?? LOCAL_DELAY_MS;
    this.loopGapMs = options.loopGapMs ?? LOOP_GAP_MS;
  }

  get playing(): boolean {
    return this._playing;
  }

  get paused(): boolean {
    return this._paused;
  }

  get loop(): boolean {
    return this._loop;
  }

  set loop(value: boolean) {
    this._loop = value;
  }

  get loaded(): ParsedMidi | null {
    return this.song;
  }

  /** Song position in ms: where playback is, or where it paused, or 0. */
  get positionMs(): number {
    if (this._playing) {
      const pos = (this.clock.now() - this.origin) * 1000;
      return Math.max(0, Math.min(this.song?.durationMs ?? 0, pos));
    }
    return this._paused ? this.pausedAtMs : 0;
  }

  /** The performance begins: `baseMs` counts from now. Once per take-out. */
  startClock(): void {
    this.t0 = this.clock.now();
    this.started = true;
  }

  load(song: ParsedMidi): void {
    this.stop();
    this.song = song;
  }

  play(): void {
    if (!this.song) return;
    if (!this.started) this.startClock();
    if (this._playing) return;
    const from = this._paused ? this.pausedAtMs : 0;
    this.origin = this.clock.now() + this.localDelayMs / 1000 - from / 1000;
    this.cursor = 0;
    while (this.cursor < this.song.events.length && this.song.events[this.cursor].ms < from) this.cursor++;
    this._playing = true;
    this._paused = false;
  }

  pause(): void {
    if (!this._playing) return;
    this.pausedAtMs = this.positionMs;
    this._playing = false;
    this._paused = true;
    this.silence();
  }

  stop(): void {
    const wasSounding = this._playing || this._paused;
    this._playing = false;
    this._paused = false;
    this.pausedAtMs = 0;
    this.cursor = 0;
    if (wasSounding) this.silence();
  }

  /** Every channel off, now, locally and on the wire. */
  silence(): void {
    const now = this.clock.now();
    const events: BatchEvent[] = [];
    const used = this.song ? this.song.channels : [];
    for (let c = 0; c < 16; c++) {
      if (used.length && !used[c].used) continue;
      const ev: MidiEvent = { ms: 0, status: 0xb0 | c, d1: ALL_NOTES_OFF, d2: 0 };
      if (this.voicesLocally(c)) this.sink.schedule(ev, now);
      events.push({ dt: 0, status: ev.status, d1: ev.d1, d2: ev.d2 });
    }
    if (events.length) this.sink.batch(this.baseMs(now), events);
  }

  /** One send window. Call every `tickMs`; a late call just sends a bigger window. */
  tick(): void {
    if (!this._playing || !this.song) return;
    const { events, durationMs } = this.song;
    const now = this.clock.now();
    const windowEndMs = (now - this.origin) * 1000 + this.leadMs + this.tickMs;

    const out: BatchEvent[] = [];
    let base = -1;

    const emit = (ev: MidiEvent): void => {
      const when = this.origin + ev.ms / 1000;
      if (this.voicesLocally(ev.status & 0x0f)) this.sink.schedule(ev, when);
      const absMs = this.baseMs(when);
      if (base < 0) base = absMs;
      out.push({ dt: Math.max(0, absMs - base), status: ev.status, d1: ev.d1, d2: ev.d2 });
    };

    // Guard against a pathological song looping inside one window.
    for (let passes = 0; passes < 8; passes++) {
      while (this.cursor < events.length && events[this.cursor].ms <= windowEndMs) {
        emit(events[this.cursor++]);
      }
      if (this.cursor < events.length) break;

      // Past the last event.
      const passEndMs = durationMs + this.loopGapMs;
      if (this._loop) {
        if (passEndMs > windowEndMs) break;
        this.origin += passEndMs / 1000;
        this.cursor = 0;
        continue;
      }
      if ((now - this.origin) * 1000 >= durationMs) {
        this._playing = false;
        this.cursor = 0;
        if (out.length) this.sink.batch(base, out);
        this.sink.ended?.();
        return;
      }
      break;
    }

    if (out.length) this.sink.batch(base, out);
  }

  private voicesLocally(channel: number): boolean {
    return (this.localMask & (1 << channel)) !== 0;
  }

  private baseMs(when: number): number {
    return Math.max(0, Math.round((when - this.t0) * 1000));
  }
}
