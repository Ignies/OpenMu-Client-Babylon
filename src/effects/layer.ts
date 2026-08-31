import type { ENUM_WORLD } from '../common/types';
import type { Scene, Vector3 } from '../libs/babylon/exports';

/**
 * The contract every visual effect implements. One file per effect, one
 * exported `EffectLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Effects differ from weather in one way: they are *spawned* — a skill, a
 * packet or a buff asks for one at a point, and it lives for its own
 * duration. So the contract adds `spawn`, and `update` is where an entry
 * steps the effects it has spawned (its own live list, from `core.ts`).
 */

/** What a spawn hands back: enough to end it early and to ask if it is over. */
export interface EffectHandle {
  /** False once the effect has finished (or was stopped) and released its pool slots. */
  readonly alive: boolean;
  /** End it now — a buff cancelled, a flame column released, a map left. */
  stop(): void;
}

export interface EffectLayer<TOptions = unknown, TName extends string = string> {
  /** Unique camelCase, identical to the file name. */
  readonly name: TName;

  /** Maps this exists on. Omit = every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Once a frame, in list order, before anything reads the system. `dt` is
   * seconds. Steps this entry's live effects. Must be cheap: no allocation.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /** Map changed: end every live effect and dispose the pools this entry owns. */
  reset?(): void;

  /**
   * Start one effect at `at` (world position, tiles). `opts` is the entry's
   * own option type — what flies where, which texture, what colour, how
   * long. Every effect is spawnable; the handle ends it early.
   */
  spawn(scene: Scene, at: Vector3, opts: TOptions): EffectHandle;
}

/** A handle for an effect that never started (bad options, missing target). */
export const DEAD_HANDLE: EffectHandle = { alive: false, stop() {} };
