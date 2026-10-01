/**
 * The per-item mesh rules of `ItemObjectAttribute` (ZzzObject.cpp:5155-5292): which mesh of an item is
 * drawn additive (`o->BlendMesh`, -2 = every mesh), which is skipped (`o->HiddenMesh`) and the
 * `o->BlendMeshLight` the additive mesh is drawn at. Weapons and shields only (groups 0-6); the
 * random UV jumps of the Legendary shield / staff and the Lightning Sword are not kept.
 *
 * Read by: effects/model.ts `native` (Twisting Slash's wheel copies, Rageful Blow's thrown weapon).
 */

export interface ItemMeshRule {
  /** `o->BlendMesh`: the additive mesh, -2 for every mesh, -1 none. */
  blendMesh: number;
  /** `o->HiddenMesh`, -1 none. */
  hiddenMesh: number;
  /** `o->BlendMeshLight` at `ms` (the original's `WorldTime`); omitted = 1. */
  blendMeshLight?: (ms: number) => number;
}

const pulse = (amount: number, base: number) => (ms: number): number => Math.sin(ms * 0.004) * amount + base;

const NONE: ItemMeshRule = { blendMesh: -1, hiddenMesh: -1 };
const blend = (mesh: number, light?: (ms: number) => number): ItemMeshRule => ({ blendMesh: mesh, hiddenMesh: -1, blendMeshLight: light });
const hidden = (mesh: number): ItemMeshRule => ({ blendMesh: -1, hiddenMesh: mesh });

/** Keyed `group * 512 + num`, as `MODEL_ITEM` indexes them. */
const RULES = new Map<number, ItemMeshRule>([
  [0 * 512 + 5, blend(1)], // MODEL_BLADE
  [0 * 512 + 10, blend(1, pulse(0.3, 0.7))], // MODEL_LIGHT_SABER
  [0 * 512 + 13, blend(1)], // MODEL_DOUBLE_BLADE
  [0 * 512 + 14, blend(1, pulse(0.3, 0.7))], // MODEL_LIGHTING_SWORD
  [0 * 512 + 31, hidden(2)], // MODEL_RUNE_BLADE
  [2 * 512 + 4, blend(1, pulse(0.2, 0.8))], // MODEL_CRYSTAL_MORNING_STAR
  [2 * 512 + 5, blend(0)], // MODEL_CRYSTAL_SWORD
  [2 * 512 + 6, blend(1, pulse(0.3, 0.7))], // MODEL_CHAOS_DRAGON_AXE
  [2 * 512 + 7, hidden(2)], // MODEL_ELEMENTAL_MACE
  [3 * 512 + 0, blend(1, pulse(0.3, 0.7))], // MODEL_SPEAR
  [3 * 512 + 10, hidden(1)], // MODEL_DRAGON_SPEAR
  [4 * 512 + 6, blend(-2, pulse(0.3, 0.7))], // MODEL_CHAOS_NATURE_BOW
  [4 * 512 + 13, blend(-2, pulse(0.3, 0.7))], // MODEL_BLUEWING_CROSSBOW
  [4 * 512 + 14, blend(-2, pulse(0.3, 0.7))], // MODEL_AQUAGOLD_CROSSBOW
  [4 * 512 + 16, blend(-2, pulse(0.2, 0.9))], // MODEL_SAINT_CROSSBOW
  [5 * 512 + 0, blend(2)], // MODEL_STAFF
  [5 * 512 + 5, blend(2)], // MODEL_LEGENDARY_STAFF
  [5 * 512 + 6, blend(-2, pulse(0.3, 0.7))], // MODEL_STAFF_OF_RESURRECTION
  // MODEL_CHAOS_LIGHTNING_STAFF: `rand() % 11 * 0.1` every frame.
  [5 * 512 + 7, blend(1, () => Math.floor(Math.random() * 11) * 0.1)],
  [5 * 512 + 8, blend(-2, pulse(0.2, 0.9))], // MODEL_STAFF_OF_DESTRUCTION
  [5 * 512 + 9, blend(1)], // MODEL_DRAGON_SOUL_STAFF
  [5 * 512 + 11, blend(2, pulse(0.3, 0.7))], // MODEL_STAFF_OF_KUNDUN
  [6 * 512 + 11, blend(1, pulse(0.3, 0.7))], // MODEL_SERPENT_SHIELD
  [6 * 512 + 12, blend(1, pulse(0.3, 0.7))], // MODEL_BRONZE_SHIELD
  [6 * 512 + 13, blend(1, pulse(0.3, 0.7))], // MODEL_DRAGON_SHIELD
  [6 * 512 + 14, blend(1)], // MODEL_LEGENDARY_SHIELD
  [6 * 512 + 16, hidden(2)], // MODEL_ELEMENTAL_SHIELD
]);

/** `ItemObjectAttribute`'s mesh rules for item `group`, `num`. */
export function itemObjectAttribute(group: number, num: number): ItemMeshRule {
  return RULES.get(group * 512 + num) ?? NONE;
}
