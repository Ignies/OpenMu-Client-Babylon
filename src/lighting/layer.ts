import type { ENUM_WORLD } from '../common/types';
import type { LightSource } from './lightSource';

/**
 * The contract every lighting entry implements. One file per entry, one
 * exported `LightingLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * The common core (`name`, `maps?`, `update?`, `reset?`) is spelled exactly as
 * in every other system . Lighting adds one reader:
 * `emitters?(map)` — the light sources the entry currently has alive, so the
 * facade, the perf overlay and tooling can see what is lighting the map from
 * one call. Registration into the two sinks (the terrain delta texture and
 * the point-light pool) is done by `LightSource` itself; entries never talk
 * to the sinks directly.
 */
export interface LightingLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /**
   * Maps this entry exists on. Omit for "every map". Informational for the
   * facade today; used by `lighting.layersFor(map)` and tooling.
   */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Once a frame, in `layers.ts` order, before anything reads the lighting.
   * `dt` is seconds. Must be cheap: no allocation, no scene walk. The shared
   * `LightSource` tick (envelopes, travel, tile re-registration) runs before
   * the entries, from the facade.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /**
   * The map changed. Drop everything belonging to the world just left —
   * every source this entry attached is already disposed by the facade
   * (`disposeAllLightSources`), so this only has to forget its handles.
   */
  reset?(): void;

  /** What this entry is lighting right now. Read-only; do not mutate. */
  emitters?(map: ENUM_WORLD): readonly LightSource[];
}
