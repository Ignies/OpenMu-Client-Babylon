import type { Item } from '../ecs/world';

/**
 * The item whose tooltip is up right now, which Alt+click links into chat.
 * `ItemTooltip` writes it while it is mounted, so every item window takes
 * part without a handler of its own.
 */
export const ItemLinkHover = {
  item: null as Item | null,
  /** An Alt+click linked something while Alt was down (worldObjects undoes its drop-name toggle). */
  linkedDuringAlt: false,

  show(item: Item): void {
    this.item = item;
  },

  hide(item: Item): void {
    if (this.item === item) this.item = null;
  },
};
