import type { World } from '../../ecs/world';
import { TarkanBannerObject } from './bannerObject';
import { TarkanDustBankObject } from './dustBankObject';
import { TarkanGlowLampObject } from './glowLampObject';
import { TarkanImpactGlowObject } from './impactGlowObject';
import { TarkanLightShaftObject } from './lightShaftObject';
import { TarkanQuakeVentObject, TarkanSandVentObject } from './ventObject';

/**
 * Tarkan (World 9 / `Object9`), the desert. `CreateObject`
 * (ZzzObject.cpp:4727-4736) touches exactly one of the 88 types, `MoveObject`
 * (:4036-4129) fourteen and `RenderObjectVisual` (:2956-3034) six. The UV
 * scrolls and the unphased `BlendMeshLight` sines are in
 * `common/meshAnimation.ts`; the blend meshes, the effect-only markers, the
 * type 70 emitter and the brazier lights are in `spec.ts`. This file is the
 * seven class assignments and the notes.
 *
 * Type identities, from EncTerrain9.obj and the models: 1/5 giant buried
 * hands, 2 scrolling frieze, 7 red glow lamp, 8 flapping banner, 11/12/13 and
 * 72/73/75/79 the sand-falls, 14/54 giant buried faces, 15-19 palm and dead
 * trees, 52/55/58/59 sarcophagi, 60 dust bank, 61/65 braziers, 63 impact
 * glow, 68/69/71/74 giant statues, 70/76/83 dust vents, 78 sit object, 82
 * light shaft, 85-87 later-season props with no code behind them.
 *
 * **`Object9` has holes**: no `Object01/04/05/35/36/39/65/85`, so types 0, 3,
 * 4, 34, 35, 38, 64 and 84 have no model. Two of them carry C++ behaviour
 * that can therefore never run — type 4's blend mesh, V scroll and white
 * range-3 terrain light (:4044-4057), and type 64, the red twin of the type
 * 63 impact glow (:2978-2986). Both are no-ops here. EncTerrain9.obj still
 * places one type 4 and two type 0 records; their loads fail and are logged.
 *
 * **Not implemented, deliberately:**
 *
 *  - **The sandstorm overlay.** `ZzzInterface.cpp:8463` draws two
 *    full-screen scrolling `sand01`/`sand02` layers tinted `(0.3, 0.3, 0.25)`
 *    over everything in this world. It is the single loudest thing about
 *    Tarkan and it is a screen-space pass, not an object — UI/post work.
 *  - **The terrain wind and water rates.** Tarkan runs the terrain's wind
 *    oscillation ten times faster (`ZzzLodTerrain.cpp:2411`) and its
 *    `WaterMove` at half rate — a 40 s loop instead of 20 s (:2615). Both are
 *    per-world constants inside the terrain, not map objects.
 *  - **Scorpion boids** (`Object9/Bug02.glb` is placed by the boid code, not
 *    by EncTerrain9.obj — which is why it has no type number).
 *  - **The Dinorant `+90` height.** `ZzzCharacter.cpp:6263-6273` lifts a
 *    Dinorant rider by 90 rather than 30 in Tarkan and Heaven; that is
 *    `ModelObject.HoverHeight` on the *player*, set from the map.
 *  - **Type 81's chrome pass.** `Draw_RenderObject` (:1034) renders the two
 *    81s twice, the second time with `RENDER_CHROME5` over `BITMAP_CHROME2`.
 *    The port has no per-object chrome pass; materials work, and the
 *    same note already stands on Lost Tower 3/4 in `meshAnimation.ts`.
 *
 * Music (`Music/tarkan`) and the `Sound/desert` ambient bed are wired
 * elsewhere.
 */
export async function createTarkan(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // Tarkan 7 (ZzzObject.cpp:4058-4069), x98: the red glow lamp. Blend mesh
  // and terrain light both pulse on a sine phased by the lamp's own yaw,
  // which no shared table can express.
  tiles[7] = TarkanGlowLampObject;

  // Tarkan 8 (ZzzObject.cpp:3679-3683), x10: the banner, at 4x play speed.
  tiles[8] = TarkanBannerObject;

  // Tarkan 60 (ZzzObject.cpp:2959-2969), x82: a one-shot burst of 20 dust
  // puffs, then hidden forever. Effect-only (spec.ts), so the class is all
  // there is of it.
  tiles[60] = TarkanDustBankObject;

  // Tarkan 63 (ZzzObject.cpp:2971-2977), x18: model loaded, body hidden,
  // a pulsing glow hung off bone 2 of the skeleton it never draws.
  tiles[63] = TarkanImpactGlowObject;

  // Tarkan 76 (ZzzObject.cpp:2996-3007), x19, and 83 (:3008-3033), x10: the
  // two windowed dust vents. Both effect-only; 83 phases its window by yaw.
  tiles[76] = TarkanSandVentObject;
  tiles[83] = TarkanQuakeVentObject;

  // Tarkan 82 (ZzzObject.cpp:4123-4127), x60: the light shaft, pinned to full
  // white rather than lit by the terrain it stands on.
  tiles[82] = TarkanLightShaftObject;

  // Tarkan 78 (ZzzObject.cpp:4730-4734), x13 — the sittable step, and the
  // only type in the map's `CreateObject` case. It is `CreateOperate(o)` and
  // nothing else: no `HiddenMesh`, no `BoundingBoxMax` override, so unlike
  // Atlans 39 the model draws normally and keeps the default
  // `(-40,-40,0)…(40,40,80)` pick box. `libs/mu/restObjects.ts` already maps
  // World 9 type 78 to `sit(false)` and `RestObjectSystem` reads that from
  // the entity's `modelId`, so the click behaviour is wired without a class.
  // The default `MapTileObject` is the whole of the visible behaviour, and a
  // subclass that only re-loaded `Object79.glb` would be a class that does
  // nothing.
}
