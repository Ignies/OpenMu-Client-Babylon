import type { Emission } from '../../common/effectParticles';
import type { MeshAnimation } from '../../common/meshAnimation';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Vulcanus / the PK Field (`WD_63PK_FIELD`, `World64`/`Object64`), the
 * plain-data half. Nothing here may import the scene.
 *
 * EncTerrain64.obj places 2290 objects of 62 types - 993 of them type 17,
 * the lava-rock scatter. Object64 ships 61 models; the one type-54 record
 * (224.5/163.5) has none. The C++ is GM_PK_Field.cpp: `CreateObject`
 * (:230-243), `MoveObject` (:245-269), `RenderObjectVisual` (:271-389),
 * `RenderObjectMesh` (:391-497) and `RenderAfterObjectMesh` (:499-515).
 *
 * `CGMDoppelGanger2` (GMDoppelGanger2.cpp) is the same art (Object67 =
 * Object64's set) with two extra hidden types. It repeats this map's 15 and
 * 16 verbatim (:246-259, :631-636) and adds five types of its own (10, 19,
 * 20, 31, 33) that Vulcanus does not have; it has no 67/68. Its spec imports
 * the emissions and lights from here, but the mesh rows below stay Vulcanus'
 * - World67 places no type 15, and its own table is that map's to write.
 */

/**
 * No `o->BlendMesh` writes. Type 16's additive pass is not one either: its
 * texture is `songla2_R`, and `_R` already makes mesh 0 bright through
 * `textureScript.ts` (`RenderBody`, ZzzBMD.cpp:2330, promotes a bright mesh
 * to the blend mesh on its own). All type 16 needs is the breathing
 * `BlendMeshLight` in `VULCANUS_MESH_ANIMATIONS`.
 */
export const VULCANUS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :252-262 hides 0-6, which `RenderObjectVisual` draws as:
 *  - **0** (x10): `WATERFALL_2` SubType 6 - the lava spray. A windowed burst,
 *    so it is `lavaSprayObject.ts` rather than a row below.
 *  - **1** (x49): `BITMAP_SMOKE` SubType 60.
 *  - **2** (x0): `BITMAP_CLOUD` SubType 16; **3** (x102): SubType 11 - the
 *    heat haze.
 *  - **4** (x0): `BITMAP_SPARK` SubType 9 thrown at a random angle, plus a
 *    `BITMAP_JOINT_SPARK` trail.
 *  - **5** (x5): `BITMAP_SMOKE` SubType 21.
 *  - **6** (x50): the lava vent - see `VULCANUS_LIGHTS`.
 */
export const VULCANUS_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6,
];

/**
 * The vents, one row per `RenderObjectVisual` case, at the case's own
 * `rand_fps_check` rate.
 *
 * Type 0 is absent on purpose: its burst is gated by a per-object window
 * (:285-304) that no `Emission` field can express, so `lavaSprayObject.ts`
 * owns both the window and the particles. World67 places no type 0, so
 * Doppelganger 2 - which shares this table and has no `create` - loses
 * nothing by it.
 *
 * Substitutions, all of them forced by the kinds `effectParticles.ts`
 * defines:
 *  - **2/3** want `BITMAP_CLOUD` SubType 16 and 11. Only `cloud21` exists.
 *    SubType 11 (ZzzEffectParticle.cpp:2874-2886) is a 500-tick cloud
 *    scattered +-400 in every axis and drifting outward; `cloud21` lives 100
 *    ticks and scatters +-100, so a fifth of the standing haze. The light is
 *    the original's channel ratio - pure red, no green or blue, where the
 *    old table had a fabricated `[0.5, 0.3, 0.2]` - lifted by that same
 *    factor of five from `Random::RangeFloat(0, 2) * 0.01 + 0.015` (:333) so
 *    the total red over the map lands where the original puts it.
 *  - **4** wants `BITMAP_SPARK` SubType 9 plus a `CreateJoint` trail. `ember`
 *    is the one spark-shaped kind; there is no joint/trail primitive. Never
 *    placed in either world, so this row is documentation.
 */
