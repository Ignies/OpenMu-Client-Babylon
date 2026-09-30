/**
 * How far from the hero map objects are kept loaded, in tiles.
 *
 * `CalculateVisibilitySystem` held 32/40 as constants, sized for the ported
 * camera's default framing - the original has no such radius, it draws every
 * 16x16 object block the 2D frustum touches (`RenderObjects`,
 * ZzzObject.cpp:3272). The camera facade's zoom, pitch and FOV sliders all
 * push the horizon well past that pair, so the radius is a player choice
 * rather than a constant: step 0 is exactly what the client always had, and
 * the top step is wider than the map's own diagonal (256 * sqrt(2) = 362), so
 * it holds every object on the map at once.
 *
 * Both rings load the model (`ModelLoaderSystem`) and only `hidden` disposes
 * one. `visible` is the inner ring: it loads first while the models stream in,
 * and it is what the systems that walk objects rather than frustum-cull them
 * read - the ceiling flood fill, picking, highlights.
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
