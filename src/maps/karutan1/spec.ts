import type { Emission } from '../../common/effectParticles';
import type { MeshAnimation } from '../../common/meshAnimation';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Karutan 1 (`WD_80KARUTAN1`, `World81`/`Object81`) and Karutan 2
 * (`WD_81KARUTAN2`, `World82`/`Object82`), the plain-data half - one table
 * set: `CGMKarutan1::MoveObject` (GMKarutan1.cpp:36-59) tests
 * `IsKarutanMap()`, both worlds (:876-879), and `CreateObject` (:31-34) is
 * `return false`. `maps/karutan2` imports these.
 *
 * EncTerrain81.obj: 2086 objects, 103 types; EncTerrain82.obj: 1720 objects,
 * 83 types. Object81/82 ship 120/119 models; in World82, types 79 and 80
 * (one record each at 112/238) have none.
 *
 * One table set is right, and not only because the code says so: decrypted,
 * every `Object82/ObjectNN.bmd` is its `Object81` twin mesh for mesh, bone
 * for bone and texture for texture, differing only in the `Data2\ObjectNN\`
 * the header carries. The sets end at a different place - `Object120.bmd`
 * (type 119) is Karutan 1 only - but where both have a model it is the same
 * model.
 */

/**
 * No `o->BlendMesh` writes in the Karutan code. What
 * `RenderAfterObjectMesh` (GMKarutan1.cpp:286-342) does instead is redraw
 * named meshes with `RENDER_BRIGHT`, and every one of those meshes is
 * textured `*_R` - 1/0 and 3/3 `lstone_R`, 54/0 `sokep04_R`, 55/0
 * `sokep01_R`, 56/0 `sokep03_R`, 57/0 `sokep02_R`, 58/1 `solivea02_R` and
 * 58/2 `livea05_R`, 62/0 `solivea07_R`, 63/0 `soliveb03_R` and 63/2
 * `soliveb02_R`, 66/1 `solivec02_R`, 119/1 `solived01_R` - which
 * `textureScript.ts` already resolves to the additive material at load. The
 * two writes the texture flag cannot make, an animated `BlendMeshLight` and
 * a V scroll, are `KARUTAN_MESH_ANIMATION`.
 */
export const KARUTAN_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :43-56 hides 113, 114, 115, 116, 118; `RenderObjectVisual`
 * (:61-161):
 *  - **113** (K1 ×59 / K2 ×50): the fire vent - see `KARUTAN_LIGHTS`.
 *  - **114** (×15 / ×20): `WATERFALL_3` SubType 16 - the oasis spray.
 *  - **115** (×0 / ×26), **118** (×6 / ×9): `BITMAP_CLOUD` SubType 0 - the
 *    sand haze.
 *  - **116** (×65 / ×21): `BITMAP_SMOKE` SubType 69 and 13 at twice scale -
 *    the dust devils.
 */
export const KARUTAN_EFFECT_ONLY_TYPES: readonly number[] = [
  113, 114, 115, 116, 118,
];

export const KARUTAN_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  114: [{ kinds: ['waterfall5_9'], every: 3 }],
  115: [{ kinds: ['cloud21'], every: 8, light: [0.6, 0.5, 0.35] }],
  116: [
    { kinds: ['smoke21'], every: 4, light: [0.7, 0.55, 0.35] },
    { kinds: ['smoke22'], every: 4, scale: 2, light: [0.7, 0.55, 0.35] },
  ],
  118: [{ kinds: ['cloud21'], every: 8, light: [0.6, 0.5, 0.35] }],
};

/** `(int)WorldTime % 10000 * 0.0001f` - a whole texture up over 10 s. */
const sandScroll = (timeMs: number) => (timeMs % 10000) * 0.0001;

/** `(sinf(WorldTime * 0.001f) + 1.f) * 0.5f` - the 6.3 s breath on 58/63/119. */
const breath = (timeMs: number) => (Math.sin(timeMs * 0.001) + 1) * 0.5;

/**
 * `RenderObjectMesh` (GMKarutan1.cpp:168-188) returns true for 1, 3, 54, 55,
 * 56, 57, 58, 62, 63, 66 and 119, so the default draw is skipped and
 * `RenderAfterObjectMesh` (:286-342) is each of those objects' only pass.
 * Most of it the `_R` texture flag already does (see
 * `KARUTAN_BLEND_MESHES`); what is left is here:
 *
 *  - **54** (K1 ×24 / K2 ×22), :300-305: `so_kwall08`'s single mesh at
 *    `(sin(t*0.002)+0.5)*0.5+1`, a glow that never drops below 1.
 *  - **55** (×1 / ×7) and **57** (×10 / ×5), :306-312: `b->StreamMesh = 0`
 *    around one bright draw whose V is `sandScroll` - the Kardamahal sand
 *    sheets, the same idiom as Tarkan 11/13/73.
 *  - **58** (×4 / ×0), :313-321: mesh 1 breathes; 0 and 3 are plain and
 *    mesh 2 is bright at the default 1.
 *  - **63** (×3 / ×0), :322-330: mesh 2 breathes; mesh 0 is bright at the
 *    default.
 *  - **119** (×6 / ×0), :335-341: mesh 1 breathes.
 *
 * Not here: the `o->m_bRenderAfterCharacter = true` all eleven types carry
 * (:170-188). That is `RenderObjects_AfterCharacter`'s second pass
 * (ZzzObject.cpp:3467-3487, which lists both Karutan worlds) - a fixed draw
 * order over the whole object set, not a per-mesh write, and the scene graph
 * sorts transparency itself.
 */
export const KARUTAN_MESH_ANIMATION: Partial<Record<number, MeshAnimation>> = {
  54: {
    mesh: 0,
    kind: 'blend',
    light: t => (Math.sin(t * 0.002) + 0.5) * 0.5 + 1,
  },
  55: { mesh: 0, kind: 'stream', v: sandScroll },
  57: { mesh: 0, kind: 'stream', v: sandScroll },
  58: { mesh: 1, kind: 'blend', light: breath },
  63: { mesh: 2, kind: 'blend', light: breath },
  119: { mesh: 1, kind: 'blend', light: breath },
};

/**
 * `MoveObject` :43-49, type 113: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 * (L, 0.6L, 0.2L), 3)` (the `case 113:` falls through into the hidden list)
 * + `RenderObjectVisual` :100-122: a `BITMAP_LIGHT` sprite at `2 * scale`
 * and the cycling `FIRE_HIK1` / `CURSEDLICH` / `HIK3`. Types 66 (×6 / ×0)
 * and 72 (×85 / ×113) carry bone sprites (`SHINY+5` at bones 13/14;
 * `LIGHT` + `SPARK` at bones 11/7, :68-99) - the Kardamahal lamps; sprites
 * only, one flare each.
 */
export const KARUTAN_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  113: [
    {
      pointRange: 5,
      sprite: {
        scale: 2,
        color: [1, 0.6, 0.3],
        pulse: { speed: 3, amount: 0.2, base: 0.9 },
      },
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
    },
  ],
  66: [{ offset: [0, 0, 200], sprite: { scale: 1.2, color: [1, 0.8, 0.5] } }],
  72: [{ offset: [0, 0, 220], sprite: { scale: 1.5, color: [1, 0.8, 0.5] } }],
};
