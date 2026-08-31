import { BonedParticleEmitter, type BonedEmission } from '../../common/effectParticles';
import { ModelObject } from '../../common/modelObject';
import type { Entity, World } from '../../ecs/world';

export class CandleObject extends ModelObject {
  #fire: BonedParticleEmitter | null = null;

  /** Wick bones (Bone03/05/07), filled by the fire setup; world positions are valid once the skeleton has been posed. */
  protected wicks: BonedEmission['node'][] = [];

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.BlendMeshLight = 2.2;

    this.GlowBlendMesh = true;

    await this.loadSpecificModel(this.modelName());

    this.#fire = this.#createFire(world);
  }

  /** Per-wick particle recipe (one table candle: 5 sprites a tick per wick). */
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
        scale: scale * 0.1,
        light: [0.75, 0.3, 0],
      },
      {
        node: wick,
        kinds: ['fire157'],
        count: 2,
        scale: scale * 0.06,
        light: [0.65, 0.45, 0.02],
      },
      {
        node: wick,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.1,
        light: [1, 1, 1],
      },
    ];
  }

  /** Model file inside `objectDir`; the Devias candelabra share the rig. */
  protected modelName(): string {
    return `Candle01.glb`;
  }

  #createFire(world: World): BonedParticleEmitter | null {
    const root = this.gltf?.mesh;

    if (!root) return null;

    const scale = this.node.scaling.x;
    const points: BonedEmission[] = [];
    const wicks: BonedEmission['node'][] = [];
    this.wicks = wicks;

    const isWick = (name: string) => /^bone_[357]_/.test(name);

    for (const bone of this.gltf?.skeleton?.bones ?? []) {
      const node = bone.getTransformNode();

      if (node && isWick(node.name)) wicks.push(node);
    }

    if (wicks.length === 0) {
      for (const node of root.getDescendants(false)) {
        if (isWick(node.name) && 'getAbsolutePosition' in node) {
          wicks.push(node as BonedEmission['node']);
        }
      }
    }

    if (wicks.length === 0) {
      console.warn(
        'CandleObject: no wick bones found - the candles will not burn'
      );
      return null;
    }

    for (const wick of wicks) {
      points.push(...this.wickEmissions(wick, scale));
    }

    return new BonedParticleEmitter(world.scene, points);
  }

  dispose(): void {
    this.#fire = null;
    this.wicks = [];
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.OutOfView) return;

    this.#fire?.update();
  }
}
