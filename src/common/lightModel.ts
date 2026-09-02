/**
 * The unified light model : **the bake is the exposure**.
 *
 * The original client lights the ground and every object with the same
 * number — the baked lightmap at their tile (`texel × PrimaryTerrainLight`).
 * Before this flag the clone kept that for the terrain only: objects took a
 * flat key-light sum and no bake, so a crate in a dark alley was as bright as
 * one in the square, and the terrain wrote its colour gamma-encoded into the
 * linear HDR buffer so it could sit next to them.
 *
 * With the flag on, three things change together (they must — any one alone
 * is a stop of exposure error, see a gamma off, and the
 * Standard path never applied BodyLight"):
 *
 *  1. the terrain decodes its output to linear when image processing runs in
 *     post, exactly as Babylon's Standard fragment does (`terrainMaterial.ts`);
 *  2. objects multiply their albedo by BodyLight (bake at the tile × the
 *     mood's `terrainBake` tint + SelfLight) on **both** material paths, via a
 *     non-UBO uniform (`itemMaterial.ts`);
 *  3. every mood's `exposure` is graded for it — objects carry the bake
 *     (≈0.5–0.8 outdoors) and the terrain arrives in linear space (`x^2.2`),
 *     so each mood holds its map's frame average where the old model had it
 *     (measured with tools/screenshot/avg.mjs, within ~5%).
 *
 * The flag stays for A/B against the old look; the moods are graded for `true`.
 */
export const UNIFIED_LIGHT_MODEL = true;

/**
 * The mood's `terrainBake` tint, mirrored here for the object materials so
 * BodyLight carries the same tint the terrain multiplies its bake by.
 * Written by `sceneLook` beside `terrainBakeTint`; read per draw.
 */
export const bodyLightTint: [number, number, number] = [1, 1, 1];

/**
 * Whether the frame buffer holds linear values (image processing runs in
 * post and the unified model is on). The terrain shader keys its output
 * decode on this. Colours that skip the material fragments entirely — the
 * clear colour, the height-fog colour — are NOT decoded: they were authored
 * at screen brightness against ~1.0 exposures, so `sceneLook` divides the
 * regraded mood exposure back out of them instead (`compensateFog`,
 * `applyCycleClear`).
 */
export function linearBufferActive(scene: {
  imageProcessingConfiguration: { applyByPostProcess: boolean };
}): boolean {
  return UNIFIED_LIGHT_MODEL && scene.imageProcessingConfiguration.applyByPostProcess;
}
