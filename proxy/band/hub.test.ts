import { describe, expect, it } from 'vitest';
import { Xor32Encryptor } from '../../src/common/encryption/xor32';
import { gameVersion as preSeason6 } from '../../versions/v097d';
import {
  BAND_LIMITS,
  BandSub,
  RefuseCause,
  StopReason,
  decodeRelayFrame,
  encodeBandState,
  encodeBatch,
  encodeJoin,
  encodeLeave,
  encodeStart,
  encodeStop,
  type BandMidiEvent,
  type BandRelayMessage,
} from '../../src/common/bandProtocol';
import { TrackedSession } from '../track/session';
import { WireEncoder } from '../track/wire';
import {
  characterInformation,
  characterList,
  gameServerEntered,
  mapChanged,
  playersInScope,
  selectCharacter,
} from '../track/packets';
import { BandHub, type BandPeer } from './hub';

/**
 * Peers are real `TrackedSession`s fed the login sequence the server would
 * send, so map, position and scope come from the same decoders the proxy
 * runs; the band frames are Xor32'd the way `Store.sendToGS` sends them.
 */

let clock = 1_000_000;
const now = () => clock;

type Fake = {
  peer: BandPeer;
  session: TrackedSession;
  sent: BandRelayMessage[];
  raw: Uint8Array[];
  status: { value: number };
};

function makePeer(id: number, opts: { map?: number; x?: number; y?: number; sees?: number[]; world?: boolean } = {}): Fake {
  const { map = 2, x = 100, y = 100, sees = [], world = true } = opts;
  const session = new TrackedSession(`n${id}`, 55901, { event() {}, change() {}, move() {} }, { now });
  const wire = new WireEncoder();
  if (world) {
    session.feedServer(wire.server(gameServerEntered(id)));
    session.setAccount(`acc${id}`);
    session.feedServer(wire.server(characterList([{ name: `P${id}`, cls: 7, level: 1, status: 0 }])));
    session.feedClient(wire.client(selectCharacter(`P${id}`)));
    session.feedServer(wire.server(characterInformation({ x, y, map, money: 0, status: 0, hp: 1, maxHp: 1 })));
    if (sees.length) session.feedServer(wire.server(playersInScope(sees.map(s => ({ id: s, x, y, name: `P${s}` })))));
  }
  const sent: BandRelayMessage[] = [];
  const raw: Uint8Array[] = [];
  const status = { value: 1 };
  const peer: BandPeer = {
    track: session,
    send: f => {
      raw.push(f);
      const m = decodeRelayFrame(f);
      if (m) sent.push(m);
      return status.value;
    },
  };
  return { peer, session, sent, raw, status };
}

const xor = (plain: Uint8Array, key?: Uint8Array): Uint8Array => {
  const enc = new Xor32Encryptor();
  if (key) enc.xor32Key = key;
  return enc.Encrypt(plain.slice());
};

const note = (n: number, dt = 0): BandMidiEvent => ({ dt, status: 0x90, d1: n, d2: 100 });

function hub(opts = {}) {
  return new BandHub({ now, ...opts });
}

function moveMap(f: Fake, map: number) {
  const wire = new WireEncoder();
  f.session.feedServer(wire.server(mapChanged(map, 50, 50)));
}

