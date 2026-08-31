import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Tarkan (World 9 / `Object9`), the plain-data half. Nothing in here may
 * import the scene: the shared registries (`blendMeshes`, `effectOnlyObjects`,
 * `effectParticles`, `effectLights`) pull these tables in, and every one of
 * them is imported *by* `modelObject`/`mapTileObject` — an import back the
 * other way closes the cycle. Anything that needs a `Scene` lives in
 * `index.ts` or an object class instead.
 *
 * **`Object9` has holes.** `Object01`, `04`, `05`, `35`, `36`, `39`, `65` and
 * `85` do not exist in the data, so `o->Type` 0, 3, 4, 34, 35, 38, 64 and 84
 * have no model at all. Two of them carry C++ behaviour that can therefore
 * never run: type 4 (a blend mesh, a V scroll and a white `AddTerrainLight`
 * of range 3, ZzzObject.cpp:4044-4057) and type 64 (the red twin of the
 * type-63 impact glow, :2978). EncTerrain9.obj still places one type 4 and
 * two type 0 records, which fail their load and are logged; nothing else
 * references the missing eight. They are no-ops here, in every table.
 */

/**
 * `MoveObject`, ZzzObject.cpp:4046-4128. Five live types re-declare their
 * `o->BlendMesh` every frame — an additive, unlit second pass over one mesh:
 *
 *  - **2** (×4) the scrolling frieze, one mesh of `R.jpg`; its U scroll is in
 *    `meshAnimation.ts`.
 *  - **7** (×98) the red glow lamp, one mesh of `redB.jpg`. Its
 *    `BlendMeshLight` is *not* in `meshAnimation.ts` and must not be: the
 *    sine is phased by the lamp's own yaw, so no shared table can produce it.
 *    See `glowLampObject.ts`.
 *  - **61** (×2) and **65** (×1) the braziers, two meshes each — `gear` (the
 *    bowl) and `gearB` (the flame sheet) — hence blend index 1. **66** is in
 *    the C++ (:4098) but EncTerrain9.obj places none; kept so the table
 *    matches the source rather than the map.
 *  - **82** (×60) the light shaft, one mesh of `light01.jpg`. The same case
 *    also forces `Vector(1.f, 1.f, 1.f, o->Light)`; see
 *    `lightShaftObject.ts` for why that is a separate class and not a
 *    no-op.
 *
 * Type 4's `o->BlendMesh = 0` is left out — there is no `Object05.bmd` for it
 * to apply to (see the header note).
 */
export const TARKAN_BLEND_MESHES: Readonly<Record<number, number>> = {
  2: 0,
  7: 0,
  61: 1,
  65: 1,
  66: 1,
  82: 0,
};

/**
 * The dust vents: hidden markers whose entire contribution is particles.
 * `o->HiddenMesh = -2` in `RenderObjectVisual` (ZzzObject.cpp:2967, :2991,
 * :2998, :3005) makes `Draw_RenderObject` (:390) skip the whole body, so the
 * effect-only path in `MapTileObject` skips the model load as well.
 *
 *  - **60** (×82) the ground dust bank — a *one-shot*, see `dustBankObject.ts`.
 *  - **70** (×3) a steady leak of sand off a high ledge; the only Tarkan
 *    emitter with no window, so it is pure table data (`TARKAN_EMISSIONS`).
 *  - **76** (×19) a 500 ms puff once every 5 s, `ventObject.ts`.
 *  - **83** (×10) the quake / rockfall vent, `ventObject.ts`.
 *
 * **63 is deliberately not in this list** even though `MoveObject` (:4092)
 * hides it too: its sprite hangs off `BoneTransform[2]`, so the model has to
 * load and animate for the effect to have a position at all. It is hidden by
 * `HiddenMesh` in `impactGlowObject.ts` instead, which is what the original
 * does — load, animate, draw nothing. 64 is hidden the same way and has no
 * model, so it needs nothing.
 */
export const TARKAN_EFFECT_ONLY_TYPES: readonly number[] = [60, 70, 76, 83];

