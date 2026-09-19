import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Illusion Temple (`WD_45CURSEDTEMPLE_LV1 … LV6`, one `World47`/`Object47`
 * for all six levels - `assetWorldNum`), the plain-data half. Nothing here
 * may import the scene.
 *
 * EncTerrain47.obj places 1964 objects of 78 types; Object47 ships 83 models
 * and only type 81 (×3, no `Object82.bmd`) is missing. The C++ is
 * w_CursedTemple.cpp: `CreateObject` (:315, `return false`), `MoveObject`
 * (:322-365), `RenderObjectVisual` (:526-690), `RenderObjectMesh`
 * (:1028-1103) and `RenderObject_AfterCharacter` (:692-712), plus the
 * `IsCursedTemple()` map-object block in ZzzObject.cpp:653-718.
 *
 * Both the move and the visual hook `return true` for the whole world
 * (w_CursedTemple.cpp:361, :687), and ZzzObject.cpp:3242 / :4200 call them
 * before the generic per-type code - so on these six worlds no map object
 * gets any behaviour except what is in this file.
 *
 * Not ported, with reasons:
 *  - **`RenderObject_AfterCharacter`** (:692-712) re-draws types 64, 65, 66
 *    and 80 whole-body additive in a second pass after the characters
 *    (`o->m_bRenderAfterCharacter`, ZzzObject.cpp:714-717). This codebase has
 *    no after-character pass and inventing one is out of scope. The loss is
 *    only ordering: all four models are a single mesh whose texture is
 *    `*_R.jpg`, so `textureScript.ts` already draws them additive - what the
 *    second pass buys the original is that the glow lands *over* a character
 *    standing in front of it. See the report note for what a port would need.
 *  - **types 67 (×13) and 68 (×15)** (ZzzObject.cpp:706-714): body, then the
 *    whole body again as `RENDER_BRIGHT | RENDER_CHROME`. A per-body chrome
 *    overlay is not one of the five mechanisms; `blendMeshes` addresses one
 *    mesh, not a second pass over all of them.
 *  - **type 62 (×8)** (ZzzObject.cpp:678-704): mesh 2 lit then additive
 *    chrome, meshes 1 and 0 additive, plus two `BITMAP_SHINY + 1` sprites at
 *    bones 22/23 breathing on `sin(t*0.001)*0.5+0.5` and a `BITMAP_SMOKE`
 *    puff at bone 20 one tick in five. The mesh passes are covered by the
 *    `_R` textures; the bone-anchored sprites would need a class, and eight
 *    dragon statues did not earn one.
 *  - **type 32's scrolling mesh** (ZzzObject.cpp:660-666): `StreamMesh = 2`
 *    drawn twice with U scrolling `-(t%4000)*0.00025` and `-(t%5000)*0.0002`.
 *    That is a `meshAnimation.ts` row, which is a shared file; the report
 *    carries it for the integrator.
 *  - **the match itself**: the statues, the relic, the two baskets, the
 *    score gauge and `SetTerrainWaterState` are all `CHARACTER`s and event
 *    state, not map objects, and none of it exists outside a running
 *    Illusion Temple.
 */

const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * `RenderObjectVisual`'s mist colours (:558-616, :672-683): one `fLumi` roll
 * per spawn - `rand() % 10 * step + base` - times a fixed tint.
 */
const mist =
  (r: number, g: number, b: number, step: number, base: number) =>
  (): readonly [number, number, number] => {
    const lumi = rand(10) * step + base;

    return [r * lumi, g * lumi, b * lumi];
  };

/** The same where the original writes the tint as bytes over 256. */
const tint256 = (r: number, g: number, b: number, step: number, base: number) =>
  mist(r / 256, g / 256, b / 256, step, base);

