import {
  PCT_HEAVY,
  PCT_MASK_ALPHA,
  PCT_OPT_CORRECTEDFORCE,
  PCT_SHORT_SHOULDER,
  PCT_STICKED,
  type ClothMeshSpec,
  type ClothSpec,
} from '@/controllers/cloth';

/** The soul pants' sphere, the hips on bone 2 (ZzzObject.cpp:10635, :10650). */
const HIPS = [[0, -15, -20, 30, 2]] as const;
const SOUL = PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_SHORT_SHOULDER;

/**
 * `MODEL_GRAND_SOUL_PANTS` (`t_PantMale19`, ZzzOpenData.cpp:189-192): a 5 x 8 grid on bone 17 drawn as the part's
 * mesh 2 (`PCT_OPT_MESHPROG`, ZzzObject.cpp:10634-10635); `BITMAP_PANTS_G_SOUL` is passed but the mesh draws itself.
 */
export const GRAND_SOUL_PANTS_CLOTH: ClothSpec = {
  mesh: 2,
  bone: 17,
  at: [0, 9, 7],
  grid: [5, 8],
  size: [45, 85],
  front: 'Item/t_lower_14m.OZT',
  back: 'Item/t_lower_14m.OZT',
  flags: SOUL,
  spheres: HIPS,
};

/** `MODEL_DARK_SOUL_PANTS` (`PantMale23`): a 7 x 5 grid over mesh 2, passed that mesh's own texture (:10648-10650). */
export const DARK_SOUL_PANTS_CLOTH: ClothSpec = {
  ...GRAND_SOUL_PANTS_CLOTH,
  grid: [7, 5],
  size: [50, 100],
  front: 'Player/lower2_15m.OZT',
  back: 'Player/lower2_15m.OZT',
};

/** `MODEL_DIVINE_PANTS` (`PantMaleTest20`, ZzzOpenData.cpp:174-181): mesh 3 made cloth on bone 2, spheres down the legs (:10638-10645). */
export const DIVINE_PANTS_CLOTH: ClothMeshSpec = {
  mesh: 3,
  bone: 2,
  flags: PCT_OPT_CORRECTEDFORCE | PCT_HEAVY,
  spheres: [
    [0, 0, -15, 22, 2],
    [0, 0, -27, 23, 2],
    [0, 0, -40, 24, 2],
    [0, 0, -54, 25, 2],
    [0, 0, -69, 26, 2],
  ],
};

/** `iCloth` (:10611-10624), by the pants model drawn: its file. */
const BY_MODEL = new Map<string, ClothSpec | ClothMeshSpec>([
  ['t_PantMale19.glb', GRAND_SOUL_PANTS_CLOTH],
  ['PantMaleTest20.glb', DIVINE_PANTS_CLOTH],
  ['PantMale23.glb', DARK_SOUL_PANTS_CLOTH],
]);

/** The cloth of the pants drawn as `model`, or null. */
export const pantsCloth = (model: string | null): ClothSpec | ClothMeshSpec | null => (model === null ? null : (BY_MODEL.get(model) ?? null));
