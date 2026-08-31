import type { ENUM_WORLD } from '../common/types';

/**
 * The contract every combat-timing entry implements. One file per entry, one
 * exported `CombatLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Entries own the client-side *timing* of fighting — the swing latch, the
 * input gate, the skill re-use delays, a held charge, a multi-hit streak.
 * They never send packets on their own initiative and never touch the
 * scene: the ECS systems that fight (`attackSystem`, `skillCastSystem`) read
 * these entries and do the sending. The layer is only the *lifecycle*.
 */
export interface CombatLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** Maps this entry exists on. Omit for every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Stepped once a frame, in `layers.ts` order, before any consumer reads
   * the combat state. `dt` is seconds. Must be cheap: no allocation, no
   * scene walk.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /** The map changed (or the hero died / left): drop every latch and timer. */
  reset?(): void;
}
