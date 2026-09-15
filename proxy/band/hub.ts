import { Xor32Decryptor } from '../../src/common/encryption/xor32';
import { gameVersion as preSeason6 } from '../../versions/v097d';
import {
  BAND_LIMITS,
  BAND_VERSION,
  BandSub,
  RefuseCause,
  RefuseWhat,
  StopReason,
  decodeClientFrame,
  encodeHello,
  encodeLeaveNotice,
  encodeRefused,
  encodeStopNotice,
  stampPerformer,
  type BandClientMessage,
} from '../../src/common/bandProtocol';
import type { TrackedSession } from '../track/session';
import { SlidingWindow } from './window';

/**
 * The band relay. Every game socket is a peer; a peer that sends `start`
 * becomes a performer, and each of their batches goes to every peer on the
 * same map whose character can see them - the tracker already knows that
 * from the server's own scope packets. Nothing here reaches the game
 * server: `main.ts` hands band frames here instead of writing them to TCP.
 *
 * Bun-free and timer-free, with an injectable clock, so the tests drive it
 * like `TrackedSession`. `main.ts` calls `sweep` on an interval.
 *
 * Limits are Space Station 14's (`BAND_LIMITS`). A malformed or oversized
 * frame is dropped and counted as a strike; a sustained breach stops the
 * performance, which tells every receiver and the performer, and starts a
 * cooldown. Nothing a client sends can cost the proxy more than one
 * decrypt, a few range checks and the sends it was going to do anyway.
 */

export interface BandPeer {
  readonly track: TrackedSession;
  /** Bun's `ws.send` status: 0 dropped (closed), -1 backpressure, else bytes. Must not throw. */
  send(frame: Uint8Array): number;
}

export type BandHubOptions = {
  now?: () => number;
  maxPerformers?: number;
  maxPerformersPerMap?: number;
  maxReceivers?: number;
  log?: (line: string) => void;
};

export type BandStats = {
  performers: number;
  members: number;
  batchesIn: number;
  batchesRelayed: number;
  framesSent: number;
  dropped: { malformed: number; rate: number; order: number; backpressure: number; closed: number };
  stopped: { flood: number; order: number; gone: number };
  refused: number;
};

/** Seconds a socket that answered `send` with backpressure is left alone. */
const BACKPRESSURE_SKIP_MS = 1000;

/** Refusal causes as the log names them. */
const REFUSE_NAMES: Record<number, string> = {
  [RefuseCause.Cooldown]: 'cooldown',
  [RefuseCause.Busy]: 'busy',
  [RefuseCause.Full]: 'full',
  [RefuseCause.Range]: 'out of range',
  [RefuseCause.Map]: 'another map',
  [RefuseCause.NotPerforming]: 'not performing',
  [RefuseCause.Rate]: 'too fast',
};

/** Milliseconds between two channelNames frames from one master. */
const NAMES_INTERVAL_MS = 5000;

type Key = 's6' | 'pre';

type PeerState = {
  peer: BandPeer;
  performing: Performer | null;
  memberOf: Performer | null;
  cooldownUntil: number;
  lastJoinAt: number;
  key: Key | null;
  backpressuredAt: number;
  strikes: SlidingWindow;
  bytes: SlidingWindow;
};

type Performer = {
  state: PeerState;
  /**
   * The id other clients address this performer by, which is what goes on
   * every relayed frame and what receivers match. Resolved from the tracker
   * by the performer's name; until a peer that sees them is found it falls
   * back to `selfId`, which is the same 0x200 for everyone and matches no one.
   */
  id: number;
  /** The performer's own local id (0x200), for the still-in-world check only. */
  selfId: number;
  map: number;
  instrument: number;
  startedAt: number;
  seq: number | null;
  offset0: number | null;
  dropped: number;
  lagged: number;
  batches: SlidingWindow;
  events: SlidingWindow;
  states: SlidingWindow;
  lastNamesAt: number;
  /** The client's own start frame, unstamped, to re-stamp when `id` resolves. */
  startPlain: Uint8Array;
  startFrame: Uint8Array;
  stateFrame: Uint8Array | null;
  members: Set<PeerState>;
  receivers: Set<PeerState>;
  receiversAt: number;
};