/**
 * Type 70 (ZzzObject.cpp:2991-2995), ×3, at 3.5-4.9 tiles up on the cliff
 * faces above the sand-falls: `rand_fps_check(5)` — a 1-in-5 chance per 25 Hz
 * reference tick, i.e. five spawns a second — of a `BITMAP_SMOKE` SubType 7.
 * No window and no per-object phase, so unlike the other three vents it needs
 * no class.
 *
 * SubType 7 is a puff *thrown sideways and falling*: created with
 * `Velocity = (0, (rand%4+6) * Scale, 0)` and `Scale *= (rand%20+120)*0.01`,
 * then per tick `Gravity += 1`, `Position[2] -= Gravity`, `Scale += 0.03`,
 * tinted `(0.725, 0.572, 0.333)` (ZzzEffectParticle.cpp:1311, :5418) — sand
 * pouring off a ledge and picking up speed.
 *
 * `waterfall5_9` is the only kind in `effectParticles.ts` that falls at all
 * (`vz = -(rand(5)+7)`, decaying upward); every fire and smoke kind rises. It
 * is the same substitution `DUNGEON_EMISSIONS` makes for the ceiling
 * rock-fall, and it costs the sand tint — the kind ignores `light` and holds
 * itself at a flat 0.2 grey. The kind that should exist is:
 *
 * ```ts
 * smoke7: {
 *   texture: 'smoke',
 *   blend: 'add',
 *   init(p, scale) {
 *     p.lifeTime = 30;
 *     p.vy = (rand(4) + 6) * scale;
 *     p.gravity = rand(200) / 200;
 *     p.scale = scale * (rand(20) + 120) * 0.01;
 *     p.rotation = rand(360);
 *   },
 *   update(p, f) {
 *     let lum = 1;
 *     p.scale += f * 0.03;
 *     p.gravity += f;
 *     p.vy -= 0.1 * f;
 *     p.pz -= p.gravity * f;
 *     if (p.lifeTime < 5) {
 *       lum = p.lifeTime / 8;
 *       p.scale -= f * 0.1;
 *     }
 *     p.lr = lum * 0.725;
 *     p.lg = lum * 0.572;
 *     p.lb = lum * 0.333;
 *   },
 *   color: plainColor,
 * } satisfies ParticleKind,
 * ```
 */
export const TARKAN_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  70: [{ kinds: ['waterfall5_9'], every: 5, scale: 0.3 }],
};

/**
 * `Luminosity = sin(WorldTime * 0.002f) * 0.35f + 0.65f;`
 * `AddTerrainLight(x, y, (L, L*0.6, L*0.2), 2, PrimaryTerrainLight);`
 * — the brazier, ZzzObject.cpp:4088-4092 (type 61) and :4102-4106 (65/66).
 * The flame itself is the type's blend mesh with its V scroll
 * (`meshAnimation.ts`), so nothing is added on top of it: no particles, no
 * sprite. The original creates neither, and the scrolling `gearB` sheet is
 * already a fire.
 *
 * The sine is ported as `flicker` rather than as a pulse because
 * `recipeFromEmitter` (lighting/mapObjectLights.ts) only runs its smooth `pulse` path for emitters that also
 * declare a `sprite`, and a brazier has no flare in the original. `flicker`
 * over `min` 0.3 / `max` 1.0 covers exactly the sine's range
 * (0.65 ± 0.35) in five steps; what is lost is the metronome — a random walk
 * inside that range instead of a 3.14 s breath. For a fire that is the better
 * of the two errors.
 *
 * `pointRange` has no C++ counterpart at all (the original has no dynamic
 * point lights); it feeds the Babylon pool, and 6 matches what Lorencia's
 * street light asks for. There are three braziers on the whole map — two 61s
 * at 66.7/181.9 and one 65 at 4.3/247.5, at scale ~1 and 2.98 — so this
 * costs nothing.
 *
 * Type 7, the red glow lamp, also calls `AddTerrainLight` (:4067) and is
 * *not* here: its sine is phased by `o->Angle[2] * 100`, a per-object value
 * this table cannot see. See `glowLampObject.ts`.
 */
const brazier: LightEmitter = {
  // Z only, and only for the point light: `recipeFromEmitter` (lighting/mapObjectLights.ts) reads x/z, which
  // the offset does not move, while `resolveEmitterPosition` lifts the pooled
  // light to the bowl (0.4 tiles) instead of leaving it inside the pedestal.
  offset: [0, 0, 40],
  pointRange: 6,
  wander: 0.06,
  terrain: {
    range: 2,
    color: [1, 0.6, 0.2],
    flicker: { min: 0.3, max: 1, steps: 5 },
  },
};

export const TARKAN_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  61: [brazier],
  65: [brazier],
  66: [brazier],
};
