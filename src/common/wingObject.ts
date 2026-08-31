import type { Scene } from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { ModelObject } from './modelObject';
import {
  BonedParticleEmitter,
  type BonedEmission,
} from './effectParticles';
import { wingBone, wingLinkMatrix, type WingSpec } from './wings';

/**
 * The `c->Wing` part. Beyond a plain `ModelObject` it owns two things the
 * original keeps on the wing type rather than on the character: the additive
 * membrane mesh (`o->BlendMesh`) and the per-bone sprite aura the 2nd/3rd
 * level wings trail (`RenderPartObjectEffect`, ZzzObject.cpp:9860-9925).
 */
export class WingObject extends ModelObject {
  spec: WingSpec | null = null;

  /**
   * Wings cast a shadow here, blend mesh included.
   *
   * The original casts none at all: its shadow pass walks `BodyPart[]` and
   * `Weapon[]` only (`RenderBodyShadow` calls in ZzzCharacter.cpp:8394-8425)
   * and `c->Wing` is neither (w_CharacterInfo.h:217-219), so a winged
   * character throws the same silhouette as a bare one. Deliberate deviation:
   * the wings are the largest thing on the character and their absence from
   * the shadow is what reads as broken.
   *
   * The blend-mesh exemption is the other half of it — on Wing of Elf and
   * Wings of Spirits (`o->BlendMesh = 0`, ZzzObject.cpp:5276-5284) the
   * additive card is the only mesh in the model, so the ordinary rule would
   * leave those two wings shadowless while every other pair cast.
   */
  ShadowBlendMeshCasts = true;

  #wake: BonedParticleEmitter | null = null;
  #wakeSpec: WingSpec | null = null;
  #elapsedMs = 0;

  /**
   * Applies a wing spec *before* the model is loaded — `BlendMesh` is read by
   * `load()`, so it has to be in place first. Returns the bone the part should
   * link to and the matrix (capes only).
   */
  prepare(spec: WingSpec | null): void {
    this.spec = spec;
    this.BlendMesh = spec?.blendMesh ?? -1;
    this.setBoneLink(wingBone(spec), wingLinkMatrix(spec) ?? undefined);
    // Forces the first playAction(0) after the load to actually start the
    // flap clip; playAction is a no-op when the action is already current.
    this.CurrentAction = -1;

    // The aura is rebuilt against the new model in the first Update after load.
    this.#wake = null;
    this.#wakeSpec = null;
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.OutOfView) return;

    if (this.spec?.wake && this.#wakeSpec !== this.spec) {
      this.#wakeSpec = this.spec;
      this.#wake = this.#createWake(this.node.getScene());
    }

    if (!this.#wake) return;

    this.#elapsedMs = gameTime.TotalGameTime.TotalSeconds * 1000;
    this.#wake.update();
  }

  #createWake(scene: Scene): BonedParticleEmitter | null {
    const wake = this.spec?.wake;
    const root = this.gltf?.mesh;
    if (!wake || !root) return null;

    const nodeByBone = new Map<number, BonedEmission['node']>();

    for (const node of root.getDescendants(false)) {
      const match = /^bone_(\d+)_/.exec(node.name);
      if (match && 'getAbsolutePosition' in node) {
        nodeByBone.set(Number(match[1]), node as BonedEmission['node']);
      }
    }

    const points: BonedEmission[] = [];

    for (const bone of wake.bones) {
      const node = nodeByBone.get(bone);
      if (!node) continue;

      points.push({
        node,
        kinds: [wake.kind],
        count: 1,
        scale: () => wake.scale(this.#elapsedMs),
        light: () => wake.light(this.#elapsedMs),
        every: wake.every,
      });
    }

    return points.length ? new BonedParticleEmitter(scene, points) : null;
  }
}
