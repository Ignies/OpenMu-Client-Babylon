import { MapTileObject } from '../../common/mapTileObject';
import type { Entity, World } from '../../ecs/world';

/**
 * `o->Velocity = 0.05f` (ZzzObject.cpp:4033). `Velocity` *is* the play speed
 * of a map object: `PlayAnimation` is called with `fSpeed = o->Velocity`
 * (:3676), in BMD keys per 25 Hz reference tick — the same units as
 * `ModelObject.AnimationSpeed` (see common/playSpeed.ts). `CreateObject`
 * hands every object 0.16 (:4470), so this is the anemone running at just
 * under a third of the speed of the kelp around it.
 */
const ANEMONE_PLAY_SPEED = 0.05;

/**
 * Atlans 40 (ZzzObject.cpp:4030-4034), ×86. The blend mesh and its breathing
 * `BlendMeshLight` are table data (`spec.ts` and `meshAnimation.ts`); the
 * only thing that needs an object is the play-speed override.
 *
 * `setAnimationSpeed` rather than a plain assignment: `MapTileObject.init`
 * has already loaded the model by the time this runs, and `loadGLTF` starts
 * clip 0 looping on load (modelLoader.ts:471-481). A plain write to
 * `AnimationSpeed` only reaches the next `playAction`, which for a
 * single-action map object never comes.
 *
 * The absolute value matters more than the ratio here: `AnimationSpeed`
 * defaults to 0.28, the *player* idle speed, where every map object should
 * start at the original's 0.16 — so the rest of the map currently animates
 * ~1.75x fast. Writing 0.05 sets what the C++ sets and is unaffected by that
 * shared-code fix when it lands.
 */
export class AtlansAnemoneObject extends MapTileObject {
  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.setAnimationSpeed(ANEMONE_PLAY_SPEED);
  }
}
