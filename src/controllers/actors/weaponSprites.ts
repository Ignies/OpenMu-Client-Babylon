import { TransformNode, Vector3, type AbstractMesh, type Scene } from '../render/babylon/exports';
import { HeldSprites, type HeldLook } from '../fx/effectParticles';
import type { ModelObject } from '../render/modelObject';
import type { HeldEmitter, HeldSprite, HeldWearer } from '../item_fx/itemLooks';

/** The original's units (cm) to the models' (tiles). */
const CM = 1 / 100;

/** A wearer standing (action 0) out of a safe zone, for a caller that names none. */
const IDLE: HeldWearer = { action: 0, safeZone: false, yaw: 0, map: -1, frame: 0 };

/**
 * A held weapon's `RenderLinkObject` sprites (ZzzCharacter.cpp:7027-8386), bound to its loaded model:
 * one node per sprite under its bone (the model's root without a skeleton), each drawn by `HeldSprites`
 * every frame the weapon is, and its emitters, run on their own bone's node. Built once per model; `update`
 * allocates nothing.
 */
export class WeaponSprites {
  /** The point each sprite rides, in spec order. */
  readonly nodes: TransformNode[];
  readonly #sprites: HeldSprites;
  /** The point each emitter runs at, in spec order. */
  readonly #emitAt: TransformNode[];
  readonly #scene: Scene;
  readonly #meshes: AbstractMesh[];
  readonly #scratch = new Vector3();
  #ms = 0;
  #body: Vector3 = Vector3.Zero();
  #wearer: HeldWearer = IDLE;

  readonly #look = (i: number, out: HeldLook): void => this.look(i, out);

  constructor(
    scene: Scene,
    readonly model: ModelObject,
    readonly specs: readonly HeldSprite[],
    readonly emitters: readonly HeldEmitter[] = []
  ) {
    const gltf = model.gltf;
    this.#scene = scene;
    this.#meshes = gltf ? gltf.mesh.getChildMeshes(false) : [];
    const at = (bone: number, name = 'weaponSprite') => {
      const node = new TransformNode(name, scene);
      node.parent = (bone >= 0 ? gltf?.skeleton?.bones[bone + 1]?.getTransformNode() : null) ?? gltf?.mesh ?? null;
      return node;
    };
    this.nodes = specs.map(spec => {
      const node = at(spec.bone);
      const offset = spec.offset;
      if (offset && typeof offset !== 'function') node.position.set(offset[0] * CM, offset[1] * CM, offset[2] * CM);
      return node;
    });
    // Bone -1: the model's root, where RenderLinkObject links it to the hand.
    this.#emitAt = emitters.map(({ bone, offset }) => {
      const node = at(bone, 'weaponEmitter');
      if (offset) node.position.set(offset[0] * CM, offset[1] * CM, offset[2] * CM);
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

  /**
   * Places and draws every sprite at `ms` (`WorldTime`) in the wearer's light, or hides them; runs the
   * emitters over a frame of `dt` seconds while the weapon is drawn.
   */
  update(ms: number, body: Vector3, shown: boolean, wearer: HeldWearer = IDLE, dt = 0): void {
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
      for (let i = 0; i < this.emitters.length; i++) this.emitters[i].emit(this.#scene, this.#emitAt[i].getAbsolutePosition(), wearer, dt, ms);
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
    for (const node of this.#emitAt) node.dispose();
  }
}
