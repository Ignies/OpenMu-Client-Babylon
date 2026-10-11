import { createMovableFlare, type MovableFlare } from '@/controllers/lighting/effectLights';
import { ModelObject } from '@/controllers/render/modelObject';
import { TILE_CM } from '@/controllers/terrain/consts';
import type { Scene } from '@/controllers/render/babylon/exports';
import type { World } from '@/ecs/world';
import { reportLoadFailure } from '@/controllers/assets';
import { visualLuminosity, visualTurn } from './visualRoll';

/** `Vector(0.f, 0.f, 260.f, p)` added to `o->Position`: no `* o->Scale` (ZzzObject.cpp:2916-2917). */
const HEIGHT = 260 / TILE_CM;

/** `CreateSprite(BITMAP_LIGHTNING + 1, Position, 2.5f, Light, o, Rotation)`: no `* o->Scale` either. */
const SCALE = 2.5;

/** `Vector(Luminosity * 1.f, Luminosity * 1.f, Luminosity * 1.f, Light)` (ZzzObject.cpp:2914). */
const WHITE: readonly [number, number, number] = [1, 1, 1];

/**
 * Lost Tower 40 (x1). `Object5` has no `Object41.bmd`, so it draws no body (LoadData.cpp:22-49), but
 * `RenderObjectVisual` runs for it all the same: two white `BITMAP_LIGHTNING + 1` 260 above it,
 * turning against each other like the machines' pairs (ZzzObject.cpp:2913-2920).
 */
export class LostTowerLightningObject extends ModelObject {
  #scene: Scene | null = null;
  #flares: MovableFlare[] = [];
  #lit = false;
  #disposed = false;

  init(world: World): Promise<void> {
    this.CastsShadow = false;
    this.Visible = false;
    this.Ready = true;
    this.#scene = world.scene;

    return Promise.resolve();
  }

  #light(scene: Scene): void {
    this.#lit = true;

    const { x, y, z } = this.node.position;

    for (let i = 0; i < 2; i++) {
      void createMovableFlare(scene, SCALE, WHITE, 'lightning1')
        .then(flare => {
          if (!flare) return;
          if (this.#disposed) return flare.dispose();

          flare.moveTo(x, y + HEIGHT, z);
          this.#flares.push(flare);
        })
        .catch(reportLoadFailure('effect light flare'));
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const flare of this.#flares) flare.dispose();
    this.#flares.length = 0;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.#lit && this.#scene) this.#light(this.#scene);

    // One roll a frame for both, the `+Rotation` copy first.
    const lumi = visualLuminosity();
    const rotation = visualTurn(gameTime.TotalGameTime.TotalSeconds * 1000);

    for (let i = 0; i < this.#flares.length; i++) {
      this.#flares[i].setLuminosity(lumi);
      this.#flares[i].setAngle(i === 0 ? rotation : -rotation);
    }
  }
}
