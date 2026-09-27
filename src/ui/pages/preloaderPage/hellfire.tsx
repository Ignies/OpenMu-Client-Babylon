import { useEffect, useRef } from 'react';
import { useMuSprite } from '../../components/muSprite';

/**
 * The Dark Wizard's Hellfire on the ground where Start was pressed, drawn with
 * the skill's own art: `Skill/magic_a01` - a quarter of the ring of flame
 * spikes, laid four ways into a disc as MODEL_CIRCLE maps it - growing to 1.3x
 * over its 45 ticks and fading on the last ten, tinted with the skill's fire
 * colour (ZzzEffect.cpp:2137-2175), on the pool of light it throws on the
 * ground. Seen from straight above, on the map under the card: the card opens
 * over it.
 *
 * The art is additive fire on black. The black is turned to transparency once
 * and the canvas is screened onto the map, so the fire lights what is under it.
 */

const RING = 'Data/Skill/magic_a01.OZJ';

/** `RGBS.fire`, the colour the skill draws its circle in. */
const FIRE: [number, number, number] = [1, 0.55, 0.2];

/** 45 ticks at 25 per second, and the last 10 of them fading. */
const LIFE = 1.8;
const FADE = 0.4;

/** The ground disc's width on screen before it grows, px. */
const DISC = 620;

/**
 * The texture tinted as the skill draws it, with its brightness as its alpha:
 * fire on black becomes fire on nothing, and the grey in the art turns to the
 * dim ember it is in the game rather than a white haze.
 */
function tintToAlpha(
  url: string,
  tint: [number, number, number]
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, c.width, c.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i] * tint[0];
        const gr = px[i + 1] * tint[1];
        const b = px[i + 2] * tint[2];
        const a = Math.max(r, gr, b);
        if (a > 0) {
          px[i] = (r * 255) / a;
          px[i + 1] = (gr * 255) / a;
          px[i + 2] = (b * 255) / a;
        }
        px[i + 3] = a;
      }
      g.putImageData(data, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export const Hellfire = () => {
  const ring = useMuSprite(RING);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ringUrl = ring?.url;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    const stage = el?.parentElement?.querySelector('.ws-stage');
    if (!el || !ctx || !ringUrl || !stage) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let cancelled = false;

    void tintToAlpha(ringUrl, FIRE).then(disc => {
      if (cancelled) return;

      const start = performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = el.clientWidth;
      const height = el.clientHeight;
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const step = (now: number) => {
        const t = (now - start) / 1000;
        const grow = 1 + 0.3 * Math.min(1, t / LIFE);
        const fade = t < LIFE - FADE ? 1 : Math.max(0, (LIFE - t) / FADE);
        const rise = Math.min(1, t / 0.12);
        const half = (DISC / 2) * grow;
        const rim = half * 0.86;
        // Where Start was: the middle of the card's place.
        const page = el.getBoundingClientRect();
        const area = stage.getBoundingClientRect();
        const cx = area.left + area.width / 2 - page.left;
        const cy = area.top + area.height / 2 - page.top;

        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        // The ground lit under it, flickering with the fire.
        const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, rim * 1.45);
        light.addColorStop(0, `rgba(255, 150, 70, ${0.5 * fade})`);
        light.addColorStop(0.45, `rgba(226, 80, 44, ${0.3 * fade})`);
        light.addColorStop(1, 'rgba(196, 48, 43, 0)');
        ctx.globalAlpha = rise * (0.85 + 0.15 * Math.sin(t * 17));
        ctx.fillStyle = light;
        ctx.fillRect(cx - rim * 1.5, cy - rim * 1.5, rim * 3, rim * 3);

        // The disc on the ground: one quarter, mirrored into the other three.
        ctx.save();
        ctx.globalAlpha = fade * rise;
        ctx.translate(cx, cy);
        for (const [sx, sy] of [
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]) {
          ctx.save();
          ctx.scale(sx, sy);
          ctx.drawImage(disc, -half, -half, half, half);
          ctx.restore();
        }
        ctx.restore();
        ctx.globalAlpha = 1;

        if (t < LIFE + 0.2) raf = requestAnimationFrame(step);
        else ctx.clearRect(0, 0, width, height);
      };

      raf = requestAnimationFrame(step);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [ringUrl]);

  return <canvas ref={canvas} className="ws-hellfire" aria-hidden />;
};
