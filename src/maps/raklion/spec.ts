import type { Emission } from '../../common/effectParticles';

/**
 * Raklion (`WD_57ICECITY`, `World58`/`Object58`) and its hatchery
 * (`WD_58ICECITY_BOSS`, `World59`/`Object59`), the plain-data half - one
 * table set, because every hook in `CGM_Raklion` gates on `IsIceCity()`
 * (GM_Raklion.cpp:2294-2306), which is both worlds. `maps/raklionboss`
 * imports these.
 *
 * EncTerrain58.obj: 1474 objects, 70 types; EncTerrain59.obj: 162 objects,
 * 23 types. Object58 ships 83 models (types 0-82), Object59 ships 21.
 * Two types in the files have no model behind them:
 *
 *  - **83** (×0 / ×6, at 172.5/24.5): `Object59` has no `Object84.bmd`.
 *  - **247** (×65 / ×7): not a map object at all. `MODEL_WORLD_OBJECT`…
 *    `MAX_WORLD_OBJECTS` is 0…159 (_enum.h:851) and that is the only range
 *    `LoadWorld` fills from `Object<n>\ObjectNN.bmd` (MapManager.cpp:1122),
 *    so no world ever loads a model for 247. `CreateObject`
 *    (ZzzObject.cpp:4437) does not range-check `Type`, so the records become
 *    live, model-less objects. Every one of the 72 is byte-identical - tile
 *    (162, 83), angle `(0, 0, 35)`, scale 1 - and that is exactly the
 *    `CreateObject(MODEL_WARP, …)` the client spawns for itself at
 *    MapManager.cpp:753-758: they are re-saves of the runtime object list by
 *    a map editor whose `MODEL_WARP` was 247, stacked one per save. World66
 *    carries three of the same record. See `create.ts` for what the port does
 *    with them.
 */

/**
 * `RenderObjectMesh` :1328-1334 draws 68 (×0 / ×6), 69 (×0 / ×4) and 71
 * (×0 / ×2) - the hatchery's `icebot01/02/03_R` floor lamps - with
 * `RenderBody(RENDER_TEXTURE, Alpha, 0, fLumi, …)`: mesh 0 forced to the
 * additive pass. All three models are a single mesh, so this is the whole
 * body. `fLumi` is in `meshAnimation.ts`.
 *
 * No other `o->BlendMesh` write on either map; the `BlendMeshLight` sine on
 * 22 (:248-252, ×15 / ×0) is also in `meshAnimation.ts`.
 */
export const RAKLION_BLEND_MESHES: Readonly<Record<number, number>> = {
  68: 0,
  69: 0,
  71: 0,
};

/**
 * `MoveObject` :254-260 hides 70 (×0 / ×6) and 80 (×4 / ×0);
 * `RenderObjectVisual` (:1744-1795) gives both a cycling
 * `BITMAP_FIRE_HIK1/2/3_MONO`. The BMD names name the pair: type 70 is
 * "real blue fire", type 80 "real red fire", and the two light vectors in
 * the C++ say the same thing.
 */
export const RAKLION_EFFECT_ONLY_TYPES: readonly number[] = [70, 80];

/**
 * `fire157` is `firehik_mono03`, the mono sheet the original cycles two of
 * the three frames of; HIK1/HIK2 mono have no kind here.
 *
 * The tints are the originals: `Vector(0.1f, 0.4f, 1.0f, vLight)` on 70
 * (:1751) and `Vector(0.7f, 0.2f, 0.1f, vLight)` on 80 (:1773). They are not
 * the same brazier - 70 burns ice-blue in the hatchery, 80 burns red on the
 * ice field.
 */
export const RAKLION_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  70: [{ kinds: ['fire157'], every: 2, light: [0.1, 0.4, 1] }],
  80: [{ kinds: ['fire157'], every: 2, light: [0.7, 0.2, 0.1] }],
};
