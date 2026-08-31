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
 *  3. the grade gets a provisional exposure lift so the frame lands near where
 *     it was while every mood is regraded .
 *
 * The flag exists for A/B against the old look. Remove it, and the lift, once
 * the moods are regraded.
 */
export const UNIFIED_LIGHT_MODEL = false;

/**
 * Provisional. Objects now carry the bake (≈0.5–0.8 outdoors) and the terrain
 * arrives in linear space (`x^2.2`), so the untouched moods read ~1 stop dark.
 * This multiplies `ip.exposure` under the flag until slice 3 sets each mood's
 * own `exposure` against the reference set — then it goes to 1 and is deleted.
 */
export const UNIFIED_EXPOSURE_LIFT = 1.6;

/**
 * The mood's `terrainBake` tint, mirrored here for the object materials so
 * BodyLight carries the same tint the terrain multiplies its bake by.
 * Written by `sceneLook` beside `terrainBakeTint`; read per draw.
 */
export const bodyLightTint: [number, number, number] = [1, 1, 1];
