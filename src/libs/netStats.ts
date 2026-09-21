/**
 * What the game socket costs the frame.
 *
 * Packets are drained synchronously inside the WebSocket `message` event
 * (`libs/sockets/createSocket.ts`), with no budget: everything that arrived
 * is parsed and handed to its handler before the browser is given the thread
 * back. That is fine at a steady trickle and is not fine when a burst
 * arrives at once - a server catching up after a stall delivers a second's
 * worth of movement in one message, and the whole burst is paid for between
 * two animation frames, which the player sees as a frame-rate drop rather
 * than as lag.
 *
 * So "is the server hurting my frame rate" is answerable, but only with a
 * number: how long the socket held the thread, not how much data arrived.
 * That is what this counts, for the overlay to print.
 *
 * Store-free and engine-free on purpose, so it can be unit tested and so the
 * socket does not have to reach into rendering to report.
 */

/** The window the rates are averaged over. */
const WINDOW_MS = 1000;

/** How long a single drain has to take before it is worth naming. */
export const NET_BURST_MS = 4;

type Window = {
  /** When this window started. */
  since: number;
  /**
   * When it was closed. A window closes on the first message to arrive after
   * its second is up, which can be well after it - a quiet stretch closes a
   * window late - so the rates divide by the span it actually covered rather
   * than by the nominal second.
   */
  until: number;
  messages: number;
  bytes: number;
  /** Total time inside the message handler. */
  ms: number;
  /** The worst single drain in the window. */
  worstMs: number;
  /** Drains that ran longer than `NET_BURST_MS`. */
  bursts: number;
};

export type NetStats = {
  /** Messages a second. */
  rate: number;
  /** Kilobytes a second. */
  kbps: number;
  /** Milliseconds a second spent draining the socket. */
  msPerSecond: number;
  /** The worst single drain in the last full window. */
  worstMs: number;
  bursts: number;
  /** False until a packet has ever arrived: offline, or not connected yet. */
  live: boolean;
};

function empty(since: number): Window {
  return { since, until: since, messages: 0, bytes: 0, ms: 0, worstMs: 0, bursts: 0 };
}

let current = empty(0);
let last: Window | null = null;
let everSaw = false;

/** Wall clock, injectable so the test does not have to sleep. */
let now: () => number = () => performance.now();

export function setNetClock(fn: () => number): void {
  now = fn;
}

export function resetNetStats(): void {
  current = empty(now());
  last = null;
  everSaw = false;
}

/**
 * One message drained. `bytes` is what arrived, `ms` is how long the thread
 * was held parsing and dispatching it.
 */
export function recordSocketDrain(bytes: number, ms: number): void {
  const t = now();

  everSaw = true;

  if (t - current.since >= WINDOW_MS) {
    current.until = t;
    last = current;
    current = empty(t);
  }

  current.messages++;
  current.bytes += bytes;
  current.ms += ms;
  if (ms > current.worstMs) current.worstMs = ms;
  if (ms >= NET_BURST_MS) current.bursts++;
}

/**
 * The last full window, so the numbers hold still long enough to read. Falls
 * back to the window in progress until the first one closes.
 */
export function netStats(): NetStats {
  const w = last ?? current;
  const span = Math.max(1, (last ? w.until : now()) - w.since) / 1000;

  return {
    rate: w.messages / span,
    kbps: w.bytes / 1024 / span,
    msPerSecond: w.ms / span,
    worstMs: w.worstMs,
    bursts: w.bursts,
    live: everSaw,
  };
}