export const VULCANUS_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    // :310-313, SubType 60 is `smoke60` exactly (:1559-1566).
    1: [{ kinds: ['smoke60'], every: 3 }],
    // :323-324. The original's light is literally black, which additively is
    // nothing at all; kept at the SubType 11 brightness so the two cloud
    // vents read alike. Never placed.
    2: [{ kinds: ['cloud21'], every: 3, light: [0.125, 0, 0] }],
    // :331-336.
    3: [{ kinds: ['cloud21'], every: 4, light: [0.125, 0, 0] }],
    // :342-350.
    4: [{ kinds: ['ember'], every: 3, light: [1, 0.4, 0.4] }],
    // :356-360, SubType 21 is `smoke21` exactly (:1342-1348).
    5: [{ kinds: ['smoke21'], every: 3 }],
  };

/**
 * Type 6 (x50), `RenderObjectVisual` :363-386: a `BITMAP_LIGHT` sprite sized
 * `2 * scale` in `(1.0, 0.2, 0.0)`, plus one of `FIRE_HIK1` SubType 0,
 * `FIRE_CURSEDLICH` SubType 4 and `FIRE_HIK3` SubType 0 - `fire1`, `fire2`
 * and `fire3` here - picked afresh every tick.
 *
 * No `AddTerrainLight` in the PK Field code at all - the lava glow is the
 * baked lightmap - so the terrain light here is ours, kept small (range 2)
 * so it only lifts the rim of the vent.
 */
export const VULCANUS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    6: [
      {
        pointRange: 4,
        sprite: {
          scale: 2,
          color: [1, 0.2, 0],
          pulse: { speed: 3, amount: 0.2, base: 0.9 },
        },
        terrain: {
          range: 2,
          color: [1, 0.45, 0.15],
          flicker: { min: 0.5, max: 1, steps: 4 },
        },
        emissions: [{ kinds: ['fire1', 'fire2', 'fire3'], every: 1, jitter: 6 }],
      },
    ],
  };

/**
 * `-(int)WorldTime % 10000 * 0.0001f` parses as `((-(int)WorldTime) % 10000)
 * * 0.0001f`, which for positive time ramps 0 to -0.9999 and wraps; the
 * unsigned form is the same ramp upward. Both spellings appear in this map.
 */
const lavaScrollDown = (t: number) => -((t % 10000) * 0.0001);
const lavaScrollUp = (t: number) => (t % 10000) * 0.0001;

/**
 * The four types `common/meshAnimation.ts` has no row for yet. Exported for
 * the integrator: this map owns no shared file.
 *
 *  - **15** (x9), `RenderObjectMesh` :404-411: `StreamMesh = 0` then
 *    `RenderBody(..., -(int)WorldTime % 10000 * 0.0001f)` - the `song_lava1`
 *    sheet, drawn unlit and crawling downward over ten seconds. The texture
 *    carries no `_R`, so `stream` is what makes it unlit, exactly as it does
 *    for Balgas 57.
 *  - **16** (x26), `RenderAfterObjectMesh` :506-510: a second full-body pass
 *    in `Draw_RenderObject_AfterCharacter` (ZzzObject.cpp:3463) with mesh 0
 *    forced to the blend mesh at `(sinf(WorldTime * 0.002f) + 1) * 0.5`. Mesh
 *    0 is `songla2_R` and therefore already additive in the first pass too,
 *    so the whole of the case is the breathing light - the `song_lava2` fade
 *    in-out its own comment names.
 *  - **67** (x1) and **68** (x1), :412-495: the two magma fish. `StreamMesh =
 *    1` (`MagmaFish02`) scrolling V *upward* on the same ten-second loop.
 *    Everything else those two cases do is in `magmaFishObject.ts`.
 */
export const VULCANUS_MESH_ANIMATIONS: Partial<
  Record<number, MeshAnimation>
> = {
  15: { mesh: 0, kind: 'stream', v: lavaScrollDown },
  16: {
    mesh: 0,
    kind: 'blend',
    light: t => (Math.sin(t * 0.002) + 1) * 0.5,
  },
  67: { mesh: 1, kind: 'stream', v: lavaScrollUp },
  68: { mesh: 1, kind: 'stream', v: lavaScrollUp },
};