describe('band hub', () => {
  it('relays a performer to the peers on their map who can see them', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    const c = makePeer(3, { map: 3, sees: [1] });
    const d = makePeer(4);
    const e = makePeer(5, { world: false });
    for (const f of [a, b, c, d, e]) h.attach(f.peer);

    h.receive(a.peer, xor(encodeStart(0)));
    expect(b.sent).toEqual([{ sub: BandSub.Start, performerId: 1, version: 1, instrument: 0 }]);
    expect(c.sent).toEqual([]);
    expect(d.sent).toEqual([]);
    expect(e.sent).toEqual([]);

    h.receive(a.peer, xor(encodeBatch(0, 100, [note(60)])));
    expect(b.sent[1]).toEqual({ sub: BandSub.Batch, performerId: 1, seq: 0, baseMs: 100, events: [note(60)] });
    expect(a.sent).toEqual([]);
    expect(h.stats().batchesRelayed).toBe(1);
    expect(h.stats().framesSent).toBe(2);
  });

  it('catches a late joiner up with the start and the band state, and stops a peer that loses sight', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    h.receive(a.peer, xor(encodeStart(2)));
    h.receive(a.peer, xor(encodeBandState(0xfffe, [{ id: 9, instrument: 1, mask: 1 }])));

    const late = makePeer(6, { sees: [1] });
    h.attach(late.peer);
    clock += BAND_LIMITS.receiversTtlMs + 1;
    h.receive(a.peer, xor(encodeBatch(0, 300, [note(62)])));
    expect(late.sent.map(m => m.sub)).toEqual([BandSub.Start, BandSub.BandState, BandSub.Batch]);

    moveMap(b, 3);
    clock += BAND_LIMITS.receiversTtlMs + 1;
    h.receive(a.peer, xor(encodeBatch(1, 400, [note(64)])));
    expect(b.sent[b.sent.length - 1]).toEqual({ sub: BandSub.Stop, performerId: 1, reason: StopReason.Gone, arg: 0 });
  });

  it('keeps the nearest receivers past the cap', () => {
    clock = 1_000_000;
    const h = hub({ maxReceivers: 2 });
    const a = makePeer(1, { x: 100, y: 100 });
    const near = makePeer(2, { x: 101, y: 100, sees: [1] });
    const mid = makePeer(3, { x: 105, y: 100, sees: [1] });
    const far = makePeer(4, { x: 112, y: 100, sees: [1] });
    for (const f of [a, near, mid, far]) h.attach(f.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    expect(near.sent).toHaveLength(1);
    expect(mid.sent).toHaveLength(1);
    expect(far.sent).toHaveLength(0);
  });

  it('drops malformed frames and stops a flood, with a cooldown after', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    h.receive(a.peer, xor(encodeStart(0)));

    const bad = xor(encodeBatch(0, 0, [note(60)]));
    bad[1] = bad.length + 1;
    h.receive(a.peer, bad);
    expect(h.stats().dropped.malformed).toBe(1);

    for (let i = 0; i < BAND_LIMITS.maxBatchesPerSecond + 1; i++) {
      h.receive(a.peer, xor(encodeBatch(i, i * 10, [note(60)])));
      clock += 10;
    }
    const stop = { sub: BandSub.Stop, performerId: 1, reason: StopReason.Flood, arg: 0 };
    expect(a.sent[a.sent.length - 1]).toEqual(stop);
    expect(b.sent[b.sent.length - 1]).toEqual(stop);
    expect(h.stats().stopped.flood).toBe(1);
    expect(h.stats().performers).toBe(0);

    h.receive(a.peer, xor(encodeStart(0)));
    const refused = a.sent[a.sent.length - 1];
    expect(refused.sub).toBe(BandSub.Refused);
    expect(refused).toMatchObject({ cause: RefuseCause.Cooldown });

    clock += BAND_LIMITS.cooldownAfterStopMs + 1;
    h.receive(a.peer, xor(encodeStart(0)));
    expect(h.stats().performers).toBe(1);
  });

  it('takes full batches at the client rate, and stops on a sequence that goes backwards twice', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    h.attach(a.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    const many = Array.from({ length: BAND_LIMITS.maxEventsPerBatch }, (_, i) => note(40 + i, i));
    const step = 1000 / BAND_LIMITS.clientBatchesPerSecond;
    for (let i = 0; i < 30; i++) {
      h.receive(a.peer, xor(encodeBatch(i, i * step, many)));
      clock += step;
    }
    expect(h.stats().performers).toBe(1);
    expect(h.stats().stopped.flood).toBe(0);
    expect(h.stats().batchesRelayed).toBe(30);

    h.receive(a.peer, xor(encodeStop()));
    clock += BAND_LIMITS.cooldownAfterEndMs + 1;
    h.receive(a.peer, xor(encodeStart(0)));
    h.receive(a.peer, xor(encodeBatch(5, 0, [note(60)])));
    h.receive(a.peer, xor(encodeBatch(3, 10, [note(60)])));
    expect(h.stats().performers).toBe(1);
    h.receive(a.peer, xor(encodeBatch(1, 20, [note(60)])));
    expect(h.stats().stopped.order).toBe(1);
    expect(a.sent[a.sent.length - 1]).toMatchObject({ sub: BandSub.Stop, reason: StopReason.Order });
  });

  it('restarts a performer who switches instruments without telling them to put it away', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { x: 103, y: 100, sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    h.receive(a.peer, xor(encodeStart(1)));
    expect(a.sent).toEqual([]);
    expect(h.stats().performers).toBe(1);
    // The room sees the guitar go and the flute come.
    expect(b.sent.map(m => m.sub)).toEqual([BandSub.Start, BandSub.Stop, BandSub.Start]);
    expect(b.sent[2]).toMatchObject({ sub: BandSub.Start, performerId: 1, instrument: 1 });
    // The new performance streams as usual.
    h.receive(a.peer, xor(encodeBatch(0, 0, [note(60)])));
    expect(b.sent[3].sub).toBe(BandSub.Batch);
  });

  it('lets a performer with an instrument out join a band, and keeps their performance', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const g = makePeer(2, { x: 103, y: 100, sees: [1] });
    const c = makePeer(3, { x: 101, y: 100, sees: [1, 2] });
    for (const f of [a, g, c]) h.attach(f.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    h.receive(g.peer, xor(encodeStart(2)));
    h.receive(g.peer, xor(encodeJoin(1, 2, 0xffff)));
    expect(g.sent.filter(m => m.sub === BandSub.Refused)).toEqual([]);
    expect(a.sent[a.sent.length - 1]).toEqual({ sub: BandSub.Join, performerId: 2, masterId: 1, instrument: 2, mask: 0xffff });
    expect(h.stats()).toMatchObject({ performers: 2, members: 1 });
    // The member's pose is still out for the room.
    expect(c.sent.filter(m => m.sub === BandSub.Stop)).toEqual([]);

    // Joining their own band is refused; the master stopping dissolves it.
    h.receive(a.peer, xor(encodeJoin(1, 0, 1)));
    expect(a.sent[a.sent.length - 1]).toMatchObject({ sub: BandSub.Refused, cause: RefuseCause.Busy });
    h.receive(a.peer, xor(encodeStop()));
    expect(g.sent[g.sent.length - 1]).toEqual({ sub: BandSub.Stop, performerId: 1, reason: StopReason.Ended, arg: 0 });
    expect(h.stats()).toMatchObject({ performers: 1, members: 0 });

    // Putting the instrument away as a member ends both the performance and the membership.
    clock += BAND_LIMITS.cooldownAfterEndMs + BAND_LIMITS.joinIntervalMs + 1;
    h.receive(a.peer, xor(encodeStart(0)));
    h.receive(g.peer, xor(encodeJoin(1, 2, 1)));
    expect(h.stats()).toMatchObject({ performers: 2, members: 1 });
    h.receive(g.peer, xor(encodeStop()));
    expect(h.stats()).toMatchObject({ performers: 1, members: 0 });
    expect(a.sent[a.sent.length - 1]).toEqual({ sub: BandSub.Leave, performerId: 2 });
  });

  it('runs a band: join within range, leave, and the master stopping', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1, { x: 100, y: 100 });
    const g = makePeer(2, { x: 104, y: 100, sees: [1] });
    const far = makePeer(3, { x: 120, y: 100, sees: [1] });
    const other = makePeer(4, { map: 3 });
    for (const f of [a, g, far, other]) h.attach(f.peer);
    h.receive(a.peer, xor(encodeStart(0)));

    h.receive(g.peer, xor(encodeJoin(1, 2, 0b10)));
    expect(a.sent[a.sent.length - 1]).toEqual({ sub: BandSub.Join, performerId: 2, masterId: 1, instrument: 2, mask: 0b10 });
    expect(h.stats().members).toBe(1);

    h.receive(far.peer, xor(encodeJoin(1, 2, 0b100)));
    expect(far.sent[far.sent.length - 1]).toMatchObject({ sub: BandSub.Refused, cause: RefuseCause.Range });
    h.receive(other.peer, xor(encodeJoin(1, 2, 0b100)));
    expect(other.sent[other.sent.length - 1]).toMatchObject({ sub: BandSub.Refused, cause: RefuseCause.Map });
    h.receive(other.peer, xor(encodeJoin(99, 2, 0b100)));
    expect(other.sent[other.sent.length - 1]).toMatchObject({ sub: BandSub.Refused, cause: RefuseCause.Rate });
    clock += BAND_LIMITS.joinIntervalMs + 1;
    h.receive(other.peer, xor(encodeJoin(99, 2, 0b100)));
    expect(other.sent[other.sent.length - 1]).toMatchObject({ sub: BandSub.Refused, cause: RefuseCause.NotPerforming });

    h.receive(g.peer, xor(encodeLeave()));
    expect(a.sent[a.sent.length - 1]).toEqual({ sub: BandSub.Leave, performerId: 2 });
    expect(h.stats().members).toBe(0);

    clock += BAND_LIMITS.joinIntervalMs + 1;
    h.receive(g.peer, xor(encodeJoin(1, 2, 0b10)));
    h.receive(a.peer, xor(encodeStop()));
    expect(g.sent[g.sent.length - 1]).toEqual({ sub: BandSub.Stop, performerId: 1, reason: StopReason.Ended, arg: 0 });
    expect(h.stats().members).toBe(0);
  });

  it('tells the room when a performer disconnects, and the master when a member does', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { x: 102, y: 100, sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    h.receive(b.peer, xor(encodeJoin(1, 1, 1)));

    h.detach(b.peer);
    expect(a.sent[a.sent.length - 1]).toEqual({ sub: BandSub.Leave, performerId: 2 });

    const c = makePeer(3, { sees: [1] });
    h.attach(c.peer);
    clock += BAND_LIMITS.receiversTtlMs + 1;
    h.receive(a.peer, xor(encodeBatch(0, 0, [note(60)])));
    h.detach(a.peer);
    expect(c.sent[c.sent.length - 1]).toEqual({ sub: BandSub.Stop, performerId: 1, reason: StopReason.Gone, arg: 0 });
    expect(h.stats().stopped.gone).toBe(1);
  });

  it('leaves a backpressured socket alone for a second', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    b.status.value = -1;
    h.receive(a.peer, xor(encodeStart(0)));
    expect(b.raw).toHaveLength(1);
    h.receive(a.peer, xor(encodeBatch(0, 0, [note(60)])));
    expect(b.raw).toHaveLength(1);
    expect(h.stats().dropped.backpressure).toBe(2);
    b.status.value = 1;
    clock += 1001;
    h.receive(a.peer, xor(encodeBatch(1, 10, [note(60)])));
    expect(b.raw).toHaveLength(2);
  });

  it('reads a client that still uses the pre-Season 6 key', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);
    const key = preSeason6.protocol.encryption.xor32Key;
    h.receive(a.peer, xor(encodeStart(1), key));
    expect(b.sent).toEqual([{ sub: BandSub.Start, performerId: 1, version: 1, instrument: 1 }]);
    h.receive(a.peer, xor(encodeBatch(0, 0, [note(60)]), key));
    expect(b.sent[1].sub).toBe(BandSub.Batch);
    expect(h.stats().dropped.malformed).toBe(0);
  });

  it('keeps a performer whose song is over across sweeps', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    h.attach(a.peer);
    h.receive(a.peer, xor(encodeStart(0)));
    for (let i = 0; i < 100; i++) {
      clock += 60_000;
      h.sweep();
    }
    expect(h.stats().performers).toBe(1);
    expect(a.sent).toEqual([]);
  });

  it('identifies performers by the id others see, not the shared local 0x200', () => {
    // The real server hands every client the same local hero id (0x200) and a
    // unique id to everyone else. Two performers with the same local id must
    // still be told apart, by the id their receivers address them under.
    clock = 1_000_000;
    function named(selfId: number, name: string, seen: { id: number; name: string }[]): Fake {
      const session = new TrackedSession(`n${name}`, 55901, { event() {}, change() {}, move() {} }, { now });
      const wire = new WireEncoder();
      session.feedServer(wire.server(gameServerEntered(selfId)));
      session.setAccount(`acc${name}`);
      session.feedServer(wire.server(characterList([{ name, cls: 7, level: 1, status: 0 }])));
      session.feedClient(wire.client(selectCharacter(name)));
      session.feedServer(wire.server(characterInformation({ x: 100, y: 100, map: 0, money: 0, status: 0, hp: 1, maxHp: 1 })));
      session.feedServer(wire.server(playersInScope(seen.map(s => ({ id: s.id, x: 100, y: 100, name: s.name })))));
      const sent: BandRelayMessage[] = [];
      const raw: Uint8Array[] = [];
      const status = { value: 1 };
      const peer: BandPeer = {
        track: session,
        send: f => {
          raw.push(f);
          const m = decodeRelayFrame(f);
          if (m) sent.push(m);
          return status.value;
        },
      };
      return { peer, session, sent, raw, status };
    }

    const h = hub();
    // Both are 0x200 to themselves; each sees the other under a real id.
    const dkfried = named(0x200, 'Dkfried', [{ id: 873, name: 'Elfita' }]);
    const elfita = named(0x200, 'Elfita', [{ id: 864, name: 'Dkfried' }]);
    h.attach(dkfried.peer);
    h.attach(elfita.peer);

    h.receive(dkfried.peer, xor(encodeStart(0)));
    // Elfita hears Dkfried under 864 - not 0x200, which is Elfita's own id.
    expect(elfita.sent).toEqual([{ sub: BandSub.Start, performerId: 864, version: 1, instrument: 0 }]);

    h.receive(elfita.peer, xor(encodeStart(1)));
    expect(dkfried.sent).toEqual([{ sub: BandSub.Start, performerId: 873, version: 1, instrument: 1 }]);

    // Two live performers, neither reaped: they no longer collide on 0x200.
    expect(h.stats().performers).toBe(2);
    expect(h.stats().stopped.gone).toBe(0);
  });

  it('says hello with the protocol version', () => {
    expect(decodeRelayFrame(BandHub.hello())).toEqual({ sub: BandSub.Hello, performerId: 0, version: 1 });
  });
});
