import { useEffect, useRef } from 'react';
import { bolt, drawBolt, type Point } from './bolt';
import { glowPulse } from './sparkSprites';

/**
 * The footer lit by the strike: when the lightning coming down from the logo
 * reaches the bottom, it breaks on the ground there and spreads out to both
 * sides into a block behind the footer's line, just the size of what it says:
 * lightning running round its edges and white inside. The line is written
 * over it in black (`.ws-status` inks itself on the same cue).
 */

/** When the strike reaches the footer after the card opens, and how long it takes to run out. */
const ARRIVE = 0.6;
const SPREAD = 0.55;

/** How far the block stands out round the footer's line, px, and how often its edges re-strike. */
const PAD_X = 16;
const PAD_Y = 5;
const BOLT_MS = 80;

export const FooterStrike = ({ lit }: { lit: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const litRef = useRef(lit);
  litRef.current = lit;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const main = canvas?.parentElement;
    if (!canvas || !ctx || !main) return;

    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')
      .matches;
    const start = performance.now();
    let litAt = -1;
    let edges: Point[][] = [];
    let boltAt = -Infinity;
    let raf = 0;
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
      const time = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      if (!litRef.current) {
        litAt = -1;
      } else {
        if (litAt < 0) litAt = time;
        const k = still
          ? 1
          : Math.min(1, Math.max(0, (time - litAt - ARRIVE) / SPREAD));

        const status = main
          .querySelector('.ws-status')
          ?.getBoundingClientRect();

        if (k > 0 && status && status.width > 0) {
          const box = canvas.getBoundingClientRect();
          const cx = status.left + status.width / 2 - box.left;
          const cy = status.top + status.height / 2 - box.top;
          const half = (status.width / 2 + PAD_X) * (1 - Math.pow(1 - k, 3));
          const tall = status.height / 2 + PAD_Y;
          const glow = still
            ? 1
            : glowPulse(time) * (0.9 + Math.random() * 0.1);

          // Inside: plain white, for the black lettering.
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowColor = `rgba(226, 70, 48, ${0.75 * glow})`;
          ctx.shadowBlur = 22;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.roundRect(cx - half, cy - tall, half * 2, tall * 2, 2);
          ctx.fill();
          ctx.restore();

          // The edges: lightning running round the block, nothing across it.
          if (!still) {
            if (now - boltAt > BOLT_MS) {
              boltAt = now;
              const l = cx - half;
              const r = cx + half;
              const top = cy - tall;
              const bottom = cy + tall;
              edges = [
                bolt({ x: l, y: top }, { x: r, y: top }, 3.5),
                bolt({ x: l, y: bottom }, { x: r, y: bottom }, 3.5),
                bolt({ x: l, y: top }, { x: l, y: bottom }, 3),
                bolt({ x: r, y: top }, { x: r, y: bottom }, 3),
              ];
            }
            ctx.globalCompositeOperation = 'lighter';
            for (const points of edges) drawBolt(ctx, points, glow);
          }
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ws-footer-strike" aria-hidden />;
};
