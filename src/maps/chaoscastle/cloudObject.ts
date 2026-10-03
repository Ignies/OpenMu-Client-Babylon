import type { Scene } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';
import { HIDDEN_MESH_ALL, ModelObject } from '../../common/modelObject';
import { CloudBank } from '../icarus/cloudBank';
import { CLOUD_TEXTURE, getSkySpritePool } from '../icarus/skySprites';
import { CHAOS_CASTLE_CLOUD_BANKS } from './spec';

/**
 * Chaos Castle types 6-11: the fog around the castle and in its two pits.
 *
 * `RenderChaosCastleVisual` (CSChaosCastle.cpp:375-470) hides each of these
 * boxes on sight and stands a bank of `BITMAP_CLOUD` in its place, dim blue
 * and kept alive for as long as the box is in view - the same cloud the
 * Icarus banks are, so it is the same `CloudBank`. Like `IcarusCloudObject`,
 * the box model is never loaded: it is never drawn and nothing hangs off it.
 */
export class ChaosCastleCloudObject extends ModelObject {
  CastsShadow = false;

  #scene: Scene | null = null;

  #bank: CloudBank | null = null;

  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#scene = world.scene;
    this.HiddenMesh = HIDDEN_MESH_ALL;
    this.Visible = false;
    this.Ready = true;

    const spec = CHAOS_CASTLE_CLOUD_BANKS[this.Type];
    if (!spec) return;

    const pool = await getSkySpritePool(world.scene, CLOUD_TEXTURE);

    // Disposed while the texture was in flight: the box left the visibility
    // radius before its clouds ever appeared.
    if (!pool || this.#disposed) return;

    this.#bank = new CloudBank(world.scene, pool);
    this.#bank.spawn(this.node.position, this.node.scaling.x, spec);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const scene = this.#scene;
    if (!scene) return;

    this.#bank?.update(
      scene.getEngine().getDeltaTime(),
      gameTime.TotalGameTime.TotalSeconds * 1000
    );
  }

  dispose(): void {
    this.#disposed = true;
    this.#bank?.dispose();
    this.#bank = null;
    this.#scene = null;

    super.dispose();
  }
}
