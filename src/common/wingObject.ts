import {
  Texture,
  Vector3,
  type AbstractMesh,
  type Material,
  type Scene,
  type TransformNode,
} from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { ModelObject } from './modelObject';
import { getMaterial, getScrollVariant } from './modelLoader';
import { BlendState } from './objects/enum';
import { loadMuSprite } from '../libs/mu/sprites';
import {
  BonedParticleEmitter,
  HeldSprites,
  type BonedEmission,
  type HeldLook,
  type HeldPoint,
} from './effectParticles';
import { effects } from '../effects';
import { TICK, darkCardGain, lightCardGain } from '../effects/core';
import { spawnModel } from '../effects/model';
import { MODEL, TEX } from '../effects/recipes';
import {
  wingBone,
  wingLinkMatrix,
  type WingMeshPass,
  type WingSpec,
  type WingSprite,
  type WingThunder,
} from './wings';

const DARK = [0, 0, 0] as const;

/** flare01 is 64 px; the thunder's halo is `CreateSprite(BITMAP_LIGHT, ..., 2.0f)`. */
const THUNDER_HALO_TILES = (64 * 2) / 100;

/** `rand() % 40 - 20` cm, in tiles. */
const thunderJitter = (): number => (Math.floor(Math.random() * 40) - 20) / 100;

/** Bone nodes of a loaded wing by MU bone index. */
function bonesByIndex(root: AbstractMesh): Map<number, TransformNode> {
  const out = new Map<number, TransformNode>();
  for (const node of root.getDescendants(false)) {
    const match = /^bone_(\d+)_/.exec(node.name);
    if (match && 'getAbsolutePosition' in node) {
      out.set(Number(match[1]), node as TransformNode);
    }
  }
  return out;
}

