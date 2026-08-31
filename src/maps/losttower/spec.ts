import type { LightEmitter } from '../../lighting/mapObjectLights';
import type { Emission } from '../../common/effectParticles';

/**
 * Lost Tower (WD_4LOSTTOWER, world 4, `Object5`/`World5`). Object5 ships 40
 * BMDs, so the live type range is 0…39.
 *
 * Unlike Lorencia or Devias the tower has no `case` in `CreateObject`
 * (ZzzObject.cpp:4457-4494 runs the default arm for every record): no
 * `CreateOperate`, no `BoundingBoxMax` override, no warp stack. Everything
 * the map does lives in `MoveObject` (ZzzObject.cpp:3946-3977),
 * `RenderObjectVisual` (:2893) and `Draw_RenderObject` (:1002), which is why
 * this file is almost all table and only three types need a class.
 *
 * Counts below are from EncTerrain5.obj (5380 records) — they decide how much
 * each recipe is allowed to cost.
 */

/**
 * `o->BlendMesh = N` from `MoveObject` (ZzzObject.cpp:3959-3970): that mesh is
 * drawn additive and unlit.
 *
 *  - 18 (n=68) wall lamp, mesh 1 = light01.jpg — the lit pane.
 *  - 19/20 (n=14 / n=6) the two tower machines, mesh 4 = t20 — the small
 *    emitter panel the U-scroll runs across.
 *  - 23 (n=163) brazier, mesh 1 = re_008.jpg — the coals.
 *
 * Types 3 and 4 (n=211 / n=399, the glowing conduits) are deliberately absent:
 * `MoveObject` writes only `BlendMeshTexCoordU` for them and never a
 * `BlendMesh`, because the scroll is consumed by `StreamMesh = 1` in
 * `Draw_RenderObject` (ZzzObject.cpp:1022-1032) instead. That half lives in
 * common/meshAnimation.ts.
 */
export const LOST_TOWER_BLEND_MESHES: Readonly<Record<number, number>> = {
  18: 1,
  19: 4,
  20: 4,
  23: 1,
};

/**
 * `o->HiddenMesh = -2` in `MoveObject` (ZzzObject.cpp:3971-3977): the body is
 * loaded but never drawn.
 *
 *  - 24 (n=95) is the flame vent. Its model (Object25.glb, t19, a 0.4-tile
 *    box) exists only so the map editor has something to click; what the
 *    player sees is the BITMAP_FLAME effect it spawns — see LOST_TOWER_LIGHTS.
 *  - 25 (n=148) is a bare marker: hidden, no effect, no `CreateOperate`, so
 *    nothing at all reaches the player. It is here rather than left as a
 *    normal object so the clone does not load and draw 148 stray t17 boxes.
 *
 * Effect-only objects skip the model load entirely (mapTileObject.ts), which
 * also spares them a mesh-less frustum test: `anyMeshInFrustum` returns null
 * for them and they stay permanently "in view", which is what the effect
 * wants.
 */
export const LOST_TOWER_EFFECT_ONLY_TYPES: readonly number[] = [24, 25];

/**
 * Empty on purpose, and not an oversight.
 *
 * This table is for effect-only types that emit particles and *no* light —
 * Lorencia's chimney smoke (131/132) is the shape it exists for. Lost Tower's
 * one particle source, the type 24 flame vent, also calls `AddTerrainLight`
 * (ZzzEffect.cpp:8648), so its recipe belongs in LOST_TOWER_LIGHTS where the
 * flame and the light share one flicker: `MapObjectLights` tints an emitter's
 * particles with the terrain light's own colour every tick, so the sprites
 * dim and brighten with the floor instead of drifting out of phase with it.
 * Splitting it across both tables would light one from `Luminosity` and the
 * other from a second, independent roll.
 */
export const LOST_TOWER_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {};

/**
 * `Luminosity` as `RenderObjectVisual` rolls it (ZzzObject.cpp:2743):
 * `(rand() % 30 + 70) * 0.01f`. 30 steps across 0.70…0.99 reproduces it
 * exactly — `recipeFromEmitter` (lighting/mapObjectLights.ts) walks `min + step * (max - min) / (steps - 1)`,
 * which for these numbers is `0.70 + step * 0.01`.
 */
const VISUAL_LUMINOSITY = { min: 0.7, max: 0.99, steps: 30 } as const;

/**
 * `Luminosity` inside the effect renderer (ZzzEffect.cpp:6764):
 * `(rand() % 4 + 7) * 0.1f`, i.e. 0.7 / 0.8 / 0.9 / 1.0. This is the roll the
 * type 24 vent's own `AddTerrainLight` is scaled by.
 */
const FLAME_LUMINOSITY = { min: 0.7, max: 1, steps: 4 } as const;

