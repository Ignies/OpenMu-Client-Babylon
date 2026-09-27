/**
 * The camera over the world map, following a traveller's route.
 *
 * The route is a list of stops across the map. The camera settles on each one
 * zoomed in, then travels the leg to the next - pulling back a little, blurred
 * with its speed - while the leg is drawn behind it, so the dashed line always
 * ends where the camera looks. After the last stop the route fades and the
 * camera goes back to the first.
 *
 * Everything here is a pure function of time; `backdrop.tsx` renders it.
 */

/** The stops, 0..1 across and down the map image, in the order they are travelled. */
export const ROUTE: readonly [number, number][] = [
  [0.473, 0.311],
  [0.412, 0.188],
  [0.597, 0.188],
  [0.793, 0.355],
  [0.924, 0.346],
  [0.917, 0.602],
  [0.782, 0.67],
  [0.793, 0.854],
  [0.601, 0.864],
  [0.59, 0.718],
  [0.422, 0.617],
  [0.349, 0.509],
  [0.386, 0.379],
];

/** How close each stop is looked at. */
const ZOOM = [
  1.55, 1.45, 1.6, 1.5, 1.65, 1.45, 1.55, 1.6, 1.5, 1.45, 1.6, 1.5, 1.55,
];

/** The heading the map is turned to at each stop, degrees. */
const BEARING = [-8, 6, -4, 10, -6, 8, -10, 4, -6, 9, -3, 7, -5];

/** How far the map leans back: looking at a stop, and mid-leg. */
const TILT = 30;
const TILT_TRAVEL = 18;

/**
 * How far the camera frames a stop from the middle of the map towards the
 * stop itself: at 1 the stops on the map's edge would show the edge.
 */
const FRAME = 0.62;

/** Seconds at a stop, on a leg, and going back to the start while the route fades. */
const DWELL = 3.4;
const TRAVEL = 1.8;
const RETURN = 2.2;

/** How far the camera pulls back mid-leg, and its blur at full speed, px. */
const PULL = 0.32;
const BLUR = 6;

/** A stop's mark pops in over this long once the camera lands on it. */
const MARK_IN = 0.45;

/**
 * How long a stop is stayed at when its credit needs longer than the rest, in
 * seconds, by lap and stop; the tour never stays less than DWELL.
 */
export type StopNeed = (lap: number, stop: number) => number;

const noNeed: StopNeed = () => 0;

const lapLength = (lap: number, need: StopNeed) =>
  ROUTE.reduce(
    (sum, _, i) => sum + Math.max(DWELL, need(lap, i)),
    (ROUTE.length - 1) * TRAVEL + RETURN
  );

/** The map image's size: legs wind in its pixels so a bend is round, not squashed. */
const MAP_W = 1500;
const MAP_H = 1118;

/** How far a leg winds off its line, as a share of the map's width, and how often. */
const MEANDER = 0.022;
const WAVES = [1.5, 1, 2, 1.5, 1, 2, 1.5, 1, 1.5, 2, 1, 1.5, 1];

/** Each leg bows to one side, alternating, so the line reads as a trail. */
function control(i: number): [number, number] {
  const [ax, ay] = ROUTE[i];
  const [bx, by] = ROUTE[(i + 1) % ROUTE.length];
  const bow = (i % 2 ? -1 : 1) * 0.16;

  return [(ax + bx) / 2 - (by - ay) * bow, (ay + by) / 2 + (bx - ax) * bow];
}

/**
 * A point `t` of the way along leg `i` (from stop `i` to stop `i + 1`): a
 * bowed curve that winds from side to side as a road would, the winding dying
 * away at both stops so every leg lands on its mark.
 */
