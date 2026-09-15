import { observable, runInAction } from 'mobx';
import type { TextKey } from '../../i18n';
import type { Entity, NetEntity } from '../../ecs/world';
import { EventBus } from '../../libs/eventBus';
import { Store } from '../../store';
import { NetStats } from '../netStats';
import {
  instrumentById,
  instrumentIndex,
  type InstrumentId,
} from '../instruments';
import {
  allNotesOff,
  audioNow,
  bankReady,
  contextReady,
  dropPerformer,
  ensureBank,
  instrumentVoices,
  noteOff,
  noteOn,
  setPerformerPosition,
} from '../../sound/instruments';
import { MidiFileError, parseMidi, type MidiEvent, type ParsedMidi } from './midiFile';
import { Sequencer, type BatchEvent } from './sequencer';
import { Receiver, receiverDelay } from './receiver';
import {
  ALL_CHANNELS,
  PERCUSSION_CHANNEL,
  canRender,
  hasChannel,
  masterMask,
  withMember,
  withoutMember,
  type BandMember,
  type BandState,
} from './bandState';
import { queueHit, startPerforming, stopPerforming } from './performing';

/**
 * The band: what the player is doing with their instrument, and what every
 * performer in scope is doing with theirs. The one object the Instrument
 * window, the emote wheel, `BandSystem` and the wire module talk to.
 *
 * Playback runs on a 100 ms timer, not the frame: the sequencer stamps notes
 * on the audio clock a quarter second ahead, so a slow frame costs nothing.
 * Entity work (the pose, the model) goes through `world.bandRequest` and
 * `BandSystem`, like the emotes do.
 *
 * The wire is a `BandTransport` handed in by `band/bandNet.ts`; offline, or
 * before the proxy says hello, it is the silent one below and the hero
 * simply plays for themselves.
 */

// ---- 1. tuning -------------------------------------------------------------

const TICK_MS = 100;

/** Seconds between the watchdog ticks over the remote streams. */
const REMOTE_TICK_MS = 500;

// ---- 2. state --------------------------------------------------------------

export type BandPhase = 'idle' | 'out' | 'playing' | 'paused';
export type BandRole = 'solo' | 'master' | 'member';

export type BandTransport = {
  start(instrument: number): void;
  stop(): void;
  batch(baseMs: number, events: BatchEvent[]): void;
  join(masterId: number, instrument: number, channelMask: number): void;
  leave(): void;
  state(masterMask: number, members: BandMember[]): void;
};

const SILENT_TRANSPORT: BandTransport = {
  start() {},
  stop() {},
  batch() {},
  join() {},
  leave() {},
  state() {},
};

let transport: BandTransport = SILENT_TRANSPORT;

/** The wire module plugs itself in here once the proxy has said hello. */
export function setBandTransport(t: BandTransport | null): void {
  transport = t ?? SILENT_TRANSPORT;
}

export const Band = observable(
  {
    phase: 'idle' as BandPhase,
    instrument: null as InstrumentId | null,
    fileName: '',
    song: null as ParsedMidi | null,
    positionMs: 0,
    loop: false,
    role: 'solo' as BandRole,
    band: null as BandState | null,
    bankLoading: false,
    /** The last thing that went wrong, shown in the window until the next action. */
    error: null as TextKey | null,
    windowOpen: false,
    /** Whether the proxy relays band frames on this connection. */
    available: false,
  },
  { song: observable.ref, band: observable.ref }
);

const HERO_KEY = 'hero';

/**
 * The hero's own band membership, kept apart from `Band.band`: a master's
 * state lists the hero by the id the master sees them under, which is not
 * one this client knows itself by (every client is 0x200 to itself). The
 * hero's share of a master's stream is voiced from this record, never from
 * that list.
 */
let membership: { masterId: number; instrument: InstrumentId; channelMask: number } | null = null;

const sequencer = new Sequencer(
  { now: audioNow },
  {
    schedule: (ev, when) => voiceLocal(ev, when),
    batch: (baseMs, events) => transport.batch(baseMs, events),
    ended: () => {
      runInAction(() => {
        if (Band.phase === 'playing') Band.phase = 'out';
      });
    },
  },
  { tickMs: TICK_MS }
);

let timer: ReturnType<typeof setInterval> | null = null;