/** A pass bound to its mesh, with the light vector the mesh reads. */
type LivePass = {
  pass: WingMeshPass;
  /** The model's own mesh the pass is on. */
  mesh: AbstractMesh;
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

  #held: HeldSprites | null = null;
  /** The sprite each held point draws, by point. */
  #heldDefs: WingSprite[] = [];
  #heldOf: ModelObject['gltf'] = null;
  #thunderNodes: TransformNode[] = [];
  #thunderDue = 0;
  #lastSeconds = -1;

  readonly #heldLook = (i: number, out: HeldLook): void => {
    const def = this.#heldDefs[i];
    const t = this.#elapsedMs;
    const [r, g, b] = this.#wakeLight(def.light(t));
    out.scale = def.scale(t);
    out.r = r;
    out.g = g;
    out.b = b;
    out.rotation = def.rotation?.(t) ?? 0;
  };

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
    this.#dropHeld();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const dt = this.#lastSeconds < 0 ? 0 : Math.max(0, seconds - this.#lastSeconds);
    this.#lastSeconds = seconds;
    this.#elapsedMs = seconds * 1000;

    // Hidden with the body in first person, or off screen: the sprites the
    // original re-issues every frame are simply not issued.
    if (!this.Ready || this.OutOfView || !this.#drawn()) {
      this.#held?.update(false, this.#heldLook);
      this.#thunderDue = 0;
      return;
    }

    if (this.#passesOf !== this.gltf) this.#applyPasses();
    this.#updatePasses(this.#elapsedMs);

    if (this.#heldOf !== this.gltf) this.#createHeld();
    this.#held?.update(true, this.#heldLook);
    this.#updateThunder(dt);

    if (this.spec?.wakes && this.#wakeSpec !== this.spec) {
      this.#wakeSpec = this.spec;
      this.#wake = this.#createWake(this.node.getScene());
    }

    this.#wake?.update();
  }

  dispose(): void {
    this.#dropHeld();
    super.dispose();
  }

  Unload(): void {
    this.#dropHeld();
    super.Unload();
  }

  /** Any of the model's meshes is being drawn (the hero body hides them all in first person). */
  #drawn(): boolean {
    const root = this.gltf?.mesh;
    if (!root || !this.node.isEnabled()) return false;
    for (const mesh of root.getChildMeshes(true)) if (mesh.isVisible) return true;
    return false;
  }

  #dropHeld(): void {
    this.#held?.dispose();
    this.#held = null;
    this.#heldDefs = [];
    this.#heldOf = null;
    this.#thunderNodes = [];
    this.#thunderDue = 0;
  }

  /** The spec's per-frame sprites and thunder bones, against the loaded model. */
  #createHeld(): void {
    this.#dropHeld();
    this.#heldOf = this.gltf;
    const root = this.gltf?.mesh;
    const spec = this.spec;
    if (!root || !spec || (!spec.sprites && !spec.thunder)) return;

    const bones = bonesByIndex(root);
    const points: HeldPoint[] = [];
    for (const def of spec.sprites ?? []) {
      for (const bone of def.bones) {
        const node = bones.get(bone);
        if (!node) continue;
        points.push({ node, texture: def.texture, blend: def.blend });
        this.#heldDefs.push(def);
      }
    }
    if (points.length) this.#held = new HeldSprites(this.node.getScene(), points);

    for (const bone of spec.thunder?.bones ?? []) {
      const node = bones.get(bone);
      if (node) this.#thunderNodes.push(node);
    }
  }

  /**
   * `if (rand_fps_check(2))` a 25 Hz frame, then `rand_fps_check(20)` a bone:
   * a MODEL_FENRIR_THUNDER SubType 1 bolt (ZzzEffect.cpp:4314-4335) - scale
   * 0.3-0.5, jittered 20 cm, gone in four frames as its Alpha drops 0.3 a
   * frame - with its flare01 halo in `Light - 0.3` for the frame it is made.
   */
  #updateThunder(dt: number): void {
    const thunder: WingThunder | undefined = this.spec?.thunder;
    if (!thunder || !this.#thunderNodes.length) return;

    const aura = this.rootObject.BodyShine.aura;
    if (aura && aura.x + aura.y + aura.z > 0) return;

    this.#thunderDue = Math.min(4, this.#thunderDue + dt / TICK);

    const scene = this.node.getScene();
    const [r, g, b] = thunder.light;
    const halo = [Math.max(0, r - 0.3), Math.max(0, g - 0.3), Math.max(0, b - 0.3)] as const;

    while (this.#thunderDue >= 1) {
      this.#thunderDue -= 1;
      if (Math.random() >= 0.5) continue;

      for (const node of this.#thunderNodes) {
        if (Math.random() >= 0.05) continue;

        const p = node.getAbsolutePosition();
        const at = new Vector3(p.x + thunderJitter(), p.y + thunderJitter(), p.z + thunderJitter());

        spawnModel(scene, at, {
          model: MODEL.lightningType,
          seconds: 4 * TICK,
          scale: 0.3 + Math.floor(Math.random() * 100) * 0.002,
          colour: thunder.light,
          yaw: Math.random() * Math.PI * 2,
          fadeTail: 0.75,
        }).pitchTo(Math.random() * Math.PI * 2);

        effects.spawn('cards', scene, at, {
          texture: TEX.flare,
          colour: halo,
          size: THUNDER_HALO_TILES,
          ticks: 1,
        });
      }
    }
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
      const live: LivePass = { pass, mesh, light };
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
    // A wing's surface stays dark under the aura; its edge glow is the
    // outlaw highlight around the silhouette.
    for (const mesh of this.gltf?.mesh.getChildMeshes(false) ?? []) {
      mesh.metadata ??= {};
      mesh.metadata.auraWing = on;
    }
    // The frame a `tint` pass lights: drawn as glowing red bone.
    for (const { pass } of this.#passes) {
      if (pass.kind !== 'tint') continue;
      const bone = this.gltf?.mesh.getChildMeshes(false)[pass.mesh];
      if (bone?.metadata) bone.metadata.auraBone = on;
    }
    for (const live of this.#passes) {
      const { target } = live;
      if (!target || !live.glow) continue;
      if (live.solid === null) {
        target.isVisible = !on;
        continue;
      }
      target.material = on && live.solid ? live.solid : live.glow;
      target.metadata.brightMesh = !(on && live.solid);
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

  /**
   * The absolute BodyLight of each pass: the wing branch sets `b->BodyLight`
   * outright with `LightEnable` off, so the ground light never reaches it.
   */
  #updatePasses(timeMs: number): void {
    // The wearer's aura (Ultra's outlaw) takes the glow passes over.
    const aura = this.rootObject.BodyShine.aura;
    const auraOn = !!aura && aura.x + aura.y + aura.z > 0;
    this.#showAura(auraOn);

    // The passes are effect art authored for the original's display frame:
    // on the graded tiers the glow takes the map's level and the dark
    // membrane its coverage, the rule every skill effect follows (1 on Classic).
    const scene = this.node.getScene();
    const cardGain = auraOn ? 1 : lightCardGain(scene);
    const coverage = auraOn ? 1 : darkCardGain(scene);

    for (const { pass, mesh, light, target } of this.#passes) {
      const [r, g, b] = pass.light?.(timeMs) ?? [1, 1, 1];
      light.set(r, g, b);
      if (pass.u) this.UvScroll.u = pass.u(timeMs);
      if (target?.metadata) target.metadata.cardGain = cardGain;
      if (pass.dark && mesh.metadata) mesh.metadata.coverage = coverage;
    }
  }

  /** Under the wearer's aura (outlawLook.ts) these sprites go dark. */
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

    const nodeByBone = bonesByIndex(root);
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
