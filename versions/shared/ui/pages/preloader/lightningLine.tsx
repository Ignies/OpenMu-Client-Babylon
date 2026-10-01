import { useEffect, useRef } from 'react';
import { bolt, drawBolt, fork, stroke, surgeStretch, type Point } from './bolt';
import { glowPulse, rampAt, sparkSprites } from './sparkSprites';

/**
 * The logo's crack carried on down the page as red lightning, the loading
 * bar's bolt stood on end. Once the load is done it strikes down from the
 * logo to the middle, where Start waits; when the card opens it carries on to
 * the footer. It sits behind the card.
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

/** How far the bolt may stray off its line, px. */
const REACH = 9;

/** A new bolt this often, ms: the flicker. */
const BOLT_MS = 70;

/** It waits for the logo to draw in, then takes this long to reach the middle, and to reach the footer. */
const LOGO_WAIT = 0.75;
const TO_MIDDLE = 1;
const TO_FOOT = 0.6;

/** A surge runs down it every `SURGE_EVERY` seconds, taking `SURGE_RUN`. */
const SURGE_EVERY = 3.1;
const SURGE_RUN = 0.9;

/** Sparks off the striking head per second, and embers off the length. */
const SPARK_RATE = 40;
const EMBER_RATE = 8;

export const LightningLine = ({
  phase,
}: {
  phase: 'loading' | 'ready' | 'open';
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const stage = canvas?.parentElement;
    if (!canvas || !ctx || !stage) return;

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
    let reach = 0;
    let readyAt = -1;
    let raf = 0;
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

      const box = canvas.getBoundingClientRect();
      const area = stage.getBoundingClientRect();
      const middle = area.top + area.height / 2 - box.top;
      const cx = width / 2;
      const current = phaseRef.current;

      // How far down it has struck: nothing while loading, to the middle once
      // the logo has drawn, to the footer once the card opens.
      if (current === 'loading') {
        reach = 0;
        readyAt = -1;
      } else {
        if (readyAt < 0) readyAt = time;
        const target = current === 'open' ? height : middle;
        const speed =
          current === 'open' ? height / TO_FOOT : middle / TO_MIDDLE;
        if (time - readyAt >= LOGO_WAIT || still) {
          reach = still ? target : Math.min(target, reach + speed * dt);
        }
      }

      const striking =
        reach > 0 && reach < (current === 'open' ? height : middle) - 0.5;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = still ? 'source-over' : 'lighter';

      if (reach > 2) {
        if (still) {
          stroke(
            ctx,
            [
              { x: cx, y: 0 },
              { x: cx, y: reach },
            ],
            3,
            'rgba(226, 70, 48, 0.9)'
          );
        } else {
          if (now - boltAt > BOLT_MS) {
            boltAt = now;
            points = bolt({ x: cx, y: 0 }, { x: cx, y: reach }, REACH);
            forks = [];
            if (Math.random() < 0.5 && points.length > 6) {
              const near = Math.floor(
                points.length * (0.3 + Math.random() * 0.65)
              );
              forks.push(fork(points[near], 0, 1));
            }
          }

          const glow = glowPulse(time) * (0.85 + Math.random() * 0.15);
          drawBolt(ctx, points, glow, forks);

          // A hot stretch running down it now and then.
          const surge = (time % SURGE_EVERY) / SURGE_RUN;
          if (surge < 1) {
            const at = reach * (surge * surge * (3 - 2 * surge));
            const stretch = surgeStretch(points, 'y', at, 40);
            stroke(ctx, stretch, 6, 'rgba(255, 150, 100, 0.35)');
            stroke(ctx, stretch, 2.4, 'rgba(255, 240, 220, 0.9)');
          }

          // The head burns while it strikes, and glows where it rests.
          const r = (striking ? 16 : 10) * (0.8 + glow * 0.3);
          ctx.globalAlpha = striking ? 0.95 : 0.6;
          ctx.drawImage(sprites[2], cx - r, reach - r, r * 2, r * 2);
          ctx.globalAlpha = 1;

          if (striking) {
            owedSparks += dt * SPARK_RATE;
            while (owedSparks >= 1) {
              owedSparks--;
              sparks.push({
                x: cx + (Math.random() - 0.5) * 6,
                y: reach,
                vx: (Math.random() - 0.5) * 160,
                vy: -30 - Math.random() * 110,
                gravity: 380,
                age: 0,
                life: 0.25 + Math.random() * 0.4,
                size: 3 + Math.random() * 4,
              });
            }
          }

          owedEmbers += dt * EMBER_RATE * Math.min(1, reach / 300);
          while (owedEmbers >= 1) {
            owedEmbers--;
            sparks.push({
              x: cx + (Math.random() - 0.5) * 10,
              y: Math.random() * reach,
              vx: (Math.random() - 0.5) * 24,
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
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ws-strike" aria-hidden />;
};
