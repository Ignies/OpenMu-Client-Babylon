import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { KIND_REACH, spawnParticle } from '@/controllers/fx/effectParticles';
import { viewDepth } from '@/controllers/render/viewPlanes';
import type { Scene } from '@/controllers/render/babylon/exports';
import type { Entity, World } from '@/ecs/world';
import { reportLoadFailure } from '@/controllers/assets';

/** `BITMAP_FIRE_RED`'s life as an effect (EffectRegistry.cpp:66). */
const EFFECT_LIFE = 40;

/** `pObject->Scale` lands in CreateEffect's `Skill`, so the effect keeps the 0.9 of a scale of 0 (ZzzEffect.cpp:365-368). */
const EFFECT_SCALE = 0.9;

/** `Vector(1.0f, 0.4f, 0.4f, Light)` (EffectBehaviors.cpp:127). */
const FIRE_LIGHT: readonly [number, number, number] = [1, 0.4, 0.4];

const TICKS_PER_SECOND = 25;

const onFailure = reportLoadFailure('particle fireRed');

/**
 * Balgass 92 (Refuge ×5), the volcano's fire pillar (GM3rdChangeUp.cpp:239-252): while
 * `(sinf(WorldTime * 0.0005f) + 1) * 0.5f > 0.9f`, two seconds and a half in each twelve, it makes two
 * `BITMAP_FIRE_RED` effects a tick. Each effect lives 40 ticks and from the tick after it is made
 * makes one `BITMAP_FIRE_RED` particle a tick, up to 16 off (EffectBehaviors.cpp:122-131,
 * ZzzEffect.cpp:8573), so the column swells to 80 particles a tick. The effects are only counted: a
 * ring holds how many each of the last 40 ticks made. As `RenderObjectVisual` runs only in view, it
 * makes effects only then; the ones made run out wherever the camera is.
 */
export class BalgasFirePillarObject extends MapTileObject {
  readonly #made = new Uint8Array(EFFECT_LIFE);
  #head = 0;
  #alive = 0;
  #due = 0;
  #scene: Scene | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.#scene = world.scene;
  }

  dispose(): void {
    this.#scene = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const scene = this.#scene;
    if (!this.Ready || !scene) return;

    this.#due = Math.min(this.#due + (scene.getEngine().getDeltaTime() / 1000) * TICKS_PER_SECOND, 4);

    const at = this.node.position;
    const reach = KIND_REACH.fireRed;
    const inView = viewDepth(scene, at.x, at.y, at.z) > -(reach.travel + reach.perScale * EFFECT_SCALE);
    const crest = (Math.sin(gameTime.TotalGameTime.TotalSeconds * 1000 * 0.0005) + 1) * 0.5 > 0.9;

    while (this.#due >= 1) {
      this.#due -= 1;

      for (let i = 0; i < this.#alive; i++) {
        void spawnParticle(scene, 'fireRed', at, this.node.rotation, EFFECT_SCALE, FIRE_LIGHT).catch(onFailure);
      }

      const made = inView && crest ? 2 : 0;
      this.#alive += made - this.#made[this.#head];
      this.#made[this.#head] = made;
      this.#head = (this.#head + 1) % EFFECT_LIFE;
    }
  }
}
