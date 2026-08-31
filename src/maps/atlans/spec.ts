import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Atlans (World 8 / `Object8`), the plain-data half. Nothing in here may
 * import the scene: the shared registries (`blendMeshes`, `effectOnlyObjects`,
 * `effectParticles`, `effectLights`) pull these tables in, and every one of
 * them is imported *by* `modelObject`/`mapTileObject` — an import back the
 * other way closes the cycle. Anything that needs a `Scene` lives in
 * `index.ts` or an object class instead.
 *
 * The map is 41 types (`Object01`..`Object41`, so `o->Type` 0..40) and 5215
 * placed objects, of which the C++ touches six: 22, 23, 32, 34, 38 and 40 in
 * `MoveObject` (ZzzObject.cpp:4005-4034) and 39 in `CreateObject` (:4719).
 * `RenderObjectVisual` has no Atlans case at all — every swaying frond
 * (5/6/21/24-28/31/33, up to 91 bones on 28) is baked BMD bone animation
 * running at the default `o->Velocity = 0.16f`, so there is nothing to port
 * for the kelp beyond loading it.
 */

/**
 * `MoveObject`, ZzzObject.cpp:4013-4034. Five types re-declare their
 * `o->BlendMesh` every frame — an additive, unlit second pass over one mesh
 * of the model:
 *
 *  - **23** (×10) the water plane, mesh 0 = `wt00.jpg`, the same caustics
 *    sheet the terrain's layer-2 flipbook uses. Breathes on
 *    `sin(WorldTime * 0.002) * 0.3 + 0.5` — table entry in `meshAnimation.ts`.
 *  - **32** (×105) and **34** (×25), the glowing coral lamps. Both models are
 *    two meshes, `wood05` (the coral body) and `wood052` (the glow shell), so
 *    the blend index is 1 rather than 0; they pulse twice as fast and over
 *    the full 0..1 range.
 *  - **38** (×125) the god-ray / light shaft, one mesh of `light01.jpg`, held
 *    at a constant `BlendMeshLight` — the original's breathing line is
 *    commented out in the C++ (:4028) and is left out here too.
 *  - **40** (×86) the anemone, one mesh of `ioi01.jpg`; see
 *    `anemoneObject.ts` for the `o->Velocity = 0.05f` half of that case.
 *
 * Note `mapTileObject.ts` still carries three hand-written `Object8/*` cases
 * from before this table existed (`Object39.glb` and `Object24.glb` forced to
 * `ALPHA_ADD`, plus a `sin(t*2)` mesh-visibility fade on `Object24.glb` that
 * is the type-23 `BlendMeshLight` done as alpha). They now duplicate — and,
 * for type 23, override the material of — what this table and
 * `meshAnimation.ts` do properly, and should be deleted with this wiring.
 */
export const ATLANS_BLEND_MESHES: Readonly<Record<number, number>> = {
  23: 0,
  32: 1,
  34: 1,
  38: 0,
  40: 0,
};

/**
 * `MoveObject`, ZzzObject.cpp:4008 — type 22 sets `o->HiddenMesh = -2` on
 * every frame, which `Draw_RenderObject` (:390) reads as "skip the whole
 * body". `Object23.glb` (one mesh of `wood00.jpg`) is loaded and never drawn;
 * the object exists only to emit bubbles, so the effect-only path in
 * `MapTileObject` skips the load entirely.
 *
 * This is by far the most numerous marker in the port: 845 of them, and the
 * densest spot on the map (37/224, the trench north-west of the palace) has
 * 160 inside the 32-tile load radius. That count is what sets the emission
 * rate in `bubbleVentObject.ts` — see the note there.
 */
export const ATLANS_EFFECT_ONLY_TYPES: readonly number[] = [22];

/**
 * Empty on purpose, and it is the one Atlans table where "empty" is a
 * decision rather than an absence.
 *
 * Atlans has exactly one particle source — the type 22 bubble vent — and it
 * is *duty-cycled*: `o->Timer += 0.1f` per 25 Hz reference tick, wrapping at
 * 10, and only `Timer > 5` spawns (ZzzObject.cpp:4009-4012). That is 100
 * ticks, i.e. a 4 s loop that emits for its second 2 s. Everything the shared
 * registry can express is unconditional, so the recipe lives with the timer
 * in `bubbleVentObject.ts` instead; putting it here as well would give every
 * vent a second, always-on emitter.
 */
export const ATLANS_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {};

/**
 * Empty, and this one is not a simplification: **the original lights nothing
 * in Atlans**. There is no `CreateFire`, no `AddTerrainLight`, no
 * `CreateSprite` and no `MODEL_WARP` anywhere in the World 8 branches of
 * `CreateObject`, `MoveObject` or `RenderObjectVisual`. The map is lit by the
 * baked `TerrainLight.OZJ` alone.
 *
 * The temptation is 32/34, the coral lamps — 130 objects whose whole point is
 * that they glow. They glow the way the original makes them glow: an additive
 * mesh whose brightness swings over the full 0..1 range twice a second
 * (`ATLANS_BLEND_MESHES` above). Giving them a terrain light on top would
 * light the seabed around every one of them, which is a look this map has
 * never had, and would do it 33 times over in the palace courtyard where they
 * cluster. Exported so a reader can tell "checked, none" from "not looked at
 * yet".
 */
export const ATLANS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {};
