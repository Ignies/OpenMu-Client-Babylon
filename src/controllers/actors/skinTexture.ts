/**
 * Which textures count as skin or hair (`LoadData.cpp:84-86`): the original
 * flags a bitmap `IsSkin` when its file name starts with `ski` or `level`, and
 * `IsHair` when it starts with `hair`. `HideSkin` then skips every mesh drawn
 * with one (`ZzzBMD.cpp:1324-1332`). `ski` and `hair` are compared byte by
 * byte, so `SkinClass106_upper` is not skin; only `level` ignores case.
 *
 * The `level` rule is not an accident: the mask helms paint the face with
 * `level_man02`, not with a `skin` texture.
 */
export function isSkinOrHairTexture(fileName: string): boolean {
  return (
    fileName.startsWith('ski') ||
    fileName.startsWith('hair') ||
    fileName.toLowerCase().startsWith('level')
  );
}

/**
 * What `RenderPartObjectBody` does under `HideSkin` in place of `RenderBody`: `texture` is the
 * bitmap mesh 0 is drawn with (the part with its skin cut out), `meshes` the only meshes drawn.
 */
type HideSkinRule = { readonly texture?: string; readonly meshes?: readonly number[] };

const only = (...meshes: number[]): HideSkinRule => ({ meshes });

/** Keyed `group * 512 + num`, as `MODEL_ITEM` indexes them; ZzzObject.cpp lines in each row. */
const HIDE_SKIN = new Map<number, HideSkinRule>([
  [8 * 512 + 31, only(0, 1)], // MODEL_SYLPHID_RAY_ARMOR, :7614
  [9 * 512 + 31, only(0, 1)], // MODEL_SYLPHID_RAY_PANTS, :7626
  [8 * 512 + 36, only(2)], // MODEL_IRIS_ARMOR, :7663
  [9 * 512 + 36, only(0)], // MODEL_IRIS_PANTS, :7674
  [10 * 512 + 36, only(0)], // MODEL_IRIS_GLOVES, :7685
  // MODEL_MISTERY_HELM to MODEL_LILIUM_HELM: `anMesh` (:7696-7705)
  [7 * 512 + 39, only(2)],
  [7 * 512 + 40, only(1)],
  [7 * 512 + 41, only(0)],
  [7 * 512 + 42, only(2)],
  [7 * 512 + 43, only(1)],
  [7 * 512 + 44, only(2)],
  // MODEL_MISTERY_ARMOR / PANTS to LILIUM: BITMAP_INVEN_ARMOR / PANTS + n
  // (:7706-7729, ZzzOpenData.cpp:550-553)
  [8 * 512 + 39, { texture: 'Player/InvenArmorMale40.OZT' }],
  [8 * 512 + 40, { texture: 'Player/InvenArmorMale41.OZT' }],
  [8 * 512 + 41, { texture: 'Player/InvenArmorMale42.OZT' }],
  [8 * 512 + 42, { texture: 'Player/InvenArmorMale43.OZT' }],
  [8 * 512 + 43, { texture: 'Player/InvenArmorMale44.OZT' }],
  [8 * 512 + 44, { texture: 'Player/InvenArmorMale45.OZT' }],
  [9 * 512 + 39, { texture: 'Player/InvenPantsMale40.OZT' }],
  [9 * 512 + 40, { texture: 'Player/InvenPantsMale41.OZT' }],
  [9 * 512 + 41, { texture: 'Player/InvenPantsMale42.OZT' }],
  [9 * 512 + 42, { texture: 'Player/InvenPantsMale43.OZT' }],
  [9 * 512 + 43, { texture: 'Player/InvenPantsMale44.OZT' }],
  [9 * 512 + 44, { texture: 'Player/InvenPantsMale45.OZT' }],
  [10 * 512 + 44, only(0)], // MODEL_LILIUM_GLOVES, :7730
  // Faith and Queen armour / pants (:7774-7796, ZzzOpenData.cpp:556-563)
  [8 * 512 + 50, { texture: 'Player/Item312_Armoritem.OZT' }],
  [9 * 512 + 50, { texture: 'Player/Item312_Pantitem.OZT' }],
  [8 * 512 + 53, { texture: 'Player/SkinClass706_upperitem.OZT' }],
  [9 * 512 + 53, { texture: 'Player/SkinClass706_loweritem.OZT' }],
  [7 * 512 + 49, only(0)], // MODEL_SERAPHIM_HELM, :7797
  [8 * 512 + 49, only(2)], // MODEL_SERAPHIM_ARMOR, :7808
  [7 * 512 + 50, only(1)], // MODEL_FAITH_HELM, :7819
  [7 * 512 + 53, only(2)], // MODEL_HELM + 53, Queen, :7830
  [7 * 512 + 73, only(0, 2)], // MODEL_PHOENIX_SOUL_HELMET, :8780
  [7 * 512 + 59, only(1)], // MODEL_SACRED_HELM, :8837
  [7 * 512 + 60, only(1)], // MODEL_STORM_HARD_HELM, :8837
  [7 * 512 + 61, only(0)], // MODEL_PIERCING_HELM, :8846
  // Lucky 65 / 70: the helms draw one mesh on every render (:8887-8895), the armour and pants
  // take BITMAP_INVEN_ARMOR / PANTS + 6 / 7 (:8897-8908, ZzzOpenData.cpp:1795-1802).
  [7 * 512 + 65, only(2)],
  [7 * 512 + 70, only(1)],
  [8 * 512 + 65, { texture: 'Player/LuckyItem/65/InvenArmorMale40_luck.OZT' }],
  [8 * 512 + 70, { texture: 'Player/LuckyItem/70/InvenArmorMale41_luck.OZT' }],
  [9 * 512 + 65, { texture: 'Player/LuckyItem/65/InvenPantsMale40_luck.OZT' }],
  [9 * 512 + 70, { texture: 'Player/LuckyItem/70/InvenPantsMale41_luck.OZT' }],
]);

/**
 * The `Data/` bitmap mesh 0 of an item is drawn with under `HideSkin` (a drop), in place of its
 * own; meshes 1.. keep theirs. Null for every other item.
 */
export function hideSkinTexture(group: number, num: number): string | null {
  return HIDE_SKIN.get(group * 512 + num)?.texture ?? null;
}

/** The only meshes of an item drawn under `HideSkin`; null = every mesh. */
export function hideSkinMeshes(group: number, num: number): readonly number[] | null {
  return HIDE_SKIN.get(group * 512 + num)?.meshes ?? null;
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
