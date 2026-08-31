import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Dungeon (World 2 / `Object2`), the plain-data half. Nothing in here may
 * import the scene: the shared registries (`blendMeshes`, `effectOnlyObjects`,
 * `effectParticles`, `effectLights`) pull these tables in, and every one of
 * them is imported *by* `modelObject`/`mapTileObject` — an import back the
 * other way closes the cycle. Anything that needs a `Scene` lives in
 * `index.ts` or an object class instead.
 */

/**
 * `CreateObject`, ZzzObject.cpp:4605-4617. The Dungeon case sets `CreateOperate`
 * on 59 and 60 and nothing else — no `o->BlendMesh = N` anywhere in the map,
 * unlike Lorencia (9 types) and Devias (5). The additive second pass the other
 * two towns use for glass and flame is simply not part of this art set; what
 * glows here is the `StreamMesh` flesh curtain (22/23/24), which is unlit
 * rather than additive and lives in `meshAnimation.ts`.
 *
 * Exported empty so the shared table carries one entry per world and a reader
 * can tell "checked, none" from "not looked at yet".
 */
export const DUNGEON_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject`, ZzzObject.cpp:3843-3846 (39/40/51) and :3829 (52) — every one
 * of these sets `o->HiddenMesh = -2`, which `Draw_RenderObject`
 * (ZzzObject.cpp:390) reads as "skip the whole body". The original still loads
 * and keeps the BMD, because the map editor draws these so a designer can
 * place them; in game they are pure markers.
 *
 *  - 39 (×27) and 40 (×26) sit in tight clusters on corridor floors — the
 *    spike/blade traps, which the *server* respawns as trap characters. 40 is
 *    a skinned model, so the original animates a body it never draws.
 *  - 51 (×6) is the same idea at doorways.
 *  - 52 (×29) is the rock-fall emitter; see DUNGEON_EMISSIONS.
 *
 * None of the four is ever clicked, so unlike Dungeon 59/60 there is no pick
 * box worth keeping and no reason to pay for the model: the effect-only path
 * in `MapTileObject` skips the load entirely. (Counts from EncTerrain2.obj.)
 */
export const DUNGEON_EFFECT_ONLY_TYPES: readonly number[] = [39, 40, 51, 52];

/**
 * Type 52, the ceiling rock-fall (ZzzObject.cpp:3825-3830).
 *
 * The original spawns a *model*, not a particle: `rand_fps_check(3)` — one in
 * three per 25 Hz reference tick — creates a `MODEL_DUNGEON_STONE01`
 * (`Object2/DungeonStone01.glb`) at the emitter offset by
 * `(rand%64-32, -(rand%32+50), rand%128+200)` at scale 0.6-1.3
 * (ZzzEffect.cpp:2970-2977), which then falls under `Gravity -= 1` per tick
 * and bounces off the terrain at 0.4 restitution, losing 4 lifetime a bounce
 * (ZzzEffect.cpp:12146-12157). It is a rigid body with a mesh, a shadow and a
 * ground collision.
 *
 * **This is a deliberate simplification.** We have no effect-model system —
 * nothing in the clone can spawn a short-lived, self-moving, non-entity model
 * — so building one for 29 emitters is out of scope here. Until it exists the
 * emitters run as particles at the reference rate, and read as grit and dust
 * shaken loose from the ceiling rather than as rocks:
 *
 *  - `waterfall5_9` is the only kind in `effectParticles` that *falls*
 *    (`vz = -(rand(5)+7)`, decaying upward); every fire and smoke kind rises.
 *    At `scale` 0.1 its `0.6 + scale` sizing lands on ~45 world units across,
 *    which is about what a 0.6-1.3 scale DungeonStone01 measures — so the
 *    silhouette is roughly honest even though the physics is not.
 *  - `jitter` 32 reproduces the `rand%64-32` horizontal spread of the real
 *    spawn. The vertical half of that offset (200-328 units up, i.e. the
 *    ceiling) is *not* reproduced: `spawnParticle` jitters all three axes by
 *    the same amount and the emitters themselves sit anywhere from 124 to 268
 *    in Z, so the grit starts at the marker and falls from there.
 *  - The `smoke60` puff is ours outright — the original makes no smoke at all.
 *    One every 12 ticks per emitter is a faint, slow veil that sells the
 *    impact the falling streak has no ground contact to show.
 *
 * These 29 emitters are meshless, so `updateFrustumVisibility` can never mark
 * them `OutOfView` and they emit whether or not the camera is looking (the
 * same deal as Lorencia 131/132). At ~10 spawns a second each that is ~300
 * live sprites across two pools of 2048 — measured against Lorencia's ~95
 * torch emitters, which cost more.
 */
export const DUNGEON_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  52: [
    { kinds: ['waterfall5_9'], every: 3, scale: 0.1, jitter: 32 },
    { kinds: ['smoke60'], every: 12, jitter: 32 },
  ],
};

/**
 * `CreateFire(0, o, x, y, z)` (ZzzEffectFireLeave.cpp:54-73), the wall-torch
 * flame, which every frame:
 *
 *  - rotates the local offset `(x, y, z)` by the object's angle, adds it to
 *    the object position and jitters each axis by `rand[-8,7]`;
 *  - rolls `Luminosity = rand[6,11] * 0.1` and lights with
 *    `(L, L*0.6, L*0.4)`;
 *  - spawns a `BITMAP_FIRE` particle on `rand_fps_check(2)`;
 *  - and *unconditionally* calls `AddTerrainLight(x, y, Light, 4, primary)`.
 *
 * That is precisely the emitter `createFire()` builds in
 * `common/effectLights.ts` — terrain range 4, colour `[1, 0.6, 0.4]`, flicker
 * quantised to five steps over 0.6-1.0, one fire sprite every second tick,
 * jitter 8. It is module-private there and this file must stay free of scene
 * imports, so the recipe is restated rather than imported; if it is ever
 * exported, delete this and call it.
 *
 * Two knowing divergences, both inherited from the shared recipe so that a
 * Dungeon torch and a Lorencia torch — the same `CreateFire(0, …)` call —
 * cannot end up looking different:
 *  - the flicker tops out at 1.0 rather than the C++ 1.1, and steps in fives
 *    instead of running continuously;
 *  - `pointRange`/`wander` have no C++ counterpart at all; they feed the
 *    Babylon point-light pool, which the original does not have.
 */
const wallTorch = (
  offset: readonly [number, number, number]
): LightEmitter => ({
  offset,
  pointRange: 7,
  wander: 0.12,
  terrain: {
    range: 4,
    color: [1, 0.6, 0.4],
    flicker: { min: 0.6, max: 1, steps: 5 },
  },
  emissions: [
    {
      kinds: ['fire0', 'fire0b'],
      every: 2,
      jitter: 8,
    },
  ],
});

/**
 * ZzzObject.cpp:3837-3842. The two Dungeon torches are the only lights the
 * original creates on this map — everything else dark is dark because
 * `TerrainLight.OZJ` is baked that way. 41 (×64) is the tall wall sconce, its
 * flame 2.4 tiles up and 0.3 back into the bracket; 42 (×56) is the floor
 * brazier, flame 1.9 tiles up and centred. Both are at scale 1.0 throughout
 * EncTerrain2.obj, so one recipe serves every instance and `emissions` can
 * stay an array rather than the size-dependent function Devias 66 needs.
 *
 * 120 emitters is the highest count of any map wired so far, and it was worth
 * checking before committing to the full recipe: Lorencia already carries ~95
 * (26×50 + 18×51 + 9×52 + 2×130 + 6×150 + two apiece for 55 and its 16 80s)
 * plus 10 street lights, on a map with far longer sightlines. The point
 * lights are pooled by distance and the particles pause off-screen, so the
 * standing cost is the terrain-light accumulation, which is bounded by the
 * range-4 footprint either way.
 */
export const DUNGEON_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    41: [wallTorch([0, -30, 240])],

    42: [wallTorch([0, 0, 190])],
  };
