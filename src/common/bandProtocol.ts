/**
 * The band system's wire format: `C1 len FA sub ...`, both ways.
 *
 * Client -> proxy frames go through `Store.sendToGS`, which Xor32s bytes 3..
 * like every other C1; the proxy decrypts a copy, validates, and relays.
 * Proxy -> client frames are plain (a C1 never touches the SimpleModulus
 * counter) and carry the performer's object id at bytes 4-5, stamped by the
 * proxy from the socket's own session - a client cannot claim to be someone
 * else. A relayed batch is the client's batch with those two bytes inserted
 * (`stampPerformer`), never re-encoded.
 *
 * Engine-free: the proxy, the client and the tests all import this. Nothing
 * here knows an instrument by name - the id is the registry index.
 */

export const BAND_CODE = 0xfa;
export const BAND_VERSION = 1;

export const BandSub = {
  Hello: 0x00,
  Start: 0x01,
  Stop: 0x02,
  Batch: 0x03,
  Join: 0x04,
  Leave: 0x05,
  BandState: 0x06,
  ChannelNames: 0x07,
  Refused: 0x08,
} as const;

export const StopReason = {
  Ended: 0,
  Flood: 1,
  Order: 2,
  Gone: 3,
} as const;
export type StopReasonCode = (typeof StopReason)[keyof typeof StopReason];

export const RefuseCause = {
  Cooldown: 1,
  Busy: 2,
  Full: 3,
  Range: 4,
  Map: 5,
  NotPerforming: 6,
  Rate: 7,
} as const;
export type RefuseCauseCode = (typeof RefuseCause)[keyof typeof RefuseCause];

/** What the refusal was about: `what` in a refused frame. */
export const RefuseWhat = { Start: 1, Join: 2 } as const;

/**
 * The limits both ends agree on. The client sender keeps under them; the
 * proxy enforces them (SS14: 1000 events/s, 60 per batch, stop after 1
 * dropped or 8 lagged batches).
 */
export const BAND_LIMITS = {
  maxEventsPerBatch: 48,
  /** What the proxy allows per second; the client sends at most 10. */
  maxBatchesPerSecond: 12,
  clientBatchesPerSecond: 10,
  maxEventsPerSecond: 1000,
  maxBytesPerSecond: 4096,
  maxDroppedBatches: 1,
  maxLaggedBatches: 8,
  /** Milliseconds a batch may be behind the proxy's clock before it counts as lagged. */
  lagToleranceMs: 1000,
  maxStrikes: 8,
  strikeWindowMs: 10_000,
  cooldownAfterStopMs: 10_000,
  cooldownAfterEndMs: 1_000,
  maxPerformers: 16,
  maxPerformersPerMap: 6,
  maxBandMembers: 7,
  joinRangeTiles: 10,
  joinIntervalMs: 2_000,
  maxReceivers: 48,
  idleStopMs: 30_000,
  maxChannelNamesBytes: 207,
  /** Milliseconds between a performer's receiver-set refreshes. */
  receiversTtlMs: 250,
} as const;

export type BandMidiEvent = {
  /** Milliseconds after the batch's `baseMs`, 0..1000. */
  dt: number;
  /** 0x80..0xEF: a channel message with the channel in the low nibble. */
  status: number;
  d1: number;
  d2: number;
};

export type BandMember = { id: number; instrument: number; mask: number };

export type BandClientMessage =
  | { sub: typeof BandSub.Start; version: number; instrument: number }
  | { sub: typeof BandSub.Stop }
  | { sub: typeof BandSub.Batch; seq: number; baseMs: number; events: BandMidiEvent[] }
  | { sub: typeof BandSub.Join; masterId: number; instrument: number; mask: number }
  | { sub: typeof BandSub.Leave }
  | { sub: typeof BandSub.BandState; masterMask: number; members: BandMember[] }
  | { sub: typeof BandSub.ChannelNames; names: { channel: number; name: string }[] };

export type BandRelayMessage =
  | { sub: typeof BandSub.Hello; performerId: number; version: number }
  | { sub: typeof BandSub.Start; performerId: number; version: number; instrument: number }
  | { sub: typeof BandSub.Stop; performerId: number; reason: number; arg: number }
  | { sub: typeof BandSub.Batch; performerId: number; seq: number; baseMs: number; events: BandMidiEvent[] }
  | { sub: typeof BandSub.Join; performerId: number; masterId: number; instrument: number; mask: number }
  | { sub: typeof BandSub.Leave; performerId: number }
  | { sub: typeof BandSub.BandState; performerId: number; masterMask: number; members: BandMember[] }
  | { sub: typeof BandSub.ChannelNames; performerId: number; names: { channel: number; name: string }[] }
  | { sub: typeof BandSub.Refused; performerId: number; what: number; cause: number; arg: number };

// ---- writing ---------------------------------------------------------------

class Writer {
  private readonly bytes: number[] = [];

  constructor(sub: number) {
    this.bytes.push(0xc1, 0, BAND_CODE, sub);
  }

  u8(v: number): this {
    this.bytes.push(v & 0xff);
    return this;
  }

