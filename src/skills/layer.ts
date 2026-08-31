import type { ENUM_WORLD } from '../common/types';

/**
 * The contract every skill-system entry implements: one file per entry, one
 * exported `SkillLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Entries own the client-side skill bookkeeping the server does not send —
 * buff timers, cooldowns, usability rules, the master tree — and the UI reads
 * them through the `skills` facade. The layer is only the *lifecycle*.
 */
export interface SkillLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** Maps this entry exists on. Omit for every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Stepped once a frame, in `layers.ts` order, before anything reads the
   * skills. `dt` is seconds. Must be cheap: no allocation, no scene walk.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /** The map changed (or the hero left the world): drop everything held. */
  reset?(): void;
}
