/**
 * Model — a skill mesh from Data/Skill (the original's `MODEL_*` effects:
 * MODEL_FIRE, MODEL_ICE, MODEL_POISON, MODEL_MAGIC_CIRCLE…) placed at a
 * point, drawn bright/additive with its own animation, scaled and turned
 * over its life, then dropped. `CreateEffect(MODEL_*, …)` + the per-model
 * `MoveEffect` / `RenderEffect` branches (ZzzEffect.cpp).
 *
 * Loading is asynchronous through the shared GLB container cache
 * (`common/modelLoader.ts`, read-only use); the mesh appears when it has
 * decoded, if the effect is still alive, and a second spawn of the same
 * model is a clone. A spawn can `follow` a moving point (a projectile) and be
 * turned with `yawTo` by whoever moves it.
 *
 * Driven by: `effects.spawn('model', …)`, `projectile.ts`. Read by: nobody.
 */
import {
  Constants,
  Material,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type AnimationGroup,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import { getMaterial, loadGLTF } from '../common/modelLoader';
import { BlendState } from '../common/objects/enum';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, additiveMaterial, fadeOut, lerp, pointSource, type EffectBlend, type PointSource, type RGB } from './core';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Lifetime when none is given: 30 ticks. */
const DEFAULT_SECONDS = 1.2;

/**
 * The GLB converter already scales BMD centimetres to tiles, so `scale` 1 is
 * the model's native size — `CreateEffect`'s `Scale` default (ZzzEffect.cpp:332;
 * MODEL_FIRE rolls 1.0–1.7, MODEL_POISON 1.0, MODEL_ICE 0.8). The move-target
 * pin's 0.6 is its own (moveTargetEffect.ts) and used to leak in here, drawing
 * every skill mesh at 60 % .
 */
const DEFAULT_SCALE = 1;

/** The BMD clip runs at ~24 fps in the original's `AnimationSpeed` terms. */
const ANIMATION_SPEED = (0.3 * 25) / 24;

// ---- 2. state + readers ----------------------------------------------------

export interface ModelOptions {
  /** `Skill/…glb` or `Effect/…glb` (recipes.ts `MODEL`). */
  model: string;
  seconds?: number;
  /** The original's `Scale`: 1 = the model's native size. */
  scale?: number;
  /** Scale multiplier at end of life. */
  grow?: number;
  /** Tint (`bodyLight`). */
  colour?: RGB;
  /** Radians/s around the up axis. */
  spin?: number;
  /** Tiles/s upward. */
  rise?: number;
  /** Initial yaw, radians. */
  yaw?: number;
  /** Lay the model flat on the ground (rings, circles). Default: upright like a character. */
  flat?: boolean;
  follow?: PointSource;
  height?: number;
  /** Loop the clip (default) or play it once. */
  loop?: boolean;
  /** Fade tail fraction (visibility). */
  fadeTail?: number;
  /** Peak visibility 0…1 (the original's `Alpha`; TwistingSlash's wheels are 0.6 → 0.3). */
  alpha?: number;
  /** Visibility ramps up from 0 over this fraction of life (`Alpha 0→` effects). */
  fadeIn?: number;
  /**
   * The original's `o->BlendMesh`: only this mesh (BMD order) is drawn
   * bright/additive; every other mesh is an opaque textured surface
   * (ZzzBMD.cpp `RenderMesh`, RENDER_TEXTURE → `DisableAlphaBlend`) —
   * MODEL_FIRE's lava core under its additive tail. Default: every mesh bright.
   */
  blendMesh?: number;
  /**
   * `add` (default) is the bright meshes' usual look; `subtract` is
   * `RENDER_DARK` — `EnableAlphaBlendMinus`, `dst × (1 − src)`
   * (ZzzBMD.cpp:1606) — the dark spirit stamps of Evil Spirit's MODEL_LASER.
   */
  blend?: EffectBlend;
  /** Yaw follows the direction `follow` moves the node (the original re-stamps along the joint's `Angle`). */
  aim?: boolean;
}

export interface ModelHandle extends EffectHandle {
  /** Point the model's nose along `dir` (a flying arrow). */
  yawTo(dir: Vector3): void;
  /** Tilt the model `rad` about its side axis (a tumbling stone; `o->Angle[0]`). */
  pitchTo(rad: number): void;
}

const live = new LiveList();

/** How many model effects are up (debug). */
export function modelCount(): number {
  return live.size;
}

const tmp = new Vector3();
const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
const FLAT = Quaternion.FromEulerAngles(0, 0, 0);

/**
 * `RENDER_DARK`'s mesh material: the sheet × tint under `EnableAlphaBlendMinus`
 * (ZzzBMD.cpp:1606). Owned by the spawn, never core.ts's shared cache: under
 * `(ZERO, ONE_MINUS_SRC_COLOR)` fragment alpha never reaches the blend, so the
 * fade must scale *this* material's emissive, and a cache entry is shared.
 */
