import { lightingTier } from './lightingQuality';

/**
 * The unified light model: **the bake is the exposure**.
 *
 * The original client lights the ground and every object with the same
 * number - the baked lightmap at their tile (`texel x PrimaryTerrainLight`,
 * ZzzLodTerrain.cpp:481-505; `texel x BodyLight`, ZzzBMD.cpp:255-257). With
 * the flag on, the terrain decodes its output to linear when image processing
 * runs in post, exactly as Babylon's Standard fragment does, and objects
 * multiply their albedo by BodyLight on both material paths.
 *
 * The flag stays for A/B against the old look.
 */
export const UNIFIED_LIGHT_MODEL = true;

/**
 * Whether the frame buffer holds linear values (image processing runs in
 * post and the unified model is on). The terrain shader keys its output
 * decode on this. Colours that skip the material fragments entirely - the
 * clear colour, the haze colour - are decoded once at their source
 * (`lighting/director.ts`), never divided by an exposure.
 */
export function linearBufferActive(scene: {
  imageProcessingConfiguration: { applyByPostProcess: boolean };
}): boolean {
  return UNIFIED_LIGHT_MODEL && scene.imageProcessingConfiguration.applyByPostProcess;
}

/**
 * Whether the structured light budget (ARCHITECTURE §3.2) composes the
 * frame: `lin(texel x bake) x light`, torch delta added after the decode,
 * shadow floor applied in linear. Only on the Enhanced/Ultra tiers with a
 * linear buffer; Classic keeps the original's gamma-space product so that
 * tier stays byte-identical to the reference formula.
 */
export function linearLightActive(scene: {
  imageProcessingConfiguration: { applyByPostProcess: boolean };
}): boolean {
  return linearBufferActive(scene) && lightingTier() !== null;
}
