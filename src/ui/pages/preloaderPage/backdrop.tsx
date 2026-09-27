import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../i18n';
import { legPoint, ROUTE, tourAt, type StopNeed } from './mapTour';
import { loadCredits, type Credit } from './contributors';

/** What each kind of credit is billed as. */
const CREDIT_ROLE: Record<Credit['kind'] | 'reporter', TextKey> = {
  thanks: 'credits.thanks',
  person: 'credits.contributor',
  reporter: 'credits.reporter',
  playtest: 'credits.playtesting',
  everyone: 'credits.playtesting',
};

const WORLD_MAP_ART = '/ui/world_select/world_map.webp';

/** The map image's own size; the route is drawn in its pixels. */
const MAP_W = 1500;
const MAP_H = 1118;

/**
 * The camera's box is the whole map image at its own proportions, this much
 * bigger than the window needs, so nothing of it is cropped and every stop can
 * be reached whatever shape the window is.
 */
const BOX = 1.3;

/** The perspective the map is tilted under (`.ws-map-layer`), px. */
const PERSPECTIVE = 1400;

/** Points per leg when the route is drawn. */
const LEG_STEPS = 40;

/** The hand that draws the route shakes this much, in map pixels. */
const SHAKE = 0.9;

/** The mark on a stop: an inked X this many map pixels from its middle, and its stroke's half-width at the thickest. */
const MARK = 11;
const MARK_WIDTH = 2.2;

/**
 * A credit's roll of names (`.ws-credit-roll`): the rows it shows at once and
 * their height, px, how many rows go by a second, and when it starts and stops
 * moving within the stay, seconds after the stop is reached and before it is
 * left. The stop is held for as long as the whole roll takes.
 */
const ROLL_ROWS = 7;
const ROLL_ROW = 18;
const ROLL_RATE = 14;
const ROLL_IN = 0.9;
const ROLL_OUT = 0.8;

/** The seconds a credit's roll needs to run past every name. */
const rollTime = (credit: Credit | null) =>
  credit?.roll ? Math.max(0, credit.roll.length - ROLL_ROWS) / ROLL_RATE : 0;

/**
 * Whose name a stop carries, if any. The credits roll in their own order from
 * the first stop. When they all fit on one lap, every lap shows all of them
 * once; when they do not, each lap carries on from where the last one left
 * off, so nobody shows twice before everyone has shown once.
 */
function creditAt(lap: number, stop: number, credits: Credit[]): Credit | null {
  const stops = ROUTE.length;
  if (!credits.length) return null;
  if (credits.length <= stops) return credits[stop] ?? null;

  return credits[(lap * stops + stop) % credits.length];
}

/** Every point of the route in map pixels, with the hand's shake baked in. */
const ROUTE_POINTS: [number, number][][] = ROUTE.slice(0, -1).map((_, leg) =>
  Array.from({ length: LEG_STEPS + 1 }, (_, i) => {
    const [u, v] = legPoint(leg, i / LEG_STEPS);
    // A fixed wobble per point, so the line is shaky but does not crawl.
    const n = Math.sin((leg * 97 + i) * 12.9898) * 43758.5453;
    const shake = (n - Math.floor(n) - 0.5) * 2 * SHAKE;
    return [u * MAP_W + shake, v * MAP_H - shake];
  })
);