export function legPoint(i: number, t: number): [number, number] {
  const [ax, ay] = ROUTE[i];
  const [bx, by] = ROUTE[(i + 1) % ROUTE.length];
  const [cx, cy] = control(i);
  const u = 1 - t;

  const x = (u * u * ax + 2 * u * t * cx + t * t * bx) * MAP_W;
  const y = (u * u * ay + 2 * u * t * cy + t * t * by) * MAP_H;
  const dx = (2 * u * (cx - ax) + 2 * t * (bx - cx)) * MAP_W;
  const dy = (2 * u * (cy - ay) + 2 * t * (by - cy)) * MAP_H;
  const length = Math.hypot(dx, dy) || 1;
  const wind =
    MEANDER *
    MAP_W *
    Math.sin(Math.PI * t) *
    Math.sin(2 * Math.PI * WAVES[i] * t + i);

  return [
    (x - (dy / length) * wind) / MAP_W,
    (y + (dx / length) * wind) / MAP_H,
  ];
}

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export type TourFrame = {
  /** Where the camera looks, 0..1 on the map. */
  u: number;
  v: number;
  zoom: number;
  /** The map's heading and lean, degrees. */
  bearing: number;
  tilt: number;
  blur: number;
  /** Legs drawn in full, and how far into the next one the pen is (0..1). */
  legs: number;
  pen: number;
  /** How visible the drawn route is (it fades on the way back to the start). */
  trail: number;
  /** Each stop's mark, 0 (not reached) to 1 (in). */
  marks: number[];
  /** The stop being looked at and how far through the stay, or null between stops. */
  stop: number | null;
  stay: number;
  /** How long this stay lasts, seconds. */
  dwell: number;
  /** Which lap this is, so the credits can move on each time round. */
  lap: number;
};

export function tourAt(seconds: number, need: StopNeed = noNeed): TourFrame {
  let lap = 0;
  let t = Math.max(0, seconds);
  for (let length = lapLength(0, need); t >= length; length = lapLength(++lap, need)) {
    t -= length;
  }
  const marks = ROUTE.map(() => 0);

  for (let i = 0; i < ROUTE.length; i++) {
    const [u, v] = ROUTE[i];
    const dwell = Math.max(DWELL, need(lap, i));

    // At stop i: every stop up to it is marked, the newest popping in.
    if (t < dwell) {
      for (let k = 0; k < i; k++) marks[k] = 1;
      marks[i] = Math.min(1, t / MARK_IN);

      return {
        u: 0.5 + (u - 0.5) * FRAME,
        v: 0.5 + (v - 0.5) * FRAME,
        // A slow push in while it stays.
        zoom: ZOOM[i] + 0.06 * (t / dwell),
        bearing: BEARING[i] + 2 * (t / dwell),
        tilt: TILT,
        blur: 0,
        legs: i,
        pen: 0,
        trail: 1,
        marks,
        stop: i,
        stay: t / dwell,
        dwell,
        lap,
      };
    }

    t -= dwell;

    // Travelling leg i, or back to the start after the last stop.
    const last = i === ROUTE.length - 1;
    const span = last ? RETURN : TRAVEL;

    if (t < span || last) {
      const k = Math.min(1, t / span);
      const along = ease(k);
      const [pu, pv] = last
        ? [u + (ROUTE[0][0] - u) * along, v + (ROUTE[0][1] - v) * along]
        : legPoint(i, along);
      const next = ZOOM[(i + 1) % ROUTE.length];
      const turn = BEARING[i] + 2;

      for (let m = 0; m <= i; m++) marks[m] = 1;

      return {
        u: 0.5 + (pu - 0.5) * FRAME,
        v: 0.5 + (pv - 0.5) * FRAME,
        bearing: turn + (BEARING[(i + 1) % ROUTE.length] - turn) * along,
        tilt: TILT - (TILT - TILT_TRAVEL) * Math.sin(Math.PI * k),
        zoom:
          ZOOM[i] +
          0.06 +
          (next - ZOOM[i] - 0.06) * along -
          PULL * Math.sin(Math.PI * k),
        blur: BLUR * Math.sin(Math.PI * k),
        legs: i,
        pen: last ? 0 : along,
        trail: last ? 1 - k : 1,
        marks: last ? marks.map(() => 1 - k) : marks,
        stop: null,
        stay: 0,
        dwell: 0,
        lap,
      };
    }

    t -= span;
  }

  // Not reached: the last stop's return leg always returns above.
  return {
    u: ROUTE[0][0],
    v: ROUTE[0][1],
    zoom: ZOOM[0],
    bearing: BEARING[0],
    tilt: TILT,
    blur: 0,
    legs: 0,
    pen: 0,
    trail: 1,
    marks,
    stop: 0,
    stay: 0,
    dwell: DWELL,
    lap,
  };
}
