import { useEffect, useRef, type RefObject } from 'react';
import { glowPulse, rampAt, sparkSprites } from './sparkSprites';
import { bolt, drawBolt, fork, stroke, surgeStretch, type Point } from './bolt';

/**
 * The bar's fill as red lightning, lit the way the logo is: a jagged bolt from
 * the start of the bar to the hunter's feet, redrawn a dozen times a second,
 * breathing with the logo's glow, a surge running along it now and then,
 * forks crackling off its head, and sparks thrown from it.
 *
 * It follows the hunter's drawn position rather than the progress number, so
 * the bolt ends under his feet while he eases along. The same position opens
 * the window in the darkness over the map (`--reveal` on the page, read by
 * `.ws-iris`).
 */

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
};

/** How far the canvas reaches past each end of the bar, px. */
const PAD_X = 48;

/** Where the front foot is in the runner's box (it is shifted back by 66%). */
const FOOT_X = 0.66;

/** A new bolt this often, ms: the flicker of the lightning. */
const BOLT_MS = 70;

/** How far the bolt may stray off the bar's line, px. */
const REACH = 11;

/** A surge runs tail to head every `SURGE_EVERY` seconds, taking `SURGE_RUN`. */
const SURGE_EVERY = 2.6;
const SURGE_RUN = 0.8;

/** Sparks thrown off the head per second, and embers lifting off the length. */
const SPARK_RATE = 55;
const EMBER_RATE = 14;

export const LightningBar = ({
  runner,
}: {
  runner: RefObject<HTMLDivElement>;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const page = canvas.closest<HTMLElement>('.ws-page');
    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')
      .matches;
    const sprites = sparkSprites();
    const start = performance.now();

    let points: Point[] = [];
    let forks: Point[][] = [];
    let boltAt = -Infinity;
    let sparks: Spark[] = [];
    let owedSparks = 0;
    let owedEmbers = 0;
    let frame = 0;
    let last = start;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      const time = (now - start) / 1000;
      last = now;

      const from = PAD_X;
      const end = width - PAD_X;
      const y = height / 2;
      const box = canvas.getBoundingClientRect();
      const hunter = runner.current?.getBoundingClientRect();
      const head = hunter?.width
        ? Math.min(
            end,
            Math.max(from, hunter.left - box.left + hunter.width * FOOT_X)
          )
        : from;
      const length = head - from;

      if (page) {
        const at = page.getBoundingClientRect();
        page.style.setProperty(
          '--reveal',
          (length / Math.max(1, end - from)).toFixed(3)
        );
        page.style.setProperty(
          '--reveal-x',
          `${box.left - at.left + width / 2}px`
        );
        page.style.setProperty('--reveal-y', `${box.top - at.top + y}px`);
      }

      ctx.clearRect(0, 0, width, height);

      if (length > 2) {
        if (still) {
          ctx.globalCompositeOperation = 'source-over';
          stroke(
            ctx,
            [
              { x: from, y },
              { x: head, y },
            ],
            3,
            'rgba(226, 70, 48, 0.9)'
          );
        } else {
          if (now - boltAt > BOLT_MS) {
            boltAt = now;
            points = bolt({ x: from, y }, { x: head, y }, REACH);
            forks = [];
            // Forks only near the head, where the energy is.
            for (let i = 0; i < 2; i++) {
              if (Math.random() < 0.7 && points.length > 3) {
                const near =
                  points.length -
                  1 -
                  Math.floor(Math.random() * Math.min(5, points.length - 1));
                forks.push(fork(points[near], 1, 0));
              }
            }
          }

          const glow = glowPulse(time) * (0.85 + Math.random() * 0.15);
          ctx.globalCompositeOperation = 'lighter';

          drawBolt(ctx, points, glow, forks);

          // The surge: a hot stretch running from the tail to the head.
          const surge = (time % SURGE_EVERY) / SURGE_RUN;
          if (surge < 1) {
            const at = from + length * (surge * surge * (3 - 2 * surge));
            const stretch = surgeStretch(points, 'x', at, 46);
            stroke(ctx, stretch, 6, 'rgba(255, 150, 100, 0.35)');
            stroke(ctx, stretch, 2.4, 'rgba(255, 240, 220, 0.9)');
          }

          // The head, burning under his feet.
          const r = (15 + Math.sin(time * 9) * 3) * (0.8 + glow * 0.3);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(sprites[2], head - r, y - r, r * 2, r * 2);
          ctx.drawImage(
            sprites[0],
            head - r / 2.5,
            y - r / 2.5,
            r / 1.25,
            r / 1.25
          );
          ctx.globalAlpha = 1;

          owedSparks += dt * SPARK_RATE;
          while (owedSparks >= 1) {
            owedSparks--;
            // Mostly off the head, thrown back and up and falling again.
            const x = head - Math.abs(Math.random() + Math.random() - 1) * 60;
            sparks.push({
              x,
              y: y + (Math.random() - 0.5) * 6,
              vx: -40 - Math.random() * 120,
              vy: -40 - Math.random() * 140,
              gravity: 380,
              age: 0,
              life: 0.25 + Math.random() * 0.4,
              size: 3 + Math.random() * 4,
            });
          }

          owedEmbers += dt * EMBER_RATE * Math.min(1, length / 300);
          while (owedEmbers >= 1) {
            owedEmbers--;
            // Anywhere along the bolt, drifting up the way the logo's do.
            sparks.push({
              x: from + Math.random() * length,
              y: y + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 20,
              vy: -18 - Math.random() * 30,
              gravity: -10,
              age: 0,
              life: 0.9 + Math.random() * 0.9,
              size: 4 + Math.random() * 4,
            });
          }
        }
      }

      for (const s of sparks) {
        s.age += dt;
        s.vy += s.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const t = s.age / s.life;
        if (t >= 1) continue;

        const size = s.size * (1 - t * 0.5);
        ctx.globalAlpha = Math.pow(1 - t, 1.2);
        ctx.drawImage(
          rampAt(sprites, t),
          s.x - size / 2,
          s.y - size / 2,
          size,
          size
        );
      }

      sparks = sparks.filter(s => s.age < s.life);
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      page?.style.setProperty('--reveal', '1');
    };
  }, [runner]);

  return <canvas ref={ref} className="ws-lightning" aria-hidden />;
};