  u16(v: number): this {
    this.bytes.push((v >>> 8) & 0xff, v & 0xff);
    return this;
  }

  u32(v: number): this {
    this.bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    return this;
  }

  raw(bytes: ArrayLike<number>): this {
    for (let i = 0; i < bytes.length; i++) this.bytes.push(bytes[i] & 0xff);
    return this;
  }

  finish(): Uint8Array {
    if (this.bytes.length > 255) throw new Error(`band frame of ${this.bytes.length} bytes does not fit a C1`);
    this.bytes[1] = this.bytes.length;
    return new Uint8Array(this.bytes);
  }
}

export function encodeStart(instrument: number): Uint8Array {
  return new Writer(BandSub.Start).u8(BAND_VERSION).u8(instrument).finish();
}

export function encodeStop(): Uint8Array {
  return new Writer(BandSub.Stop).finish();
}

/** Throws over `maxEventsPerBatch`: the sender splits before it gets here. */
export function encodeBatch(seq: number, baseMs: number, events: readonly BandMidiEvent[]): Uint8Array {
  if (events.length === 0 || events.length > BAND_LIMITS.maxEventsPerBatch) {
    throw new Error(`a batch carries 1..${BAND_LIMITS.maxEventsPerBatch} events, not ${events.length}`);
  }
  const w = new Writer(BandSub.Batch).u16(seq).u32(baseMs).u8(events.length);
  for (const e of events) w.u16(Math.min(1000, Math.max(0, e.dt))).u8(e.status).u8(e.d1 & 0x7f).u8(e.d2 & 0x7f);
  return w.finish();
}

export function encodeJoin(masterId: number, instrument: number, mask: number): Uint8Array {
  return new Writer(BandSub.Join).u16(masterId).u8(instrument).u16(mask).finish();
}

export function encodeLeave(): Uint8Array {
  return new Writer(BandSub.Leave).finish();
}

export function encodeBandState(masterMask: number, members: readonly BandMember[]): Uint8Array {
  if (members.length > BAND_LIMITS.maxBandMembers) throw new Error(`a band holds at most ${BAND_LIMITS.maxBandMembers} members`);
  const w = new Writer(BandSub.BandState).u16(masterMask).u8(members.length);
  for (const m of members) w.u16(m.id).u8(m.instrument).u16(m.mask);
  return w.finish();
}

