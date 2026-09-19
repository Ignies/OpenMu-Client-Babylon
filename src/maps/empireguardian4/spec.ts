import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Fortress of Imperial Guardian day 4 (`WD_72EMPIREGUARDIAN4`, `World73` /
 * `Object73`), the plain-data half. Nothing here may import the scene.
 *
 * Day 4 is the indoor day: it has no `CreateRain` of its own and
 * `PlayObjectSound` (GMEmpireGuardian1.cpp:2962-2966) answers it with
 * `ImperialGuardianFort_in.wav` instead of the three weather beds days 1-3
 * get, so the map entry is not `outdoor`. Music is
 * `Music/ImperialGuardianFort`, the same file as days 1-3
 * (`_enum.h:212-215`).
 *
 * `EncTerrain73.obj` places 1670 objects across 84 types. The counts in the
 * `(xN)` notes below are from that file; a type the original handles but
 * World73 never places is called out as `(x0)`, because it still runs on the
 * login scene or on days 1-3.
 *
 * Days 1-3 share the art set but not this file: their tables are in
 * `../empireguardian/spec.ts`. These are also the tables the login scene
 * (`WD_73NEW_LOGIN_SCENE` / `WD_74NEW_CHARACTER_SCENE`) draws with, since
 * `GMEmpireGuardian4` is the class that runs there too.
 */

/**
 * No `o->BlendMesh` writes anywhere in GMEmpireGuardian4.cpp. Type 81's
 * `o->BlendMeshTexCoordV += 0.015f` (:227-231) is a UV scroll, not a blend
 * mesh, and lives in `common/meshAnimation.ts`.
 */
export const EMPIRE_GUARDIAN_4_BLEND_MESHES: Readonly<
  Record<number, number>
> = {};

/**
 * `MoveObject` sets `o->HiddenMesh = -2` on these and nothing else
 * (GMEmpireGuardian4.cpp:212-226): the marker boxes whose only job is to sit
 * somewhere and emit. On World73: 79 (x120), 82 (x32), 83 (x25), 85 (x12),
 * 86 (x18), 129 (x24); 80, 84, 130, 131 and 132 are placed on other days and
 * on the login scene (x0 here).
 *
 * 157 and 158 are deliberately *not* in this list - the original draws both
 * (`Chandelier.smd`, `¿¬±â¹Ú½º_³ì.smd`) and emits on top of the model.
 */
export const EMPIRE_GUARDIAN_4_EFFECT_ONLY_TYPES: readonly number[] = [
  79, 80, 82, 83, 84, 85, 86, 129, 130, 131, 132,
];

/**
 * `RenderObjectVisual` (GMEmpireGuardian4.cpp:800-1110), the effect-only half.
 * `emissions` is only consulted for effect-only types, so the drawn emitters
 * (12, 20, 37, 50, 64, 157, 158) cannot live here - 37 and 157 are classes in
 * `create.ts`, the rest are the gaps listed at the bottom of this comment.
 *
 * Not ported, each because `common/effectParticles.ts` has no kind for the
 * sheet and this file may not add one:
 *
 *  - **83 (x25)** :957-962 - `BITMAP_WATERFALL_3` SubType 14, white. Init is
 *    `LifeTime 30, Velocity[2] = rand%5+5, Scale = (rand%10+10)*0.05*Scale`
 *    with a +-20/+-20/+-10 spawn box (ZzzEffectParticle.cpp:3708-3712,
 *    :3725-3728): a rising spray. `waterfall5_9` is the wrong sheet
 *    (`waterFall5` vs `waterFall3`) *and* falls instead of rising, so it is
 *    not a stand-in. Needs a `waterfall3` texture and a `waterfall3_14` kind.
 *  - **84 (x0)** :964-972 - `BITMAP_WATERFALL_2` SubType 4, one in eight
 *    ticks. Same missing sheet.
 *  - **85 (x12)** :973-989 - 4 to 8 `BITMAP_FLAME` SubType 6 *effects* (not
 *    particles) in the 2 ms of every 200 ms of `WorldTime`, light 0.5 grey.
 *    `BITMAP_FLAME` is `Effect/Flame01.OZJ`, which the particle layer does
 *    not carry; SubType 6 is also the one case the flame's ground decal skips
 *    (ZzzEffect.cpp:10015-10021), so it is a pure billboard burst.
 */
export const EMPIRE_GUARDIAN_4_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  /**
   * :917-938 (x120). The original rolls `rand() % 3` and spawns exactly one
   * of `BITMAP_FIRE_HIK1` SubType 0, `BITMAP_FIRE_CURSEDLICH` SubType 4 and
   * `BITMAP_FIRE_HIK3` SubType 0 per tick. `count: 3` is the login scene's
   * tuning carried over unchanged; on World73 that is 120 braziers x 3 x 25
   * spawns a second against a 2048 sprite pool, so this is the one row worth
   * re-measuring on day 4.
   */
  79: [
    { kinds: ['fire1', 'fire2', 'fire3'], every: 1, count: 3, light: [1, 1, 1] },
  ],

  /** :951-955 (x32) - `BITMAP_WATERFALL_5` SubType 9 every tick. */
  82: [{ kinds: ['waterfall5_9'], every: 1 }],

  /** :991-999 (x18) - `BITMAP_CLOUD` SubType 21, one tick in six, red-lit. */
  86: [{ kinds: ['cloud21'], every: 6, light: [0.05, 0.02, 0.01] }],

  /** :1001-1009 (x24) - the same cloud, blue. */
  129: [{ kinds: ['cloud21'], every: 6, light: [0.01, 0.02, 0.05] }],

  /** :1011-1019 (x0 here) - the same cloud, green. */
  130: [{ kinds: ['cloud21'], every: 6, light: [0.01, 0.05, 0.02] }],

  /** :1021-1032 (x0 here) - `BITMAP_SMOKE` SubType 22 plus SubType 21 at 2x. */
  131: [
    { kinds: ['smoke22'], every: 3 },
    { kinds: ['smoke21'], every: 3, scale: 2 },
  ],

  /** :1034-1047 (x0 here) - two SubType 60 plus one SubType 21 at 2x. */
  132: [
    { kinds: ['smoke60'], every: 3, count: 2 },
    { kinds: ['smoke21'], every: 3, scale: 2 },
  ],
};