/**
 * No `o->BlendMesh` writes anywhere in the map's C++, and none is wanted: the
 * `RENDER_BRIGHT` meshes the original names by hand - 39/41 mesh 0, 46 mesh
 * 2, 54 mesh 2, 62 meshes 0/1, 64/65/66/80 mesh 0, 67/68 mesh 1
 * (ZzzObject.cpp:660-718, w_CursedTemple.cpp:1094-1100) - are every one of
 * them textured `*_R.jpg`, which `textureScript.ts` already resolves to a
 * bright pass at load. A row here would re-state that and additionally take
 * the mesh off its own material.
 *
 * The `BlendMeshLight = sin(t*0.001)*0.5+0.5` on 64/65/80 (:342-346) is in
 * `meshAnimation.ts`'s `CURSED_TEMPLE` table; it writes the same
 * `blendMeshLight` metadata the `_R` pass reads.
 */
export const CURSED_TEMPLE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :347-358 sets `HiddenMesh = -2` on 70-79 every frame. All ten
 * are the same 12-triangle `runeword_r.jpg` box - a marker, never drawn, that
 * `RenderObjectVisual` (:556-684) hangs the map's ambience on. Placed: 70
 * (×46), 71 (×23), 72 (×65), 73 (×5), 74 (×37), 75 (×21), 76 (×12), 77 (×20),
 * 78 (×46), 79 (×11).
 */
export const CURSED_TEMPLE_EFFECT_ONLY_TYPES: readonly number[] = [
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
];

/**
 * The markers' own emitters. `rand_fps_check(n)` is a 1-in-n roll per 25 Hz
 * tick, which is exactly `every: n`.
 *
 * Every `BITMAP_CLOUD` row here is SubType 15/16/17, a 500-tick drifting
 * puff (ZzzEffectParticle.cpp:2918-2983, :7659-7778); `cloud21` is the same
 * texture and the same shape at 100 ticks, so the steady-state haze is about
 * a fifth as thick as the original's. Left alone: the original saturates its
 * own 3000-particle array with these too (`MAX_PARTICLES`, _define.h:460),
 * and thickening each puff to compensate would be a different effect, not a
 * closer one.
 *
 *  - **70** (×46, :556-565) teal and **71** (×23, :566-575) pink mist, one
 *    tick in three; **72** (×65, :576-587) both off one roll, here two
 *    independent rows at the same rate.
 *  - **73** (×5, :588-597): the same at a near-white `1.2 * fLumi`.
 *  - **74** (×37, :598-606) is *not* ported. It is SubType 16, drawn through
 *    `EnableAlphaBlendMinus` (:9240-9245) and climbing from black to a 0.2
 *    grey - a faint darkening. Both subtractive kinds (`smoke2`, `smoke21`)
 *    open at a luminosity of 1.0 or more, which subtracts to solid black;
 *    thirty-seven of those at one puff per two ticks is a field of holes, not
 *    a haze. A 0.2-strength subtractive cloud is a new kind in
 *    `effectParticles.ts`, and that file is not this folder's to edit.
 *  - **75** (×21, :607-616): `ghosteffect01.jpg`, 1-in-35 per frame. No kind
 *    has that sheet; `cloud21` runs the identical SubType-0 code path
 *    (:7508-7547) on `clouds.jpg`.
 *  - **78** (×46, :649-671): a ~1.5% per-frame window (`timeGetTime() % 500`
 *    against a fresh `rand() % 485`, so ≈ one tick in 65) that drops four
 *    `MODEL_FALL_STONE_EFFECT` plus one more, two waterfall splashes off a
 *    ±40 offset, and a red `BITMAP_SMOKE`. The falling-stone *model* is an
 *    effect entity, not a particle, and has no mechanism here - only the
 *    splash and the dust are ported.
 *  - **79** (×11, :672-683): five `BITMAP_EVENT_CLOUD` puffs every tick at a
 *    third the usual scale (`(rand%20+20)/80 + Scale/3`, :2965).
 *
 * **76** and **77** are not here: they are flames with a flare card, so they
 * are rows in `CURSED_TEMPLE_LIGHTS` where the sprite and the particles ride
 * on one emitter.
 */
