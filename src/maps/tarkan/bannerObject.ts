import { MapTileObject } from '../../common/mapTileObject';
import type { Entity, World } from '../../ecs/world';

/**
 * `fSpeed = o->Velocity; if (WorldActive == WD_8TARKAN && o->Type == 8)`
 * `fSpeed *= pow(4.0f, FPS_ANIMATION_FACTOR);` (ZzzObject.cpp:3676-3684).
 *
 * `Velocity` *is* the play speed of a map object — `PlayAnimation` takes it
 * directly, in BMD keys per 25 Hz reference tick, the same units as
 * `ModelObject.AnimationSpeed` (common/playSpeed.ts) — and `CreateObject`
 * hands every object 0.16 (:4470). `FPS_ANIMATION_FACTOR` is
 * `REFERENCE_FPS / FPS` clamped to 1 (ZzzAI.cpp:729), so at the reference
 * rate the exponent is 1 and the multiplier is a flat 4. Above 25 fps it
 * shrinks toward 1, which is the original compensating for calling
 * `PlayAnimation` more often per second; the port advances clips on wall
 * clock, so the reference value is the one to use.
 *
 * 0.16 x 4 = 0.64.
 */
const BANNER_PLAY_SPEED = 0.64;

/**
 * Tarkan 8 (ZzzObject.cpp:3679-3683), ×10 — the cloth banners on the temple
 * poles, at scales 0.6 to 1.78. This is the only per-type animation-rate
 * override in either map's C++, and it is the difference between cloth
 * snapping in a desert wind and cloth stirring underwater.
 *
 * `setAnimationSpeed` rather than a plain assignment: `MapTileObject.init`
 * has already loaded the model, and `loadGLTF` starts clip 0 looping on load
 * (modelLoader.ts:471-481), so a plain write to `AnimationSpeed` would only
 * reach a `playAction` that never comes for a single-action map object.
 */
export class TarkanBannerObject extends MapTileObject {
  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.setAnimationSpeed(BANNER_PLAY_SPEED);
  }
}
