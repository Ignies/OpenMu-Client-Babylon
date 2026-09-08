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
