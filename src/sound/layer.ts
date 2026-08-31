import type { ENUM_WORLD } from '../common/types';

/**
 * The contract every sound entry implements: one file per entry, one
 * exported `SoundLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Entries own *what* is heard — which bed plays under a map, which track,
 * which footstep, which swing — and command the mixer
 * (`libs/soundsManager.ts`) to play it. The layer is only the *lifecycle*:
 * beds and music step every frame; one-shot entries (ui, combat, monsters)
 * are command-only and may have neither `update` nor `reset`.
 */
export interface SoundLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** Maps this entry exists on. Omit for every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Stepped once a frame, in `layers.ts` order, after movement (the beds are
   * muted by the tile under the hero's feet). `dt` is seconds. Must be cheap:
   * no allocation, no scene walk.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /** The map changed: stop what belongs to the world just left. */
  reset?(): void;
}
