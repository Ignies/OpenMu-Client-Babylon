import { observable, runInAction } from 'mobx';
import { GameOptions } from '../common/gameOptions';
import { devQueryNumbers } from '../common/devSeams';
import { serverNow } from '../common/serverTime';
import { MiniGameOpeningStateRequestPacket } from '../common/packets/ClientToServerPackets';
import { Store, UIState } from '../store';
import type { EventLayer } from './layer';
import { OPENING_STATE_GAME } from './recipes';
import {
  MIN_REQUEST_MS,
  UNKNOWN_ENTRY,
  countdownSeconds,
  nextPollAt,
  resolveOpening,
  type EventScheduleEntry,
} from './scheduleClock';

export type { EventScheduleEntry } from './scheduleClock';

/**
 * When each event next opens, on the one clock (`common/serverTime.ts`).
 *
 * The only writer of that state. It is fed by the three
 * `MiniGameOpeningState` handlers (`bloodCastle.ts`, `devilSquare.ts`,
 * `chaosCastle.ts`), which call `takeOpeningState` before they word their
 * own notice, and it keeps the answer fresh by re-sending the very request
 * a ticket sends - `MiniGameOpeningStateRequest`, nothing new on the wire.
 * OpenMU answers it from `MiniGameOpeningStateRequestHandlerPlugIn` with no
 * NPC dialog open: the only thing it asks for is a selected character.
 *
 * Read by the HUD rows in `ui/pages/worldPage/components/events`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Display order of the rows, and the only three events OpenMU runs. */
export const EVENT_SCHEDULE_KEYS = ['bloodCastle', 'devilSquare', 'chaosCastle'] as const;

export type EventScheduleKey = (typeof EVENT_SCHEDULE_KEYS)[number];

const GAME_OF: Readonly<Record<EventScheduleKey, number>> = {
  bloodCastle: OPENING_STATE_GAME.bloodCastle,
  devilSquare: OPENING_STATE_GAME.devilSquare,
  chaosCastle: OPENING_STATE_GAME.chaosCastle,
};

/**
 * Chaos Castle is the one answer that carries the minutes as two bytes
 * (`ShowMiniGameOpeningStateViewPlugIn`), so its "no timetable" sentinel is
 * 0xFFFF where the other two send 0xFF.
 */
const WIDE_MINUTES: Readonly<Record<EventScheduleKey, boolean>> = {
  bloodCastle: false,
  devilSquare: false,
  chaosCastle: true,
};

/**
 * `GetSuitableMiniGameDefinition` falls back to the definition whose
 * `GameLevel` equals the level asked for when the hero is in no level range
 * at all. Every event has a level 1 definition and none has a level 0, so 1
 * is the value that always resolves - a 0 would leave Chaos Castle with no
 * definition and throw on the server.
 */
const POLL_EVENT_LEVEL = 1;

/** An unanswered request is written off after this and may be retried. */
const ANSWER_TIMEOUT_MS = 15_000;
/**
 * A server that never answers for an event (the periodic task disabled) is
 * left alone after this many tries; a warp or a click on the row retries.
 */
const MAX_SILENT_POLLS = 3;

// ---- 2. state + readers ----------------------------------------------------

export type EventScheduleRow = {
  readonly key: EventScheduleKey;
  readonly open: boolean;
  /** Answered, but no nearer than the 255 minutes one byte can hold. */
  readonly far: boolean;
  /** Whole seconds until it opens, or null when open / far off / not known. */
  readonly seconds: number | null;
};

const entries: Record<EventScheduleKey, EventScheduleEntry> = {
  bloodCastle: UNKNOWN_ENTRY,
  devilSquare: UNKNOWN_ENTRY,
  chaosCastle: UNKNOWN_ENTRY,
};

type PollState = {
  nextPollAtMs: number;
  lastRequestMs: number;
  /** Set while a request of ours is out; null when nothing is awaited. */
  sentAtMs: number | null;
  silentPolls: number;
  /** A ticket or a row click is waiting for the answer: it gets the notice. */
  manual: boolean;
};

const polls: Record<EventScheduleKey, PollState> = {
  bloodCastle: fresh(),
  devilSquare: fresh(),
  chaosCastle: fresh(),
};

function fresh(): PollState {
  return {
    nextPollAtMs: 0,
    lastRequestMs: Number.NEGATIVE_INFINITY,
    sentAtMs: null,
    silentPolls: 0,
    manual: false,
  };
}

/** What the HUD draws, one row per event, in `EVENT_SCHEDULE_KEYS` order. */
const state = observable(
  {
    rows: EVENT_SCHEDULE_KEYS.map(key => ({
      key,
      open: false,
      far: false,
      seconds: null,
    })) as readonly EventScheduleRow[],
  },
  {},
  { deep: false }
);