function startTimer(): void {
  if (timer) return;
  timer = setInterval(() => {
    sequencer.tick();
    runInAction(() => {
      Band.positionMs = sequencer.positionMs;
    });
    if (!sequencer.playing && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, TICK_MS);
}

function stopTimer(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function heroEntity() {
  return Store.world?.playerEntity ?? null;
}

type NoteEvent = { status: number; d1: number; d2: number };

/** One performer's take on a channel message: a note at their key, a strum on their entity. */
function voiceOn(
  key: string,
  instrument: InstrumentId,
  ev: NoteEvent,
  when: number,
  entity: Entity | null | undefined
): void {
  const channel = ev.status & 0x0f;
  if (!canRender(instrument, channel)) return;
  const kind = ev.status & 0xf0;
  if (kind === 0x90 && ev.d2 > 0) {
    noteOn(key, instrument, channel, ev.d1, ev.d2, when);
    if (entity) queueHit(entity, when);
  } else if (kind === 0x80 || kind === 0x90) {
    noteOff(key, channel, ev.d1, when);
  } else if (kind === 0xb0) {
    allNotesOff(key);
  }
}

/**
 * The hero's own notes, at the hero's key - and, when the hero is a master,
 * each member's doubling of them: on the member's instrument, where the
 * member stands, on the channels in their mask. A member is a performer in
 * their own right here (their instrument is out), so their key is placed.
 */
function voiceLocal(ev: MidiEvent, when: number): void {
  const instrument = Band.instrument;
  if (!instrument) return;
  voiceOn(HERO_KEY, instrument, ev, when, heroEntity());
  if (Band.role !== 'master' || !Band.band) return;
  const channel = ev.status & 0x0f;
  for (const m of Band.band.members) {
    const remote = remotes.get(m.netId);
    if (!remote || !hasChannel(m.channelMask, channel)) continue;
    voiceOn(keyOf(m.netId), m.instrument, ev, when, remote.entity);
  }
}

/**
 * Which channels the hero's own sequencer voices: all of its song (a band
 * doubles the master, it takes nothing from them), percussion only if the
 * row renders it. A member's sequencer never runs; their notes come off the
 * master's stream in `voiceRemote`.
 */
function refreshLocalMask(): void {
  const instrument = Band.instrument;
  let mask = Band.role === 'member' ? 0 : ALL_CHANNELS;
  if (!instrument || !canRender(instrument, PERCUSSION_CHANNEL)) mask &= ~(1 << PERCUSSION_CHANNEL);
  sequencer.localMask = mask;
}

// ---- 3. the hero's commands ------------------------------------------------

/** Asks BandSystem to take the instrument out; `takenOut` / `refused` come back next frame. */
export function takeOutInstrument(id: InstrumentId): void {
  const world = Store.world;
  if (!world?.playerEntity) return;
  runInAction(() => {
    Band.error = null;
  });
  world.bandRequest = { kind: 'takeOut', instrument: id };
}

/** BandSystem: the instrument is in the hero's hands. */
export function takenOut(id: InstrumentId): void {
  runInAction(() => {
    Band.instrument = id;
    Band.phase = 'out';
    Band.windowOpen = true;
    Band.bankLoading = !bankReady(id);
  });
  sequencer.startClock();
  refreshLocalMask();
  transport.start(instrumentIndex(id));
  void ensureBank(id).then(ok => {
    runInAction(() => {
      Band.bankLoading = false;
      if (!ok && Band.instrument === id) Band.error = 'instrument.unavailable';
    });
  });
}

/** BandSystem: the request could not be honoured. */
export function refused(reason: TextKey): void {
  runInAction(() => {
    Band.error = reason;
  });
}

export function putAwayInstrument(): void {
  const world = Store.world;
  stopPlaying();
  if (Band.role !== 'solo') leaveBand();
  transport.stop();
  if (world) world.bandRequest = { kind: 'putAway' };
  membership = null;
  runInAction(() => {
    Band.instrument = null;
    Band.phase = 'idle';
    Band.windowOpen = false;
    Band.role = 'solo';
    Band.band = null;
  });
}

/** The proxy stopped this client's performance (a limit, or its own stop echoed). */
export function stoppedByProxy(): void {
  const hero = heroEntity();
  const world = Store.world;
  if (hero && world) stopPerforming(world, hero);
  performanceEnded();
}

/** BandSystem: the performance ended on its side (a step, a hit, death, the request). */
export function performanceEnded(): void {
  if (Band.phase === 'idle' && Band.instrument === null) return;
  stopPlaying();
  transport.stop();
  membership = null;
  runInAction(() => {
    Band.instrument = null;
    Band.phase = 'idle';
    Band.windowOpen = false;
    Band.role = 'solo';
    Band.band = null;
  });
}

export async function loadMidiFile(file: File): Promise<void> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const song = parseMidi(bytes);
    stopPlaying();
    sequencer.load(song);
    runInAction(() => {
      Band.song = song;
      Band.fileName = file.name;
      Band.positionMs = 0;
      Band.error = null;
    });
    if (Band.role === 'master' || Band.role === 'solo') refreshLocalMask();
  } catch (err) {
    runInAction(() => {
      Band.error = err instanceof MidiFileError ? 'instrument.fileError' : 'instrument.fileError';
    });
  }
}

export async function playSong(): Promise<void> {
  const instrument = Band.instrument;
  if (!instrument || !Band.song || Band.role === 'member') return;
  if (Band.phase === 'playing') return;
  if (!bankReady(instrument)) {
    runInAction(() => {
      Band.bankLoading = true;
    });
    const ok = await ensureBank(instrument);
    runInAction(() => {
      Band.bankLoading = false;
    });
    if (!ok || Band.instrument !== instrument) return;
  }
  if (!contextReady()) return;
  refreshLocalMask();
  sequencer.play();
  runInAction(() => {
    Band.phase = 'playing';
  });
  startTimer();
}

export function pauseSong(): void {
  if (Band.phase !== 'playing') return;
  sequencer.pause();
  runInAction(() => {
    Band.phase = 'paused';
    Band.positionMs = sequencer.positionMs;
  });
  stopTimer();
}

export function stopPlaying(): void {
  if (Band.phase !== 'playing' && Band.phase !== 'paused') return;
  sequencer.stop();
  stopTimer();
  runInAction(() => {
    Band.phase = 'out';
    Band.positionMs = 0;
  });
}

export function setLoop(loop: boolean): void {
  sequencer.loop = loop;
  runInAction(() => {
    Band.loop = loop;
  });
}

export function toggleInstrumentWindow(open?: boolean): void {
  runInAction(() => {
    Band.windowOpen = open ?? !Band.windowOpen;
  });
}

export function setBandAvailable(available: boolean): void {
  runInAction(() => {
    Band.available = available;
  });
}

// ---- 4. bands: the hero's side --------------------------------------------

/** Join another performer's band with the instrument in hand, doubling the channels in `channelMask`. */
export function joinBand(masterId: number, channelMask = ALL_CHANNELS): void {
  const instrument = Band.instrument;
  if (!instrument || Band.phase === 'playing' || Band.phase === 'paused') return;
  transport.join(masterId, instrumentIndex(instrument), channelMask);
  membership = { masterId, instrument, channelMask };
  runInAction(() => {
    Band.role = 'member';
    Band.band = { masterId, members: [{ netId: Store.playerId ?? 0, instrument, channelMask }] };
  });
  refreshLocalMask();
}

export function leaveBand(): void {
  if (Band.role === 'member') transport.leave();
  membership = null;
  runInAction(() => {
    Band.role = 'solo';
    Band.band = null;
  });
  refreshLocalMask();
}

/** A member joined or left the hero's band (from the wire); the hero becomes / stays the master. */
export function memberChanged(member: BandMember | null, netId: number): void {
  const me = Store.playerId ?? 0;
  const current = Band.band ?? { masterId: me, members: [] };
  const next = member ? withMember(current, member) : withoutMember(current, netId);
  runInAction(() => {
    Band.band = next.members.length ? next : null;
    Band.role = next.members.length ? 'master' : 'solo';
  });
  refreshLocalMask();
  transport.state(masterMask(next), next.members);
}

/** The band state pushed by a master the hero follows. */
export function masterStateChanged(masterId: number, members: BandMember[]): void {
  if (Band.role !== 'member' || Band.band?.masterId !== masterId) return;
  runInAction(() => {
    Band.band = { masterId, members };
  });
  refreshLocalMask();
}

// ---- 5. remote performers --------------------------------------------------

type Remote = {
  netId: number;
  /** The scene entity, once it exists here: the pose and the exact position. */
  entity: NetEntity | null;
  /** Whether the pose was started on the entity (it has the player rig). */
  posed: boolean;
  instrument: InstrumentId;
  receiver: Receiver;
  band: BandState;
  /** Batches taken so far; the first one is announced on the console. */
  batches: number;
};

const remotes = new Map<number, Remote>();

/** Performers heard before their start landed here, each noted once. */
const orphans = new Set<number>();
let remoteTimer: ReturnType<typeof setInterval> | null = null;

const keyOf = (netId: number) => `net:${netId}`;

/**
 * Where a remote performer stands, for the ear. A posed player is placed by
 * `BandSystem` each frame; a skinned player and one whose entity has not
 * arrived yet are placed here - at the entity if we have it, else beside the
 * hero so the notes are heard rather than lost at the map origin.
 */
function placeRemote(remote: Remote): void {
  const e = remote.entity;
  if (e) {
    if (e.performing) return;
    setPerformerPosition(keyOf(remote.netId), e.transform.pos.x, e.transform.pos.z);
    return;
  }
  const hero = heroEntity();
  if (hero) setPerformerPosition(keyOf(remote.netId), hero.transform.pos.x, hero.transform.pos.z);
}

/**
 * Bind a remote to its scene entity once it exists: a start can arrive before
 * this client has drawn the performer (the proxy relays it the instant the
 * tracker sees them in scope), and a batch must never be lost waiting. The
 * audio always plays by net id; only the pose and the exact position wait.
 */
function resolveEntity(remote: Remote): void {
  const world = Store.world;
  let entity = remote.entity;
  if (!entity || entity.objOutOfScope) {
    entity = world?.getByNetId(remote.netId) ?? null;
    if (entity?.objOutOfScope) entity = null;
    remote.entity = entity;
  }
  // The pose (the instrument in hand) is attached once, the first time the
  // entity is here with a player rig - now if it was in view at the start,
  // else the tick it arrives. A skinned player has no rig and stays sound.
  if (entity && !remote.posed && entity.playerAnimation && world) {
    startPerforming(world, entity as never, remote.instrument, false);
    remote.posed = true;
    console.info(`band: #${remote.netId} in view, holding the ${remote.instrument}`);
  }
  placeRemote(remote);
}

export function remoteStart(netId: number, instrument: InstrumentId, entity: NetEntity | null): void {
  const world = Store.world;
  if (!world) return;
  const existing = remotes.get(netId);
  if (existing && existing.instrument === instrument) return;
  if (existing) remoteStop(netId);

  const band: BandState = { masterId: netId, members: [] };
  const remote: Remote = {
    netId,
    entity: entity && !entity.objOutOfScope ? entity : null,
    posed: false,
    instrument,
    band,
    batches: 0,
    receiver: new Receiver(
      { now: audioNow },
      {
        schedule: (ev, when) => voiceRemote(remote, ev, when),
        allOff: () => silenceRemote(remote),
      },
      { delaySec: receiverDelay(NetStats.roundTripMs) }
    ),
  };
  remotes.set(netId, remote);
  void ensureBank(instrument);
  // The pose (a player rig) is attached now if the entity is here, else the
  // moment it arrives; a skinned player never gets one.
  resolveEntity(remote);
  if (!remote.entity) console.info(`band: #${netId} starts playing, entity not in view yet - sound only for now`);
  if (!remoteTimer) {
    remoteTimer = setInterval(() => {
      for (const r of remotes.values()) {
        r.receiver.tick();
        resolveEntity(r);
      }
    }, REMOTE_TICK_MS);
  }
}

export function remoteBatch(netId: number, seq: number, baseMs: number, events: BatchEvent[]): void {
  const remote = remotes.get(netId);
  if (!remote) {
    // No start here yet: the performer just entered scope and the proxy's
    // cached start is on its way. Drop this batch; the next arrives with it.
    if (!orphans.has(netId)) {
      orphans.add(netId);
      console.warn(`band: notes from #${netId} before its start, waiting`);
    }
    return;
  }
  orphans.delete(netId);
  if (remote.batches++ === 0) {
    console.info(
      `band: first notes from #${netId}: ${events.length} events, ${(baseMs / 1000).toFixed(1)} s into their song`
    );
  }
  remote.receiver.onBatch(seq, baseMs, events);
}

export function remoteStop(netId: number): void {
  const remote = remotes.get(netId);
  if (!remote) return;
  remotes.delete(netId);
  remote.receiver.stop();
  const world = Store.world;
  if (world && remote.entity) stopPerforming(world, remote.entity);
  // Members were doubling this master; they are performers of their own and
  // keep their keys, only their doubling stops.
  silenceRemote(remote);
  dropPerformer(keyOf(netId));
  if (membership?.masterId === netId) {
    // The master stopped (the proxy already dropped the band): solo again,
    // with the instrument still in hand.
    membership = null;
    runInAction(() => {
      Band.role = 'solo';
      Band.band = null;
    });
    refreshLocalMask();
  }
  if (remotes.size === 0 && remoteTimer) {
    clearInterval(remoteTimer);
    remoteTimer = null;
  }
}

/** Band membership seen from the wire, for a remote master. */
export function remoteBandState(masterId: number, members: BandMember[]): void {
  const remote = remotes.get(masterId);
  if (!remote) return;
  remote.band = { masterId, members };
  for (const m of members) void ensureBank(m.instrument);
}

/** Who is performing in view of this client, with their instrument. */
export function remotePerformers(): { netId: number; instrument: InstrumentId }[] {
  return Array.from(remotes.values(), r => ({ netId: r.netId, instrument: r.instrument }));
}

/**
 * A note off a remote master's stream, voiced by everyone in that band who
 * holds the channel: the master on their instrument where they stand, each
 * member on theirs where they stand - and the hero, when a member of this
 * band, on the hero's own key, which is never attenuated.
 *
 * A member is found by the id the master lists them under, which is the id
 * their own start arrived here under; one that is not a performer here yet
 * has nowhere to be placed and waits. The hero is never in that lookup: the
 * master lists the hero by an id this client does not know itself by, so the
 * hero's share comes from the local join record.
 */
function voiceRemote(remote: Remote, ev: BatchEvent, when: number): void {
  const channel = ev.status & 0x0f;
  voiceOn(keyOf(remote.netId), remote.instrument, ev, when, remote.entity);
  for (const m of remote.band.members) {
    const member = remotes.get(m.netId);
    if (!member || !hasChannel(m.channelMask, channel)) continue;
    voiceOn(keyOf(m.netId), m.instrument, ev, when, member.entity);
  }
  if (membership?.masterId === remote.netId && hasChannel(membership.channelMask, channel)) {
    voiceOn(HERO_KEY, membership.instrument, ev, when, heroEntity());
  }
}

/** Every voice of the master's stream off: the master's, each member's doubling, the hero's share. */
function silenceRemote(remote: Remote): void {
  allNotesOff(keyOf(remote.netId));
  for (const m of remote.band.members) if (remotes.has(m.netId)) allNotesOff(keyOf(m.netId));
  if (membership?.masterId === remote.netId) allNotesOff(HERO_KEY);
}

/** Map change or logout: every stream gone, the hero's instrument away. */
export function resetBand(): void {
  for (const netId of Array.from(remotes.keys())) remoteStop(netId);
  if (Band.instrument) {
    const hero = heroEntity();
    const world = Store.world;
    if (hero && world) stopPerforming(world, hero);
    performanceEnded();
  }
}

EventBus.on('requestWarp', () => resetBand());

// Dev hook for the harness and the console: `window.__band.play('/dev/band/scale.mid')`.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __band: unknown }).__band = {
    state: Band,
    takeOut: takeOutInstrument,
    putAway: putAwayInstrument,
    async play(url: string) {
      const res = await fetch(url);
      const blob = await res.blob();
      await loadMidiFile(new File([blob], url.split('/').pop() ?? 'song.mid'));
      await playSong();
    },
    pause: pauseSong,
    stop: stopPlaying,
    loop: setLoop,
    join: joinBand,
    leave: leaveBand,
    window: toggleInstrumentWindow,
    // The app's own sampler instance: a probe's dynamic import after an HMR
    // update would get a fresh copy with nothing in it.
    voices: instrumentVoices,
    ready: contextReady,
  };
}

export { instrumentById };
