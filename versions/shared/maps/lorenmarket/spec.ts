import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';

/**
 * Loren Market (`WD_79UNITEDMARKETPLACE`, `World80`/`Object80`), the
 * plain-data half. Nothing here may import the scene.
 *
 * EncTerrain80.obj places 517 objects of 49 types; Object80 ships 54 models
 * and every referenced type has one. The C++ is GMUnitedMarketPlace.cpp:
 * `CreateObject` (:45-58), `MoveObject` (:82-236), `RenderObjectVisual`
 * (:238-492).
 */

/** No `o->BlendMesh` writes. */
export const LOREN_MARKET_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :132-139 hides 54-58; `RenderObjectVisual` draws them as:
 *  - **54** (×5) `WATERFALL_5` every tick, **55** (×5) `WATERFALL_3` SubType
 *    8, **56** (×4) `WATERFALL_2` one in four - the fountain's spray.
 *  - **57** (×12): a fire vent - see `LOREN_MARKET_LIGHTS`.
 *  - **58** (×0): a `BITMAP_LIGHT` sprite at `20 * scale`.
 * `CreateObject` 67 (×0 placed) is the lean box.
 */
export const LOREN_MARKET_EFFECT_ONLY_TYPES: readonly number[] = [
  54, 55, 56, 57, 58,
];

export const LOREN_MARKET_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  54: [{ kinds: ['waterfall5_9'], every: 1, scale: 0.6 }],
  55: [{ kinds: ['waterfall5_9'], every: 2 }],
  56: [{ kinds: ['waterfall5_9'], every: 4 }],
};

/**
 * `MoveObject`:
 *  - **30** (×4), :98-113: the street lamp - `L = (rand%4+3)*0.1` fire
 *    colour at bone 1, `AddTerrainLight(…, 3)`; `RenderObjectVisual`
 *    :248-262 adds a `BITMAP_FLARE` (Flare.jpg's warm star) on bones 1-3
 *    (one here), `1.5 * Scale`, grey `fLumi * 0.5` with `fLumi =
 *    (sin(WorldTime * 0.002) + 1) * 0.2 + 0.6`.
 *  - **35** (×8), :115-130: the wall lamp - the same at bone 2, range 1; its
 *    one `BITMAP_FLARE` (:264-274) is grey `fLumi * 0.7`, breathing at 0.039
 *    like the fortress wall torch.
 *  - **57** (×12), `RenderObjectVisual` :297-318: `BITMAP_LIGHT` sprite at
 *    `2 * scale` plus the cycling `FIRE_HIK1` / `CURSEDLICH` / `HIK3` - the
 *    same vent Vulcanus 6 and Karutan 113 are.
 *
 * Bone offsets are approximated by height (lamp heads ~2.5 tiles up).
 */
export const LOREN_MARKET_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  30: [
    {
      offset: [0, 0, 250],
      pointRange: 6,
      sprite: { scale: 1.5, color: [0.5, 0.5, 0.5], pulse: { speed: 0.002, amount: 0.2, base: 0.6 }, texture: 'flare' },
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],
  35: [
    {
      offset: [0, 0, 200],
      pointRange: 4,
      sprite: { scale: 1.5, color: [0.7, 0.7, 0.7], pulse: { speed: 0.039, amount: 0.2, base: 0.6 }, texture: 'flare' },
      terrain: {
        range: 1,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],
  57: [
    {
      pointRange: 4,
      sprite: {
        scale: 2,
        color: [1, 0.5, 0.2],
        pulse: { speed: 3, amount: 0.2, base: 0.9 },
      },
      terrain: {
        range: 2,
        color: [1, 0.45, 0.15],
        flicker: { min: 0.5, max: 1, steps: 4 },
      },
      emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
    },
  ],
};
