/**
 * The game's logic while the browser gives no frames (a hidden tab, a minimised window). A windowed
 * original runs its scene loop unfocused or minimised too (Winmain.cpp:1495), so the hero keeps
 * walking and the MU Helper keeps hunting. Only the logic runs here, never the draw: boot.tsx hands
 * in a step that skips `scene.render`. A worker ticks (its timers keep their rate in a hidden tab).
 */

/** Frames this far apart mean the browser stopped giving them. */
const STALLED_MS = 250;

let lastFrameAt = performance.now();

/** Called from each drawn (animation-frame) frame. */
export function noteDrawnFrame(now: number): void {
  lastFrameAt = now;
}

/** One worker tick: runs `step` once the last drawn frame is `STALLED_MS` old. */
export function backgroundTick(now: number, step: (now: number) => void): void {
  if (now - lastFrameAt >= STALLED_MS) step(now);
}

/** Starts the worker; `step` runs once per tick while the browser gives no frames. */
export function installBackgroundTick(step: (now: number) => void): void {
  if (typeof Worker === 'undefined') return;
  let worker: Worker;
  try {
    worker = new Worker(new URL('./backgroundTick.worker.ts', import.meta.url), { type: 'module', name: 'background-tick' });
  } catch {
    return;
  }
  worker.onmessage = () => backgroundTick(performance.now(), step);
}
