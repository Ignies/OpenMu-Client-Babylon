/** Hot to cool, as a spark burns out. */
export const SPARK_RAMP = [
  '255,240,200',
  '255,196,110',
  '255,128,64',
  '226,70,48',
  '150,28,24',
];

const SPRITE = 32;

/**
 * One soft round glow per ramp colour, so a frame of sparks is image draws
 * rather than a gradient per spark.
 */
export function sparkSprites(): HTMLCanvasElement[] {
  return SPARK_RAMP.map(rgb => {
    const c = document.createElement('canvas');
    c.width = c.height = SPRITE;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(
      SPRITE / 2,
      SPRITE / 2,
      0,
      SPRITE / 2,
      SPRITE / 2,
      SPRITE / 2
    );
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.35, `rgba(${rgb},0.6)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, SPRITE, SPRITE);
    return c;
  });
}

/** The sprite for a spark `t` of the way through its life. */
export function rampAt(
  sprites: HTMLCanvasElement[],
  t: number
): HTMLCanvasElement {
  return sprites[Math.min(sprites.length - 1, Math.floor(t * sprites.length))];
}

/**
 * The light's breathing, shared by everything that glows on the page: a slow
 * swell with a flicker near its peak. The CSS `ws-glow` keyframes follow the
 * same curve for the parts drawn by the stylesheet.
 */
export function glowPulse(seconds: number): number {
  const t = (seconds % 3.4) / 3.4;
  const swell = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
  const flicker = t > 0.34 && t < 0.42 ? 0.75 + 0.25 * Math.sin(t * 400) : 1;

  return (0.45 + 0.55 * swell) * flicker;
}
