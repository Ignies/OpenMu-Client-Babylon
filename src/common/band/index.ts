import { observable, runInAction } from 'mobx';
import type { TextKey } from '../../i18n';
import type { NetEntity } from '../../ecs/world';
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
} from '../../sound/instruments';
import { MidiFileError, parseMidi, type MidiEvent, type ParsedMidi } from './midiFile';
import { Sequencer, type BatchEvent } from './sequencer';
import { Receiver, receiverDelay } from './receiver';
import {
  ALL_CHANNELS,
  PERCUSSION_CHANNEL,
  canRender,
  masterMask,
  ownersOf,
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

/** The hero's own notes: every channel the hero voices, at the hero's key. */
function voiceLocal(ev: MidiEvent, when: number): void {
  const instrument = Band.instrument;
  if (!instrument) return;
  const channel = ev.status & 0x0f;
  const kind = ev.status & 0xf0;
  if (kind === 0x90 && ev.d2 > 0) {
    noteOn(HERO_KEY, instrument, channel, ev.d1, ev.d2, when);
    const hero = heroEntity();
    if (hero) queueHit(hero, when);
  } else if (kind === 0x80 || kind === 0x90) {
    noteOff(HERO_KEY, channel, ev.d1, when);
  } else if (kind === 0xb0) {
    allNotesOff(HERO_KEY);
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
  runInAction(() => {
    Band.role = 'member';
    Band.band = { masterId, members: [{ netId: Store.playerId ?? 0, instrument, channelMask }] };
  });
  refreshLocalMask();
}

export function leaveBand(): void {
  if (Band.role === 'member') transport.leave();
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
  entity: NetEntity;
  instrument: InstrumentId;
  receiver: Receiver;
  band: BandState;
};

const remotes = new Map<number, Remote>();
let remoteTimer: ReturnType<typeof setInterval> | null = null;

const keyOf = (netId: number) => `net:${netId}`;

export function remoteStart(entity: NetEntity, instrument: InstrumentId): void {
  const world = Store.world;
  if (!world || !entity.playerAnimation) return;
  const netId = entity.netId;
  const existing = remotes.get(netId);
  if (existing && existing.instrument === instrument) return;
  if (existing) remoteStop(netId);

  startPerforming(world, entity as never, instrument, false);
  const band: BandState = { masterId: netId, members: [] };
  const remote: Remote = {
    entity,
    instrument,
    band,
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
  if (!remoteTimer) {
    remoteTimer = setInterval(() => {
      for (const r of remotes.values()) r.receiver.tick();
    }, REMOTE_TICK_MS);
  }
}

export function remoteBatch(netId: number, seq: number, baseMs: number, events: BatchEvent[]): void {
  remotes.get(netId)?.receiver.onBatch(seq, baseMs, events);
}

export function remoteStop(netId: number): void {
  const remote = remotes.get(netId);
  if (!remote) return;
  remotes.delete(netId);
  remote.receiver.stop();
  const world = Store.world;
  if (world) stopPerforming(world, remote.entity);
  // Members were doubling this master; their own performing state stays.
  const self = Store.playerId ?? -1;
  for (const member of remote.band.members) {
    if (member.netId !== self) dropPerformer(keyOf(member.netId));
  }
  dropPerformer(keyOf(netId));
  if (Band.role === 'member' && Band.band?.masterId === netId) {
    // The master stopped (the proxy already dropped the band): solo again,
    // with the instrument still in hand.
    allNotesOff(HERO_KEY);
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

export function isRemotePerformer(netId: number): boolean {
  return remotes.has(netId);
}

/**
 * A note off a remote master's stream, voiced by everyone in that band who
 * holds the channel: the master on their instrument where they stand, each
 * member on theirs where they stand - and the hero, when a member, on the
 * hero's own key, which is never attenuated.
 */
function voiceRemote(remote: Remote, ev: BatchEvent, when: number): void {
  const channel = ev.status & 0x0f;
  const kind = ev.status & 0xf0;
  const self = Store.playerId ?? -1;
  for (const owner of ownersOf(remote.band, channel)) {
    const member = owner === remote.band.masterId ? null : remote.band.members.find(m => m.netId === owner);
    const instrument = member ? member.instrument : remote.instrument;
    if (!canRender(instrument, channel)) continue;
    const key = owner === self ? HERO_KEY : keyOf(owner);
    if (kind === 0x90 && ev.d2 > 0) {
      noteOn(key, instrument, channel, ev.d1, ev.d2, when);
      const entity =
        owner === self ? heroEntity() : owner === remote.entity.netId ? remote.entity : Store.world?.getByNetId(owner);
      if (entity) queueHit(entity, when);
    } else if (kind === 0x80 || kind === 0x90) {
      noteOff(key, channel, ev.d1, when);
    } else if (kind === 0xb0) {
      allNotesOff(key);
    }
  }
}

function silenceRemote(remote: Remote): void {
  const self = Store.playerId ?? -1;
  allNotesOff(keyOf(remote.entity.netId));
  for (const m of remote.band.members) allNotesOff(m.netId === self ? HERO_KEY : keyOf(m.netId));
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
