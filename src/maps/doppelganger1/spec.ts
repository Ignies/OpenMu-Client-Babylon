import type { Emission } from '../../common/effectParticles';
import type { MeshAnimation } from '../../common/meshAnimation';

/**
 * Doppelganger 1 (`WD_65DOPPLEGANGER1`, `World66`/`Object66`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain66.obj places 421 objects of 33 types. Object66 ships 32 models
 * and four placed types have none: 6 (x6) and 96 (x1), both buried under the
 * terrain, 32 (x13), and 247 (x3), which is not a world object at all - see
 * `index.ts`.
 *
 * The C++ is GMDoppelGanger1.cpp: `CreateObject` (:40-47, empty),
 * `MoveObject` (:165-188), `RenderObjectMesh` (:342-414),
 * `RenderObjectVisual` (:416-490) and `RenderAfterObjectMesh` (:568-596).
 * `MoveObject` is `CGM_Raklion::MoveObject` (GM_Raklion.cpp:241-266) with 99
 * and 101 added to the hidden list; the render hooks are this map's own and
 * have no Raklion twin.
 */

/**
 * No `o->BlendMesh` writes. What these four have instead is a body the render
 * hooks replace with one `RENDER_BRIGHT` pass on a single mesh, which is what
 * a `BlendMesh` is: that mesh drawn additive, its lit pass never drawn.
 *
 *  - **33** (x14, :351-356 + :581-586): `Lightbim.smd`, one mesh - the light
 *    beam, deferred past the characters and scrolled (see
 *    `DOPPELGANGER1_MESH_ANIMATION`).
 *  - **76** (x3, :357-362): `ohohroraya_R.SMD`, one mesh - the aurora. The
 *    original draws the bright pass twice so it burns at double; once here.
 *  - **98** (x11, :363-365 + :587-592): `DopleIceWall01`, one mesh - the ice
 *    wall, bright plus a second `RENDER_CHROME` pass. The chrome layer is
 *    materials work and is not built.
 *  - **102** (x0, :366-373): `DoplePotal.SMD` - mesh 1 keeps its lit pass,
 *    mesh 0 is the scrolling additive sheet.
 *
 * Types **19** (x6), **20** (x18) and **31** (x1) are only deferred past the
 * characters (`m_bRenderAfterCharacter`, :351-356, drawn unchanged at
 * :575-580) - the three portal pieces, so they overlay a player standing in
 * front of them. Draw order is not a thing a map entry can ask for here, and
 * the bodies are identical either way, so nothing is ported for them.
 */
export const DOPPELGANGER1_BLEND_MESHES: Readonly<Record<number, number>> = {
  33: 0,
  76: 0,
  98: 0,
  102: 0,
};

/**
 * `MoveObject` :177-184 hides 70 (x0), 80 (x0, and no model either), 99 (x30)
 * and 101 (x14).
 */
export const DOPPELGANGER1_EFFECT_ONLY_TYPES: readonly number[] = [
  70, 80, 99, 101,
];

/**
 * The hidden markers' effects, `RenderObjectVisual` :416-490.
 *
 *  - **70** (x0, :423-443) and **80** (x0, :444-463): one of three `_MONO`
 *    fire sheets at random plus a fourth spawn every frame, tinted blue
 *    `(0.1, 0.4, 1.0)` on 70 and red `(0.7, 0.2, 0.1)` on 80. `fire157` is
 *    the only mono sheet `effectParticles` carries, so it stands for all
 *    three.
 *  - **99** (x30, :464-474), the sky-blue fog: nothing, and that is faithful.
 *    Its ten `BITMAP_CLOUD` sit behind `if (o->HiddenMesh != -2)` while
 *    `MoveObject` sets exactly that on it every frame before the render runs,
 *    so the branch is unreachable - the same dead gate Kanturu Ruins'
 *    62/107/108 have. 30 markers that hide a model and draw nothing.
 *  - **101** (x14, :475-486), the sky-blue light box: a `BITMAP_LIGHT`
 *    SubType 15 mote one tick in three, jittered +/-30 in x/y and tinted
 *    `(0.6, 0.8, 1.0)`. SubType 15 is a 100-tick spiral climb
 *    (ZzzEffectParticle.cpp:3241-3250, :8139-8160); `spark03_24` is the only
 *    sparkle kind that keeps the emission's own colour, so it stands in, short.
 */
export const DOPPELGANGER1_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  70: [{ kinds: ['fire157'], every: 1, count: 2, light: [0.1, 0.4, 1] }],
  80: [{ kinds: ['fire157'], every: 1, count: 2, light: [0.7, 0.2, 0.1] }],
  101: [{ kinds: ['spark03_24'], every: 3, light: [0.6, 0.8, 1], jitter: 30 }],
};

/**
 * The per-frame mesh writes, for `common/meshAnimation.ts`. 22 is Raklion's
 * ice crystal breathing (:172-176, `CGM_Raklion::MoveObject`
 * GM_Raklion.cpp:246-252) and x0 placed here; 33 and 102 are the two additive
 * sheets the render hooks scroll. `(int)WorldTime % 10000 * 0.0001f` climbs
 * 0 -> 0.9999 over ten seconds, `-(int)WorldTime % 4000 * 0.00025f` is that
 * ramp negated over four.
 *
 * Both sheets also get `b->StreamMesh = 0` for the draw (unlit, flat
 * `BodyLight`). `kind: 'blend'` is the closer of the two the table offers:
 * the additive material they are already on is unlit anyway, and `'stream'`
 * would swap it back to a flat *opaque* one, which turns a light beam into a
 * grey cone.
 */
export const DOPPELGANGER1_MESH_ANIMATION: Partial<
  Record<number, MeshAnimation>
> = {
  22: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
  33: { mesh: 0, kind: 'blend', v: t => (t % 10000) * 0.0001 },
  102: { mesh: 0, kind: 'blend', v: t => -((t % 4000) * 0.00025) },
};