export function eventSchedule(): readonly EventScheduleRow[] {
  return state.rows;
}

function keyOfGame(game: number): EventScheduleKey | null {
  for (const key of EVENT_SCHEDULE_KEYS) {
    if (GAME_OF[key] === game) return key;
  }
  return null;
}

/**
 * A `MiniGameOpeningState` answer, before its handler words it. Returns true
 * when it answers a poll of ours, so the handler shows nothing.
 */
export function takeOpeningState(game: number, minutes: number): boolean {
  const key = keyOfGame(game);
  if (!key) return false;

  const now = serverNow();
  const poll = polls[key];
  const ours = poll.sentAtMs !== null && !poll.manual;

  entries[key] = resolveOpening(minutes, WIDE_MINUTES[key], now);
  poll.sentAtMs = null;
  poll.manual = false;
  poll.silentPolls = 0;
  poll.nextPollAtMs = nextPollAt(entries[key], now);
  publish(now);

  return ours;
}

/** A ticket or a row click sent the request: the answer is the player's. */
export function noteOpeningStateRequest(game: number): void {
  const key = keyOfGame(game);
  if (!key) return;
  const poll = polls[key];
  poll.manual = true;
  poll.lastRequestMs = serverNow();
  poll.sentAtMs = null;
}

/** The row was clicked while nothing is known: ask again as soon as allowed. */
export function refreshEventSchedule(key: EventScheduleKey): void {
  const poll = polls[key];
  poll.silentPolls = 0;
  poll.sentAtMs = null;
  poll.nextPollAtMs = 0;
}

// ---- 3. the poll -----------------------------------------------------------

function publish(nowMs: number): void {
  const rows = EVENT_SCHEDULE_KEYS.map(key => ({
    key,
    open: entries[key].open,
    far: entries[key].far,
    seconds: countdownSeconds(entries[key], nowMs),
  }));
  const same = rows.every((row, i) => {
    const old = state.rows[i];
    return old.open === row.open && old.far === row.far && old.seconds === row.seconds;
  });
  if (same) return;
  runInAction(() => {
    state.rows = rows;
  });
}

function send(key: EventScheduleKey, nowMs: number): void {
  const packet = MiniGameOpeningStateRequestPacket.createPacket();
  packet.EventType = GAME_OF[key];
  packet.EventLevel = POLL_EVENT_LEVEL;
  Store.sendToGS(packet.buffer);

  const poll = polls[key];
  poll.lastRequestMs = nowMs;
  poll.sentAtMs = nowMs;
  poll.silentPolls += 1;
  // A lost answer must not wedge the row: the floor is the only guard.
  poll.nextPollAtMs = nowMs + MIN_REQUEST_MS;
}

function pollable(): boolean {
  return (
    GameOptions.eventTimers &&
    !Store.isOffline &&
    Store.uiState === UIState.World &&
    Store.world !== null
  );
}

/** The rows print whole seconds, so nothing is rebuilt in between. */
let publishedSecond = 0;

function tick(): void {
  if (!GameOptions.eventTimers) return;

  const now = serverNow();
  const second = Math.floor(now / 1000);
  if (second !== publishedSecond) {
    publishedSecond = second;
    publish(now);
  }
  if (!pollable()) return;

  for (const key of EVENT_SCHEDULE_KEYS) {
    const poll = polls[key];
    if (poll.sentAtMs !== null && now - poll.sentAtMs < ANSWER_TIMEOUT_MS) continue;
    if (poll.silentPolls >= MAX_SILENT_POLLS) continue;
    if (now < poll.nextPollAtMs) continue;
    if (now - poll.lastRequestMs < MIN_REQUEST_MS) continue;
    send(key, now);
  }
}

/** A warp: ask again as soon as the 30 s floor allows, on every event. */
function reset(): void {
  for (const key of EVENT_SCHEDULE_KEYS) {
    const poll = polls[key];
    poll.nextPollAtMs = 0;
    poll.sentAtMs = null;
    poll.silentPolls = 0;
  }
}

// Dev only (`?events=<blood>,<devil>,<chaos>` in minutes): stage the rows
// with no server. `devQueryNumbers` answers null in a production build.
const seeded = devQueryNumbers('events', EVENT_SCHEDULE_KEYS.length);
if (seeded) {
  const now = serverNow();
  EVENT_SCHEDULE_KEYS.forEach((key, i) => {
    entries[key] = resolveOpening(seeded[i], WIDE_MINUTES[key], now);
    polls[key].silentPolls = MAX_SILENT_POLLS;
  });
  publish(now);
}

// ---- 4. the layer ----------------------------------------------------------

export const scheduleLayer: EventLayer = {
  name: 'schedule',
  update: () => tick(),
  reset,
  state: () => ({ open: false, running: false }),
};
