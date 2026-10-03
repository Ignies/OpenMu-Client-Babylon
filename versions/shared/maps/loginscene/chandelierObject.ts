import { BonedParticleEmitter, type BonedEmission } from '@/controllers/fx';
import { LOGIN_CHANDELIER, lightMapObject } from '@/controllers/lighting';
import { MapTileObject } from '@/controllers/terrain';
import type { Entity, World } from '@/ecs/world';

/**
 * The login scene's chandelier, type 157 on `WD_73NEW_LOGIN_SCENE`: fire on bones 22/23/25,
 * smoke on 26/24/21 and the `LOGIN_CHANDELIER` light (`GMEmpireGuardian4::RenderObjectVisual`
 * case 157, :1050-1098). The original returns before this on the login worlds (`spec.ts`).
 */
export class LoginChandelierObject extends MapTileObject {
  // Its fire and light are per object: never a batched prop.
  static Batchable = false;

  #fire: BonedParticleEmitter | null = null;
  #source: ReturnType<typeof lightMapObject> | null = null;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.#fire = this.#createFire(world);
  }

  #createFire(world: World): BonedParticleEmitter | null {
    const root = this.gltf?.mesh;

    if (!root) return null;

    const nodeByBone = new Map<number, BonedEmission['node']>();

    for (const node of root.getDescendants(false)) {
      const match = /^bone_(\d+)_/.exec(node.name);

      if (match && 'getAbsolutePosition' in node) {
        nodeByBone.set(Number(match[1]), node as BonedEmission['node']);
      }
    }

    const scale = this.node.scaling.x;
    const points: BonedEmission[] = [];

    for (const bone of [22, 23, 25]) {
      const node = nodeByBone.get(bone);
      if (!node) continue;

      points.push(
        { node, kinds: ['fire157'], count: 2, scale: scale * 0.2, light: [0.9, 0.5, 0] },
        { node, kinds: ['fire157'], count: 2, scale: scale * 0.1, light: [0.75, 0.3, 0] }
      );
    }

    for (const bone of [26, 24, 21]) {
      const node = nodeByBone.get(bone);
      if (!node) continue;

      points.push({
        node,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.1,
        light: [1, 1, 1],
      });
    }

    if (!points.length) return null;

    this.#source = lightMapObject(world.scene, LOGIN_CHANDELIER, this.node.position);

    return new BonedParticleEmitter(world.scene, points);
  }

  dispose(): void {
    this.#source?.dispose();
    this.#source = null;
    this.#fire = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    if (!this.Ready) return;
    this.#fire?.update();
  }
}
