/**
 * A Standard MIDI File, read into the events the band system plays: note on
 * / off and the two "everything off" controllers, each with an absolute time
 * in milliseconds, plus what each channel is called.
 *
 * Formats 0 and 1 with a ticks-per-quarter division (format 2 and SMPTE
 * timing are refused: nobody's song file is either, and the tempo map below
 * assumes ticks). Tracks are merged by tick so a tempo change in track 0
 * applies to every track, as the format intends. Running status is honoured.
 * SysEx and every other meta event are skipped.
 *
 * What is deliberately dropped: program changes (the chosen instrument voices
 * every channel), pitch bend, aftertouch and the other controllers - the
 * sampler has no use for them, and every event kept is bytes on the wire.
 */

export type MidiEvent = {
  /** Absolute time from the start of the song. */
  ms: number;
  /** Status byte with the channel in the low nibble: 0x8n, 0x9n, 0xBn. */
  status: number;
  d1: number;
  d2: number;
};

export type MidiChannel = {
  /** Whether any note is played on this channel. */
  used: boolean;
  /** The name of the first track that plays notes on it, or "Ch N". */
  name: string;
  noteCount: number;
};

export type ParsedMidi = {
  durationMs: number;
  /** Sixteen channels, index = MIDI channel (9 is percussion). */
  channels: MidiChannel[];
  /** Sorted by `ms`, ties in file order. */
  events: MidiEvent[];
};

export class MidiFileError extends Error {}

const DEFAULT_US_PER_QUARTER = 500_000;

/** Controllers the sampler acts on: all sound off (120), all notes off (123). */
const KEPT_CONTROLLERS = new Set([120, 123]);

type Raw = {
  tick: number;
  order: number;
  status: number;
  d1: number;
  d2: number;
  track: number;
};

class Reader {
  pos = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get eof(): boolean {
    return this.pos >= this.bytes.length;
  }

  u8(): number {
    if (this.pos >= this.bytes.length) throw new MidiFileError('unexpected end of file');
    return this.bytes[this.pos++];
  }

  u16(): number {
    return (this.u8() << 8) | this.u8();
  }

  u32(): number {
    return ((this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8()) >>> 0;
  }

  vlq(): number {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) return value;
    }
    throw new MidiFileError('bad variable-length quantity');
  }

  skip(n: number): void {
    this.pos += n;
  }

  text(n: number): string {
    const slice = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return new TextDecoder('latin1').decode(slice).replace(/\0+$/, '').trim();
  }

  tag(): string {
    return String.fromCharCode(this.u8(), this.u8(), this.u8(), this.u8());
  }
}

/** Bytes of data after a status byte, for the channel messages. */
function dataLength(status: number): number {
  const kind = status & 0xf0;
  return kind === 0xc0 || kind === 0xd0 ? 1 : 2;
}

export function parseMidi(bytes: Uint8Array): ParsedMidi {
  const r = new Reader(bytes);

  if (r.tag() !== 'MThd') throw new MidiFileError('not a MIDI file');
  const headerLength = r.u32();
  const format = r.u16();
  const trackCount = r.u16();
  const division = r.u16();
  r.skip(headerLength - 6);

  if (format !== 0 && format !== 1) throw new MidiFileError(`format ${format} is not supported`);
  if (division & 0x8000) throw new MidiFileError('SMPTE timing is not supported');
  if (division === 0) throw new MidiFileError('bad division');

  const raw: Raw[] = [];
  const tempos: { tick: number; usPerQuarter: number; order: number }[] = [];
  const trackNames: string[] = [];
  let order = 0;

  for (let t = 0; t < trackCount && !r.eof; t++) {
    const tag = r.tag();
    const length = r.u32();
    const end = r.pos + length;
    if (tag !== 'MTrk') {
      r.pos = end;
      continue;
    }

    let tick = 0;
    let running = 0;
    trackNames[t] = '';

    while (r.pos < end) {
      tick += r.vlq();
      let status = r.u8();

      if (status === 0xff) {
        const type = r.u8();
        const len = r.vlq();
        if (type === 0x51 && len === 3) {
          const us = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          tempos.push({ tick, usPerQuarter: us || DEFAULT_US_PER_QUARTER, order: order++ });
        } else if (type === 0x03) {
          const name = r.text(len);
          if (!trackNames[t]) trackNames[t] = name;
        } else if (type === 0x2f) {
          r.skip(len);
          break;
        } else {
          r.skip(len);
        }
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        r.skip(r.vlq());
        continue;
      }

      let d1: number;
      if (status & 0x80) {
        running = status;
        d1 = r.u8();
      } else {
        // Running status: the byte read was the first data byte.
        if (!running) throw new MidiFileError('data byte without a status');
        d1 = status;
        status = running;
      }
      const d2 = dataLength(status) === 2 ? r.u8() : 0;

      const kind = status & 0xf0;
      const keep =
        kind === 0x80 ||
        kind === 0x90 ||
        (kind === 0xb0 && KEPT_CONTROLLERS.has(d1));
      if (keep) raw.push({ tick, order: order++, status, d1: d1 & 0x7f, d2: d2 & 0x7f, track: t });
    }

    r.pos = end;
  }

  raw.sort((a, b) => a.tick - b.tick || a.order - b.order);
  tempos.sort((a, b) => a.tick - b.tick || a.order - b.order);

  // The tempo map: walk events and tempo changes together, in tick order.
  const events: MidiEvent[] = [];
  let usPerQuarter = DEFAULT_US_PER_QUARTER;
  let lastTick = 0;
  let lastMs = 0;
  let ti = 0;

  const msAt = (tick: number): number => {
    while (ti < tempos.length && tempos[ti].tick <= tick) {
      const change = tempos[ti++];
      lastMs += ((change.tick - lastTick) * usPerQuarter) / division / 1000;
      lastTick = change.tick;
      usPerQuarter = change.usPerQuarter;
    }
    return lastMs + ((tick - lastTick) * usPerQuarter) / division / 1000;
  };

  const channels: MidiChannel[] = Array.from({ length: 16 }, (_, i) => ({
    used: false,
    name: `Ch ${i + 1}`,
    noteCount: 0,
  }));

  for (const e of raw) {
    const ms = msAt(e.tick);
    const channel = e.status & 0x0f;
    const isNoteOn = (e.status & 0xf0) === 0x90 && e.d2 > 0;
    if (isNoteOn) {
      const c = channels[channel];
      if (!c.used) {
        c.used = true;
        if (trackNames[e.track]) c.name = trackNames[e.track];
      }
      c.noteCount++;
    }
    events.push({ ms, status: e.status, d1: e.d1, d2: e.d2 });
  }

  const durationMs = events.length ? events[events.length - 1].ms : 0;

  return { durationMs, channels, events };
}
