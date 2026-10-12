/**
 * The paths of Gaion's thrown swords, in the original's space (cm, z up, angles in degrees): the
 * `m_Interpolates` keys CreateEffect writes for his sword models (ZzzEffect.cpp:5023-5610).
 */

export type Vec = [number, number, number];

/** One `INTERPOLATE_FACTOR`: `a` to `b` while the flight's rate is in `[from, to)`. */
export type Key = { readonly from: number; readonly to: number; readonly a: Readonly<Vec>; readonly b: Readonly<Vec> };

/** A flight: its life in ticks, its position and angle keys, and the angle the angle keys add to (`HeadAngle`). */
export type Flight = { readonly ticks: number; readonly pos: readonly Key[]; readonly angle: readonly Key[]; readonly head: Readonly<Vec> };

/**
 * `GetCurrentValue` (w_ObjectInfo.cpp:7-34): the first key holding `rate`, lerped into `out`; false and `out`
 * untouched when none does.
 */
export function sample(keys: readonly Key[], rate: number, out: Vec): boolean {
  for (const k of keys) {
    if (k.from <= rate && k.to > rate) {
      const w = (rate - k.from) / (k.to - k.from);
      out[0] = k.a[0] + (k.b[0] - k.a[0]) * w;
      out[1] = k.a[1] + (k.b[1] - k.a[1]) * w;
      out[2] = k.a[2] + (k.b[2] - k.a[2]) * w;
      return true;
    }
  }
  return false;
}

const key = (from: number, to: number, a: Readonly<Vec>, b: Readonly<Vec>): Key => ({ from, to, a, b });

/** `AngleMatrix(0, 0, deg)` then `VectorRotate`: `v` turned about z, times `length`, added to `from`. */
function along(from: Readonly<Vec>, v: Readonly<Vec>, deg: number, length: number, drop: number): Vec {
  const r = (deg * Math.PI) / 180;
  const x = v[0] * Math.cos(r) - v[1] * Math.sin(r);
  const y = v[0] * Math.sin(r) + v[1] * Math.cos(r);
  return [from[0] + x * length, from[1] + y * length, from[2] + v[2] * length - drop];
}

function normalized(v: Vec): Vec {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** left02 / right02: the turns of the dip and of the final pass, the final drop and the angle keys. */
const CURVED = {
  1: { first: 50, last: -26, drop: 280, split: 0.33, turn: 0.4, mid: [110, 0, 0], end: [60, 0, -300] },
  3: { first: -40, last: 24, drop: 290, split: 0.32, turn: 0.32, mid: [90, 0, 0], end: [90, 0, 340] },
} as const;

/** left01 / right01 run this far along the throw (`fTotalDist`). */
const STRAIGHT_RUN = 1700;

/**
 * SubType 1 of the four side swords (`GAION_SWORDS` 0-3) from `start` at `target`, `owner` being Gaion's
 * position and `head` his angle.
 */
export function sideFlight(sword: number, start: Readonly<Vec>, target: Readonly<Vec>, owner: Readonly<Vec>, head: Readonly<Vec>): Flight {
  const distance = Math.hypot(target[0] - start[0], target[1] - start[1], target[2] - start[2]);
  const curved = sword === 1 || sword === 3 ? CURVED[sword] : null;

  if (curved) {
    // ZzzEffect.cpp:5398-5604: a dip toward the target, then on past it and down.
    const dir = normalized([target[0] - start[0], target[1] - start[1], 0]);
    const p1 = along(start, dir, curved.first, distance * 0.4, 100);
    const end = along(start, dir, curved.last, distance + 700, curved.drop);
    return {
      ticks: 30,
      head,
      angle: [key(0, curved.turn, [0, 0, 0], curved.mid), key(curved.turn, 1.01, curved.mid, curved.end)],
      pos: [key(0, curved.split, start, p1), key(curved.split, 1.01, p1, end)],
    };
  }

  // ZzzEffect.cpp:5272-5396: straight on along Gaion's line to the target, a hand above its height.
  const from: Vec = [start[0], start[1], target[2] + 100];
  const dir = normalized([target[0] - owner[0], target[1] - owner[1], 0]);
  const first = distance * 0.3;
  const p1 = along(from, dir, 0, first, 0);
  const end = along(from, dir, 0, STRAIGHT_RUN, 0);
  const rate = first / STRAIGHT_RUN;
  const spin = sword === 2 ? 1560 : -1560;
  return {
    ticks: 35,
    head,
    angle: [key(0, rate, [0, 0, 0], [90, 0, 0]), key(rate, 1.01, [90, 0, 0], [90, 0, spin])],
    pos: [key(0, rate, start, p1), key(rate, 1.01, p1, end)],
  };
}

/** SubType 3's rates, each start pushed 0.03 a sword later (`fOffsetRate`). */
const STORM_RATES = [0, 0.22, 0.35, 0.5, 1.01] as const;

/**
 * SubType 3 (ZzzEffect.cpp:5040-5130): up 900 cm (+-50) within 100 cm of `start`, across by the target's offset,
 * then down to 120 cm (+-50) above `ground`, the terrain height at the target. No angle keys: it keeps `head`.
 */
export function stormFlight(sword: number, start: Readonly<Vec>, target: Readonly<Vec>, ground: number, head: Readonly<Vec>, random: () => number): Flight {
  const roll = (n: number) => Math.floor(random() * n);
  const rise = 900 + (roll(100) - 50);
  const p1: Vec = [start[0] + (roll(200) - 100), start[1] + (roll(200) - 100), start[2] + rise];
  const p2: Vec = [p1[0] + target[0] - start[0], p1[1] + target[1] - start[1], p1[2]];
  const p3: Vec = [p2[0], p2[1], ground + 100 * 1.2 + (roll(100) - 50)];
  const o = 0.03 * sword;
  const r = STORM_RATES;
  return {
    ticks: 60,
    head,
    angle: [],
    pos: [key(r[0] + o, r[1] + o, start, p1), key(r[1] + o, r[2] + o, p1, p2), key(r[2] + o, r[3] + o, p2, p3), key(r[3] + o, r[4], p3, p3)],
  };
}
