import { ParticleEmitter, type Emission } from '../../common/effectParticles';
import { MapTileObject } from '../../common/mapTileObject';
import { cmToTiles } from '../../common/terrain/consts';
import type { Entity, World } from '../../ecs/world';

/** `Position[2] += 50.0f` (GMSwampOfQuiet.cpp:164). */
const VENT_HEIGHT = cmToTiles(50);

/**
 * `CreateParticle(BITMAP_SMOKE, Position, Angle, (0.03, 0.03, 0.03), 49,
 * o->Scale)` (GMSwampOfQuiet.cpp:166-167), one in six reference ticks.
 *
 * SubType 49 is not smoke at all: its init swaps the sheet for `BITMAP_CLOUD`
 * (ZzzEffectParticle.cpp:1488-1499), takes `LifeTime 100 + rand%50`, sets
 * `Scale = o->Scale * 0.4` and spins the card one way or the other. Its move
 * (:5656-5678) grows the light by 1.03 a frame for the first fifty, then
 * decays it by 0.97 until it dies, and lifts the puff by `Scale * 6` all the
 * way - gas leaving the water, brightening as it spreads and fading out.
 *
 * `cloud21` is the nearest kind that exists: the same sheet, the same rise,
 * a third of the life. What it cannot do is the ramp, so the light here is
 * the original's *peak* - `0.03 * 1.03^50` - rather than its starting value,
 * which on an additive card would be nothing at all. `scale` is 0.2 because
 * `cloud21` multiplies by 1.8-2.0 of its own (:339-353) and the original's
 * 0.4 is flat.
 */
const MARSH_GAS: readonly Emission[] = [
  { kinds: ['cloud21'], every: 6, scale: 0.2, light: [0.1, 0.1, 0.1] },
];

/**
 * Swamp 72 (×59): the marsh gas vent, hidden by `MoveObject` (:90) and drawn
 * only as this plume.
 *
 * The class exists for one line, the `+= 50` above: an emission table spawns
 * at the object's own origin, and this one is the only Swamp emitter the
 * original lifts off the ground before it spawns. Everything else the type
 * does is the recipe.
 */
export class SwampMarshGasObject extends MapTileObject {
  #emitter: ParticleEmitter | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    const { x, y, z } = this.node.position;

    this.#emitter = new ParticleEmitter(
      world.scene,
      MARSH_GAS,
      { x, y: y + VENT_HEIGHT, z },
      this.node.rotation.y,
      this.node.scaling.x
    );
  }

  dispose(): void {
    this.#emitter = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    this.#emitter?.update();
  }
}