function chebyshev(a: TrackedSession, b: TrackedSession): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export class BandHub {
  private readonly peers = new Map<BandPeer, PeerState>();
  /** Keyed by the performer's socket, so two performers never share a key even when their local ids do. */
  private readonly performers = new Map<PeerState, Performer>();
  private readonly now: () => number;
  private readonly maxPerformers: number;
  private readonly maxPerformersPerMap: number;
  private readonly maxReceivers: number;
  private readonly log: (line: string) => void;
  private readonly s6 = new Xor32Decryptor();
  private readonly pre = new Xor32Decryptor();
  private readonly counters: BandStats = {
    performers: 0,
    members: 0,
    batchesIn: 0,
    batchesRelayed: 0,
    framesSent: 0,
    dropped: { malformed: 0, rate: 0, order: 0, backpressure: 0, closed: 0 },
    stopped: { flood: 0, order: 0, gone: 0 },
    refused: 0,
  };

  constructor(options: BandHubOptions = {}) {
    this.now = options.now ?? Date.now;
    this.maxPerformers = options.maxPerformers ?? BAND_LIMITS.maxPerformers;
    this.maxPerformersPerMap = options.maxPerformersPerMap ?? BAND_LIMITS.maxPerformersPerMap;
    this.maxReceivers = options.maxReceivers ?? BAND_LIMITS.maxReceivers;
    this.log = options.log ?? (() => {});
    this.pre.xor32Key = preSeason6.protocol.encryption.xor32Key;
  }

  static hello(): Uint8Array {
    return encodeHello();
  }

  attach(peer: BandPeer): void {
    if (this.peers.has(peer)) return;
    this.peers.set(peer, {
      peer,
      performing: null,
      memberOf: null,
      cooldownUntil: 0,
      lastJoinAt: 0,
      key: null,
      backpressuredAt: 0,
      strikes: new SlidingWindow(1000, 10),
      bytes: new SlidingWindow(100, 10),
    });
  }

  detach(peer: BandPeer): void {
    const state = this.peers.get(peer);
    if (!state) return;
    if (state.performing) this.endPerformance(state.performing, StopReason.Gone);
    if (state.memberOf) this.leave(state, true);
    for (const perf of this.performers.values()) perf.receivers.delete(state);
    this.peers.delete(peer);
  }

  /** One client ws message that starts `C1 ?? FA`, still Xor32'd. Never throws. */
  receive(peer: BandPeer, wire: Uint8Array): void {
    const state = this.peers.get(peer);
    if (!state) return;
    const now = this.now();

    if (wire.length < 4 || wire.length > 255 || wire[1] !== wire.length) {
      this.strike(state, now, 'malformed');
      return;
    }

    if (state.bytes.add(now, wire.length) > BAND_LIMITS.maxBytesPerSecond) {
      if (state.performing) this.endPerformance(state.performing, StopReason.Flood);
      else this.strike(state, now, 'rate');
      return;
    }

    const decoded = this.decode(state, wire);
    if (!decoded) {
      this.strike(state, now, 'malformed');
      return;
    }

    const { message, plain } = decoded;
    const track = state.peer.track;
    if (!track.inWorld || track.objectId === null) return;

    switch (message.sub) {
      case BandSub.Start:
        this.onStart(state, message, plain, now);
        return;
      case BandSub.Stop:
        // Putting the instrument away ends both: the performance (the pose
        // others see) and any band membership.
        if (state.performing) {
          this.endPerformance(state.performing, StopReason.Ended);
          state.cooldownUntil = now + BAND_LIMITS.cooldownAfterEndMs;
        }
        if (state.memberOf) this.leave(state, false);
        return;
      case BandSub.Batch:
        this.onBatch(state, message, plain, now);
        return;
      case BandSub.Join:
        this.onJoin(state, message, plain, now);
        return;
      case BandSub.Leave:
        if (state.memberOf) this.leave(state, false);
        return;
      case BandSub.BandState: {
        const perf = state.performing;
        if (!perf) return;
        if (perf.states.add(now) > 2) {
          this.strike(state, now, 'rate');
          return;
        }
        perf.stateFrame = stampPerformer(plain, perf.id);
        this.relay(perf, perf.stateFrame, now);
        return;
      }
      case BandSub.ChannelNames: {
        const perf = state.performing;
        if (!perf) return;
        if (now - perf.lastNamesAt < NAMES_INTERVAL_MS) {
          this.strike(state, now, 'rate');
          return;
        }
        perf.lastNamesAt = now;
        this.relay(perf, stampPerformer(plain, perf.id), now);
        return;
      }
    }
  }

  /**
   * Performers who left their map, members who wandered off. Every few
   * seconds. A performer whose song is over stays: an instrument held out
   * costs nothing, and a dead socket ends its performance in `detach`.
   */
  sweep(now = this.now()): void {
    for (const perf of Array.from(this.performers.values())) {
      this.refreshReceivers(perf, now, true);
      if (!this.performers.has(perf.state)) continue;
      for (const member of Array.from(perf.members)) {
        const t = member.peer.track;
        if (!t.inWorld || t.map !== perf.map || chebyshev(t, perf.state.peer.track) > BAND_LIMITS.joinRangeTiles) {
          this.leave(member, true);
        }
      }
    }
  }

  stats(): BandStats {
    let members = 0;
    for (const perf of this.performers.values()) members += perf.members.size;
    return { ...this.counters, dropped: { ...this.counters.dropped }, stopped: { ...this.counters.stopped }, performers: this.performers.size, members };
  }

  /* ------------------------------------------------------------- decoding */

  private decode(state: PeerState, wire: Uint8Array): { message: BandClientMessage; plain: Uint8Array } | null {
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

  private strike(state: PeerState, now: number, why: 'malformed' | 'rate'): void {
    this.counters.dropped[why]++;
    if (state.strikes.add(now) > BAND_LIMITS.maxStrikes && state.performing) {
      this.endPerformance(state.performing, StopReason.Flood);
    }
  }

  /* ------------------------------------------------------------ performing */

  private refuse(state: PeerState, what: number, cause: number, arg = 0): void {
    this.counters.refused++;
    const id = state.peer.track.objectId ?? 0;
    this.log(`band: #${id} refused (${what === RefuseWhat.Start ? 'start' : 'join'}, ${REFUSE_NAMES[cause] ?? cause})`);
    this.trySend(state, encodeRefused(id, what, cause, arg), this.now());
  }

  /**
   * `start` is "instrument out": the pose and the model everyone sees. A
   * performer sending it again has switched instruments, so the old
   * performance ends quietly for them (the receivers get the stop and the
   * new start); a band member may hold an instrument too, that is how they
   * are seen playing.
   */
  private onStart(state: PeerState, message: Extract<BandClientMessage, { sub: 1 }>, plain: Uint8Array, now: number): void {
    const track = state.peer.track;
    if (message.version !== BAND_VERSION) {
      this.strike(state, now, 'malformed');
      return;
    }
    const previous = state.performing;
    if (!previous && now < state.cooldownUntil) {
      this.refuse(state, RefuseWhat.Start, RefuseCause.Cooldown, Math.min(255, Math.ceil((state.cooldownUntil - now) / 1000)));
      return;
    }
    if (!previous) {
      if (this.performers.size >= this.maxPerformers) {
        this.refuse(state, RefuseWhat.Start, RefuseCause.Full);
        return;
      }
      let onMap = 0;
      for (const perf of this.performers.values()) if (perf.map === track.map) onMap++;
      if (onMap >= this.maxPerformersPerMap) {
        this.refuse(state, RefuseWhat.Start, RefuseCause.Full);
        return;
      }
    }

    // The same socket sending start again has switched instruments: the old
    // performance ends quietly for them (receivers get the stop and the new
    // start). A socket is one performer, so the map is keyed by socket and no
    // two performers can collide even when their local ids are the same 0x200.
    if (previous) this.endPerformance(previous, StopReason.Ended, false);

    const selfId = track.objectId ?? 0;
    const perf: Performer = {
      state,
      id: selfId,
      selfId,
      map: track.map ?? -1,
      instrument: message.instrument,
      startedAt: now,
      seq: null,
      offset0: null,
      dropped: 0,
      lagged: 0,
      batches: new SlidingWindow(100, 10),
      events: new SlidingWindow(100, 10),
      states: new SlidingWindow(100, 10),
      lastNamesAt: 0,
      startPlain: plain,
      startFrame: stampPerformer(plain, selfId),
      stateFrame: null,
      members: new Set(),
      receivers: new Set(),
      receiversAt: 0,
    };
    this.performers.set(state, perf);
    state.performing = perf;
    this.counters.performers = this.performers.size;
    // The performer's own socket only knows its local id (0x200); the id
    // others address it by is recovered from a peer that sees it.
    this.resolvePublicId(perf);
    track.note('band', `starts playing instrument ${message.instrument}`, { instrument: message.instrument });
    // Every receiver is new to this performance, so the refresh is what
    // hands them the start.
    this.refreshReceivers(perf, now, false);
    this.log(`band: #${perf.id} starts playing instrument ${message.instrument} on map ${perf.map} (${perf.receivers.size} receivers)`);
  }

  /**
   * Recover the id other clients see this performer by, from the tracker: the
   * performer's own socket calls its hero 0x200, but every socket that has the
   * performer in scope knows them by their real id under their name. Sets
   * `perf.id` and re-stamps the cached start when it changes.
   */
  private resolvePublicId(perf: Performer): void {
    const name = perf.state.peer.track.character;
    if (!name) return;
    for (const other of this.peers.values()) {
      if (other === perf.state) continue;
      const id = other.peer.track.idByName(name);
      if (id === null) continue;
      if (id !== perf.id) {
        perf.id = id;
        perf.startFrame = stampPerformer(perf.startPlain, id);
      }
      return;
    }
  }

  private onBatch(state: PeerState, message: Extract<BandClientMessage, { sub: 3 }>, plain: Uint8Array, now: number): void {
    const perf = state.performing;
    if (!perf) return;
    this.counters.batchesIn++;

    if (perf.batches.add(now) > BAND_LIMITS.maxBatchesPerSecond) {
      this.endPerformance(perf, StopReason.Flood);
      return;
    }
    if (perf.events.add(now, message.events.length) > BAND_LIMITS.maxEventsPerSecond) {
      this.endPerformance(perf, StopReason.Flood);
      return;
    }

    if (perf.seq !== null && ((perf.seq + 1) & 0xffff) !== message.seq) {
      perf.dropped++;
      if (perf.dropped > BAND_LIMITS.maxDroppedBatches) {
        this.endPerformance(perf, StopReason.Order);
        return;
      }
    }
    perf.seq = message.seq;

    // `baseMs` runs on the performer's clock from their start; the difference
    // to ours should stay put. Growing means they are sending late (lagged);
    // shrinking means notes from the future - a pre-buffered flood.
    const offset = now - perf.startedAt - message.baseMs;
    if (perf.offset0 === null) perf.offset0 = offset;
    else if (offset > perf.offset0 + BAND_LIMITS.lagToleranceMs) {
      perf.lagged++;
      if (perf.lagged >= BAND_LIMITS.maxLaggedBatches) {
        this.endPerformance(perf, StopReason.Order);
        return;
      }
    } else if (offset < perf.offset0 - BAND_LIMITS.lagToleranceMs) {
      this.strike(state, now, 'rate');
      if (!this.performers.has(perf.state)) return;
    }

    this.refreshReceivers(perf, now, false);
    if (!this.performers.has(perf.state)) return;
    this.relay(perf, stampPerformer(plain, perf.id), now);
    this.counters.batchesRelayed++;
  }

  /**
   * A member keeps their own performance (their instrument is out, that is
   * their pose on every screen) and doubles the master's notes on it; the
   * master's client learns who joined and pushes the band state to everyone
   * in earshot.
   */
  private onJoin(state: PeerState, message: Extract<BandClientMessage, { sub: 4 }>, plain: Uint8Array, now: number): void {
    const track = state.peer.track;
    if (now - state.lastJoinAt < BAND_LIMITS.joinIntervalMs) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.Rate);
      return;
    }
    state.lastJoinAt = now;
    // The joiner names the master by the id they see them under - the master's
    // public id, not the master's own 0x200 - so find the performance with
    // that resolved id.
    const wanted = message.masterId & 0x7fff;
    let master: Performer | undefined;
    for (const perf of this.performers.values()) {
      this.resolvePublicId(perf);
      if (perf.id === wanted) {
        master = perf;
        break;
      }
    }
    if (!master) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.NotPerforming);
      return;
    }
    if (master.state === state) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.Busy);
      return;
    }
    if (master.map !== track.map) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.Map);
      return;
    }
    if (chebyshev(track, master.state.peer.track) > BAND_LIMITS.joinRangeTiles) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.Range);
      return;
    }
    if (state.memberOf && state.memberOf !== master) this.leave(state, false);
    if (!master.members.has(state) && master.members.size >= BAND_LIMITS.maxBandMembers) {
      this.refuse(state, RefuseWhat.Join, RefuseCause.Full);
      return;
    }
    master.members.add(state);
    state.memberOf = master;
    // The master's client must learn the joiner by the id it sees them under.
    const joinerId = this.memberIdFor(master, state);
    track.note('band', `joins the band of #${master.id}`, { master: master.id, instrument: message.instrument });
    this.log(`band: #${joinerId} joins the band of #${master.id} with instrument ${message.instrument}`);
    this.trySend(master.state, stampPerformer(plain, joinerId), now);
  }

  /** The id the master's client sees `member` under, falling back to the member's local id. */
  private memberIdFor(master: Performer, member: PeerState): number {
    const name = member.peer.track.character;
    const seen = name ? master.state.peer.track.idByName(name) : null;
    return seen ?? member.peer.track.objectId ?? 0;
  }

  private leave(state: PeerState, quiet: boolean): void {
    const master = state.memberOf;
    if (!master) return;
    master.members.delete(state);
    state.memberOf = null;
    const id = this.memberIdFor(master, state);
    this.trySend(master.state, encodeLeaveNotice(id), this.now());
    if (!quiet) state.peer.track.note('band', `leaves the band of #${master.id}`, { master: master.id });
    this.log(`band: #${id} leaves the band of #${master.id}`);
  }

  /** `notifyPerformer` false: the performer is switching instruments and is not to put the new one away. */
  private endPerformance(perf: Performer, reason: number, notifyPerformer = true): void {
    if (this.performers.get(perf.state) !== perf) return;
    this.performers.delete(perf.state);
    perf.state.performing = null;
    this.counters.performers = this.performers.size;
    const now = this.now();

    if (reason === StopReason.Flood) this.counters.stopped.flood++;
    else if (reason === StopReason.Order) this.counters.stopped.order++;
    else if (reason === StopReason.Gone) this.counters.stopped.gone++;
    if (reason === StopReason.Flood || reason === StopReason.Order) {
      perf.state.cooldownUntil = now + BAND_LIMITS.cooldownAfterStopMs;
    }

    // One notice each: a member is usually a receiver too.
    const notice = encodeStopNotice(perf.id, reason);
    const told = new Set<PeerState>();
    for (const receiver of perf.receivers) {
      this.trySend(receiver, notice, now);
      told.add(receiver);
    }
    perf.receivers.clear();
    for (const member of Array.from(perf.members)) {
      member.memberOf = null;
      if (!told.has(member)) this.trySend(member, notice, now);
    }
    perf.members.clear();
    if (notifyPerformer) this.trySend(perf.state, notice, now);

    const why = reason === StopReason.Flood ? 'too many notes' : reason === StopReason.Order ? 'notes out of order' : reason === StopReason.Gone ? 'gone' : 'ended';
    perf.state.peer.track.note('band', `stops playing (${why})`, { reason });
    this.log(`band: #${perf.id} stopped (${why})`);
  }

  /* -------------------------------------------------------------- relaying */

  /**
   * Who hears this performer: every peer on the same map whose own scope
   * holds them, nearest first past the cap. Recomputed at most every
   * `receiversTtlMs`; a peer coming in gets the cached start and band state
   * first, one going out gets a stop.
   */
  private refreshReceivers(perf: Performer, now: number, force: boolean): void {
    if (!force && now - perf.receiversAt < BAND_LIMITS.receiversTtlMs) return;
    const first = perf.receiversAt === 0;
    perf.receiversAt = now;

    const me = perf.state.peer.track;
    if (!me.inWorld || me.map !== perf.map || me.objectId !== perf.selfId) {
      this.endPerformance(perf, StopReason.Gone);
      return;
    }

    // A peer that just came into scope may be the first to know this
    // performer's public id; a performer whose own id is still the local
    // 0x200 has no receivers, since nobody addresses anyone by 0x200.
    this.resolvePublicId(perf);
    const name = me.character;

    let candidates: PeerState[] = [];
    for (const state of this.peers.values()) {
      if (state === perf.state) continue;
      const t = state.peer.track;
      if (!t.inWorld || t.objectId === null || t.map !== perf.map) continue;
      // The receiver must actually see this performer - by their name, since
      // the performer's own id (0x200) is every peer's own hero id too.
      if (!name || t.idByName(name) === null) continue;
      candidates.push(state);
    }
    if (candidates.length > this.maxReceivers) {
      candidates = candidates
        .map(state => ({ state, d: chebyshev(state.peer.track, me) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.maxReceivers)
        .map(c => c.state);
    }

    const next = new Set(candidates);
    let changed = false;
    for (const state of perf.receivers) {
      if (!next.has(state)) {
        this.trySend(state, encodeStopNotice(perf.id, StopReason.Gone), now);
        changed = true;
      }
    }
    for (const state of next) {
      if (!perf.receivers.has(state)) {
        this.trySend(state, perf.startFrame, now);
        if (perf.stateFrame) this.trySend(state, perf.stateFrame, now);
        changed = true;
      }
    }
    perf.receivers = next;
    if (changed && !first) this.log(`band: #${perf.id} now has ${next.size} receivers`);
  }

  private relay(perf: Performer, frame: Uint8Array, now: number): void {
    for (const receiver of perf.receivers) this.trySend(receiver, frame, now);
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
