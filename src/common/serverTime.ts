/**
 * The one clock every client agrees on.
 *
 * Anything that has to look the same on two screens at the same moment —
 * ambient weather episodes, timed world events — must be a pure function of
 * `serverNow()` rather than of `Math.random()` or a per-client uptime, or two
 * players standing next to each other see different skies.
 *
 * The protocol carries no timestamp today (`WeatherStatusUpdate` pushes state,
 * not time), so the base is UTC wall time: NTP keeps desktops within a second
 * or two of each other, which is far tighter than the tens of seconds an
 * ambient episode lasts. `setServerTimeOffset` is the seam for the day a
 * server-stamped packet arrives — set it once from
 * `serverEpochMs - Date.now()` and every consumer follows without changing.
 */

let offsetMs = 0;

/** Re-anchor the shared clock: `offset = serverEpochMs - Date.now()`. */
export function setServerTimeOffset(ms: number): void {
  offsetMs = Number.isFinite(ms) ? ms : 0;
}

export function getServerTimeOffset(): number {
  return offsetMs;
}

/** Epoch milliseconds on the shared clock. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
