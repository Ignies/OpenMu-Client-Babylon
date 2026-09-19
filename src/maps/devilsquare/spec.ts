import type { Emission } from '../../common/effectParticles';

/**
 * Devil Square (`WD_9DEVILSQUARE` and OpenMU's map 32, `World10`/`Object10`),
 * the plain-data half. Nothing in here may import the scene: the shared
 * registries (`blendMeshes`, `effectOnlyObjects`, `effectParticles`) pull
 * these tables in, and every one of them is imported *by*
 * `modelObject`/`mapTileObject`.
 *
 * `EncTerrain10.obj` places 564 objects of seven types, all at scale 1, and
 * `Object10` ships exactly seven models for them. Read out of the BMDs, the
 * set is the arena and the two armies watching it:
 *
 *  - **0** (x52) and **1** (x12) - `Object01/02.bmd`, "wall 00" and "wall
 *    01": one box, one bone, one animation key, one `bacc00` stone texture.
 *    Yaw 0-120, never tilted. The arena walls.
 *  - **2** (x200) - `Object03.bmd`, "enemy army 01": a 38-bone biped in
 *    `kni00`/`kni01` plate over a four-key action. Every copy stands in the
 *    west half (x 41-123) facing east (yaw 30-120). The only type the C++
 *    touches - see `DEVIL_SQUARE_EMISSIONS`.
 *  - **3** (x191) - `Object04.bmd`, "friendly army 01": a 45-bone biped in
 *    nine meshes (Javelins03, shield06, the plate-11 set, a ponytail),
 *    likewise four keys. Every copy stands in the east half (x 81-157)
 *    facing west (yaw -120 to -30). The two ranks face each other across
 *    the squares.
 *  - **4** (x55), **5** (x44), **6** (x10) - `Object05/06/07.bmd`, "brick
 *    01/02/03": single-bone rubble, pitched -720 to 70 and spun -90 to 1770
 *    by the designer, some of it stacked up to z 388.
 *
 * Four identical arenas share the terrain - x 44-87 or 118-152 by y 72-110
 * or 140-184 - one per Devil Square level; the server picks one with the
 * warp.
 */

/**
 * `CreateObject` (ZzzObject.cpp:4546-4772) has no `case WD_9DEVILSQUARE` at
 * all: no blend mesh, no operate box, no hidden marker. Exported empty so
 * the table carries one entry per world and a reader can tell "checked,
 * none" from "not looked at yet".
 */
export const DEVIL_SQUARE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * Nothing on this map is a pure marker: `MoveObject`'s Devil Square block
 * (ZzzObject.cpp:3630-3644) is world-level, not per-type, and hides nothing.
 * See `storm.ts`.
 */
export const DEVIL_SQUARE_EFFECT_ONLY_TYPES: readonly number[] = [];

/**
 * `RenderObjectVisual`, ZzzObject.cpp:3024-3046, is the map's one per-type
 * visual: on type 2, the 200 enemy soldiers, it drops `BITMAP_RAIN_CIRCLE +
 * 1` at bones 23 and 31 - `Bip01 R UpperArm` and `Bip01 L UpperArm`, offset
 * -15 along the bone's x - one tick in four each, plus one every tick at
 * bone 23. Rain running off the shoulder plates of the rank that stands in
 * the rain and never moves.
 *
 * **Not reproduced**, for two reasons that are both about the sprite rather
 * than the timing:
 *
 *  - the texture is `World10\rain03.OZT`, a TGA-alpha sheet. `effectParticles`
 *    loads OZJ only (it strips a 24-byte header and hands the rest to the
 *    browser as a JPEG), so the ripple sheet cannot be named by a kind as
 *    the table stands.
 *  - no existing kind moves like it. Every kind in `effectParticles` rises,
 *    falls or drifts; a ground-plane ring that expands and fades is a
 *    different motion, and a substitute smoke or spark on 200 soldiers x 3
 *    emitters would read as the rank being on fire.
 *
 * The rain itself is the weather layer's, and this map runs it at full
 * strength for good (`ALWAYS_RAINING` in `weather/rainState.ts`). Left empty
 * so the table says so.
 */
export const DEVIL_SQUARE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};
