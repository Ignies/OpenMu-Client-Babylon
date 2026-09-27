/**
 * Red lightning, as the page draws it: the loading bar's bolt and the crack
 * running down from the logo are the same stroke in two directions.
 */

export type Point = { x: number; y: number };

/**
 * A bolt from `a` to `b` by midpoint displacement: each pass kinks the middle
 * of every segment sideways, less each time, so big bends carry smaller ones.
 * Both ends stay put and no joint strays further than `reach` from the line.
 */
export function bolt(a: Point, b: Point, reach: number, finest = 7): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return [a, b];

  const nx = -dy / length;
  const ny = dx / length;

  // Offsets from the straight line, at evenly halved positions along it.
  let offsets = [0, 0];
  let kink = Math.min(reach, length * 0.12);

  while (length / (offsets.length - 1) > finest && offsets.length < 513) {
    const next = [offsets[0]];

    for (let i = 1; i < offsets.length; i++) {
      const mid =
        (offsets[i - 1] + offsets[i]) / 2 + (Math.random() - 0.5) * 2 * kink;
      next.push(Math.max(-reach, Math.min(reach, mid)), offsets[i]);
    }

    offsets = next;
    kink *= 0.58;
  }

  const last = offsets.length - 1;

  return offsets.map((off, i) => ({
    x: a.x + (dx * i) / last + nx * off,
    y: a.y + (dy * i) / last + ny * off,
  }));
}

/** A short crooked branch off `from`, heading back along `(dx, dy)` and out to one side. */
export function fork(from: Point, dx: number, dy: number): Point[] {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const side = Math.random() < 0.5 ? -1 : 1;
  const points = [from];
  let { x, y } = from;

  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    const back = 6 + Math.random() * 10;
    const out = side * (3 + Math.random() * 7);
    x += -ux * back - uy * out;
    y += -uy * back + ux * out;
    points.push({ x, y });
  }

  return points;
}

export function stroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  style: string
): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

/** The bolt in its layers - a wide red glow, the red body, a hot core - at `glow` (0..1+). */
export function drawBolt(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  glow: number,
  forks: Point[][] = []
): void {
  stroke(ctx, points, 18, `rgba(196, 48, 43, ${0.12 * glow})`);
  stroke(ctx, points, 8, `rgba(226, 70, 48, ${0.28 * glow})`);
  stroke(ctx, points, 2.8, `rgba(255, 104, 64, ${0.95 * glow})`);
  stroke(ctx, points, 1.2, `rgba(255, 232, 214, ${0.9 * glow})`);

  for (const branch of forks) {
    stroke(ctx, branch, 4, `rgba(226, 70, 48, ${0.3 * glow})`);
    stroke(ctx, branch, 1.2, `rgba(255, 170, 130, ${0.8 * glow})`);
  }
}

/** The hot stretch of a surge: the part of `points` within `span` of `at` along the axis `key`. */
export function surgeStretch(
  points: Point[],
  key: 'x' | 'y',
  at: number,
  span: number
): Point[] {
  return points.filter(p => Math.abs(p[key] - at) < span);
}
