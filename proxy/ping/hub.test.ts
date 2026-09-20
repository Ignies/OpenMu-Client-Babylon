import { describe, expect, it } from 'vitest';
import { Xor32Encryptor } from '../../src/common/encryption/xor32';
import {
  PING_LIMITS,
  PingSub,
  decodeRelayFrame,
  encodePoint,
  type PingRelayMessage,
} from '../../src/common/pingProtocol';
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
import { PingHub, type PingPeer } from './hub';

/**
 * Peers are real `TrackedSession`s fed the login sequence the server would
 * send, so map, position and scope come from the same decoders the proxy
 * runs; the ping frames are Xor32'd the way `Store.sendToGS` sends them.
 */

let clock = 1_000_000;
const now = () => clock;

type Fake = {
  peer: PingPeer;
  session: TrackedSession;
  sent: PingRelayMessage[];
  status: { value: number };
};

function makePeer(
  id: number,
  opts: { map?: number; x?: number; y?: number; sees?: number[]; world?: boolean } = {}
): Fake {
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
  const sent: PingRelayMessage[] = [];
  const status = { value: 1 };
  const peer: PingPeer = {
    track: session,
    send: f => {
      if (status.value <= 0) return status.value;
      const m = decodeRelayFrame(f);
      if (m) sent.push(m);
      return status.value;
    },
  };
  return { peer, session, sent, status };
}

const xor = (plain: Uint8Array): Uint8Array => new Xor32Encryptor().Encrypt(plain.slice());

const point = (x: number, z: number) => xor(encodePoint({ x, z }));

function hub(opts = {}) {
  return new PingHub({ now, ...opts });
}

describe('ping hub', () => {
  it('relays a ping to the peers on the sender map who can see them', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    const c = makePeer(3, { map: 3, sees: [1] });
    const d = makePeer(4);
    const e = makePeer(5, { world: false });
    for (const f of [a, b, c, d, e]) h.attach(f.peer);

    h.receive(a.peer, point(12.5, 34.25));

    // The sender is addressed by the id its watchers know it by, not 0x200.
    expect(b.sent).toEqual([{ sub: PingSub.Point, senderId: 1, point: { x: 12.5, z: 34.25 } }]);
    // Another map, no scope, not in the world.
    expect(c.sent).toEqual([]);
    expect(d.sent).toEqual([]);
    expect(e.sent).toEqual([]);
    // The sender draws its own ping; the relay never echoes it back.
    expect(a.sent).toEqual([]);
    expect(h.stats().pings).toBe(1);
  });

  it('drops a second ping inside the gate and takes the next one after it', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);

    h.receive(a.peer, point(1, 1));
    clock += PING_LIMITS.minIntervalMs - 1;
    h.receive(a.peer, point(2, 2));
    expect(b.sent).toHaveLength(1);
    expect(h.stats().dropped.rate).toBe(1);

    clock += 1;
    h.receive(a.peer, point(3, 3));
    expect(b.sent).toHaveLength(2);
    expect(b.sent[1]).toEqual({ sub: PingSub.Point, senderId: 1, point: { x: 3, z: 3 } });
  });

  it('refuses a ping from a sender nobody can see, without spending the gate', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2);
    h.attach(a.peer);
    h.attach(b.peer);

    h.receive(a.peer, point(5, 5));
    expect(b.sent).toEqual([]);
    expect(h.stats().dropped.unseen).toBe(1);
    expect(h.stats().pings).toBe(0);

    // The gate was never spent, so the ping that follows once b sees a lands.
    b.session.feedServer(new WireEncoder().server(playersInScope([{ id: 1, x: 100, y: 100, name: 'P1' }])));
    h.receive(a.peer, point(5, 5));
    expect(b.sent).toHaveLength(1);
  });

  it('drops a malformed or wrongly sized frame', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);

    // Right length, garbage body: fails both xor keys.
    h.receive(a.peer, new Uint8Array([0xc1, 8, 0xfb, 0x01, 1, 2, 3, 4]));
    // A length byte that lies.
    const lying = point(1, 1);
    lying[1] = 9;
    h.receive(a.peer, lying);
    // A relay-sized frame coming the wrong way.
    h.receive(a.peer, new Uint8Array(10));

    expect(b.sent).toEqual([]);
    expect(h.stats().dropped.malformed).toBe(3);
  });

  it('keeps only the nearest receivers past the cap', () => {
    clock = 1_000_000;
    const h = hub({ maxReceivers: 2 });
    const a = makePeer(1, { x: 100, y: 100 });
    const near = makePeer(2, { x: 101, y: 100, sees: [1] });
    const mid = makePeer(3, { x: 110, y: 100, sees: [1] });
    const far = makePeer(4, { x: 200, y: 100, sees: [1] });
    for (const f of [a, near, mid, far]) h.attach(f.peer);

    h.receive(a.peer, point(1, 1));
    expect(near.sent).toHaveLength(1);
    expect(mid.sent).toHaveLength(1);
    expect(far.sent).toHaveLength(0);
  });

  it('stops relaying to a peer that walked onto another map, and to one that left', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    const c = makePeer(3, { sees: [1] });
    for (const f of [a, b, c]) h.attach(f.peer);

    h.receive(a.peer, point(1, 1));
    expect(b.sent).toHaveLength(1);
    expect(c.sent).toHaveLength(1);

    b.session.feedServer(new WireEncoder().server(mapChanged(3, 50, 50)));
    h.detach(c.peer);
    clock += PING_LIMITS.minIntervalMs;
    h.receive(a.peer, point(2, 2));
    expect(b.sent).toHaveLength(1);
    expect(c.sent).toHaveLength(1);
  });

  // The ping gate (1.9 s) is longer than the backpressure window (1 s), so a
  // socket only ever meets the window through a second sender pinging behind
  // the first - which is exactly the case a crowd produces.
  it('leaves a backpressured socket alone until its window passes', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2);
    const watcher = makePeer(3, { sees: [1, 2] });
    for (const f of [a, b, watcher]) h.attach(f.peer);

    watcher.status.value = -1;
    h.receive(a.peer, point(1, 1));
    expect(watcher.sent).toHaveLength(0);
    expect(h.stats().dropped.backpressure).toBe(1);

    // Drained, but still inside the skip window: the next sender's ping is
    // not sent, and the socket is not hammered while it catches up.
    watcher.status.value = 1;
    clock += 500;
    h.receive(b.peer, point(2, 2));
    expect(watcher.sent).toHaveLength(0);
    expect(h.stats().dropped.backpressure).toBe(2);

    // Past the window, and past the sender's own gate, it is talked to again.
    clock += PING_LIMITS.minIntervalMs - 500;
    h.receive(a.peer, point(3, 3));
    expect(watcher.sent).toEqual([{ sub: PingSub.Point, senderId: 1, point: { x: 3, z: 3 } }]);
  });

  it('closes over a socket whose send reports it gone', () => {
    clock = 1_000_000;
    const h = hub();
    const a = makePeer(1);
    const b = makePeer(2, { sees: [1] });
    h.attach(a.peer);
    h.attach(b.peer);

    b.status.value = 0;
    h.receive(a.peer, point(1, 1));
    expect(b.sent).toHaveLength(0);
    expect(h.stats().dropped.closed).toBe(1);
    // The ping itself still counted: the other receivers got it.
    expect(h.stats().pings).toBe(1);
  });
});
