/**
 * The maths behind the event schedule rows, on its own so it can be tested
 * without the client: `MiniGameOpeningState` minutes into a moment on the
 * shared clock, the text that moment prints, and when to ask again.
 * `schedule.ts` owns the state and does the asking.
 */

import { EVENT_TEXT } from './recipes';

/** The floor: one request per event per 30 s, whatever else asks. */
export const MIN_REQUEST_MS = 30_000;
/** Nothing known yet, or the server has no timetable: ask again soon. */
export const POLL_UNKNOWN_MS = 30_000;
/** The gate is open: the row only has to notice it closing again. */
export const POLL_OPEN_MS = 60_000;
/** A countdown is running: nothing can change it, so drift slowly. */
export const POLL_KNOWN_MS = 5 * 60_000;

export type EventScheduleEntry = {
  /** Epoch ms on the shared clock, or null while there is no moment to print. */
  readonly opensAtServerMs: number | null;
  readonly open: boolean;
  /** Answered, but the minutes hit the ceiling: it opens further off than that. */
  readonly far: boolean;
};

export const UNKNOWN_ENTRY: EventScheduleEntry = {
  opensAtServerMs: null,
  open: false,
  far: false,
};

/** Answered with the top value a one-byte figure can hold: 255 minutes or more. */
export const FAR_ENTRY: EventScheduleEntry = {
  opensAtServerMs: null,
  open: false,
  far: true,
};

/**
 * `RemainingEnteringTimeMinutes` into a moment on the shared clock. The
 * server rounds the wait up to whole minutes and writes its "no timetable"
 * value as 0xFFFF, which Blood Castle and Devil Square then send truncated
 * to one byte: for them 255 is both "no timetable" and any wait of 255
 * minutes or more, so it is read as the long wait rather than as silence.
 * Chaos Castle's answer is two bytes wide and has no such ambiguity.
 */
export function resolveOpening(
  minutes: number,
  wide: boolean,
  nowMs: number
): EventScheduleEntry {
  const ceiling = wide ? 0xffff : 0xff;
  if (!Number.isFinite(minutes) || minutes < 0) return UNKNOWN_ENTRY;
  if (minutes >= ceiling) return wide ? UNKNOWN_ENTRY : FAR_ENTRY;
  if (minutes === 0) return { opensAtServerMs: nowMs, open: true, far: false };
  return { opensAtServerMs: nowMs + minutes * 60_000, open: false, far: false };
}

/** Whole seconds until the gate opens; null when open, far off or unknown. */
export function countdownSeconds(entry: EventScheduleEntry, nowMs: number): number | null {
  if (entry.open || entry.opensAtServerMs === null) return null;
  return Math.max(0, Math.ceil((entry.opensAtServerMs - nowMs) / 1000));
}

/** `%.2d:%.2d` of the seconds left; the same clock the timer figure prints. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** What one row prints, in the order the states rule each other out. */
export function rowText(row: {
  open: boolean;
  far: boolean;
  seconds: number | null;
}): string {
  if (row.open) return EVENT_TEXT.timerOpen;
  if (row.far) return EVENT_TEXT.timerFarOff;
  if (row.seconds === null) return '--:--';
  return clockText(row.seconds);
}

/** When the next request for this event may go out, given its last answer. */
export function nextPollAt(entry: EventScheduleEntry, nowMs: number): number {
  if (entry.open) return nowMs + POLL_OPEN_MS;
  // Far off is an answer like any other, so it backs off the same way: the
  // row turns into a real countdown as soon as the figure drops under 255.
  if (entry.far) return nowMs + POLL_KNOWN_MS;
  if (entry.opensAtServerMs === null) return nowMs + POLL_UNKNOWN_MS;
  // Back off, but never past the moment the countdown hits zero.
  const backOff = Math.min(nowMs + POLL_KNOWN_MS, entry.opensAtServerMs);
  return Math.max(backOff, nowMs + MIN_REQUEST_MS);
}
