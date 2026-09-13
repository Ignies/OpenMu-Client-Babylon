/**
 * The maths behind the event schedule rows, on its own so it can be tested
 * without the client: `MiniGameOpeningState` minutes into a moment on the
 * shared clock, the clock that moment prints, and when to ask again.
 * `schedule.ts` owns the state and does the asking.
 */

/** The floor: one request per event per 30 s, whatever else asks. */
export const MIN_REQUEST_MS = 30_000;
/** Nothing known yet, or the server has no timetable: ask again soon. */
export const POLL_UNKNOWN_MS = 30_000;
/** The gate is open: the row only has to notice it closing again. */
export const POLL_OPEN_MS = 60_000;
/** A countdown is running: nothing can change it, so drift slowly. */
export const POLL_KNOWN_MS = 5 * 60_000;

export type EventScheduleEntry = {
  /** Epoch ms on the shared clock, or null while the server has not said. */
  readonly opensAtServerMs: number | null;
  readonly open: boolean;
};

export const UNKNOWN_ENTRY: EventScheduleEntry = { opensAtServerMs: null, open: false };

/**
 * `RemainingEnteringTimeMinutes` into a moment on the shared clock. The
 * server rounds the wait up to whole minutes and sends 0xFF (0xFFFF for
 * Chaos Castle, whose answer is two bytes wide) when it has no timetable
 * for the event at all.
 */
export function resolveOpening(
  minutes: number,
  wide: boolean,
  nowMs: number
): EventScheduleEntry {
  const unknown = wide ? 0xffff : 0xff;
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= unknown) return UNKNOWN_ENTRY;
  if (minutes === 0) return { opensAtServerMs: nowMs, open: true };
  return { opensAtServerMs: nowMs + minutes * 60_000, open: false };
}

/** Whole seconds until the gate opens; null when open or unknown. */
export function countdownSeconds(entry: EventScheduleEntry, nowMs: number): number | null {
  if (entry.open || entry.opensAtServerMs === null) return null;
  return Math.max(0, Math.ceil((entry.opensAtServerMs - nowMs) / 1000));
}

/** When the next request for this event may go out, given its last answer. */
export function nextPollAt(entry: EventScheduleEntry, nowMs: number): number {
  if (entry.open) return nowMs + POLL_OPEN_MS;
  if (entry.opensAtServerMs === null) return nowMs + POLL_UNKNOWN_MS;
  // Back off, but never past the moment the countdown hits zero.
  const backOff = Math.min(nowMs + POLL_KNOWN_MS, entry.opensAtServerMs);
  return Math.max(backOff, nowMs + MIN_REQUEST_MS);
}
