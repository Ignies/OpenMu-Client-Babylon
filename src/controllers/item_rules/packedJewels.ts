/** The packed jewels, `ITEM_PACKED_*` (_enum.h:2635-2636, :2697-2704): group 12, 30-31 and 136-143. */
const PACKED: ReadonlySet<number> = new Set([30, 31, 136, 137, 138, 139, 140, 141, 142, 143]);

/** The potions `RenderNumberOfItem` counts (NewUIInventoryCtrl.cpp:1543-1578), as [first, last] of group 14. */
const STACKING_POTIONS: readonly (readonly [number, number])[] = [
  [0, 8], [46, 50], [35, 40], [70, 71], [94, 94], [78, 82], [85, 90], [133, 133],
];

export function isPackedJewel(group: number, num: number): boolean {
  return group === 12 && PACKED.has(num);
}

/** The number drawn on a square: a packed jewel's `(Level + 1) * 10` loose jewels (`CalcCompiledCount`), a potion's pieces; 1 or less draws none. */
export function stackCount(item: { group: number; num: number; lvl?: number; durability?: number }): number {
  if (isPackedJewel(item.group, item.num)) return ((item.lvl ?? 0) + 1) * 10;
  if (item.group !== 14) return 0;
  for (const [first, last] of STACKING_POTIONS) {
    if (item.num >= first && item.num <= last) return item.durability ?? 0;
  }
  return 0;
}
