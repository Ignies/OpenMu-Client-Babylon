import { createMovableFlare, type MovableFlare } from '../../common/effectLights';
import {
  DEVIAS_CANDELABRA,
  lightMapObject,
} from '../../lighting/mapObjectLights';
import type { LightSource } from '../../lighting/lightSource';
import { Store } from '../../store';
import type { World } from '../../ecs/world';
import type { BonedEmission } from '../../common/effectParticles';
import { CandleObject } from '../lorencia/candleObject';

const FLARE_SCALE = 1.6;
const FLARE_COLOR: readonly [number, number, number] = [1, 0.62, 0.22];

/** Updates to wait for a posed skeleton before giving up and lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * Devias standing candelabra (Object3 types 54 and 56, 1.7 tiles tall).
 * Same three-arm rig as Lorencia's Candle01 (Bone02/04/06 arms
 * with Bone03/05/07 wicks), so the Lorencia wick-fire logic applies
 * unchanged; only the model file differs. The original gives them a
 * BlendMesh and nothing else (ZzzObject.cpp:4650).
 *
 * The light is ours — `DEVIAS_CANDELABRA` in the lighting layer's map-object
 * table. Instead of a fixed table offset it sits at the wicks: BMD bone
 * transforms only exist once the skeleton has been posed by a render (see
 * the bounds note in the memory), so the light is created from `Update` the
 * first time the wicks have left the object origin, and it keeps following
 * them through the shared position object.
 */
export class DeviasCandleObject extends CandleObject {
  #lightPos = { x: 0, y: 0, z: 0 };
  #flares: MovableFlare[] = [];
  #source: LightSource | null = null;
  #lit = false;
  #waited = 0;
  #disposed = false;

  protected modelName(): string {
    return `Object${(this.Type + 1).toString().padStart(2, '0')}.glb`;
  }

  /**
   * Lighter than the Lorencia table candle: the reading room has 18 wicks
   * in view at once (six candelabra × 3), and the full recipe
   * would spawn ~3000 sprites a second into a 2048 pool and starve the
   * fireplace. Two flame sprites a tick, smoke every third tick.
   */
  protected wickEmissions(
    wick: BonedEmission['node'],
    scale: number
  ): BonedEmission[] {
    return [
      {
        node: wick,
        kinds: ['fire157'],
        count: 1,
        scale: scale * 0.2,
        light: [0.9, 0.5, 0],
      },
      {
        node: wick,
        kinds: ['fire157'],
        count: 1,
        scale: scale * 0.08,
        light: [0.7, 0.42, 0.02],
      },
      {
        node: wick,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.1,
        light: [1, 1, 1],
        every: 3,
      },
    ];
  }

  #wicksPosed(): boolean {
    const origin = this.node.getAbsolutePosition();

    for (const wick of this.wicks) {
      const p = wick.getAbsolutePosition();
      if (
        Math.abs(p.x - origin.x) > 1e-3 ||
        Math.abs(p.y - origin.y) > 1e-3 ||
        Math.abs(p.z - origin.z) > 1e-3
      ) {
        return true;
      }
    }

    return false;
  }

  #updateLightPos(): void {
    const pos = this.#lightPos;
    pos.x = pos.y = pos.z = 0;

    for (const wick of this.wicks) {
      const p = wick.getAbsolutePosition();
      pos.x += p.x;
      pos.y += p.y;
      pos.z += p.z;
    }

    const n = this.wicks.length || 1;
    pos.x /= n;
    pos.y /= n;
    pos.z /= n;
  }

  #light(world: World): void {
    this.#lit = true;
    this.#updateLightPos();

    this.#source = lightMapObject(world.scene, DEVIAS_CANDELABRA, this.#lightPos);

    const scale = this.node.scaling.x;

    for (const wick of this.wicks) {
      void createMovableFlare(world.scene, FLARE_SCALE * scale, FLARE_COLOR).then(
        flare => {
          if (!flare) return;

          if (this.#disposed) {
            flare.dispose();
            return;
          }

          const p = wick.getAbsolutePosition();
          flare.moveTo(p.x, p.y, p.z);
          this.#flares.push(flare);
        }
      );
    }
  }

  dispose(): void {
    this.#disposed = true;

    this.#source?.dispose();
    this.#source = null;

    for (const flare of this.#flares) flare.dispose();
    this.#flares.length = 0;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.wicks.length === 0) return;

    const world = Store.world;
    if (!world) return;

    if (!this.#lit) {
      if (this.#wicksPosed() || ++this.#waited >= POSE_WAIT_LIMIT) {
        this.#light(world);
      }
      return;
    }

    if (this.OutOfView) return;

    this.#updateLightPos();

    if (this.#source && this.#flares.length) {
      // Same roll as the terrain light: the flare breathes with the flicker
      // instead of sitting as a constant disc on the flame.
      const c = this.#source.color;
      const lumi = Math.min(1, (c.r + c.g + c.b) / 1.68 + 0.4);

      for (let i = 0; i < this.#flares.length; i++) {
        const p = this.wicks[i % this.wicks.length].getAbsolutePosition();
        this.#flares[i].moveTo(p.x, p.y, p.z);
        this.#flares[i].setLuminosity(lumi);
      }
    }
  }
}
