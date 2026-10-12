import type { MeshPass, MeshPassSet } from '../render/meshPasses';
import { legacyItemEffectsOn } from './itemEffectMode';

export type { MeshPass } from '../render/meshPasses';

/**
 * One item's own look beyond its model, as content declares it (`versions/shared/item_looks/`):
 * `body` is its `RenderPartObjectBody` branch (ZzzObject.cpp:6890-8920), drawn worn, on the ground
 * and in the bag. It belongs to the original's passes, so it follows the Item effects option.
 */
export type ItemLook = {
  /** `[group, index]` of every item the look is for (an armour set names its pieces). */
  readonly items: readonly (readonly [number, number])[];
  readonly body?: { readonly passes: readonly MeshPass[]; readonly drawn?: readonly number[] };
};

export const defineItemLook = (look: ItemLook): ItemLook => look;

/** A pass light the branch sets outright (`Vector(r, g, b, b->BodyLight)`), whatever the body's. */
export const fixedLight =
  (r: number, g: number, b: number): NonNullable<MeshPass['light']> =>
  (_ms, _body, out) => {
    out.set(r, g, b);
  };

/** Chrome01 on the normal look-up: RENDER_CHROME with no texture of its own (ZzzBMD.cpp:1478). */
export const CHROME01 = { texture: 'Effect/Chrome01.OZJ', map: 'chrome' } as const;

const bodies = new Map<number, MeshPassSet>();
const key = (group: number, num: number) => group * 512 + num;

/** Content's looks, handed in at boot; a later look for the same item replaces the earlier one. */
export function registerItemLooks(looks: readonly ItemLook[]): void {
  for (const look of looks) {
    if (!look.body) continue;
    const set: MeshPassSet = { ...look.body, shown: legacyItemEffectsOn };
    for (const [group, num] of look.items) bodies.set(key(group, num), set);
  }
}

/** The passes the item's model draws over its lit body, or null. */
export function itemBodyPasses(group: number, num: number): MeshPassSet | null {
  return bodies.get(key(group, num)) ?? null;
}
