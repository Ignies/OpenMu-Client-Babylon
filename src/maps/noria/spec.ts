import type { LightEmitter } from '../../lighting/mapObjectLights';
import type { Emission } from '../../common/effectParticles';

/**
 * Noria (WD_3NORIA, World4 / Object4). Plain data — no scene imports, so the
 * shared registries can pull it in without dragging Babylon along.
 *
 * `Object4` ships 43 BMDs, so `o->Type` runs 0…42 (`Object4/Object{N+1}.glb`).
 * EncTerrain4.obj carries 9399 records over all 44 ids: id 43 is placed once,
 * at tile (181, 104.5), and has no model at all — see
 * `NORIA_EFFECT_ONLY_TYPES`.
 */

/**
 * `CreateObject`, ZzzObject.cpp:4672-4716, plus the two blend meshes the
 * original only assigns from `MoveObject` (39 at :3930, 41 at :3933) because
 * they are set every frame next to a UV scroll rather than once at spawn.
 *
 * Every index was checked against the converted model's mesh count, since an
 * out-of-range `BlendMesh` is a silent warn-and-skip in `applyBlendMesh`:
 *  1  → Object02.glb, 2 meshes    9  → Object10.glb, 4 meshes
 *  17 → Object18.glb, 7 meshes    18 → Object19.glb, 4 meshes
 *  19 → Object20.glb, 1 mesh      37 → Object38.glb, 1 mesh
 *  39 → Object40.glb, 3 meshes    41 → Object42.glb, 1 mesh
 *
 * 18 and 41 also appear in `meshAnimation.ts` as `kind: 'blend'`. That table
 * only names the mesh the UV writes land on and never touches `BlendMesh`, so
 * without the entries here the mill water and the stream would scroll a fully
 * lit, opaque mesh instead of an additive one.
 */
export const NORIA_BLEND_MESHES: Readonly<Record<number, number>> = {
  1: 1,
  9: 3,
  17: 0,
  18: 2,
  19: 0,
  37: 0,
  39: 1,
  41: 0,
};

/**
 * Id 43 is the one Noria record with no model behind it: `Data/Object4` ends
 * at `Object43.bmd` (type 42), and `MapManager` loads exactly that many, so
 * `Models[43]` stays a zero-mesh BMD and `RenderObject` draws nothing for the
 * single instance at (181, 104.5). Its `MoveObject` case (ZzzObject.cpp:3940)
 * still runs — it writes `StreamMesh`/`BlendMeshTexCoordU` into that empty
 * model, which is why the type looks implemented in the source.
 *
 * Declaring it effect-only reproduces "loads nothing, draws nothing" exactly:
 * `MapTileObject.init` returns before `loadGLTF`, so the entity stays live
 * (pickable-free, shadowless, no body) instead of throwing a 404 through
 * `modelLoaderSystem`'s failure path on every Noria load. It emits nothing —
 * see `NORIA_EMISSIONS`.
 */
export const NORIA_EFFECT_ONLY_TYPES: readonly number[] = [43];

/**
 * `emissionsFor` is only ever consulted for effect-only types
 * (`MapTileObject.init`), and Noria's only effect-only type is 43, the record
 * whose model is missing. The original draws nothing there and invents no
 * particles, so neither do we — putting steam or water on that spot would be
 * new content, not a port.
 *
 * The forge's sparks are *not* here on purpose: they hang off bone 58 of
 * Object40, so they ride on `NORIA_LIGHTS[39]`, where `MapObjectLights`
 * places each `LightEmitter.emissions` at that emitter's own bone offset.
 */
export const NORIA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {};

/**
 * `Luminosity` is rolled once per object per frame in `RenderObjectVisual`
 * (ZzzObject.cpp:2743): `(rand() % 30 + 70) * 0.01f`, i.e. a fresh 0.70…0.99,
 * and every Noria lamp colour is that value times a fixed tint.
 *
 * `LightEmitter.sprite.pulse` is the only per-sprite animation the shared
 * emitter offers — `(sin(t * speed) + 1) * amount + base` — so `amount` 0.145
 * over `base` 0.70 lands on exactly the original's 0.70…0.99 window and only
 * the *shape* differs: a ~0.8 s breath instead of white noise. That is the
 * better trade at this scale. The alternative, a class per lamp re-rolling
 * `Math.random()` each frame, would have put a per-frame Update on the ~300
 * type-1 plants that sit inside the load radius in the west of the map, to
 * animate a ±15 % wobble nobody can resolve on a 32 px sprite.
 *
 * `elapsed` inside `createEffectLight` starts at zero per sprite and objects
 * stream in as the hero walks, so the pulses desynchronise on their own.
 */
