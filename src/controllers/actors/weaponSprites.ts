import { TransformNode, Vector3, type AbstractMesh, type Scene } from '../render/babylon/exports';
import { HeldSprites, type HeldLook } from '../fx/effectParticles';
import type { ModelObject } from '../render/modelObject';
import type { HeldSprite, HeldWearer } from '../item_fx/itemLooks';

/** The original's units (cm) to the models' (tiles). */
const CM = 1 / 100;

/** A wearer standing (action 0) out of a safe zone, for a caller that names none. */
const IDLE: HeldWearer = { action: 0, safeZone: false };

/**
 * A held weapon's `RenderLinkObject` sprites (ZzzCharacter.cpp:7027-8386), bound to its loaded model:
 * one node per sprite under its bone (the model's root without a skeleton), each drawn by `HeldSprites`
 * every frame the weapon is. Built once per model; `update` allocates nothing.
 */
export class WeaponSprites {
  /** The point each sprite rides, in spec order. */
  readonly nodes: TransformNode[];
  readonly #sprites: HeldSprites;
  readonly #meshes: AbstractMesh[];
  readonly #scratch = new Vector3();
  #ms = 0;
  #body: Vector3 = Vector3.Zero();
  #wearer: HeldWearer = IDLE;

  readonly #look = (i: number, out: HeldLook): void => this.look(i, out);

  constructor(
    scene: Scene,
    readonly model: ModelObject,
    readonly specs: readonly HeldSprite[]
  ) {
    const gltf = model.gltf;
    this.#meshes = gltf ? gltf.mesh.getChildMeshes(false) : [];
    this.nodes = specs.map(spec => {
      const node = new TransformNode('weaponSprite', scene);
      node.parent = gltf?.skeleton?.bones[spec.bone + 1]?.getTransformNode() ?? gltf?.mesh ?? null;
      const offset = spec.offset;
      if (offset && typeof offset !== 'function') node.position.set(offset[0] * CM, offset[1] * CM, offset[2] * CM);
      return node;
    });
    this.#sprites = new HeldSprites(
      scene,
      this.nodes.map((node, i) => ({ node, texture: specs[i].texture, blend: 'add' as const }))
    );
  }

  /** Sprite `i`'s look at the last update's time, body light and wearer; a sprite its `when` skips is drawn at size 0. */
  look(i: number, out: HeldLook): void {
    const spec = this.specs[i];
    const ms = this.#ms;
    out.scale = spec.when && !spec.when(this.#wearer) ? 0 : typeof spec.scale === 'number' ? spec.scale : spec.scale(ms);
    const light = spec.light;
    if (typeof light === 'function') {
      light(ms, this.#body, this.#scratch);
      out.r = this.#scratch.x;
      out.g = this.#scratch.y;
      out.b = this.#scratch.z;
    } else {
      out.r = light[0];
      out.g = light[1];
      out.b = light[2];
    }
    out.rotation = spec.rotation?.(ms) ?? 0;
  }

  /** Places and draws every sprite at `ms` (`WorldTime`) in the wearer's light, or hides them. */
  update(ms: number, body: Vector3, shown: boolean, wearer: HeldWearer = IDLE): void {
    this.#ms = ms;
    this.#body = body;
    this.#wearer = wearer;
    const visible = shown && this.#drawn();
    if (visible) {
      for (let i = 0; i < this.specs.length; i++) {
        const offset = this.specs[i].offset;
        if (typeof offset !== 'function') continue;
        offset(ms, this.#scratch);
        this.nodes[i].position.set(this.#scratch.x * CM, this.#scratch.y * CM, this.#scratch.z * CM);
      }
    }
    this.#sprites.update(visible, this.#look);
  }

  /** The weapon is on screen and drawn: loaded, in view, not hidden (first person, a skill's hide). */
  #drawn(): boolean {
    const model = this.model;
    if (!model.Ready || model.OutOfView || !model.node.isEnabled()) return false;
    for (let i = 0; i < this.#meshes.length; i++) if (this.#meshes[i].isVisible) return true;
    return false;
  }

  dispose(): void {
    this.#sprites.dispose();
    for (const node of this.nodes) node.dispose();
  }
}