export const CURSED_TEMPLE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  70: [
    { kinds: ['cloud21'], every: 3, light: tint256(54, 177, 150, 0.007, 0.03) },
  ],
  71: [
    { kinds: ['cloud21'], every: 3, light: tint256(221, 121, 201, 0.007, 0.03) },
  ],
  72: [
    { kinds: ['cloud21'], every: 3, light: tint256(54, 177, 150, 0.007, 0.03) },
    { kinds: ['cloud21'], every: 3, light: tint256(221, 121, 201, 0.007, 0.03) },
  ],
  73: [{ kinds: ['cloud21'], every: 3, light: mist(1.2, 1.2, 1.2, 0.002, 0.03) }],
  75: [{ kinds: ['cloud21'], every: 35, light: mist(1, 1, 1, 0.05, 0.03) }],
  78: [
    { kinds: ['waterfall5_9'], every: 65, count: 2, jitter: 40 },
    { kinds: ['smoke22'], every: 65, scale: 1.5 },
  ],
  79: [
    {
      kinds: ['cloud21'],
      every: 1,
      count: 5,
      scale: 0.3,
      light: tint256(100, 110, 160, 0.03, 0.008),
    },
  ],
};

/**
 * The map's flames and its one glowing prop. No row has a `terrain` block,
 * because the original adds no terrain light anywhere on this map - the
 * torches are a `CreateSprite(BITMAP_LIGHT, …)` flare card and nothing else
 * (:630, :646), the way Icarus type 10 is. `recipeFromEmitter` returns null
 * for a row without one, so these draw and emit without lighting the walls,
 * which is what the original does.
 *
 *  - **54** (×8, :543-554): the only *drawn* object with an emitter, so it
 *    cannot ride `CURSED_TEMPLE_EMISSIONS` (`MapTileObject` builds that one
 *    only for effect-only types) and rides here instead. The original drops
 *    100 units, then each particle lifts itself 250 ± 100 and scatters ± 25 -
 *    the row's offset is the net +150. Two sprites are spawned: SubType 0 on
 *    `Logo/chasellight.jpg`, which has no `TextureKey` and is not ported, and
 *    SubType 3 on `clud64.jpg` (ZzzEffectParticle.cpp:104-108), which is
 *    `wingCloud`. Its light ramps 0.15 → ~0.66 over ten ticks and back down
 *    (:3890-3920); `wingCloud` only fades, so the row carries the peak.
 *  - **76** (×12, :617-632): a red torch - one `BITMAP_TORCH_FIRE` per frame
 *    (`torchfire.jpg`, no kind; the `firehik` flames are the house
 *    substitute, as in Kanturu) and a `BITMAP_LIGHT` flare at `Scale * 6`,
 *    20 units up. The original re-rolls the red channel per frame across
 *    0.70…1.70; the card takes the middle of that.
 *  - **77** (×20, :633-648): the same in blue, `0.70…1.20` on the blue
 *    channel.
 */
export const CURSED_TEMPLE_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  54: [
    {
      offset: [0, 0, 150],
      emissions: [
        {
          kinds: ['wingCloud'],
          every: 1,
          scale: 0.12,
          jitter: 25,
          light: [0.65, 0.65, 0.65],
        },
      ],
    },
  ],
  76: [
    {
      offset: [0, 0, 20],
      sprite: { scale: 6, color: [1.2, 0.28, 0.22] },
      emissions: [
        { kinds: ['fire1', 'fire3'], every: 1, light: [1.2, 0.28, 0.22] },
      ],
    },
  ],
  77: [
    {
      offset: [0, 0, 20],
      sprite: { scale: 6, color: [0.21, 0.28, 0.95] },
      emissions: [
        { kinds: ['fire1', 'fire3'], every: 1, light: [0.21, 0.28, 0.95] },
      ],
    },
  ],
};
