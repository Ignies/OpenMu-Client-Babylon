/**
 * The level an item is drawn at: `RenderPartObjectEffect`'s switch on the model (ZzzObject.cpp:9419-9563),
 * before the render-level cap. Applies on the body, the ground and in the bag alike. See readme.md.
 */

type Rule = number | ((level: number) => number);

const key = (group: number, num: number) => group * 512 + num;

const twicePlusOne = (l: number) => (l >= 1 ? l * 2 + 1 : 0);
const devilTicket = (l: number) => (l <= 6 ? l >> 1 : 13);

/** (group, num) -> drawn level, from the model cases of the switch. */
const RULES = new Map<number, Rule>();
const set = (rule: Rule, group: number, ...nums: number[]) => {
  for (const n of nums) RULES.set(key(group, n), rule);
};

// Group 4: bolt and arrows.
set(twicePlusOne, 4, 7, 15);
// Group 12: wings and capes 0, jewels 8, orbs and crystals 9, packed stones 0.
set(0, 12, 0, 1, 2, 3, 4, 5, 6, 36, 37, 38, 39, 40, 41, 42, 43, 49, 50, 11, 139, 140, 142, 143);
set(8, 12, 15, 30, 31, 136, 137, 138, 141);
set(9, 12, 7, 12, 13, 14, 16, 17, 18, 19, 44, 45, 46, 47);
// Group 13: Horn of Dinorant and the plain ring 8, the transformation rings 13, the Cape of Lord and Condor items 0.
set(8, 13, 3, 10);
set(13, 13, 39, 40, 41, 42);
set(0, 13, 30, 50, 52, 53);
// Group 14: jewels 8 (the Heart's three models too), Christmas Star 13, Devil Square tickets, stones 0.
set(8, 14, 12, 13, 14, 16, 22, 25, 26, 31);
set(13, 14, 51);
set(devilTicket, 14, 17, 18, 19);
set(9, 14, 20);
set(0, 14, 41, 42, 43, 44, 64);

/**
 * The ground models `CreateItem` puts in place of a few items by level (ZzzObject.cpp:6014-6136), by their
 * own case of the switch (`MODEL_EVENT + n`). Only the ground swaps the model; the bag keeps the item's.
 */
function groundLevel(group: number, num: number, level: number): number | null {
  if (group === 14) {
    if (num === 11) {
      // Box of Luck: EVENT + 4 / 5 / 8 at 0, + 6 at 9 or 13, + 9 at 8, + 10 at (L - 8) * 2 + 1.
      if (level === 1 || level === 2 || level === 5 || level === 14 || level === 15) return 0;
      if (level === 3) return 9;
      if (level === 13) return 13;
      if (level === 6) return 8;
      if (level >= 8 && level <= 12) return (level - 8) * 2 + 1;
      return null;
    }
    if (num === 21 && (level === 1 || level === 2)) return level - 1; // Rena: EVENT + 11
    if ((num === 23 || num === 24 || num === 9) && level === 1) return 0; // EVENT + 12 / 13 / 7
    return null;
  }
  if (group === 13) {
    if (num === 20 && level === 0) return 8; // Wizards Ring: EVENT + 15
    if (num === 20 && level <= 3) return level + 7; // Ring of Lord: EVENT + 14
    if (num === 14 && level === 1) return 0; // Loch's Feather: EVENT + 16
  }
  return null;
}

/** The drawn level of item (group, num) at `level`; `ground` for a drop, whose model `CreateItem` may swap. */
export function itemDrawLevel(group: number, num: number, level: number, ground = false): number {
  if (ground) {
    const swapped = groundLevel(group, num, level);
    if (swapped !== null) return swapped;
  }
  const rule = RULES.get(key(group, num));
  if (rule === undefined) return level;
  return typeof rule === 'number' ? rule : rule(level);
}