/** Names longer than the frame allows are cut; a name is a label, not data. */
export function encodeChannelNames(names: readonly { channel: number; name: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const w = new Writer(BandSub.ChannelNames);
  const rows = names.slice(0, 16);
  w.u8(rows.length);
  let budget = BAND_LIMITS.maxChannelNamesBytes - 1;
  for (const row of rows) {
    let bytes = encoder.encode(row.name);
    if (bytes.length > 24) bytes = bytes.subarray(0, 24);
    if (budget - 2 - bytes.length < 0) bytes = new Uint8Array(0);
    w.u8(row.channel & 0x0f).u8(bytes.length).raw(bytes);
    budget -= 2 + bytes.length;
  }
  return w.finish();
}

// ---- proxy-originated frames ------------------------------------------------

function relayWriter(sub: number, performerId: number): Writer {
  return new Writer(sub).u16(performerId);
}

export function encodeHello(): Uint8Array {
  return relayWriter(BandSub.Hello, 0).u8(BAND_VERSION).finish();
}

export function encodeStopNotice(performerId: number, reason: number, arg = 0): Uint8Array {
  return relayWriter(BandSub.Stop, performerId).u8(reason).u8(arg).finish();
}

export function encodeRefused(selfId: number, what: number, cause: number, arg = 0): Uint8Array {
  return relayWriter(BandSub.Refused, selfId).u8(what).u8(cause).u8(arg).finish();
}

export function encodeLeaveNotice(memberId: number): Uint8Array {
  return relayWriter(BandSub.Leave, memberId).finish();
}

/** A relay frame from a client's (decrypted) frame: the performer id goes in after the sub. */
export function stampPerformer(plain: Uint8Array, performerId: number): Uint8Array {
  const out = new Uint8Array(plain.length + 2);
  out[0] = 0xc1;
  out[1] = plain.length + 2;
  out[2] = BAND_CODE;
  out[3] = plain[3];
  out[4] = (performerId >>> 8) & 0xff;
  out[5] = performerId & 0xff;
  out.set(plain.subarray(4), 6);
  return out;
}

// ---- reading ---------------------------------------------------------------

class Reader {
  pos: number;

  constructor(private readonly bytes: Uint8Array, start: number) {
    this.pos = start;
  }

  get left(): number {
    return this.bytes.length - this.pos;
  }

  u8(): number {
    return this.bytes[this.pos++];
  }

  u16(): number {
    const v = (this.bytes[this.pos] << 8) | this.bytes[this.pos + 1];
    this.pos += 2;
    return v;
  }

  u32(): number {
    const v =
      ((this.bytes[this.pos] << 24) |
        (this.bytes[this.pos + 1] << 16) |
        (this.bytes[this.pos + 2] << 8) |
        this.bytes[this.pos + 3]) >>>
      0;
    this.pos += 4;
    return v;
  }

  raw(n: number): Uint8Array {
    const v = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
}

function frameOk(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes.length <= 255 && bytes[0] === 0xc1 && bytes[1] === bytes.length && bytes[2] === BAND_CODE;
}

function readEvents(r: Reader): BandMidiEvent[] | null {
  if (r.left < 1) return null;
  const count = r.u8();
  if (count < 1 || count > BAND_LIMITS.maxEventsPerBatch || r.left !== count * 5) return null;
  const events: BandMidiEvent[] = [];
  for (let i = 0; i < count; i++) {
    const dt = r.u16();
    const status = r.u8();
    const d1 = r.u8();
    const d2 = r.u8();
    if (dt > 1000 || status < 0x80 || status > 0xef || d1 > 0x7f || d2 > 0x7f) return null;
    events.push({ dt, status, d1, d2 });
  }
  return events;
}

function readMembers(r: Reader): BandMember[] | null {
  if (r.left < 1) return null;
  const count = r.u8();
  if (count > BAND_LIMITS.maxBandMembers || r.left !== count * 5) return null;
  const members: BandMember[] = [];
  for (let i = 0; i < count; i++) members.push({ id: r.u16(), instrument: r.u8(), mask: r.u16() });
  return members;
}

function readNames(r: Reader): { channel: number; name: string }[] | null {
  if (r.left < 1) return null;
  const count = r.u8();
  if (count > 16) return null;
  const decoder = new TextDecoder();
  const names: { channel: number; name: string }[] = [];
  for (let i = 0; i < count; i++) {
    if (r.left < 2) return null;
    const channel = r.u8();
    const n = r.u8();
    if (channel > 15 || r.left < n) return null;
    names.push({ channel, name: decoder.decode(r.raw(n)) });
  }
  return r.left === 0 ? names : null;
}

/** A client frame after Xor32 decryption. Null for anything the proxy should drop. */
export function decodeClientFrame(bytes: Uint8Array): BandClientMessage | null {
  if (!frameOk(bytes)) return null;
  const sub = bytes[3];
  const r = new Reader(bytes, 4);

  switch (sub) {
    case BandSub.Start:
      if (r.left !== 2) return null;
      return { sub, version: r.u8(), instrument: r.u8() };
    case BandSub.Stop:
      return r.left === 0 ? { sub } : null;
    case BandSub.Batch: {
      if (r.left < 7) return null;
      const seq = r.u16();
      const baseMs = r.u32();
      const events = readEvents(r);
      return events ? { sub, seq, baseMs, events } : null;
    }
    case BandSub.Join:
      if (r.left !== 5) return null;
      return { sub, masterId: r.u16(), instrument: r.u8(), mask: r.u16() };
    case BandSub.Leave:
      return r.left === 0 ? { sub } : null;
    case BandSub.BandState: {
      if (r.left < 3) return null;
      const masterMask = r.u16();
      const members = readMembers(r);
      return members ? { sub, masterMask, members } : null;
    }
    case BandSub.ChannelNames: {
      const names = readNames(r);
      return names ? { sub, names } : null;
    }
    default:
      return null;
  }
}

/** A frame from the proxy. Null for anything malformed. */
export function decodeRelayFrame(bytes: Uint8Array): BandRelayMessage | null {
  if (!frameOk(bytes) || bytes.length < 6) return null;
  const sub = bytes[3];
  const r = new Reader(bytes, 4);
  const performerId = r.u16();

  switch (sub) {
    case BandSub.Hello:
      return r.left === 1 ? { sub, performerId, version: r.u8() } : null;
    case BandSub.Start:
      if (r.left !== 2) return null;
      return { sub, performerId, version: r.u8(), instrument: r.u8() };
    case BandSub.Stop:
      if (r.left !== 2) return null;
      return { sub, performerId, reason: r.u8(), arg: r.u8() };
    case BandSub.Batch: {
      if (r.left < 7) return null;
      const seq = r.u16();
      const baseMs = r.u32();
      const events = readEvents(r);
      return events ? { sub, performerId, seq, baseMs, events } : null;
    }
    case BandSub.Join:
      if (r.left !== 5) return null;
      return { sub, performerId, masterId: r.u16(), instrument: r.u8(), mask: r.u16() };
    case BandSub.Leave:
      return r.left === 0 ? { sub, performerId } : null;
    case BandSub.BandState: {
      if (r.left < 3) return null;
      const masterMask = r.u16();
      const members = readMembers(r);
      return members ? { sub, performerId, masterMask, members } : null;
    }
    case BandSub.ChannelNames: {
      const names = readNames(r);
      return names ? { sub, performerId, names } : null;
    }
    case BandSub.Refused:
      if (r.left !== 3) return null;
      return { sub, performerId, what: r.u8(), cause: r.u8(), arg: r.u8() };
    default:
      return null;
  }
}

/** Whether a client message on the wire is a band frame: header, code, nothing else. */
export function isBandFrame(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0xc1 && bytes[2] === BAND_CODE;
}