/**
 * Types `EncTerrain73.obj` places whose model `Data/Object73` never shipped.
 * Computed from the folder, `Object<type + 1>.bmd`: it runs Object01 to
 * Object159 with gaps, so 75 (x1, Object76), 159 (x1, Object160), 160 (x2,
 * Object161) and 163 (x1, Object164) have nothing to load. The original
 * draws nothing for them; here the fetch is what matters, since the dev
 * server answers a missing file with index.html.
 *
 * The same reading as `loginscene/spec.ts`'s `LOGIN_SCENE_ABSENT_MODELS` for
 * `World74`/`World75`.
 */
export const EMPIRE_GUARDIAN_4_ABSENT_MODELS: readonly number[] = [
  75, 159, 160, 163,
];

/**
 * Type 37's flare, `sos_bob02.smd` bone 1 (GMEmpireGuardian4.cpp:864-875,
 * x20). The original is `CreateSprite(BITMAP_FLARE, bone1, 4 * Scale, grey)`
 * with `grey = ((sin(WorldTime * 0.039) + 1) * 0.2 + 0.6) * 0.7`, i.e. 0.42
 * to 0.70 - the `pulse` block below is that curve exactly. The colour and the
 * point light are `LOGIN_WALL_TORCH`'s (lighting/mapObjectLights.ts), kept
 * identical so a wall torch reads the same on day 4 and on the login scene.
 *
 * Hosted by `wallTorchObject.ts` rather than by a row in the table because
 * the table resolves an emitter at the object's origin and the flame is on a
 * bone; the original never gives 37 an `AddTerrainLight`, so `terrain` here
 * is ours.
 */
export const EMPIRE_GUARDIAN_4_WALL_TORCH: LightEmitter = {
  sprite: {
    scale: 4,
    color: [1, 0.45, 0.15],
    pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
  },
  terrain: {
    range: 2,
    color: [1, 0.6, 0.2],
    flicker: { min: 0.3, max: 0.6, steps: 4 },
  },
};

/**
 * Type 157's light, `Chandelier.smd` (x6). The original hangs no light on it
 * at all - this is ours, at the object origin with the table candle's colour,
 * and it is the row `common/mapTileObject.ts` already uses for the login
 * scene under the name `LOGIN_CHANDELIER`.
 */
export const EMPIRE_GUARDIAN_4_CHANDELIER: LightEmitter = {
  terrain: {
    range: 5,
    color: [1, 0.62, 0.22],
    flicker: { min: 0.3, max: 0.6, steps: 4 },
  },
};

/**
 * The two lit marker boxes, moved here verbatim from the local
 * `EMPIRE_GUARDIAN_4_LIGHTS` in `lighting/mapObjectLights.ts` so day 4 owns
 * its own table like every other ported map.
 *
 * 37 and 157 are not rows here on purpose: both need a bone, so they are
 * classes (`wallTorchObject.ts`, `chandelierObject.ts`) that call
 * `lightMapObject` with the two emitters above. Adding them to this table
 * would also double the login scene's torch, which `mapTileObject.ts` hosts
 * there already.
 */
export const EMPIRE_GUARDIAN_4_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  /**
   * :917-921 (x120) - `CreateSprite(BITMAP_LIGHT, pos, 2 * Scale, (1, 0.2, 0))`.
   * The original's sprite is a constant; the breathing, the wander and the
   * terrain light are ours, matched to the wall torch below it so a brazier
   * reads as a jet rather than as something burning.
   */
  79: [
    {
      sprite: {
        scale: 2,
        color: [1, 0.2, 0],
        pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
      },
      pointRange: 6,
      wander: 0.08,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],

  /**
   * :941-948 (x0 here, days 1-3 and the login scene place it) -
   * `CreateSprite(BITMAP_LIGHT, pos, 8 * Scale, (L*0.1, L*0.1, L*0.5))` with
   * `L = (sin(WorldTime * 0.04) + 1) * 0.3 + 0.4`. Scale, colour ratio and
   * pulse are the original's; the point and terrain light are ours.
   */
  80: [
    {
      sprite: {
        scale: 8,
        color: [0.1, 0.1, 0.5],
        pulse: { speed: 0.04, amount: 0.3, base: 0.4 },
      },
      pointRange: 4,
      terrain: {
        range: 2,
        color: [0.1, 0.1, 0.5],
      },
    },
  ],
};