const LAMP_PULSE = { speed: 0.008, amount: 0.145, base: 0.7 } as const;

/** `Vector(Luminosity * 0.4f, Luminosity * 0.7f, Luminosity * 1.f, Light)`. */
const LAMP_COLOR: readonly [number, number, number] = [0.4, 0.7, 1];

/**
 * A Noria lamp sprite: `CreateSprite(BITMAP_LIGHT, Position, scale, Light, o)`
 * at a bone, and nothing else.
 *
 * There is deliberately no `terrain` block. Noria is the one town map with no
 * `AddTerrainLight` call anywhere — its lamps are pure additive sprites that
 * do not light the ground, and `MapObjectLights` nests the point-light
 * registration inside the terrain one, so omitting it here reproduces both
 * halves. Copying Lorencia's street-light recipe would have been wrong twice
 * over: the colour is cold here, and 300-odd blue pools summing into the
 * delta texture's 2.0 clamp would flatten the whole west of the map.
 *
 * `offset` is in BMD units and `resolveEmitterPosition` maps it as
 * `(x, z, y)` then rotates it by the object's own yaw/pitch/roll — the same
 * frame the model root ends up in after `scaling(1,-1,1) · rotX(-90°)`, so a
 * bone's BMD rest position can be pasted in unchanged.
 */
const lamp = (
  offset: readonly [number, number, number],
  scale: number,
  color: readonly [number, number, number] = LAMP_COLOR
): LightEmitter => ({
  offset,
  sprite: { scale, color, pulse: LAMP_PULSE },
});

/**
 * The forge hearth (ZzzObject.cpp:2866 sets `Light` to white before the
 * bone 61…65 loop, so these five are *not* tinted by `Luminosity`).
 */
const FORGE_GLOW: LightEmitter['sprite'] = {
  scale: 1,
  color: [1, 1, 1],
};

/**
 * Noria's map-object light sprites, `RenderObjectVisual` ZzzObject.cpp:
 * 2826-2890. All five entries are bone-anchored in the original; the offsets
 * below are those bones' rest positions read out of the converted GLBs (the
 * first animation key of each channel, composed down the parent chain).
 *
 * The animation moves them 5…30 MU — under a third of a tile, against
 * sprites 0.3…1.5 tiles across — so a fixed offset costs the slow bob and
 * buys back the bone lookups. Type 17's hanging lanterns swing the furthest
 * (~0.3 tile); with three of them on the map that is the one place a
 * bone-following class would still be visible, and it is noted rather than
 * built.
 */