/** The route drawn so far, as an SVG path: every leg behind the pen, and the one it is on. */
function routeSoFar(legs: number, pen: number): string {
  let d = '';

  for (let leg = 0; leg <= legs && leg < ROUTE_POINTS.length; leg++) {
    const points = ROUTE_POINTS[leg];
    const upTo = leg < legs ? LEG_STEPS : Math.floor(pen * LEG_STEPS);
    if (upTo <= 0) break;

    for (let i = leg === 0 ? 0 : 1; i <= upTo; i++) {
      const [x, y] = points[i];
      d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  return d;
}

/**
 * One brush stroke of an X, `draw` (0..1) of the way from `from` to `to`: a
 * filled shape that swells in the middle and tapers to points, bowed a little,
 * the way a stroke of ink lies.
 */
function brush(
  from: [number, number],
  to: [number, number],
  draw: number,
  bow: number
): string {
  if (draw <= 0) return '';

  const steps = 10;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * draw;
    const swell = Math.pow(Math.sin(Math.PI * t), 0.7);
    const w = MARK_WIDTH * (0.18 + 0.82 * swell);
    const curve = bow * Math.sin(Math.PI * t);
    const x = from[0] + dx * t + nx * curve;
    const y = from[1] + dy * t + ny * curve;
    left.push(`${(x + nx * w).toFixed(1)} ${(y + ny * w).toFixed(1)}`);
    right.unshift(`${(x - nx * w).toFixed(1)} ${(y - ny * w).toFixed(1)}`);
  }

  return `M${left.join('L')}L${right.join('L')}Z`;
}

/** An X on stop `i`, painted stroke by stroke as `m` goes from 0 to 1. */
function markShape(i: number, m: number): { ink: string; halo: string } {
  const x = ROUTE[i][0] * MAP_W;
  const y = ROUTE[i][1] * MAP_H;
  const first = Math.min(1, m * 2);
  const second = Math.max(0, m * 2 - 1);
  const a: [number, number] = [x - MARK, y - MARK * 0.9];
  const b: [number, number] = [x + MARK * 0.95, y + MARK];
  const c: [number, number] = [x + MARK, y - MARK];
  const d: [number, number] = [x - MARK * 0.9, y + MARK * 0.95];

  const halo =
    `M${a[0]} ${a[1]}L${a[0] + (b[0] - a[0]) * first} ${a[1] + (b[1] - a[1]) * first}` +
    (second > 0
      ? `M${c[0]} ${c[1]}L${c[0] + (d[0] - c[0]) * second} ${c[1] + (d[1] - c[1]) * second}`
      : '');

  return { ink: brush(a, b, first, 2) + brush(c, d, second, -1.6), halo };
}

/**
 * The Babylon site's hero art behind the world picker: the world map drained
 * to grey and washed in the logo's red, a faint grid, embers rising off it.
 * Opaque on purpose - the login scene loads behind this page and is not shown
 * until a world is entered.
 *
 * The map is toured like a camera over a map on a table (`mapTour.ts`): tilted
 * back, turned to a heading, following a traveller whose route is inked on the
 * map as the camera goes. Beside each stop the camera rests on, a name from
 * the credits, as a film's credits sit over a shot.
 */
export const Backdrop = observer(() => {
  const mover = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const ink = useRef<SVGPathElement>(null);
  const halo = useRef<SVGPathElement>(null);
  const marks = useRef<SVGPathElement>(null);
  const marksHalo = useRef<SVGPathElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const credit = useRef<HTMLDivElement>(null);
  const roll = useRef<HTMLSpanElement>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [who, setWho] = useState<Credit | null>(null);
  const cast = useRef(credits);
  cast.current = credits;

  useEffect(() => {
    void loadCredits().then(setCredits);
  }, []);

  useEffect(() => {
    const box = mover.current;
    const frame = layer.current;
    const card = credit.current;
    if (!box || !frame || !card) return;

    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')
      .matches;
    const start = performance.now();
    let raf = 0;
    let blurShown = -1;
    let credited: Credit | null = null;
    let width = 0;
    let height = 0;
    let iw = 0;
    let ih = 0;

    const resize = () => {
      width = frame.clientWidth;
      height = frame.clientHeight;
      iw = Math.max(width, (height * MAP_W) / MAP_H) * BOX;
      ih = (iw * MAP_H) / MAP_W;
      box.style.width = `${iw}px`;
      box.style.height = `${ih}px`;
      box.style.left = `${(width - iw) / 2}px`;
      box.style.top = `${(height - ih) / 2}px`;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    resize();

    // A stop whose credit rolls names stays until they have all gone by.
    const need: StopNeed = (lap, stop) => {
      const time = rollTime(creditAt(lap, stop, cast.current));
      return time ? ROLL_IN + time + ROLL_OUT : 0;
    };

    const step = (now: number) => {
      const tour = tourAt(still ? 0 : (now - start) / 1000, need);
      const s = tour.zoom;
      const px = (tour.u - 0.5) * iw;
      const py = (tour.v - 0.5) * ih;

      // Read right to left: bring the camera's point to the middle, zoom,
      // turn the map to its heading, lean it back under the perspective.
      box.style.transform =
        `rotateX(${tour.tilt.toFixed(2)}deg) rotateZ(${tour.bearing.toFixed(2)}deg) ` +
        `scale(${s.toFixed(4)}) translate(${(-px).toFixed(1)}px, ${(-py).toFixed(1)}px)`;

      const blur = Math.round(tour.blur * 4) / 4;
      if (blur !== blurShown) {
        box.style.filter = blur > 0.2 ? `blur(${blur}px)` : '';
        blurShown = blur;
      }

      // The route: inked up to the pen, the pen's tip on the line's end.
      const d = tour.trail > 0.01 ? routeSoFar(tour.legs, tour.pen) : '';
      ink.current?.setAttribute('d', d);
      halo.current?.setAttribute('d', d);
      ink.current?.parentElement?.setAttribute(
        'opacity',
        tour.trail.toFixed(3)
      );

      let markInk = '';
      let markHalo = '';
      tour.marks.forEach((m, i) => {
        if (m <= 0) return;
        const shape = markShape(i, Math.min(1, m));
        markInk += shape.ink;
        markHalo += shape.halo;
      });
      marks.current?.setAttribute('d', markInk);
      marksHalo.current?.setAttribute('d', markHalo);

      const drawing =
        tour.pen > 0 && tour.pen < 1 && tour.legs < ROUTE_POINTS.length;
      if (tip.current) {
        if (drawing) {
          const [x, y] = legPoint(tour.legs, tour.pen);
          tip.current.setAttribute('cx', (x * MAP_W).toFixed(1));
          tip.current.setAttribute('cy', (y * MAP_H).toFixed(1));
        }
        tip.current.setAttribute('opacity', drawing ? '1' : '0');
      }

      // The credit for the stop being looked at, upright beside its mark:
      // the mark's place on screen, through the same lean, turn and zoom.
      const person =
        tour.stop === null ? null : creditAt(tour.lap, tour.stop, cast.current);
      if (tour.stop !== null && person) {
        if (person !== credited) {
          credited = person;
          setWho(person);
        }

        const [mu, mv] = ROUTE[tour.stop];
        const lx = s * ((mu - 0.5) * iw - px);
        const ly = s * ((mv - 0.5) * ih - py);
        const b = (tour.bearing * Math.PI) / 180;
        const a = (tour.tilt * Math.PI) / 180;
        const rx = lx * Math.cos(b) - ly * Math.sin(b);
        const ry = lx * Math.sin(b) + ly * Math.cos(b);
        const depth = ry * Math.sin(a);
        const f = PERSPECTIVE / (PERSPECTIVE - depth);
        const x = width / 2 + rx * f;
        const y = height / 2 + ry * Math.cos(a) * f;

        const held = tour.stay * tour.dwell;
        const alpha = Math.max(
          0,
          Math.min(1, (held - 0.4) / 0.5, (tour.dwell - 0.2 - held) / 0.4)
        );
        const left = x + 340 > width;
        // High on the screen the logo is in the way: hang the credit below.
        // A credit with a roll is tall, so it hangs below unless low down.
        const below = y < height * (person.roll ? 0.55 : 0.38);

        const time = rollTime(person);
        if (roll.current && time) {
          const k = Math.max(0, Math.min(1, (held - ROLL_IN) / time));
          const rows = (person.roll?.length ?? 0) - ROLL_ROWS;
          roll.current.style.transform = `translateY(${(-k * rows * ROLL_ROW).toFixed(1)}px)`;
        }

        card.style.opacity = alpha.toFixed(3);
        card.style.transform = `translate(${(left ? x - 30 : x + 30).toFixed(1)}px, ${(below ? y + 16 + (1 - alpha) * 10 : y - 16 - (1 - alpha) * 10).toFixed(1)}px) translate(${left ? '-100%' : '0'}, ${below ? '0' : '-100%'})`;
        card.style.textAlign = left ? 'right' : 'left';
      } else {
        card.style.opacity = '0';
      }

      if (!still) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="ws-art" aria-hidden>
      <div className="ws-map-layer" ref={layer}>
        <div className="ws-map-move" ref={mover}>
          <div
            className="ws-map"
            style={{ backgroundImage: `url(${WORLD_MAP_ART})` }}
          />
          <svg
            className="ws-trail"
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            preserveAspectRatio="none"
          >
            <g>
              <path className="ws-trail-halo" ref={halo} />
              <path className="ws-trail-ink" ref={ink} />
            </g>
            <path className="ws-trail-marks-halo" ref={marksHalo} />
            <path className="ws-trail-marks" ref={marks} />
            <circle className="ws-trail-tip" ref={tip} r="4" opacity="0" />
          </svg>
        </div>
        <div className="ws-tint" />
      </div>
      <div className="ws-grid" />
      <Embers />
      <div className="ws-credit" ref={credit}>
        {who && (
          <>
            <span className="ws-credit-role ws-mono">
              {t(
                CREDIT_ROLE[
                  who.kind === 'person' && !who.commits ? 'reporter' : who.kind
                ]
              )}
            </span>
            <span className="ws-credit-name">
              {who.kind === 'everyone' ? t('credits.everyone') : who.name}
            </span>
            {who.note && (
              <span className="ws-credit-meta ws-mono">{who.note}</span>
            )}
            {who.roll && (
              <span
                className="ws-credit-roll ws-mono"
                style={{ height: ROLL_ROWS * ROLL_ROW, lineHeight: `${ROLL_ROW}px` }}
              >
                <span ref={roll}>
                  {who.roll.map(name => (
                    <span key={name}>{name}</span>
                  ))}
                </span>
              </span>
            )}
            {who.kind === 'person' && (
              <span className="ws-credit-meta ws-mono">
                {[
                  who.commits
                    ? t('credits.commits', { count: who.commits })
                    : '',
                  who.reports
                    ? t('credits.reports', { count: who.reports })
                    : '',
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </span>
            )}
          </>
        )}
      </div>
      <div className="ws-iris" />
      <div className="ws-vignette" />
    </div>
  );
});

type Ember = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  da: number;
  color: string;
};

/** The logo red, a lighter red and the page grey, weighted toward red. */
const EMBER_COLORS = ['196,48,43', '226,86,74', '226,86,74', '155,161,166'];

/** Embers per 1600x900 of screen, so a small window is not a blizzard. */
const EMBER_DENSITY = 64;

const spawn = (w: number, h: number, anywhere: boolean): Ember => ({
  x: Math.random() * w,
  y: anywhere ? Math.random() * h : h + 4,
  r: 0.5 + Math.random() * 1.6,
  vx: (Math.random() - 0.5) * 0.35,
  vy: -(0.25 + Math.random() * 0.8),
  a: 0.08 + Math.random() * 0.57,
  da: (Math.random() - 0.5) * 0.01,
  color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
});

/** Sparse, slow and small: a mood behind the cards, not something to watch. */
const Embers = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let embers: Ember[] = [];
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((EMBER_DENSITY * w * h) / (1600 * 900));
      embers = Array.from({ length: count }, () => spawn(w, h, true));
    };

    const step = (now: number) => {
      // Per 60 Hz frame, and capped so a tab coming back does not jump.
      const k = Math.min((now - last) / 16.7, 3);
      last = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];

        e.x += e.vx * k;
        e.y += e.vy * k;
        e.a += e.da * k;
        if (e.a < 0.08 || e.a > 0.65) e.da = -e.da;

        if (e.y < -4 || e.x < -4 || e.x > w + 4) {
          embers[i] = spawn(w, h, false);
          continue;
        }

        // Fade in over the bottom and out toward the top, where the logo is.
        const band = Math.min(1, (e.y / h) * 1.8);

        ctx.fillStyle = `rgba(${e.color},${(e.a * band).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(step);
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="ws-embers" />;
};
