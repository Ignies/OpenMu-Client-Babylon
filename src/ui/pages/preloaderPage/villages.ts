/**
 * A credit's roll drawn as villages round its mark: each name a small
 * settlement on the map, founded outwards from the mark and joined by a road
 * to the nearest one already there, the way a capital's hamlets spread along
 * its roads.
 *
 * A village stands at a point on the map, in map pixels, so it moves with the
 * map under the camera; its label is laid out on screen, upright, where it is
 * read. Which ground is open is the caller's to say: it knows the camera, and
 * what stands in front of the map.
 */

export type Point = [number, number];

/** left, top, right, bottom, in screen px. */
export type Box = [number, number, number, number];

export type Village = {
  name: string;
  /** Where it stands, in map pixels. */
  at: Point;
  /** The label on the marker's right, or its left. */
  right: boolean;
  /** The road in from the village it was founded from, in map pixels. */
  road: Point[];
};

export type Founding = {
  /** Map pixels to screen px, through the camera as it rests on the mark. */
  toScreen: (x: number, y: number) => Point;
  /** Whether a label's box is on screen and clear of what stands in front of the map. */
  open: (box: Box) => boolean;
  /** A label's width, px. */
  measure: (name: string) => number;
  /** A label's height, px, and screen px per map pixel near the mark. */
  label: number;
  scale: number;
  /** Room kept round the mark itself, px. */
  keep: number;
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Points on a road, and how far the hand that draws it strays, in label heights. */
const ROAD_STEPS = 8;
const ROAD_SHAKE = 0.12;

const overlaps = (a: Box, b: Box) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** A fixed wobble for point `i` of road `n`, so a road is shaky but does not crawl. */
function wobble(n: number, i: number): number {
  const h = Math.sin((n * 131 + i) * 12.9898) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 2;
}

function road(n: number, from: Point, to: Point, stray: number): Point[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;

  return Array.from({ length: ROAD_STEPS + 1 }, (_, i) => {
    const t = i / ROAD_STEPS;
    // Straying most in the middle of the road, none at its ends.
    const off = wobble(n, i) * stray * Math.sin(Math.PI * t);
    return [from[0] + dx * t + nx * off, from[1] + dy * t + ny * off];
  });
}

/** Where a village's marker sits in its label box, and the box, around screen point `p`. */
export function labelBox(
  p: Point,
  width: number,
  label: number,
  right: boolean
): Box {
  const dot = label * 0.3;
  const gap = label * 0.7;
  const pad = label * 0.3;
  const half = label * 0.6;

  return right
    ? [p[0] - dot - pad, p[1] - half - pad, p[0] + gap + width + pad, p[1] + half + pad]
    : [p[0] - gap - width - pad, p[1] - half - pad, p[0] + dot + pad, p[1] + half + pad];
}

/**
 * Found a village for each name, nearest the mark first, on a spiral out from
 * it: a spot is taken when its label is on open ground and clear of every
 * other label and the mark. Names that find no spot are left out.
 */
export function foundVillages(
  names: string[],
  mark: Point,
  f: Founding
): Village[] {
  const spacing = (f.label * 0.9) / f.scale;
  const reach = (f.label * 80) / f.scale;
  const start = (f.keep * 1.4) / f.scale;
  const centre = f.toScreen(mark[0], mark[1]);

  const taken: Box[] = [
    [centre[0] - f.keep, centre[1] - f.keep, centre[0] + f.keep, centre[1] + f.keep],
  ];
  const villages: Village[] = [];

  for (let k = 0; villages.length < names.length; k++) {
    const r = start + spacing * Math.sqrt(k);
    if (r > reach) break;

    const a = k * GOLDEN;
    const at: Point = [mark[0] + Math.cos(a) * r, mark[1] + Math.sin(a) * r];
    const p = f.toScreen(at[0], at[1]);
    const name = names[villages.length];
    const width = f.measure(name);

    // The label reads away from the mark where it can.
    for (const right of p[0] >= centre[0] ? [true, false] : [false, true]) {
      const box = labelBox(p, width, f.label, right);
      if (taken.some(t => overlaps(t, box)) || !f.open(box)) continue;

      // The road comes in from the nearest village already founded, or the mark.
      let from = mark;
      let best = Math.hypot(at[0] - mark[0], at[1] - mark[1]);
      for (const v of villages) {
        const d = Math.hypot(at[0] - v.at[0], at[1] - v.at[1]);
        if (d < best) {
          best = d;
          from = v.at;
        }
      }

      taken.push(box);
      villages.push({
        name,
        at,
        right,
        road: road(villages.length, from, at, (f.label * ROAD_SHAKE) / f.scale),
      });
      break;
    }
  }

  return villages;
}

/** The first `drawn` (0..1) of a road, as its points. */
export function roadSoFar(road: Point[], drawn: number): Point[] {
  if (drawn <= 0) return [];
  if (drawn >= 1) return road;

  const last = drawn * ROAD_STEPS;
  const whole = Math.floor(last);
  const points = road.slice(0, whole + 1);
  const f = last - whole;
  if (f > 0 && whole < ROAD_STEPS) {
    const [ax, ay] = road[whole];
    const [bx, by] = road[whole + 1];
    points.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }

  return points;
}