export const NORIA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  /**
   * The glow plant (Object02, 2336 records — the signature blue of the
   * fairy forest). ZzzObject.cpp:2839-2847 draws three 0.5-scale sprites, at
   * bones 2/4/6 — named `light03`/`light02`/`light01` in the BMD, resting at
   * (-20.9, -8.7, 138.3), (13.3, -28.6, 138.4) and (24.8, 6.3, 115.1).
   *
   * One sprite, at their centroid and grown to cover the ~45 MU spread. Three
   * each does not fit: 309 of these plants fall inside the 40-tile load
   * radius around (44, 98), which is 927 sprites against the 512 the
   * `effectLights` manager can hold. Babylon renders the first 512 in
   * creation order and silently drops the rest, so *which* plants glow would
   * come down to load order — a worse artefact than a slightly rounder glow.
   * (The original hits the same wall from the other side: MAX_SPRITES is
   * 1000, _define.h:441, and it draws every block on screen rather than a
   * radius.) One each puts the peak at ~360 sprites with types 9/17/35/39.
   */
  // Reduced from 0.9 after seeing it: `createEffectLight` sizes a flare as
  // `64 * scale * objectScale / 100` tiles, so 0.9 was a 0.58-tile additive
  // disc, and 300 of them at once read as white cotton rather than as a
  // fairy-forest glow — they blew past the ground and each other. The
  // original's three sprites are 0.5 *of a BITMAP_LIGHT*, a much tighter
  // texture than flare01. At 0.3 this is a fifth of the area and stays a
  // point of light. If it still crowds the map, this constant is the dial.
  1: [lamp([6, -10, 131], 0.3)],

  /** Street lamp (Object10, 14 records): bone 1, scale 1.5 — :2829-2833. */
  9: [lamp([-1, 0, 179], 1.5)],

  /**
   * The lantern arch by the spawn (Object18, 3 records): bones 4, 7, 10, 13,
   * scale 1.0 each — :2848-2858.
   */
  17: [
    lamp([65, -5, 281], 1),
    lamp([103, -5, 280], 1),
    lamp([165, -5, 281], 1),
    lamp([196, -5, 281], 1),
  ],

  /**
   * Glow shrub (Object36, 228 records): bone 3, scale 1.5 — :2834-2838.
   *
   * The one type here whose records are not all 1.00 scale (EncTerrain4.obj
   * has them from 1.00 to 1.48), and `resolveEmitterPosition` rotates the
   * offset but does not scale it, so the largest shrubs carry their glow up
   * to ~0.5 tile low. The sprite itself does scale with the object, so this
   * reads as the glow sitting a little deep in the foliage rather than as a
   * misplaced light.
   */
  35: [lamp([-23, 0, 110], 1.5)],

  /**
   * The blacksmith forge (Object40, one record at (181, 104.5)), the busiest
   * object on the map: ZzzObject.cpp:2859-2890.
   *
   * Not reproduced, for want of a system rather than a decision:
   *  - bone 57's two BITMAP_LIGHTNING+1 sprites at +Rotation and -Rotation
   *    (`(int)(WorldTime * 0.1f) % 360`). `createEffectLight` draws one
   *    flare01 quad with no angle, so the counter-rotating pair collapses to
   *    a single steady sprite of the same 1.0 scale and (0.4, 0.8, 1.0) tint.
   *  - the 1-in-32 BITMAP_SHINY pair at each of bones 61…65. There is no
   *    shiny kind; five independent 1-in-32 rolls average one pair every 6.4
   *    ticks, which the hearth's `ember` emission below stands in for at
   *    `every: 6`.
   *  - `CreateJoint(BITMAP_JOINT_SPARK, …)`, the ribbon trailing each of the
   *    eight anvil sparks. The clone has no joint/ribbon system at all; the
   *    embers alongside the sparks carry the arc instead.
   */
  39: [
    // bone 57 (light01) — the lightning pair, flattened to one sprite.
    lamp([-18, 0, 152], 1, [0.4, 0.8, 1]),

    // bones 61…65 (light06/04/03/05/02) — BITMAP_LIGHT, white, scale 1.
    { offset: [-186, -42, 85], sprite: FORGE_GLOW },
    {
      offset: [-178, 9, 92],
      sprite: FORGE_GLOW,
      /**
       * Stated deviation: Noria has no `AddTerrainLight` anywhere, so this
       * ground glow is ours. It is confined to the single forge — one object
       * on a 9399-object map — because a smithy whose sparks light nothing
       * reads as a prop rather than a fire, and because the cost and the
       * clamp argument that rule the light out for the 2500-odd lamps do not
       * apply to one instance. Side effect worth knowing: `emitsLight` makes
       * `load()` clear `csmCaster`, so the forge stops casting a sun shadow,
       * the same trade Lorencia's braziers make.
       */
      pointRange: 6,
      pointGain: 1.4,
      wander: 0.1,
      terrain: {
        range: 4,
        color: [1, 0.55, 0.2],
        flicker: { min: 0.55, max: 0.9, steps: 4 },
        falloff: 1.8,
      },
      emissions: [
        { kinds: ['ember'], every: 6, count: 2, light: [1, 0.5, 0.12] },
      ],
    },
    { offset: [-180, -15, 92], sprite: FORGE_GLOW },
    { offset: [-196, 31, 92], sprite: FORGE_GLOW },
    { offset: [-198, -32, 92], sprite: FORGE_GLOW },

    /**
     * bone 58 (light07) — the anvil. `rand_fps_check(8)` is a 1-in-8 roll per
     * 25 Hz tick and each hit fires eight BITMAP_SPARK, so `every: 8` with
     * `count: 8` keeps both the burst size and the ~3 bursts a second. The
     * original's sparks carry `Light` still set to white from the hearth
     * loop, hence [1, 1, 1]; the embers are the stand-in for the joint
     * ribbons and are the only warm thing here.
     */
    {
      offset: [146, 0, 88],
      emissions: [
        { kinds: ['spark03_24'], every: 8, count: 8, light: [1, 1, 1] },
        { kinds: ['ember'], every: 8, count: 3, light: [1, 0.55, 0.15] },
      ],
    },
  ],
};
