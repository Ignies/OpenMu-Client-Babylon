/**
 * How the HUD prints its numbers. Pure functions with no store behind them,
 * so the session panel, the experience tooltip and the performance readout
 * all spell the same figure the same way.
 */

/** A span as the session panel prints it: `2:10:04`, or `10:04` under an hour. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (v: number) => String(v).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** `0.374231` -> `37.42 %`. */
export function formatExpPercent(fraction: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  return `${(clamped * 100).toFixed(2)} %`;
}

/** `1234567 / 3300000` -> `1,234,567 / 3,300,000`. */
export function formatExpProgress(exp: number, next: number): string {
  // Fixed grouping, not the machine locale: the panel beside it groups the
  // same way, and a test must not read differently on a Spanish box.
  const group = (value: number) =>
    Math.max(0, Math.floor(value)).toLocaleString('en-US');

  return `${group(exp)} / ${group(next)}`;
}

/** The time to the next level, or a dash while no rate is known yet. */
export function formatTimeToLevel(ms: number | null): string {
  return ms === null ? '-' : formatDuration(ms);
}

/** The round trip in whole milliseconds, or a dash before the first sample. */
export function formatRoundTrip(ms: number | null): string {
  return ms === null ? '-' : `${Math.round(ms)} ms`;
}
