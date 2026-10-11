import { BonedParticleEmitter, type BonedEmission } from '@/controllers/fx';
import {
  LOGIN_WALL_TORCH,
  createEffectLight,
  lightMapObject,
  type EffectLight,
} from '@/controllers/lighting';
import { MapTileObject } from '@/controllers/terrain';
import { reportLoadFailure } from '@/controllers/assets';
import { isOn } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';
import { WALL_TORCH_FLARE } from '../empireguardian4/spec';

/**
 * The login scene's wall torch, type 37 on `WD_73NEW_LOGIN_SCENE`: a grey BITMAP_FLARE card at bone 1
 * (the object origin without one), as `RenderObjectVisual` case 37 draws it (GMEmpireGuardian4.cpp:864-875).
 * The `loginWallTorches` improvement makes it burn: the warm `LOGIN_WALL_TORCH` flare, its ground
 * light and the cycling `FIRE_HIK1` / `CURSEDLICH` / `HIK3` flame; the original has none of them.
 */
export class LoginWallTorchObject extends MapTileObject {
  // Its flame and light are per object: never a batched prop.
  static Batchable = false;

  #light: EffectLight | null = null;
  #source: ReturnType<typeof lightMapObject> | null = null;
  #fire: BonedParticleEmitter | null = null;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    const scale = this.node.scaling.x;

    const bone = this.gltf?.mesh
      .getDescendants(false)
      .find(n => n.name.startsWith('bone_1_'));

    const anchor: BonedEmission['node'] =
      bone && 'getAbsolutePosition' in bone
        ? (bone as unknown as BonedEmission['node'])
        : this.node;

    const position = anchor.getAbsolutePosition();
    const offsetY = 0;

    const spritePosition = {
      x: position.x,
      y: position.y + offsetY,
      z: position.z,
    };

    // Classic: case 37's grey flare alone; a burning torch's flare is warm.
    const burning = isOn('loginWallTorches');
    const flare = burning ? LOGIN_WALL_TORCH.sprite! : WALL_TORCH_FLARE;

    void createEffectLight(world.scene, flare, spritePosition, scale).then(light => {
      this.#light = light;

      if (this.#disposed) {
        this.#light?.dispose();
        this.#light = null;
      }
    }).catch(reportLoadFailure('effect light flare'));

    if (!burning) return;

    this.#source = lightMapObject(world.scene, LOGIN_WALL_TORCH, spritePosition);

    this.#fire = new BonedParticleEmitter(world.scene, [
      {
        node: anchor,
        kinds: ['fire1', 'fire2', 'fire3'],
        count: 1,
        scale: scale * 0.8,
        light: [1, 1, 1],
        offsetY,
      },
    ]);
  }

  dispose(): void {
    this.#disposed = true;
    this.#light?.dispose();
    this.#light = null;

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
