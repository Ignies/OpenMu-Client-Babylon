import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Icarus (World 10 / `WD_10HEAVEN`, assets `Object11`/`World11`) as plain
 * data. Nothing here touches the scene, so the tables can be pulled into the
 * shared registries (`blendMeshes.ts`, `effectLights.ts`, …) without dragging
 * Babylon in behind them.
 *
 * `Object11` ships 16 models, so the world runs types 0…15 — except type 11,
 * which has no `Object12.bmd` at all. EncTerrain11.obj agrees: 670 records,
 * every id from 0 to 15 present except 11.
 */

/**
 * Empty on purpose, and it is not an omission.
 *
 * `CreateObject` (ZzzObject.cpp:4433+) has *no* `case WD_10HEAVEN`, so no
 * Icarus type is ever given an `o->BlendMesh`; likewise `MoveObject` is a bare
 * `case WD_10HEAVEN: break;`. Everything the world does at runtime lives in
 * `RenderObjectVisual` (ZzzObject.cpp:3052-3153) and in the two world-level
 * movers (`MoveHeavenThunder`, `MoveObjectSetting`), none of which set a
 * blend mesh.
 *
 * A model whose own BMD marks a mesh as blended still gets it — that comes off
 * the mesh flags in the loader, not from this table.
 */
export const ICARUS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * Types 0-5, the six cloud emitters. All six are the same 50×50×50 MU
 * `연기박스` ("smoke box") mesh — `Object01.bmd` … `Object06.bmd` are byte-for-byte
 * the same 1194-byte file, and the converted `Object01.glb` bounds are
 * (-0.25,-0.25,0)…(0.25,0.25,0.5) — and all six are hidden on their first
 * visible frame (`o->HiddenMesh = -2`, ZzzObject.cpp:3052-3096) and replaced by
 * a bank of cloud billboards.
 *
 * So the box is never drawn and its model is never needed. `IcarusCloudObject`
 * is registered for these ids in `index.ts` and loads nothing at all, which is
 * why they do not also need an entry in `common/effectOnlyObjects.ts`.
 *
 * Note this is *not* the same thing as `Object11/cloud.bmd`: that model is
 * `MODEL_CLOUD`, an effect model loaded by `MapManager.cpp:151` and used only
 * for the overhead lightning flash plane. It is not a map object, and mapping
 * types 4/5 onto it draws a flash plane where a cloud bank belongs.
 */
export const ICARUS_EFFECT_ONLY_TYPES: readonly number[] = [0, 1, 2, 3, 4, 5];

/**
 * Also empty, and also not an omission — the clouds are the map's only
 * particle work, and they cannot be expressed as an `Emission`.
 *
 * `ParticleEmitter` re-spawns a `KindName` at a fixed cadence and each particle
 * then lives out a canned life. The Icarus clouds are the opposite shape: a
 * fixed bank of 20 (types 0-2) or 10 (types 3-5) billboards created once when
 * the emitter first becomes visible and kept alive for as long as it stays so
 * (ZzzObject.cpp:3052-3096), each one bobbing on a sine of `WorldTime` and
 * turning about the view axis at its own rate. `cloud21` is the closest kind
 * in `effectParticles.ts` — same `BITMAP_CLOUD` texture, same 1.80…1.99 scale
 * roll, because it is the same particle with a different SubType — but its
 * update rises, sinks and dies, which reads as smoke rather than as a sky.
 *
 * `IcarusCloudObject` therefore drives its own billboards. This table stays as
 * the registration point if a bespoke kind is ever added to
 * `effectParticles.ts`, and so that world 10 has the same shape as the others.
 */
export const ICARUS_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {};

/**
 * Type 10 — the only Icarus type with a light. `RenderObjectVisual`
 * (ZzzObject.cpp:3126-3131) resolves bone 3 of the model and drops one
 * `BITMAP_LIGHT` at it every frame:
 *
 *   b->TransformPosition(BoneTransform[3], (0,0,0), Position);
 *   Light = (1,1,1);
 *   CreateParticleFpsChecked(BITMAP_LIGHT, Position, o->Angle, Light, 0, 1.f);
 *
 * A re-created-every-frame particle at a fixed point on a static object is a
 * static flare, so this is one sprite, not an emission — the same reduction
 * `effectLights.ts` already makes for Lorencia's street lamp.
 *
 * The offset is bone 3's own rest translation out of `Object11.glb`
 * (`bone_3_Bone01` at -1.399, -0.000, 5.006 in the BMD's z-up bone frame,
 * metres), rounded to MU units — the two `Sphere01`/`Sphere02` bones sit at
 * (-1.403, 0.004, 4.969) and (-1.400, 0.005, 4.976), i.e. the orb the flare is
 * meant to be inside. `resolveEmitterPosition` rotates it by the object's yaw,
 * so the 1.4 MU-metre lateral kick follows the pillar around.
 *
 * No `terrain` block: the original does not call `AddTerrainLight` here, so
 * there is no terrain pool and no point light either — 180 of these stand on
 * the map (EncTerrain11.obj), and giving each a real light would swamp the
 * point-light pool for a glow that is a billboard in the original.
 */
export const ICARUS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  10: [
    {
      offset: [-140, 0, 500],
      // `Light = (1,1,1)`, ZzzObject.cpp:3128. BITMAP_LIGHT's own base size is
      // not recoverable from the call (it passes Scale 1.f and the particle
      // supplies the rest), so the flare is sized to the orb it sits in
      // rather than guessed: 64 px × 2.5 ÷ 100 ≈ 1.6 tiles across.
      sprite: { scale: 2.5, color: [1, 1, 1] },
    },
  ],
};
