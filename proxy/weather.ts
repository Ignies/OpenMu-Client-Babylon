/**
 * Server-side weather, pushed to every connected client as `WeatherStatusUpdate`.
 *
 * OpenMU has no weather system, so nothing ever sends 0x0F and the client's
 * rain slot can never become eligible on its own — the only map that rains is
 * Icarus, which overrides the packet entirely. The proxy is the natural place
 * to fill that in: it is the one process every client already talks through,
 * so a schedule computed here is authoritative and identical for everyone
 * without inventing a protocol.
 *
 * The schedule is a **pure function of wall-clock time**, not a random walk.
 * That is what makes it agree across clients that connect at different
 * moments, survive a proxy restart mid-shower, and be reproducible when
 * something looks wrong: given a timestamp you can always recompute what the
 * sky was doing. The hash and roll below are deliberately the same ones the
 * client uses for leaf gusts and snow squalls
 * (`client/src/weather/ambientSchedule.ts`) so there is one weather algorithm
 * in this project, not two.
 *
 * Two levels, which is what gives the requested behaviour:
 *
 *  - **A day roll** sets the day's character. Most days never rain at all;
 *    the rest carry a *per-slot chance*, never a certainty. This is why the
 *    same hour rains today and not tomorrow — the day seed changes, so every
 *    slot inside it re-rolls.
 *  - **Slot levels** inside the day pick a target intensity every `SLOT`
 *    seconds, and the reported intensity eases between neighbouring slot
 *    centres with a smoothstep. Nothing switches: a shower climbs to its peak
 *    over half a slot and falls away over the next.
 *
 * **Rain is an event, not a climate.** The day chance is capped well under 1
 * (`MAX_SLOT_CHANCE`), so even the wettest day is a day of *showers with gaps
 * between them* rather than one that rains from dawn to dusk — which is the
 * failure the first tuning had, and the reason the sky read as permanently
 * overcast.
 *
 * The client ramps further on top of this — `RainCurrent` chases `RainTarget`
 * at 0.25/s (rainState.ts, ported from the original) — so the steps sent here
 * are already smoothed again before anything is drawn.
 */

/** Weather kinds the packet's high nibble can carry (`ReceiveWeather`). */
export const WEATHER_CLEAR = 0;
export const WEATHER_RAIN = 1;

/** The low nibble is 4 bits: `RainTarget = variation * 6`, so 15 is the cap. */
const MAX_VARIATION = 15;
/** Below this a shower is not worth starting; it would read as a glitch. */
const MIN_VARIATION = 4;

const DAY_SECONDS = 86400;

/**
 * Seconds per intensity slot. Also the ramp: a lone wet slot takes half of
 * this to reach its peak and half to fall away, because the eased value is
 * anchored at slot *centres*. Ten minutes gives a five-minute build, which
 * reads as weather rather than as a switch.
 */
const SLOT_SECONDS = Number(process.env.WEATHER_SLOT ?? 600);

/**
 * The day-character curve, tuned by sweeping a year of minutes and counting
 * the mix. A day rolling under `DRY_BELOW` is bone dry; the rest is cubed,
 * which is what separates "a shower this afternoon" from "showers all day" —
 * without the exponent the mid-range days all saturate, because neighbouring
 * wet slots blend into each other.
 *
 * `DRY_BELOW` was 0.45 and `MAX_SLOT_CHANCE` did not exist, which put rain in
 * the sky ~19 % of all hours with 16 % of days raining end to end. That is a
 * climate, not an event: on a wet day every slot rolled wet, and because the
 * eased intensity never passes through zero between two wet slot centres, the
 * shower never ended. Both halves are fixed here — far fewer days carry rain
 * at all, and the days that do can only ever *roll* for it, one slot at a
 * time.
 *
 * As set, measured over a year at one-minute resolution
 * (`bun run tools/weatherStats.ts`): **82 % of days never rain**, rain is in
 * the sky **2.8 %** of all minutes, showers run a median of **17 minutes**,
 * and a player logging in for half an hour sees rain **6 %** of the time.
 */
const DRY_BELOW = 0.78;
const WET_ABOVE = 1;
const WETNESS_CURVE = 3;

/**
 * The most a slot's chance of rain can ever be, however wet the day rolled.
 *
 * This is the cap that makes rain an event. At 1 — the old implicit value —
 * the wettest days rained in every slot, and a run of wet slots is
 * indistinguishable from continuous rain, because the smoothstep between two
 * wet slot centres never touches zero. Held here, the wettest day of the year
 * still has most of its slots dry, so its showers arrive, pass, and leave a
 * clear sky behind them.
 */