function subtractMaterial(scene: Scene, tex: Texture, colour: RGB, owned: StandardMaterial[]): StandardMaterial {
  const mat = new StandardMaterial('fxModelMinus', scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(colour[0], colour[1], colour[2]);
  mat.disableLighting = true;
  mat.alphaMode = Constants.ALPHA_SUBTRACT;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;
  mat.diffuseTexture = tex;
  owned.push(mat);
  return mat;
}

/** Spawn helper other entries call directly (projectile heads). */
export function spawnModel(scene: Scene, at: Vector3, opts: ModelOptions): ModelHandle {
  const world = Store.world;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const scale = (opts.scale ?? 1) * DEFAULT_SCALE;
  const grow = opts.grow ?? 1;
  const spin = opts.spin ?? 0;
  const rise = opts.rise ?? 0;
  const height = opts.height ?? 0;
  const tail = opts.fadeTail ?? 0.25;
  const alpha = opts.alpha ?? 1;
  const fadeIn = opts.fadeIn ?? 0;
  const source = opts.follow ?? pointSource(at);
  const colour = opts.colour ?? RGBS.white;
  const subtract = opts.blend === 'subtract';

  const node = new TransformNode('fxModel', scene);
  node.rotationQuaternion = null;
  node.rotation.y = opts.yaw ?? 0;
  node.scaling.setAll(scale);
  if (world) node.setParent(world.mapParent);
  source(tmp);
  node.position.set(tmp.x, tmp.y + height, tmp.z);
  let prevX = tmp.x;
  let prevZ = tmp.z;

  let meshes: AbstractMesh[] = [];
  const fadeMats: StandardMaterial[] = [];
  let clip: AnimationGroup | null = null;
  let disposed = false;
  let t = 0;

  if (world) {
    void loadGLTF(opts.model, world)
      .then(gltf => {
        if (disposed) {
          gltf.mesh.dispose(false, false);
          return;
        }
        gltf.mesh.setParent(node);
        gltf.mesh.position.setAll(0);
        gltf.mesh.scaling.set(1, -1, 1);
        gltf.mesh.rotationQuaternion = (opts.flat ? FLAT : UPRIGHT).clone();
        const bodyLight = new Vector3(colour[0], colour[1], colour[2]);
        // The lighting lane's shared bright material, for a mesh whose
        // texture did not come through the GLB cache (never disposed here).
        const brightFallback = getMaterial(scene, false, Material.MATERIAL_ALPHABLEND, BlendState.ALPHA_ONEOE, true);
        // Unlit, opaque, texture × body light — `glColor3fv(BodyLight)` with lighting off.
        const solid =
          opts.blendMesh === undefined
            ? null
            : getMaterial(scene, true, Material.MATERIAL_OPAQUE, BlendState.ALPHA_DISABLE, false, true);
        // The converter names nodes in BMD mesh order (node_0, node_1…).
        meshes = gltf.mesh.getChildMeshes(false).sort((a, b) => a.name.localeCompare(b.name));
        meshes.forEach((mesh, i) => {
          const isBright = !solid || i === opts.blendMesh;
          mesh.metadata ??= {};
          mesh.metadata.bodyLight = bodyLight;
          mesh.metadata.brightMesh = isBright;
          mesh.isPickable = false;
          mesh.alwaysSelectAsActiveMesh = true;
          // A bright mesh takes the effects' own additive material — the
          // sheet × `colour` under (SRC_ALPHA, ONE) — so `visibility` is the
          // original's `Alpha` and the tint is its `Light`. Cached per
          // (texture, colour) in core.ts; the texture stays the GLB cache's.
          const tex = mesh.metadata.diffuseTexture as Texture | undefined;
          mesh.material = isBright
            ? tex
              ? subtract
                ? subtractMaterial(scene, tex, colour, fadeMats)
                : additiveMaterial(scene, tex, colour)
              : brightFallback
            : solid;
          (scene as TestScene).look?.glow.addExcludedMesh(mesh as never);
        });
        clip = gltf.animationGroups[0] ?? null;
        if (clip) {
          clip.speedRatio = ANIMATION_SPEED;
          clip.play(opts.loop ?? true);
        }
        meshes.push(gltf.mesh);
      })
      .catch(err => console.warn('[effects] model failed', opts.model, err));
  }

  const handle = live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      source(tmp);
      node.position.set(tmp.x, tmp.y + height + rise * t, tmp.z);
      node.scaling.setAll(scale * lerp(1, grow, p));
      if (spin) node.rotation.y += spin * dt;
      if (opts.aim) {
        const dx = tmp.x - prevX;
        const dz = tmp.z - prevZ;
        if (dx * dx + dz * dz > 1e-8) node.rotation.y = Math.atan2(dx, dz);
        prevX = tmp.x;
        prevZ = tmp.z;
      }
      const vis = fadeOut(p, tail) * alpha * (fadeIn > 0 ? Math.min(1, p / fadeIn) : 1);
      // A subtractive mesh fades through its own material's emissive —
      // `visibility` is alpha, which its blend never reads.
      if (subtract) for (const m of fadeMats) m.emissiveColor.set(colour[0] * vis, colour[1] * vis, colour[2] * vis);
      else for (const m of meshes) m.visibility = vis;
      return true;
    },
    release() {
      disposed = true;
      clip?.stop();
      // Never the shared materials and textures: the bright / solid materials
      // are shared caches (core.ts, modelLoader.ts) and the textures the GLB
      // cache's — `dispose(false, true)` used to take them down with the
      // first Meteorite to land. The subtractive materials are this spawn's
      // own (their emissive is mutated per frame) and go with it.
      for (const m of fadeMats) m.dispose(false, false);
      node.dispose(false, false);
    },
  });

  return {
    get alive() {
      return handle.alive;
    },
    stop: () => handle.stop(),
    yawTo(dir: Vector3) {
      node.rotation.y = Math.atan2(dir.x, dir.z);
    },
    pitchTo(rad: number) {
      node.rotation.x = rad;
    },
  };
}

function spawn(scene: Scene, at: Vector3, opts: ModelOptions): EffectHandle {
  return spawnModel(scene, at, opts);
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const modelLayer: EffectLayer<ModelOptions, 'model'> = {
  name: 'model',
  update,
  reset,
  spawn,
};
