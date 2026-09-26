import {
  Texture,
  Vector3,
  type AbstractMesh,
  type Material,
  type Scene,
} from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { ModelObject } from './modelObject';
import { getMaterial, getScrollVariant } from './modelLoader';
import { BlendState } from './objects/enum';
import { loadMuSprite } from '../libs/mu/sprites';
import { BonedParticleEmitter, type BonedEmission } from './effectParticles';
import {
  wingBone,
  wingLinkMatrix,
  type WingMeshPass,
  type WingSpec,
} from './wings';

const DARK = [0, 0, 0] as const;

/** A pass bound to its mesh, with the light vector the mesh reads. */
type LivePass = {
  pass: WingMeshPass;
  light: Vector3;
  /** The mesh a glow pass draws, its additive material and the lit one it had. */
  target?: AbstractMesh;
  glow?: Material;
  solid?: Material | null;
};

/** `RenderMesh(n, RENDER_BRIGHT | RENDER_CHROME)` in white BodyLight. */
const WHITE_CHROME = {
  tint: new Vector3(1, 1, 1),
  star: false,
  chromeOnly: true,
};

const overlayTextures = new Map<string, Texture>();

/** Starts URL-less, like the chrome maps, so nothing red flashes before the sprite lands. */
function overlayTexture(scene: Scene, path: string): Texture {
  let texture = overlayTextures.get(path);
  if (texture && texture.getScene() === scene) return texture;
  const created = new Texture(null, scene);
  created.name = `wing_${path}`;
  void loadMuSprite(path).then(
    sprite => created.updateURL(sprite.url),
    error => console.error(`Could not load wing texture ${path}:`, error)
  );
  overlayTextures.set(path, created);
  texture = created;
  return texture;
}

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
   * The blend-mesh exemption is the other half of it - on Wing of Elf and
   * Wings of Spirits (`o->BlendMesh = 0`, ZzzObject.cpp:5276-5284) the
   * additive card is the only mesh in the model, so the ordinary rule would
   * leave those two wings shadowless while every other pair cast.
   */
  ShadowBlendMeshCasts = true;

  #wake: BonedParticleEmitter | null = null;
  #passes: LivePass[] = [];
  #passesOf: ModelObject['gltf'] = null;
  #wakeSpec: WingSpec | null = null;
  #elapsedMs = 0;

  /**
   * Applies a wing spec *before* the model is loaded - `BlendMesh` is read by
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

    if (this.#passesOf !== this.gltf) this.#applyPasses();
    this.#updatePasses(gameTime.TotalGameTime.TotalSeconds * 1000);

    if (this.spec?.wakes && this.#wakeSpec !== this.spec) {
      this.#wakeSpec = this.spec;
      this.#wake = this.#createWake(this.node.getScene());
    }

    if (!this.#wake) return;

    this.#elapsedMs = gameTime.TotalGameTime.TotalSeconds * 1000;
    this.#wake.update();
  }

  /**
   * The wing's own `RenderPartObjectBody` branch, bound once per loaded
   * model. Clones are appended after the model's meshes, so indices stand.
   */
  #applyPasses(): void {
    this.#passesOf = this.gltf;
    this.#passes = [];
    const passes = this.spec?.passes;
    if (!passes || !this.gltf) return;

    const meshes = this.gltf.mesh.getChildMeshes(false);
    for (const pass of passes) {
      const mesh = meshes[pass.mesh];
      if (!mesh) {
        console.warn(
          `Wing pass mesh ${pass.mesh} is out of range for type ${this.Type}`
        );
        continue;
      }
      mesh.metadata ??= {};

      if (pass.kind === 'chrome') {
        mesh.metadata.bodyShine = WHITE_CHROME;
        continue;
      }

      const light = new Vector3(1, 1, 1);
      const live: LivePass = { pass, light };
      this.#passes.push(live);

      if (pass.kind === 'tint') {
        mesh.metadata.bodyLight = light;
        continue;
      }

      const target = pass.kind === 'bright' ? mesh : this.#overlayOf(mesh);
      if (!target) continue;
      live.target = target;
      live.solid = pass.kind === 'bright' ? mesh.material : null;
      target.material = getMaterial(
        target.getScene(),
        false,
        2,
        BlendState.ALPHA_ONEOE,
        true
      );
      // The scroll variant is the additive card that takes the pass's own
      // light; the plain one draws the texel at full strength.
      const scroll = getScrollVariant(target.getScene(), target);
      if (scroll) target.material = scroll;
      target.metadata.uvScroll = pass.u ? this.UvScroll : { u: 0, v: 0 };
      if (pass.texture) {
        target.metadata.diffuseTexture = overlayTexture(
          target.getScene(),
          pass.texture
        );
      }
      target.metadata.brightMesh = true;
      target.metadata.blendMeshLight = 1;
      target.metadata.bodyLight = light;
      target.metadata.csmCaster = false;
      live.glow = target.material ?? undefined;
    }
    this.#auraShown = false;
  }

  #auraShown = false;

  /**
   * Under the wearer's aura (Ultra's outlaw) the glow passes go dark: a
   * bright mesh is drawn solid again, in the wearer's near-black light, so
   * the aura shader can put red veins on it; an overlay copy is hidden.
   */
  #showAura(on: boolean): void {
    if (this.#auraShown === on) return;
    this.#auraShown = on;
    for (const live of this.#passes) {
      const { target } = live;
      if (!target || !live.glow) continue;
      if (live.solid === null) {
        target.isVisible = !on;
        continue;
      }
      target.material = on && live.solid ? live.solid : live.glow;
      target.metadata.brightMesh = !(on && live.solid);
      target.metadata.auraRimOnly = on;
      target.metadata.bodyLight = on ? this.rootObject.Light : live.light;
    }
  }

  #overlayOf(mesh: AbstractMesh): AbstractMesh | null {
    const overlay = mesh.clone(`${mesh.name}_wingOverlay`, mesh.parent, true);
    if (!overlay) return null;
    overlay.metadata = { ...mesh.metadata, depthOccluder: false };
    overlay.isPickable = false;
    overlay.receiveShadows = false;
    return overlay;
  }

  /** The absolute BodyLight of each pass; a `tint` rides the wearer's light. */
  #updatePasses(timeMs: number): void {
    const worn = this.rootObject.Light;
    // The wearer's aura (Ultra's outlaw) recolours the glow passes to its own.
    const aura = this.rootObject.BodyShine.aura;
    this.#showAura(!!aura && aura.x + aura.y + aura.z > 0);
    for (const { pass, light } of this.#passes) {
      const [r, g, b] = pass.light?.(timeMs) ?? [1, 1, 1];
      if (pass.kind === 'tint') light.set(worn.x * r, worn.y * g, worn.z * b);
      else light.set(r, g, b);
      if (pass.u) this.UvScroll.u = pass.u(timeMs);
    }
  }

  /** Under the wearer's aura its crackle stands in for these sprites (outlawLook.ts). */
  #wakeLight(
    light: readonly [number, number, number]
  ): readonly [number, number, number] {
    const aura = this.rootObject.BodyShine.aura;
    return aura && aura.x + aura.y + aura.z > 0 ? DARK : light;
  }

  #createWake(scene: Scene): BonedParticleEmitter | null {
    const wakes = this.spec?.wakes;
    const root = this.gltf?.mesh;
    if (!wakes || !root) return null;

    const nodeByBone = new Map<number, BonedEmission['node']>();

    for (const node of root.getDescendants(false)) {
      const match = /^bone_(\d+)_/.exec(node.name);
      if (match && 'getAbsolutePosition' in node) {
        nodeByBone.set(Number(match[1]), node as BonedEmission['node']);
      }
    }

    const points: BonedEmission[] = [];

    for (const wake of wakes) {
      for (const bone of wake.bones) {
        const node = nodeByBone.get(bone);
        if (!node) continue;

        points.push({
          node,
          kinds: [wake.kind],
          count: 1,
          scale: () => wake.scale(this.#elapsedMs),
          light: () => this.#wakeLight(wake.light(this.#elapsedMs)),
          every: wake.every,
        });
      }
    }

    return points.length ? new BonedParticleEmitter(scene, points) : null;
  }
}
