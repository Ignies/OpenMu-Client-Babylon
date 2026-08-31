import type { LightEmitter } from '../../lighting/mapObjectLights';
import type { Emission } from '../../common/effectParticles';

/**
 * Stadium (WD_6STADIUM, world 6, `Object7`/`World7`). Object7 ships 41 BMDs,
 * so the live type range is 0…40.
 *
 * This is the smallest world-specific block in the client. Like Lost Tower it
 * has no `case` in `CreateObject` (no `CreateOperate`, no `BoundingBoxMax`
 * override, no warp stack), and its entire contribution to `MoveObject` and
 * `RenderObjectVisual` is three cases: the fountain water, one hidden marker
 * and the brazier glow (ZzzObject.cpp:3993-4001 and :2945-2953). The arena is
 * meant to be plain — it is a duel floor, not a place to look at.
 *
 * Counts are from EncTerrain7.obj (1489 records).
 */

/**
 * `case 21: o->BlendMesh = 3` (ZzzObject.cpp:3996). Type 21 (n=11) is the
 * fountain; `Object7/Object22.glb` carries four meshes and mesh 3 is water.jpg,
 * so the basin surface is the additive one. The V scroll that runs across it
 * lives in common/meshAnimation.ts.
 */
export const STADIUM_BLEND_MESHES: Readonly<Record<number, number>> = {
  21: 3,
};

/**
 * `case 38: o->HiddenMesh = -2` (ZzzObject.cpp:4000). Type 38 (n=52) is a
 * marker and nothing else — no `CreateOperate`, no effect, no light, no case
 * in `RenderObjectVisual`. The original still loads `Object39.glb` (au_09) so
 * the map editor can grab it; the player never sees or touches one, so the
 * clone skips the load entirely.
 */
export const STADIUM_EFFECT_ONLY_TYPES: readonly number[] = [38];

/**
 * Empty, and correctly so: type 38 is the world's only hidden type and it
 * emits nothing. Stadium's one particle source is the type 9 brazier, whose
 * plume hangs off bone 1 rather than the object origin — a floor-level
 * emission would put the fire under the pillar instead of in the bowl — so it
 * is built as a `BonedParticleEmitter` in brazierObject.ts.
 */
export const STADIUM_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {};

/**
 * The brazier's floor light (type 9, n=32).
 *
 * The original gives Stadium 9 a `BITMAP_LIGHT` sprite and no `AddTerrainLight`
 * at all (ZzzObject.cpp:2948-2952) — the whole map is lit by its baked
 * lightmap. This entry is ours, on the same reasoning as Devias' candelabra:
 * a lit brazier that throws nothing on the sand reads as a prop rather than a
 * light.
 *
 * It sits at the object origin rather than on bone 1 because the terrain light
 * is an x/z footprint and the bowl is straight above the base — anchoring it
 * to the bone would only change the point light's height, and
 * `registerPointLightEmitter`'s own `heightOffset` already covers that. The
 * sprite, which does need the bone, is in brazierObject.ts.
 *
 * `flicker` is the standard `(rand() % 4 + 7) * 0.1f` brazier roll
 * (ZzzEffect.cpp:6764): 0.7 / 0.8 / 0.9 / 1.0.
 *
 * Colour follows the original's sprite tint, `(L*0.6, L*0.3, L*0.1)`
 * (ZzzObject.cpp:2949), normalised so the brightest roll lands near 1 —
 * `recipeFromEmitter` (lighting/mapObjectLights.ts) multiplies colour by luminosity, so carrying the 0.6
 * through as well would halve the light twice.
 */
export const STADIUM_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  9: [
    {
      pointRange: 6,
      wander: 0.07,
      terrain: {
        range: 3.5,
        color: [1, 0.5, 0.17],
        flicker: { min: 0.7, max: 1, steps: 4 },
      },
    },
  ],
};
