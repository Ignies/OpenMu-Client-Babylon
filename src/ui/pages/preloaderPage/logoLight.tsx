import { useEffect, useRef } from 'react';
import { rampAt, sparkSprites } from './sparkSprites';

const LOGO_ART = '/ui/world_select/logo.webp';

/** The logo's red light alone - the crack, the star, the red letters - on transparent. */
const GLOW_ART = '/ui/world_select/logo_glow.webp';

/**
 * The logo with its light alive: the red parts pulse and flicker, a surge runs
 * down the crack now and then (`style.less`), and sparks lift off whatever is
 * lit. The sparks are born on the glow layer's own pixels, so they only ever
 * come off the light and never off the metal.
 */
export const LogoLight = () => (
  <div className="ws-logo">
    <img
      className="ws-logo-art"
      src={LOGO_ART}
      alt="OpenMU Babylon"
      draggable={false}
    />
    <img className="ws-logo-bloom" src={GLOW_ART} alt="" draggable={false} />
    <img className="ws-logo-glow" src={GLOW_ART} alt="" draggable={false} />
    <img className="ws-logo-surge" src={GLOW_ART} alt="" draggable={false} />
    <Sparks />
  </div>
);

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  glint: boolean;
};

/** Sparks and glints lit per second. */
const SPARK_RATE = 26;
const GLINT_RATE = 3;

/** How far the canvas reaches past the logo on each side, as a fraction of it. */
const REACH_X = 0.15;
const REACH_Y = 0.1;

/** The glow is sampled on a grid this coarse; plenty for picking birthplaces. */
const SAMPLE_W = 170;

/** Where the light is, as 0..1 points over the logo, read off the glow layer's pixels. */
function lightPoints(image: HTMLImageElement): [number, number][] {
  const w = SAMPLE_W;
  const h = Math.round((image.naturalHeight / image.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(image, 0, 0, w, h);

  const data = g.getImageData(0, 0, w, h).data;
  const points: [number, number][] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 110)
        points.push([(x + 0.5) / w, (y + 0.5) / h]);
    }
  }

  return points;
}

const Sparks = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const sprites = sparkSprites();
    let points: [number, number][] = [];
    let sparks: Spark[] = [];
    let owedSparks = 0;
    let owedGlints = 0;
    let frame = 0;
    let last = performance.now();
    let width = 0;
    let height = 0;
    let disposed = false;

    const glow = new Image();
    glow.onload = () => {
      if (!disposed) points = lightPoints(glow);
    };
    glow.src = GLOW_ART;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    /** A point on the light, in canvas pixels. */
    const somewhereLit = (): [number, number] => {
      const [u, v] = points[Math.floor(Math.random() * points.length)];
      const logoW = width / (1 + REACH_X * 2);
      const logoH = height / (1 + REACH_Y * 2);

      return [(u + REACH_X) * logoW, (v + REACH_Y) * logoH];
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (points.length) {
        const scale = height / 240;

        owedSparks += dt * SPARK_RATE;
        while (owedSparks >= 1) {
          owedSparks--;
          const [x, y] = somewhereLit();
          sparks.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 24 * scale,
            vy: -(12 + Math.random() * 30) * scale,
            age: 0,
            life: 0.9 + Math.random() * 1.1,
            size: (4 + Math.random() * 5) * scale,
            glint: false,
          });
        }

        owedGlints += dt * GLINT_RATE;
        while (owedGlints >= 1) {
          owedGlints--;
          const [x, y] = somewhereLit();
          sparks.push({
            x,
            y,
            vx: 0,
            vy: 0,
            age: 0,
            life: 0.45 + Math.random() * 0.35,
            size: (18 + Math.random() * 20) * scale,
            glint: true,
          });
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const s of sparks) {
        s.age += dt;
        s.vy -= 6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const t = s.age / s.life;
        if (t >= 1) continue;

        if (s.glint) {
          // Swells and fades in place: a flare on the metal where the light is.
          ctx.globalAlpha = Math.sin(t * Math.PI) * 0.55;
          ctx.drawImage(
            sprites[1],
            s.x - s.size / 2,
            s.y - s.size / 2,
            s.size,
            s.size
          );
        } else {
          const size = s.size * (1 - t * 0.5);
          ctx.globalAlpha = Math.pow(1 - t, 1.2) * Math.min(1, t * 8);
          ctx.drawImage(
            rampAt(sprites, t),
            s.x - size / 2,
            s.y - size / 2,
            size,
            size
          );
        }
      }

      sparks = sparks.filter(s => s.age < s.life);
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ws-logo-sparks" aria-hidden />;
};
