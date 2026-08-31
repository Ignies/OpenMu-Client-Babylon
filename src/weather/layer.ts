import type { ENUM_WORLD } from '../common/types';

/**
 * The contract every weather effect implements. One file per effect, one
 * exported `WeatherLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Keep it small on purpose: an effect that needs more than this (a terrain
 * overlay, a particle recipe, a sound) declares it in its own file and the
 * consumer that draws it imports it from there. The layer is only the
 * *lifecycle* — what happens each frame and what happens on a map change.
 */
export interface WeatherLayer {
  /** Unique, kebab-free camelCase, same as the file name. */
  readonly name: string;

  /**
   * Maps this effect exists on. Omit for "every map" (the effect then has to
   * decide per map inside `update`). Purely informational for the facade
   * today; used by `weather.layersFor(map)` and tooling.
   */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Stepped once a frame, in `layers.ts` order, before anything reads the
   * weather. `dt` is seconds. Must be cheap: no allocation, no scene walk.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /**
   * The map changed. Drop everything belonging to the world just left —
   * accumulators, pools, particle systems. Called before the new map's
   * terrain material binds, so anything a shader samples must be zeroed here.
   */
  reset?(): void;
}
