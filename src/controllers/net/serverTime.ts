/**
 * The one clock every client agrees on.
 *
 * Anything that has to look the same on two screens at the same moment -
 * ambient weather episodes, timed world events - must be a pure function of
 * `serverNow()` rather than of `Math.random()` or a per-client uptime, or two
 * players standing next to each other see different skies.
 *
 * The protocol carries no timestamp today (`WeatherStatusUpdate` pushes state,
 * not time), so the base is UTC wall time: NTP keeps desktops within a second
 * or two of each other, which is far tighter than the tens of seconds an
 * ambient episode lasts. Once a server-stamped packet arrives, add its offset
 * here and every consumer follows without changing.
 */

/** Epoch milliseconds on the shared clock. */
export function serverNow(): number {
  return Date.now();
}
