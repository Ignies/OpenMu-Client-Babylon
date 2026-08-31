import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Crywolf Fortress (`WD_34CRYWOLF_1ST`, `World35`/`Object35`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain35.obj places 6644 objects of 78 types; Object35 ships 84 models
 * and every referenced type has one. The C++ is GMCrywolf1st.cpp:
 * `CreateCryWolf1stObject` (:322, a bare `return true`),
 * `MoveCryWolf1stObject` (:330-372), `RenderCryWolf1stObjectVisual`
 * (:374-428).
 */

/** No `o->BlendMesh` writes anywhere in the Crywolf code. */
export const CRYWOLF_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveCryWolf1stObject` :363-366 hides 82 (×5), 83 (none placed) and 84
 * (×4); `RenderCryWolf1stObjectVisual` :420-426 gives 84 a `BITMAP_SMOKE`
 * SubType 21 puff. 82 has no effect in the C++.
 */
export const CRYWOLF_EFFECT_ONLY_TYPES: readonly number[] = [82, 83, 84];

/** Type 84, the smoke vents by the altar (94.6/26.6). */
export const CRYWOLF_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  84: [{ kinds: ['smoke21'], every: 3 }],
};

/**
 * `MoveCryWolf1stObject`:
 *  - **41** (×9), :344-348: `AddTerrainLight(x, y, (0.2, 0.7, 0.5), 2)` —
 *    a steady teal glow, no flicker; `RenderCryWolf1stObjectVisual` :393-412
 *    adds two counter-rotating `BITMAP_FLARE`s sized by a sine.
 *  - **57** (×12) and **71** (×8), :349-356: `L = (rand%4+3)*0.1;
 *    AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)` — the standard MU brazier
 *    fire, the same recipe as Kanturu 61 / Swamp 57 / Balgas 3 / Karutan 113.
 *    Not hidden here (the brazier model draws), so no `emissions` on the
 *    light — the flame is in the mesh.
 */
export const CRYWOLF_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  41: [
    {
      pointRange: 4,
      terrain: { range: 2, color: [0.2, 0.7, 0.5] },
      sprite: {
        scale: 1.5,
        color: [0.2, 0.7, 0.5],
        pulse: { speed: 1, amount: 0.3, base: 0.8 },
      },
    },
  ],
  57: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],
  71: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],
};
