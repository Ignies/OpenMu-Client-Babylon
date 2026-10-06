/**
 * Which textures count as skin or hair (`LoadData.cpp:82-84`): the original
 * flags a bitmap `IsSkin` when its file name starts with `ski` or `level`, and
 * `IsHair` when it starts with `hair`. `HideSkin` then skips every mesh drawn
 * with one (`ZzzBMD.cpp:970-978`).
 *
 * The `level` rule is not an accident: the mask helms paint the face with
 * `level_man02`, not with a `skin` texture.
 */
export function isSkinOrHairTexture(fileName: string): boolean {
  const name = fileName.toLowerCase();

  return (
    name.startsWith('ski') || name.startsWith('level') || name.startsWith('hair')
  );
}

/** Keyed `group * 512 + num`, as `MODEL_ITEM` indexes them; the files ZzzOpenData.cpp:556-563 loads. */
const HIDE_SKIN_TEXTURES = new Map<number, string>([
  [8 * 512 + 50, 'Player/Item312_Armoritem.OZT'], // MODEL_FAITH_ARMOR
  [9 * 512 + 50, 'Player/Item312_Pantitem.OZT'], // MODEL_FAITH_PANTS
  [8 * 512 + 53, 'Player/SkinClass706_upperitem.OZT'], // MODEL_ARMOR + 53, Queen
  [9 * 512 + 53, 'Player/SkinClass706_loweritem.OZT'], // MODEL_PANTS + 53, Queen
]);

/**
 * The bitmap mesh 0 of an item is drawn with under `HideSkin` (a drop), in
 * place of its own (`RenderPartObjectBody`, ZzzObject.cpp:7774-7790): the
 * part's texture with the skin cut out. Null for every other item.
 */
export function hideSkinTexture(group: number, num: number): string | null {
  return HIDE_SKIN_TEXTURES.get(group * 512 + num) ?? null;
}

/**
 * The hide slot (`LoadData.cpp:70-73`): a mesh whose texture name starts with
 * `hid` binds BITMAP_HIDE instead of a bitmap, and every RenderMesh returns
 * on that index (`ZzzBMD.cpp:953-956`). The name is the instruction - the
 * file it points at may or may not exist, and either way nothing draws.
 */
export function isHideTexture(fileName: string): boolean {
  return fileName.toLowerCase().startsWith('hid');
}
