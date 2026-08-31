/**
 * What the proxy's weather schedule actually does, measured.
 *
 * `proxy/weather.ts` is a pure function of wall-clock time, so its climate is
 * a thing you can measure rather than guess at: this sweeps a year of it at
 * one-minute resolution and prints the numbers its tuning comments quote —
 * how often it rains, how the days divide up, how long a shower lasts, and
 * the odds that a player who logs in for half an hour sees any rain at all.
 *
 * Run it after touching `DRY_BELOW`, `MAX_SLOT_CHANCE` or `WETNESS_CURVE`;
 * those three decide the whole climate and nothing else in the project will
 * tell you when one of them has gone wrong.
 *
 *   bun run tools/weatherStats.ts [days] [sessionMinutes]
 */
import { weatherAt } from '../proxy/weather';

const DAYS = Number(process.argv[2] ?? 365);
const SESSION_MINUTES = Number(process.argv[3] ?? 30);

/** Midnight UTC on 1 Jan 2026 — an arbitrary but fixed window to sweep. */
const START = Date.UTC(2026, 0, 1);
const MINUTE = 60_000;

const wetAt: boolean[] = [];
const intensity: number[] = [];

for (let m = 0; m < DAYS * 1440; m++) {
  const w = weatherAt(START + m * MINUTE);
  wetAt.push(w.kind !== 0);
  intensity.push(w.variation);
}

const wetMinutes = wetAt.reduce((n, w) => n + (w ? 1 : 0), 0);

// Days, by how much of them was wet.
let dry = 0;
let showery = 0;
let wet = 0;
let soaked = 0;

for (let d = 0; d < DAYS; d++) {
  let n = 0;
  for (let m = 0; m < 1440; m++) if (wetAt[d * 1440 + m]) n++;
  const share = n / 1440;
  if (share < 0.005) dry++;
  else if (share < 0.15) showery++;
  else if (share < 0.4) wet++;
  else soaked++;
}

// Showers: a run of wet minutes, start to finish.
const showers: number[] = [];
let run = 0;
for (const w of wetAt) {
  if (w) run++;
  else if (run > 0) {
    showers.push(run);
    run = 0;
  }
}
if (run > 0) showers.push(run);

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.floor(s.length / 2)];
};

// The number that matters most: does a player who logs in at a random moment
// for one session ever see rain? Every possible session start, not a sample.
let sessionsWithRain = 0;
const sessions = wetAt.length - SESSION_MINUTES;
for (let m = 0; m < sessions; m++) {
  for (let k = 0; k < SESSION_MINUTES; k++) {
    if (wetAt[m + k]) {
      sessionsWithRain++;
      break;
    }
  }
}

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)} %`;
const peaks = showers.length;

console.log(`weather schedule over ${DAYS} days`);
console.log(`  rain in the sky      ${pct(wetMinutes, wetAt.length)} of all minutes`);
console.log(
  `  days                 ${pct(dry, DAYS)} dry, ${pct(showery, DAYS)} showery, ` +
    `${pct(wet, DAYS)} wet, ${pct(soaked, DAYS)} soaked`
);
console.log(
  `  showers              ${peaks} in ${DAYS} days ` +
    `(one every ${(DAYS / Math.max(1, peaks)).toFixed(1)} days), ` +
    `median ${median(showers)} min, longest ${Math.max(0, ...showers)} min`
);
console.log(
  `  peak intensity       median ${median(intensity.filter(v => v > 0))}/15, ` +
    `max ${Math.max(...intensity)}/15`
);
console.log(
  `  a ${SESSION_MINUTES}-minute session  sees rain ${pct(sessionsWithRain, sessions)} of the time`
);