export const LOST_TOWER_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    /**
     * Wall lamp (n=68). Ours — the original lights nothing in this world, it
     * only makes the light01.jpg pane additive.
     *
     * Steady, not flickering: light01 is a caged lamp, and 68 of them
     * stuttering out of phase down a corridor reads as a fault, not as
     * atmosphere. Range 3 keeps each one a pool of its own instead of merging
     * into a lit floor — the tower is meant to be navigated between lamps.
     *
     * No sprite. The BlendMesh already draws the pane at full brightness, and
     * a flare on top of it would only wash out the one part of the model that
     * is already doing the job.
     */
    18: [
      {
        pointRange: 4,
        terrain: {
          range: 3,
          color: [1, 0.85, 0.6],
        },
      },
    ],

    /**
     * The red tower machine (n=14). `RenderObjectVisual` gives it
     * `BITMAP_MAGIC + 1` sprites tinted `(L*1.0, L*0.2, L*0.0)`
     * (ZzzObject.cpp:2898-2900); those are bone-anchored and live in
     * towerMachineObject.ts.
     *
     * What is here is the floor light, which is ours. It can sit at the object
     * origin rather than on a bone because `addTerrainLight` is a 2D
     * footprint (x/z only) and the machine's emitters are stacked vertically
     * above that origin — the bone offset would move the light nowhere the
     * terrain can see.
     */
    19: [
      {
        pointRange: 6,
        terrain: {
          range: 4,
          color: [1, 0.2, 0],
          flicker: VISUAL_LUMINOSITY,
        },
      },
    ],

    /** The blue machine (n=6), `BITMAP_LIGHTNING + 1` at `(L*0.4, L*0.8, L*1.0)` (ZzzObject.cpp:2903-2904). */
    20: [
      {
        pointRange: 6,
        terrain: {
          range: 4,
          color: [0.4, 0.8, 1],
          flicker: VISUAL_LUMINOSITY,
        },
      },
    ],

    /**
     * Brazier (n=163). The original's `case 23` carries a commented-out
     * `TransformPosition(BoneTransform[1]) + CreateSprite(BITMAP_LIGHT, 2.f)`
     * (ZzzObject.cpp:3967-3968) — the devs built the glow and then switched it
     * off. The sprite scale 2 below is taken from that dead line, so if it is
     * ever compared against the original the number matches.
     *
     * Sprite only, no particle plume: 163 braziers are the most common prop on
     * the map and a per-brazier fire would spend the whole 2048-sprite pool on
     * scenery before the flame vents got a look in. The coals mesh is already
     * additive through LOST_TOWER_BLEND_MESHES.
     */
    23: [
      {
        sprite: { scale: 2, color: [1, 0.55, 0.25] },
        pointRange: 5,
        wander: 0.06,
        terrain: {
          range: 3.5,
          color: [1, 0.55, 0.25],
          flicker: { min: 0.6, max: 1, steps: 4 },
        },
      },
    ],

    /**
     * The flame vent (n=95), the one light in this world the original actually
     * asks for.
     *
     * `MoveObject` hides the body and, on `rand_fps_check(64)`, spawns a
     * `BITMAP_FLAME` effect (ZzzObject.cpp:3971-3975). That effect lives 40
     * ticks (ZzzEffect.cpp:1104) and every tick throws 6 flame particles
     * jittered `rand[-25,25]` on x and y plus
     * `AddTerrainLight(x, y, (L*1.0, L*0.4, 0.0), 3)` (ZzzEffect.cpp:8637-8649).
     *
     * Two deliberate differences:
     *
     *  - It burns continuously here instead of guttering. 1-in-64 restarts on
     *    a 40-tick flame is a ~62% duty cycle, and `Emission` has no notion of
     *    one — reproducing it would need per-object state in a class for what
     *    is, at 95 vents scattered across the map, an effect nobody watches
     *    long enough to see restart. The rate is dropped to match: 1 particle
     *    a tick against the original's 6-at-62%, which is also what keeps the
     *    pool sane. `fire0` lives 24 ticks, so ~20 vents inside the 40-tile
     *    load radius hold ~480 sprites of the 2048 available; at the
     *    original's rate the vents alone would overrun it and starve the
     *    braziers.
     *  - `fire0`/`fire0b` (Fire01/Fire03) stand in for BITMAP_FLAME, which has
     *    no port. They are the strip fire Lorencia's camp fires burn, which is
     *    the right read for a floor vent even if it is not the same texture.
     *
     * `jitter` 25 and the terrain range 3 are the original's, unchanged —
     * `jitter` is in MU units, which is what the C++ `rand() % 50 - 25` is in.
     */
    24: [
      {
        pointRange: 5,
        wander: 0.1,
        terrain: {
          range: 3,
          color: [1, 0.4, 0],
          flicker: FLAME_LUMINOSITY,
        },
        emissions: [
          {
            kinds: ['fire0', 'fire0b'],
            every: 1,
            count: 1,
            jitter: 25,
            scale: 0.7,
          },
        ],
      },
    ],
  };