const MAX_SLOT_CHANCE = 0.3;

/** Salt, so a different deployment can get a different year of weather. */
const SEED_TEXT = process.env.WEATHER_SEED ?? 'muWeather';

/**
 * Manual override, for looking at the rain without waiting for the sky to
 * agree. `WEATHER_FORCE=12` pins a downpour, `WEATHER_FORCE=0` pins clear,
 * unset follows the schedule. Four days in five never rain at all by design,
 * so without this the first question any change to the rain raises — "is it
 * broken, or is it just not raining today?" — has no cheap answer. It is the
 * only practical way to look at the wet-weather ground, which needs minutes
 * of rain before it pools.
 */
const FORCE = process.env.WEATHER_FORCE;

export type WeatherState = {
  /** 0 clear, 1 rain — the packet's high nibble. */
  readonly kind: number;
  /** Intensity 0…15 — the packet's low nibble. */
  readonly variation: number;
};

export const CLEAR: WeatherState = { kind: WEATHER_CLEAR, variation: 0 };

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One roll in [0, 1) from (slot, salt) — the same on every run, forever. */
function roll(slot: number, salt: number): number {
  let h =
    (hashString(SEED_TEXT) ^
      Math.imul(slot, 0x9e3779b1) ^
      Math.imul(salt, 0x85ebca6b)) >>>
    0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/** Smoothstep: the slot-to-slot ease, so intensity has no corners. */
const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

/**
 * Odds that any given slot in this day carries rain. Most days land under
 * `DRY_BELOW` and stay clear from midnight to midnight; the wettest day the
 * year has still only rolls `MAX_SLOT_CHANCE` per slot, so it is a day of
 * showers rather than a day of rain.
 */
function dayChance(day: number): number {
  const character = roll(day, 1);
  const above = clamp01((character - DRY_BELOW) / (WET_ABOVE - DRY_BELOW));
  return Math.pow(above, WETNESS_CURVE) * MAX_SLOT_CHANCE;
}

/** The target intensity this slot is heading for; 0 when the slot is dry. */
function slotLevel(slot: number): number {
  // Which day the slot belongs to. Slots do not divide the day evenly for
  // every SLOT_SECONDS, and that is fine — a slot straddling midnight simply
  // takes the character of the day it starts in.
  const day = Math.floor((slot * SLOT_SECONDS) / DAY_SECONDS);

  if (roll(slot, 2) >= dayChance(day)) return 0;

  return Math.round(lerp(MIN_VARIATION, MAX_VARIATION, roll(slot, 3)));
}

/**
 * The weather at `nowMs`. Pure: same input, same output, on any machine.
 *
 * Intensity is anchored at slot centres and eased between them, so a wet slot
 * next to a dry one is a shower that arrives and leaves, and two wet slots in
 * a row hand over without ever touching zero.
 */
export function weatherAt(nowMs: number): WeatherState {
  const t = nowMs / 1000;

  // Shift by half a slot so `i` is the slot whose *centre* we are past.
  const s = t / SLOT_SECONDS - 0.5;
  const i = Math.floor(s);

  const value = lerp(slotLevel(i), slotLevel(i + 1), smooth(s - i));
  const variation = Math.min(MAX_VARIATION, Math.round(value));

  // Never kind 1 with intensity 0: `RainTarget = (Value & 15) * 6` would be
  // zero, which the client correctly reads as "not raining" — sending it
  // would claim rain and show none.
  if (variation <= 0) return CLEAR;

  return { kind: WEATHER_RAIN, variation };
}

/**
 * The weather to broadcast at `nowMs`: the schedule, unless it has been
 * pinned. Callers that want the schedule itself (tests, tools) use
 * `weatherAt`.
 */
export function currentWeather(nowMs: number): WeatherState {
  if (FORCE == null || FORCE === '') return weatherAt(nowMs);

  const variation = Math.max(0, Math.min(MAX_VARIATION, Math.trunc(Number(FORCE))));

  if (!Number.isFinite(variation) || variation <= 0) return CLEAR;

  return { kind: WEATHER_RAIN, variation };
}

/** Whether the schedule is currently pinned by `WEATHER_FORCE`. */
export const weatherForced = FORCE != null && FORCE !== '';

/** `C1 04 0F <kind:variation>` — the wire form of a `WeatherStatusUpdate`. */
export function weatherPacket(state: WeatherState): Uint8Array {
  return new Uint8Array([
    0xc1,
    0x04,
    0x0f,
    ((state.kind & 0x0f) << 4) | (state.variation & 0x0f),
  ]);
}

export const weatherSlotSeconds = SLOT_SECONDS;
