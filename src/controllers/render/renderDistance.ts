/**
 * How far from the hero map objects are kept loaded, in tiles. Step 0 is the old
 * 32/40; the original draws every block the frustum touches (ZzzObject.cpp:3272).
 */
export type RenderDistanceRanges = {
  readonly visible: number;
  readonly nearby: number;
};

export const RENDER_DISTANCE_STEPS: readonly RenderDistanceRanges[] = [
  { visible: 32, nearby: 40 },
  { visible: 64, nearby: 80 },
  { visible: 96, nearby: 120 },
  { visible: 128, nearby: 160 },
  { visible: 160, nearby: 200 },
  { visible: 192, nearby: 240 },
  { visible: 224, nearby: 280 },
  { visible: 256, nearby: 320 },
  { visible: 320, nearby: 400 },
  { visible: 384, nearby: 480 },
];

export const RENDER_DISTANCE_MAX = RENDER_DISTANCE_STEPS.length - 1;

export function renderDistanceRanges(step: number): RenderDistanceRanges {
  return (
    RENDER_DISTANCE_STEPS[
      Math.max(0, Math.min(RENDER_DISTANCE_MAX, Math.round(step)))
    ] ?? RENDER_DISTANCE_STEPS[0]
  );
}
