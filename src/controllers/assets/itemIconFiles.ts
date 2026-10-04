import { ITEM_ICON_MANIFEST } from './itemIconManifest';

/**
 * Which pre-rendered icon files exist, from the generated manifest alone: no item tables, no
 * game version, so server processes (the cash shop) can ask too. See assets/readme.md.
 */

/** Tints the pack was rendered at: +0, +3, +5, … +15 (manifest bit order). */
export const ITEM_ICON_TINTS: readonly number[] = [0, 3, 5, 7, 9, 11, 13, 15];

export type Variant = '' | '_e' | '_a';

const VARIANT_BIT: Readonly<Record<Variant, number>> = {
  '': 0,
  _e: ITEM_ICON_TINTS.length,
  _a: ITEM_ICON_TINTS.length * 2,
};

/** Whether `public/items` holds this exact file (per the generated manifest). */
export function hasItemIconFile(
  group: number,
  num: number,
  tint: number,
  variant: Variant
): boolean {
  const mask = ITEM_ICON_MANIFEST[`${group}_${num}`];
  if (mask === undefined) return false;
  const tintIndex = ITEM_ICON_TINTS.indexOf(tint);
  if (tintIndex < 0) return false;
  return (mask & (1 << (tintIndex + VARIANT_BIT[variant]))) !== 0;
}
