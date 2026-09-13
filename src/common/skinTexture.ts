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

/**
 * The hide slot (`LoadData.cpp:70-73`): a mesh whose texture name starts with
 * `hid` binds BITMAP_HIDE instead of a bitmap, and every RenderMesh returns
 * on that index (`ZzzBMD.cpp:953-956`). The name is the instruction - the
 * file it points at may or may not exist, and either way nothing draws.
 */
export function isHideTexture(fileName: string): boolean {
  return fileName.toLowerCase().startsWith('hid');
}
