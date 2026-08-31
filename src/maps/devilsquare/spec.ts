import type { Emission } from '../../common/effectParticles';

/**
 * Devil Square (World 9 / `World10`, `Object10`), the plain-data half. Nothing
 * in here may import the scene: the shared registries (`blendMeshes`,
 * `effectOnlyObjects`, `effectParticles`) pull these tables in, and every one
 * of them is imported *by* `modelObject`/`mapTileObject`.
 *
 * EncTerrain10.obj places 564 objects of seven types, all at scale 1: 0 (×52)
 * and 1 (×12) the arena walls and corner towers, 2 (×200) and 3 (×191) the two
 * fence/pillar runs that ring the four squares, 4 (×55), 5 (×44) and 6 (×10)
 * the tilted rubble and dead trees (pitch/roll up to -720°/1680°, i.e. the
 * designer spun them). Four identical arenas sit at x 44-87 / 118-152 by
 * y 72-110 / 140-184, one per Devil Square level.
 */

/**
 * `CreateObject` (ZzzObject.cpp) has no `case WD_9DEVILSQUARE` at all: no
 * blend mesh, no operate box, no hidden marker. Exported empty so the table
 * carries one entry per world and a reader can tell "checked, none" from "not
 * looked at yet".
 */
export const DEVIL_SQUARE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/** `MoveObject` has no case either; nothing on this map is a pure marker. */
export const DEVIL_SQUARE_EFFECT_ONLY_TYPES: readonly number[] = [];

/**
 * `RenderObjectVisual`, ZzzObject.cpp:3030-3053, is the map's one visual: on
 * type 2 (the 200 fence pillars) it drops `BITMAP_RAIN_CIRCLE + 1` ripple
 * particles at bones 23 and 31, one in four ticks each plus one every tick —
 * rain splashing off the pillar caps, on the map whose rain never stops.
 *
 * **Not reproduced.** `effectParticles` has no ripple kind (every kind it
 * knows rises, falls or drifts; a ground-plane ring that expands and fades is
 * a different sprite and a different motion), and a substitute smoke or spark
 * on 200 pillars × 3 emitters would read as the pillars burning. The rain
 * itself is the weather layer's, which this map now runs at the full
 * `MAX_LEAVES` budget (`outdoor` on the entry). Left empty so the
 * table says so.
 */
export const DEVIL_SQUARE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};
