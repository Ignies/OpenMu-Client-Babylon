/// <reference lib="webworker" />

// The tick of app/backgroundTick.ts: a dedicated worker's timers keep their rate in a hidden tab,
// where the page's frames stop and its own timers slow down. 40 ms is the original's 25 Hz tick.
const TICK_MS = 40;

setInterval(() => postMessage(0), TICK_MS);
