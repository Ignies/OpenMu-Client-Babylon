/**
 * The day/night clock: a pure function of the shared server clock.
 *
 * This module is a producer and nothing else (see
 * documentation/day_night/ARCHITECTURE.md). It never touches a Babylon
 * object, a material or a mood table — it turns `serverNow()` milliseconds
 * into a `CycleState` (time of day, sun angles, phase weights, dynamic-light
 * gain) and `sceneLook` is its one consumer. Same pattern as
 * `weather/ambientSchedule.ts`: two clients standing together see the same
 * sunset second, and the state survives reconnects for free.
 *
 * The output is continuous, never four discrete states: the phase weights
 * smoothstep between keyframe centres on the day circle and always sum to 1,
 * so every consumer blends instead of switching.
 */

export type CyclePhase = 'dawn' | 'noon' | 'dusk' | 'night';

export type CycleWeights = Record<CyclePhase, number>;

export type CycleState = {
  /** Time of day in [0, 1). 0 is midnight-ish; see the phase centres. */
  t: number;
  /** Where the key light points from, radians. Moon at night (see below). */
  sunAzimuth: number;
  sunElevation: number;
  /** Blend weights over the four phases; always sum to 1. */
  weights: CycleWeights;
  /** Multiplier on the dynamic-light layer: 1 at noon, ~1.85 at night. */
  lightGain: number;
};

/** One game day in real minutes. */
export const DAY_LENGTH_MIN = 60;

const DAY_MS = DAY_LENGTH_MIN * 60 * 1000;

/**
 * Keyframe centres as fractions of the day, in circle order. The gaps are
 * deliberately uneven: noon and night are the plateaus players live on
 * (day:night screen time ~65:35 — night is the expensive-to-read state),
 * dawn and dusk are short transitions (~6 real minutes at 60-minute days).
 */
const PHASES: readonly CyclePhase[] = ['dawn', 'noon', 'dusk', 'night'];

const CENTRES: readonly number[] = [0.08, 0.35, 0.62, 0.85];

/**
 * The sun's path. The noon direction reproduces the authored constant the
 * scene was lit with ((0.4, -1, 0.6) in testScene.ts): azimuth is where that
 * vector points from, elevation is its pitch. Dawn/dusk swing ±70° around it.
 */
const SUN_NOON_AZIMUTH = Math.atan2(-0.4, -0.6);
const SUN_NOON_ELEVATION = Math.atan2(1, Math.hypot(0.4, 0.6));

/**
 * Load-bearing floor: a horizon-grazing directional light breaks CSM
 * stretch/bias long before it looks pretty. The reference dawn's *look* of a
 * 15° sun comes from this angle; anything longer is the grade's job.
 */
const SUN_MIN_ELEVATION = (15 * Math.PI) / 180;

const SUN_SWEEP = (140 * Math.PI) / 180;

/** The moon: opposite side of the sky, a gentler arc, moonlit-key height. */
const MOON_AZIMUTH_OFFSET = Math.PI;
const MOON_SWEEP = (60 * Math.PI) / 180;
const MOON_ELEVATION = (35 * Math.PI) / 180;

/** Dynamic-light gain over the noon 1.0, per phase (dark hours carry more). */
const LIGHT_GAIN: CycleWeights = {
  dawn: 1.25,
  noon: 1,
  dusk: 1.25,
  night: 1.85,
};

const smooth = (t: number) => {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return k * k * (3 - 2 * k);
};

/** Debug freeze: `/time` and the `?tod=` URL parameter land here. */
let override: number | null = null;

export function setCycleOverride(t: number | null): void {
  override = t === null ? null : ((t % 1) + 1) % 1;
}

export function getCycleOverride(): number | null {
  return override;
}

/** Time of day in [0, 1) at `nowMs` on the shared clock. */
export function cycleT(nowMs: number): number {
  if (override !== null) return override;
  return ((nowMs / DAY_MS) % 1 + 1) % 1;
}

