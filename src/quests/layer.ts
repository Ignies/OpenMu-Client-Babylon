import type { ENUM_WORLD } from '../common/types';

/**
 * The contract every quest entry implements: one file per topic (the data
 * tables, the legacy Scroll-of-Emperor chain, the Season 6 quest log, the
 * kill counters, the HUD bubbles), one exported `QuestLayer` per file,
 * listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * Only the common core: quests have nothing every
 * entry must provide beyond lifecycle. Packet handlers, MobX state for the
 * windows and commands live in the entry files and are re-exported through
 * the `quests` facade.
 */
export interface QuestLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** Maps this entry exists on. Omit = every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Once a frame, in `layers.ts` order, before anything reads the quests.
   * `dt` is seconds. Must be cheap: no allocation, no scene walk.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /**
   * Map changed: close the NPC windows (the original hides every NPC
   * interface on `ReceiveMapChange`) and drop anything bound to the world
   * just left. Quest *state* survives — it belongs to the character.
   */
  reset?(): void;
}
