import { useEffect, useRef } from 'react';

const WORLD_MAP_ART = '/ui/world_select/world_map.webp';

/**
 * The Babylon site's hero art behind the world picker: the world map drained
 * to grey and washed in the logo's red, a faint grid, embers rising off it.
 * Opaque on purpose - the login scene loads behind this page and is not shown
 * until a world is entered.
 */
export const Backdrop = () => (
  <div className="ws-art" aria-hidden>
    <div className="ws-map-layer">
      <div className="ws-map" style={{ backgroundImage: `url(${WORLD_MAP_ART})` }} />
      <div className="ws-tint" />
    </div>
    <div className="ws-grid" />
    <Embers />
    <div className="ws-vignette" />
  </div>
);

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