/**
 * `'dawn' | 'noon' | 'dusk' | 'night'` → the phase centre, `'off'` → null
 * (clear the freeze), a number in [0, 1] → itself. Undefined for anything
 * else — the caller prints usage.
 */
export function parseCycleTime(arg: string): number | null | undefined {
  const word = arg.trim().toLowerCase();

  if (word === 'off') return null;

  const phase = PHASES.indexOf(word as CyclePhase);
  if (phase >= 0) return CENTRES[phase];

  const value = Number(word);
  if (Number.isFinite(value) && value >= 0 && value <= 1) return value % 1;

  return undefined;
}

function makeState(): CycleState {
  return {
    t: 0,
    sunAzimuth: 0,
    sunElevation: 0,
    weights: { dawn: 0, noon: 1, dusk: 0, night: 0 },
    lightGain: 1,
  };
}

const shared = makeState();

/**
 * The full cycle state at `nowMs`, written into `out` (a shared buffer by
 * default — this runs on the frame path and must not allocate).
 */
export function cycleStateAt(nowMs: number, out: CycleState = shared): CycleState {
  const t = cycleT(nowMs);

  out.t = t;

  // Phase weights: between two consecutive centres the weight smoothsteps
  // from the earlier phase to the later one; elsewhere both are 0. The
  // smoothstep's flat ends are what makes noon and night read as plateaus.
  const w = out.weights;
  w.dawn = w.noon = w.dusk = w.night = 0;

  let gain = 1;

  for (let i = 0; i < PHASES.length; i++) {
    const j = (i + 1) % PHASES.length;
    const from = CENTRES[i];
    const span = (CENTRES[j] - from + 1) % 1 || 1;
    const into = ((t - from) % 1 + 1) % 1;

    if (into >= span) continue;

    const k = smooth(into / span);

    w[PHASES[i]] = 1 - k;
    w[PHASES[j]] = k;
    gain =
      LIGHT_GAIN[PHASES[i]] * (1 - k) + LIGHT_GAIN[PHASES[j]] * k;
    break;
  }

  out.lightGain = gain;

  // The key light's path. One DirectionalLight plays both parts: while the
  // night weight is below half it is the sun (east at dawn, high at noon,
  // west at dusk); past half — the darkest point of the dusk fade, where the
  // directional contribution is at its minimum and a snap cannot read — it is
  // retargeted as the moon. The night modifier has already turned its colour
  // blue-white by then (sceneLook's phase table).
  if (w.night >= 0.5) {
    // Night progress: 0 at the dusk-side crossing, 1 at the dawn-side one.
    const rise = ((t - CENTRES[2]) % 1 + 1) % 1;
    const span = (CENTRES[0] - CENTRES[2] + 1) % 1;
    const v = Math.min(1, Math.max(0, rise / span));

    out.sunAzimuth =
      SUN_NOON_AZIMUTH + MOON_AZIMUTH_OFFSET + MOON_SWEEP * (v - 0.5);
    out.sunElevation = MOON_ELEVATION;
  } else {
    // Day progress: 0 at the dawn centre, 1 at the dusk centre. In the dark
    // stretch outside them the sun waits at its 15° floor on whichever end
    // is nearer — after dusk it parks west, before dawn it parks east, so
    // neither crossing into the day arc can snap the azimuth.
    const into = ((t - CENTRES[0]) % 1 + 1) % 1;
    const span = (CENTRES[2] - CENTRES[0] + 1) % 1;
    const u = into >= span ? (into >= (span + 1) / 2 ? 0 : 1) : into / span;

    out.sunAzimuth = SUN_NOON_AZIMUTH + SUN_SWEEP * (u - 0.5);
    out.sunElevation =
      SUN_MIN_ELEVATION +
      (SUN_NOON_ELEVATION - SUN_MIN_ELEVATION) * Math.sin(Math.PI * u);
  }

  return out;
}
