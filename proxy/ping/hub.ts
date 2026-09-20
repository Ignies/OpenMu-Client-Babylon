import { Xor32Decryptor } from '../../src/common/encryption/xor32';
import { gameVersion as preSeason6 } from '../../versions/v097d';
import {
  PING_LIMITS,
  decodeClientFrame,
  encodeHello,
  stampSender,
  type PingClientMessage,
} from '../../src/common/pingProtocol';
import type { TrackedSession } from '../track/session';

/**
 * The map ping relay. Every game socket is a peer; a peer that sends a point
 * has it relayed to every peer on the same map whose character can see them,
 * nearest first past the cap. Nothing here reaches the game server, and a
 * ping holds no state past the moment it is sent - one timestamp per socket.
 *
 * Bun-free and timer-free, with an injectable clock, so the tests drive it.
 *
 * A socket that pings faster than `minIntervalMs` is simply ignored: the
 * honest client gates itself on the same number and never gets here, so a
 * refusal frame would only ever answer a modified one. A malformed frame is
 * dropped and counted.
 */

export interface PingPeer {
  readonly track: TrackedSession;
  /** Bun's `ws.send` status: 0 dropped (closed), -1 backpressure, else bytes. Must not throw. */
  send(frame: Uint8Array): number;
}

export type PingHubOptions = {
  now?: () => number;
  maxReceivers?: number;
  log?: (line: string) => void;
};

export type PingStats = {
  peers: number;
  pings: number;
  framesSent: number;
  dropped: { malformed: number; rate: number; unseen: number; backpressure: number; closed: number };
};

/** Milliseconds a socket that answered `send` with backpressure is left alone. */
const BACKPRESSURE_SKIP_MS = 1000;

type Key = 's6' | 'pre';

type PeerState = {
  peer: PingPeer;
  lastPingAt: number;
  key: Key | null;
  backpressuredAt: number;
};

function chebyshev(a: TrackedSession, b: TrackedSession): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export class PingHub {
  private readonly peers = new Map<PingPeer, PeerState>();
  private readonly now: () => number;
  private readonly maxReceivers: number;
  private readonly log: (line: string) => void;
  private readonly s6 = new Xor32Decryptor();
  private readonly pre = new Xor32Decryptor();
  private readonly counters: PingStats = {
    peers: 0,
    pings: 0,
    framesSent: 0,
    dropped: { malformed: 0, rate: 0, unseen: 0, backpressure: 0, closed: 0 },
  };

  constructor(options: PingHubOptions = {}) {
    this.now = options.now ?? Date.now;
    this.maxReceivers = options.maxReceivers ?? PING_LIMITS.maxReceivers;
    this.log = options.log ?? (() => {});
    this.pre.xor32Key = preSeason6.protocol.encryption.xor32Key;
  }

  static hello(): Uint8Array {
    return encodeHello();
  }

  attach(peer: PingPeer): void {
    if (this.peers.has(peer)) return;
    this.peers.set(peer, {
      peer,
      // A socket may ping the instant it connects; the gate starts open.
      lastPingAt: -Infinity,
      key: null,
      backpressuredAt: 0,
    });
  }

  detach(peer: PingPeer): void {
    this.peers.delete(peer);
  }

  /** One client ws message that starts `C1 ?? FB`, still Xor32'd. Never throws. */
  receive(peer: PingPeer, wire: Uint8Array): void {
    const state = this.peers.get(peer);
    if (!state) return;
    const now = this.now();

    if (wire.length !== 8 || wire[1] !== wire.length) {
      this.counters.dropped.malformed++;
      return;
    }

    const decoded = this.decode(state, wire);
    if (!decoded) {
      this.counters.dropped.malformed++;
      return;
    }

    if (now - state.lastPingAt < PING_LIMITS.minIntervalMs) {
      this.counters.dropped.rate++;
      return;
    }

    const me = state.peer.track;
    if (!me.inWorld || me.objectId === null || me.map === null || !me.character) return;

    // A socket calls its own hero 0x200, so the id every receiver knows this
    // sender by has to come from a peer that has them in scope, by name. No
    // such peer means nobody can see the ping anyway.
    const senderId = this.publicId(state);
    if (senderId === null) {
      this.counters.dropped.unseen++;
      return;
    }

    state.lastPingAt = now;
    this.counters.pings++;

    const frame = stampSender(decoded.plain, senderId);
    let sent = 0;
    for (const receiver of this.receivers(state)) {
      this.trySend(receiver, frame, now);
      sent++;
    }
    this.log(
      `ping: #${senderId} ${me.character} points at ${decoded.message.point.x.toFixed(1)},${decoded.message.point.z.toFixed(1)} on map ${me.map} (${sent} receivers)`
    );
  }

  stats(): PingStats {
    this.counters.peers = this.peers.size;
    return this.counters;
  }

  /* ------------------------------------------------------------- internals */

  /**
   * The Xor32 key this socket speaks, found once by trying both and keeping
   * whichever decodes. The two decryptors are stateless per frame.
   */
  private decode(state: PeerState, wire: Uint8Array): { message: PingClientMessage; plain: Uint8Array } | null {
    const order: Key[] = state.key === 'pre' ? ['pre', 's6'] : ['s6', 'pre'];
    for (const key of order) {
      const plain = wire.slice();
      (key === 's6' ? this.s6 : this.pre).Decrypt(plain);
      const message = decodeClientFrame(plain);
      if (message) {
        state.key = key;
        return { message, plain };
      }
    }
    return null;
  }

  /** What other sockets in scope call this sender, or null if none of them do. */
  private publicId(state: PeerState): number | null {
    const name = state.peer.track.character;
    if (!name) return null;
    for (const other of this.peers.values()) {
      if (other === state) continue;
      const id = other.peer.track.idByName(name);
      if (id !== null) return id;
    }
    return null;
  }

  /**
   * Who sees this ping: every peer on the sender's map whose own scope holds
   * them, nearest first past the cap. The sender is not among them - their
   * client drew the ping on the gesture, before this round trip.
   */
  private receivers(sender: PeerState): PeerState[] {
    const me = sender.peer.track;
    const name = me.character;
    const out: PeerState[] = [];
    for (const state of this.peers.values()) {
      if (state === sender) continue;
      const t = state.peer.track;
      if (!t.inWorld || t.objectId === null || t.map !== me.map) continue;
      if (!name || t.idByName(name) === null) continue;
      out.push(state);
    }
    if (out.length <= this.maxReceivers) return out;
    return out
      .map(state => ({ state, d: chebyshev(state.peer.track, me) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.maxReceivers)
      .map(c => c.state);
  }

  private trySend(state: PeerState, frame: Uint8Array, now: number): void {
    if (now - state.backpressuredAt < BACKPRESSURE_SKIP_MS) {
      this.counters.dropped.backpressure++;
      return;
    }
    let status: number;
    try {
      status = state.peer.send(frame);
    } catch {
      this.counters.dropped.closed++;
      return;
    }
    if (status === -1) {
      state.backpressuredAt = now;
      this.counters.dropped.backpressure++;
    } else if (status === 0) {
      this.counters.dropped.closed++;
    } else {
      this.counters.framesSent++;
    }
  }
}
