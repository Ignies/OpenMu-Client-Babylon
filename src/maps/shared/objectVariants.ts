import { MapTileObject } from '../../common/mapTileObject';
import type { Entity, World } from '../../ecs/world';

/**
 * The two per-object settings the later worlds' `MoveObject` cases write
 * over and over — `o->Alpha = k` and `o->Velocity = k` — as parameterised
 * classes, so a map's `index.ts` can say `tiles[41] = AlphaObject.at(0.5)`
 * instead of declaring a subclass per type per map.
 *
 * `MapTileObjects` is an array of constructors (`modelFactory`), so `at()`
 * returns a fresh subclass with the value baked in; the same value gives the
 * same class back, which keeps the factory identity stable for the ECS.
 */

const alphaClasses = new Map<number, typeof MapTileObject>();
const speedClasses = new Map<number, typeof MapTileObject>();

/**
 * `o->Alpha = k` (e.g. Aida 41, Kanturu 76/96, Crywolf 81, Balgas 78): a
 * translucent map object. `setAlpha` writes `mesh.visibility`, which is what
 * the original's per-mesh `Alpha` does in `RenderMesh`.
 */
export class AlphaObject extends MapTileObject {
  /** Subclass with `alpha` baked in. */
  static at(alpha: number): typeof MapTileObject {
    let cls = alphaClasses.get(alpha);
    if (!cls) {
      cls = class extends AlphaObject {
        protected alpha(): number {
          return alpha;
        }
      };
      alphaClasses.set(alpha, cls);
    }
    return cls;
  }

  protected alpha(): number {
    return 1;
  }

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);
    this.setAlpha(this.alpha());
  }
}

/**
 * `o->Velocity = k`: the play speed of a map object in BMD keys per 25 Hz
 * tick, the same units as `ModelObject.AnimationSpeed` (see
 * maps/atlans/anemoneObject.ts for why `setAnimationSpeed` and not a plain
 * assignment). `CreateObject` gives every object 0.16.
 */
export class PlaySpeedObject extends MapTileObject {
  /** Subclass with `speed` baked in. */
  static at(speed: number): typeof MapTileObject {
    let cls = speedClasses.get(speed);
    if (!cls) {
      cls = class extends PlaySpeedObject {
        protected playSpeed(): number {
          return speed;
        }
      };
      speedClasses.set(speed, cls);
    }
    return cls;
  }

  protected playSpeed(): number {
    return 0.16;
  }

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);
    this.setAnimationSpeed(this.playSpeed());
  }
}
