import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { KIND_REACH, spawnParticle } from '@/controllers/fx/effectParticles';
import { viewDepth } from '@/controllers/render/viewPlanes';
import type { Scene } from '@/controllers/render/babylon/exports';
import type { Entity, World } from '@/ecs/world';
import { reportLoadFailure } from '@/controllers/assets';
import { BALGAS_TIMER_PUFFS, type TimerPuff } from './spec';

const TICKS_PER_SECOND = 25;

const onFailure = reportLoadFailure('particle balgas smoke');

const coin = () => Math.random() < 0.5;

/** Each puff's move overwrites the light it is made with (`BALGAS_TIMER_PUFFS`). */
const WHITE: readonly [number, number, number] = [1, 1, 1];

/**
 * Balgass 5 and 85 (GM3rdChangeUp.cpp:133-153, :187-210): a tick, two `rand_fps_check(2)`; each that
 * passes steps `o->Timer`, the first making its pair when its step lands on 2 (mod 4), the second when
 * its step lands on 0 (`BALGAS_TIMER_PUFFS`). So each pair comes one tick in eight, never with the
 * other, in an order the dice pick. `RenderObjectVisual` runs only in view: out of it the timer stands.
 */
export class BalgasSmokeObject extends MapTileObject {
  #timer = 0;
  #due = 0;
  #reach = 0;
  #scene: Scene | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.#scene = world.scene;

    const scale = this.node.scaling.x;
    for (const pair of BALGAS_TIMER_PUFFS[this.Type] ?? []) {
      for (const puff of pair) {
        const r = KIND_REACH[puff.kind];
        this.#reach = Math.max(this.#reach, r.travel + r.base + r.perScale * Math.abs(scale * (puff.scale ?? 1)));
      }
    }
  }

  dispose(): void {
    this.#scene = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const scene = this.#scene;
    const pairs = BALGAS_TIMER_PUFFS[this.Type];
    if (!this.Ready || !scene || !pairs) return;

    const at = this.node.position;
    if (viewDepth(scene, at.x, at.y, at.z) <= -this.#reach) {
      this.#due = 0;
      return;
    }

    this.#due = Math.min(this.#due + (scene.getEngine().getDeltaTime() / 1000) * TICKS_PER_SECOND, 4);

    while (this.#due >= 1) {
      this.#due -= 1;
      if (coin() && (++this.#timer + 2) % 4 === 0) this.#puff(scene, pairs[0]);
      if (coin() && ++this.#timer % 4 === 0) this.#puff(scene, pairs[1]);
    }
  }

  #puff(scene: Scene, pair: readonly TimerPuff[]): void {
    for (const puff of pair) {
      if (puff.coin && !coin()) continue;
      const scale = this.node.scaling.x * (puff.scale ?? 1);
      void spawnParticle(scene, puff.kind, this.node.position, this.node.rotation, scale, WHITE).catch(onFailure);
    }
  }
}
