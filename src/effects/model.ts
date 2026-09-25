/**
 * Model - a skill mesh from Data/Skill (the original's `MODEL_*` effects:
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
  Matrix,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type AnimationGroup,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import { clampAlpha } from './clampAlpha';
import { getMaterial, loadGLTF } from '../common/modelLoader';
import { BlendState } from '../common/objects/enum';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, additiveMaterial, darkCardGain, fadeOut, fxNow, lerp, luma, pointSource, type EffectBlend, type PointSource, type RGB } from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Lifetime when none is given: 30 ticks. */
const DEFAULT_SECONDS = 1.2;

/**
 * The GLB converter already scales BMD centimetres to tiles, so `scale` 1 is
 * the model's native size - `CreateEffect`'s `Scale` default (ZzzEffect.cpp:332;
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
  /** Ends it early (the body it rides left: `if (o->Owner == NULL || !o->Owner->Live) o->Live = false`). */
  until?: () => boolean;
  /** Loop the clip (default) or play it once. */
  loop?: boolean;
  /**
   * Hold the clip on this frame instead of playing it - the original's
   * `if (AnimationFrame >= 4) AnimationFrame = 4` on a frozen body's
   * MODEL_ICE (ZzzEffect.cpp:7702). Done as a looping clip over a sliver of
   * a frame, never a paused one: a paused group writes its bones but nothing
   * drawn follows.
   */
  holdFrame?: number;
  /** Fade tail fraction (visibility). */
  fadeTail?: number;
  /** Peak visibility 0…1 (the original's `Alpha`; TwistingSlash's wheels are 0.6 → 0.3). */
  alpha?: number;
  /** Visibility ramps up from 0 over this fraction of life (`Alpha 0→` effects). */
  fadeIn?: number;
  /**
   * The original's `o->BlendMesh`: only this mesh (BMD order) is drawn
   * bright/additive; every other mesh is an opaque textured surface
   * (ZzzBMD.cpp `RenderMesh`, RENDER_TEXTURE → `DisableAlphaBlend`) -
   * MODEL_FIRE's lava core under its additive tail. Default: every mesh bright.
   */
  blendMesh?: number;
  /**
   * `add` (default) is the bright meshes' usual look; `subtract` is
   * `RENDER_DARK` - `EnableAlphaBlendMinus`, `dst × (1 − src)`
   * (ZzzBMD.cpp:1606) - the dark spirit stamps of Evil Spirit's MODEL_LASER.
   */
  blend?: EffectBlend;
  /** With `subtract`: cover the whole mesh evenly instead of by the sheet (a solid silhouette). */
  solid?: boolean;
  /** Yaw follows the direction `follow` moves the node (the original re-stamps along the joint's `Angle`). */
  aim?: boolean;
  /** Added to the `aim` yaw, for a mesh whose nose is not its +Z. */
  aimYaw?: number;
  /**
   * Re-seat the mesh on the node: centred across, its back end (+Z) this far
   * behind the node as a fraction of its length. For a head riding a ribbon's
   * tip when the model was not built around its own pivot.
   */
  rearAt?: number;
  /** With `subtract`: the most the coverage gain may reach, whatever the map's dark gain asks for. */
  maxCover?: number;
  /**
   * The mesh's own up axis is its tail, so a projectile lays it back down the
   * path instead of only turning it. MODEL_FIRE's `Direction` is written in
   * the model's frame - `Dir(0, 0, −50)` for the Meteorite (ZzzEffect.cpp:2546),
   * `MoveParticle` rotating it by the effect's `Angle` - so the flame always
   * points at where the ball came from.
   */
  alongPath?: boolean;
  /**
   * Let the mesh into the sun cascades. Off by default: an effect mesh is
   * light, not matter, and `scenes/shadows.ts castsSunShadow` drops every
   * bright mesh for that reason. A spirit is the exception the wings already
   * are (`shadowBlendCaster`) - the card *is* the body, so it should throw a
   * shadow as it goes over the ground. The shadow layer still decides whether
   * the tier runs cascades at all.
   */
  shadow?: boolean;
  /**
   * The original's `o->Angle` in degrees on MU's axes (x, y, z = yaw), turned
   * the way `AngleMatrix` does (ZzzMathLib.cpp:185). Replaces `yaw` and `flat`;
   * `spin` and `aim` do not apply.
   */
  angle?: readonly [number, number, number];
  /** `o->HiddenMesh`: this mesh (BMD order) is not drawn. */
  hideMesh?: number;
  /**
   * RENDER_TEXTURE on a sheet with alpha: every mesh but `blendMesh` is
   * alpha-tested and unlit (`EnableAlphaTest`, ZzzBMD.cpp:1507-1526) instead
   * of additive, and `visibility` is its `Alpha`.
   */
  cutout?: boolean;
  /** The scale at `t` seconds alive; wins over `scale` and `grow` (a per-tick `o->Scale` curve). */
  scaleAt?: (t: number) => number;
  /** A 0..1 brightness at `t` seconds alive, multiplied into the fade (`BodyLight x BlendMeshLight`, clamped as GL did). */
  intensity?: (t: number) => number;
  /**
   * The sheet the bright meshes draw instead of their own - the original's
   * `RenderBody(…, Texture)` override (MODEL_CIRCLE sub2 with BITMAP_MAGIC_EMBLEM, ZzzObject.cpp:1497).
   */
  texture?: string;
  /**
   * Visibility over life (0…1 progress in, 0…1 out), replacing `fadeIn` / `fadeTail`: the
   * per-tick `BlendMeshLight` ramps of the original (`LifeTime * 0.1` and the like).
   */
  life?: (p: number) => number;
  /** U scroll of the bright meshes' sheet, lengths/s (`BlendMeshTexCoordU = -LifeTime * 0.01`: 0.25). */
  scrollU?: number;
  /** Radians about the node's z axis, after the yaw (the original's `Angle[1]`, negated by the mirror). */
  roll?: number;
  /**
   * With `blendMesh`: a non-bright mesh whose sheet carries alpha is alpha-tested and blended
   * (`EnableAlphaTest`, ZzzBMD.cpp RenderMesh `Components == 4`) instead of opaque.
   */
  alphaTest?: boolean;
  /** Play the clip once and hold its last authored key (the original's `Loop = false` MODEL_GROUND_STONE rising and staying up). */
  holdLast?: boolean;
}

export interface ModelHandle extends EffectHandle {
  /** Point the model's nose along `dir` (a flying arrow). */
  yawTo(dir: Vector3): void;
  /** Lay the model's up axis back down `dir`, so its tail trails the flight. */
  aimAlong(dir: Vector3): void;
  /** Tilt the model `rad` about its side axis (a tumbling stone; `o->Angle[0]`). */
  pitchTo(rad: number): void;
  /** Re-turn a model spawned with `angle` (a homing body's `o->Angle` each tick). */
  setAngle(angle: readonly [number, number, number]): void;
}

const live = new LiveList();

/** How many model effects are up (debug). */
export function modelCount(): number {
  return live.size;
}

const tmp = new Vector3();
const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
const FLAT = Quaternion.FromEulerAngles(0, 0, 0);
const angleMatrix = new Matrix();

/**
 * `AngleMatrix(angle)` (Z·Y·X, degrees) as the node's rotation. The default
 * conversion puts BMD (x, y, z) on (x, z, y), so the rotation is P·R·P⁻¹ with
 * P swapping y and z, written transposed for Babylon's row vectors.
 */
export function muAngle(angle: readonly [number, number, number], out: Quaternion): Quaternion {
  const d = Math.PI / 180;
  const sr = Math.sin(angle[0] * d);
  const cr = Math.cos(angle[0] * d);
  const sp = Math.sin(angle[1] * d);
  const cp = Math.cos(angle[1] * d);
  const sy = Math.sin(angle[2] * d);
  const cy = Math.cos(angle[2] * d);
  const m00 = cp * cy;
  const m10 = cp * sy;
  const m20 = -sp;
  const m01 = sr * sp * cy - cr * sy;
  const m11 = sr * sp * sy + cr * cy;
  const m21 = sr * cp;
  const m02 = cr * sp * cy + sr * sy;
  const m12 = cr * sp * sy - sr * cy;
  const m22 = cr * cp;
  Matrix.FromValuesToRef(m00, m20, m10, 0, m02, m22, m12, 0, m01, m21, m11, 0, 0, 0, 0, 1, angleMatrix);
  return Quaternion.FromRotationMatrixToRef(angleMatrix, out);
}

/**
 * `RENDER_DARK`'s mesh material (ZzzBMD.cpp:1606). Owned by the spawn, never
 * core.ts's shared cache: the fade lives on the material and a cache entry is
 * shared.
 *
 * Drawn as black under `(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)` with the sheet as
 * the coverage, not as `(ZERO, ONE_MINUS_SRC_COLOR)` with the sheet as the
 * colour. For the greyscale `Light` the original gives these
 * (ZzzEffectJoint.cpp:3773) the two are the same arithmetic - `dst x (1 - t)`
 * either way - but the subtract route caps at the sheet's own levels:
 * `clamp(diffuseBase x diffuseColor + emissiveColor, 0, 1) x texel` means the
 * emissive can never push the source past the texel, and the Laser01 sheet
 * averages 0.34. Coverage has no such cap (`alpha = material.alpha x
 * luminance(sheet)`), so `darkCardGain` can saturate the silhouette on the
 * graded tiers, where a partial subtraction is flattened by the tone curve.
 */
export function subtractMaterial(scene: Scene, tex: Texture | null, owned: StandardMaterial[]): StandardMaterial {
  const mat = new StandardMaterial('fxModelMinus', scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(0, 0, 0);
  mat.disableLighting = true;
  mat.alphaMode = Constants.ALPHA_COMBINE;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;
  if (tex) {
    mat.opacityTexture = tex;
    mat.opacityTexture.getAlphaFromRGB = true;
  }
  clampAlpha(mat);
  owned.push(mat);
  return mat;
}

/** `rearAt`: the mesh's bounds in the node's own frame, then the shift that seats it. */
export function reseat(node: TransformNode, root: AbstractMesh, rearAt: number): void {
  node.computeWorldMatrix(true);
  const toNode = node.getWorldMatrix().clone().invert();
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const v = new Vector3();
  for (const m of root.getChildMeshes(false)) {
    const pos = m.getVerticesData('position');
    if (!pos) continue;
    const rel = m.computeWorldMatrix(true).multiply(toNode);
    for (let i = 0; i < pos.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(pos[i], pos[i + 1], pos[i + 2], rel, v);
      min.minimizeInPlace(v);
      max.maximizeInPlace(v);
    }
  }
  if (!Number.isFinite(min.x)) return;
  const length = max.z - min.z;
  root.position.set(-(min.x + max.x) / 2, -(min.y + max.y) / 2, rearAt * length - max.z);
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
  // The original's greyscale `Light` is the coverage a RENDER_DARK stamp takes out; the map's
  // level scales it so the silhouette saturates on a scene-referred buffer (core.ts).
  const cover = subtract ? Math.min(opts.maxCover ?? Infinity, luma(colour) * darkCardGain(scene)) : 0;

  const node = new TransformNode('fxModel', scene);
  node.rotationQuaternion = opts.angle ? muAngle(opts.angle, new Quaternion()) : null;
  node.rotation.y = opts.yaw ?? 0;
  node.rotation.z = opts.roll ?? 0;
  node.scaling.setAll(scale);
  if (world) node.setParent(world.mapParent);
  source(tmp);
  node.position.set(tmp.x, tmp.y + height, tmp.z);
  let prevX = tmp.x;
  let prevZ = tmp.z;

  let meshes: AbstractMesh[] = [];
  const fadeMats: StandardMaterial[] = [];
  const scrollMats: StandardMaterial[] = [];
  const scrollU = opts.scrollU ?? 0;
  // An override sheet loads after the mesh: until it is in, the material is a solid tinted face.
  const sheetMats: StandardMaterial[] = [];
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
        gltf.mesh.rotationQuaternion = (opts.flat && !opts.angle ? FLAT : UPRIGHT).clone();
        if (opts.rearAt !== undefined) reseat(node, gltf.mesh, opts.rearAt);
        const bodyLight = new Vector3(colour[0], colour[1], colour[2]);
        // The lighting lane's shared bright material, for a mesh whose
        // texture did not come through the GLB cache (never disposed here).
        const brightFallback = getMaterial(scene, false, Material.MATERIAL_ALPHABLEND, BlendState.ALPHA_ONEOE, true);
        // Unlit, opaque, texture × body light - `glColor3fv(BodyLight)` with lighting off.
        const solid = opts.cutout
          ? getMaterial(scene, false, Material.MATERIAL_ALPHATESTANDBLEND, BlendState.ALPHA_COMBINE, false, true)
          : opts.blendMesh === undefined
            ? null
            : getMaterial(scene, true, Material.MATERIAL_OPAQUE, BlendState.ALPHA_DISABLE, false, true);
        const solidAlpha = opts.alphaTest
          ? getMaterial(scene, false, Material.MATERIAL_ALPHATESTANDBLEND, BlendState.ALPHA_COMBINE, false, true)
          : null;
        // The converter names nodes in BMD mesh order (node_0, node_1…).
        meshes = gltf.mesh.getChildMeshes(false).sort((a, b) => a.name.localeCompare(b.name));
        meshes.forEach((mesh, i) => {
          const isBright = !solid || i === opts.blendMesh;
          // The loader alpha-tests a sheet that carries alpha (modelLoader.ts); keep that for `alphaTest`.
          const keyed = !!solidAlpha && mesh.material?.transparencyMode === Material.MATERIAL_ALPHATESTANDBLEND;
          mesh.metadata ??= {};
          mesh.metadata.bodyLight = bodyLight;
          // A dark mesh is not emissive art: kept out of the effect mask, or the tone pass adds its sheet back.
          mesh.metadata.brightMesh = isBright && !subtract;
          if (opts.shadow) {
            mesh.metadata.csmCaster = true;
            mesh.metadata.shadowBlendCaster = true;
          }
          mesh.isPickable = false;
          mesh.alwaysSelectAsActiveMesh = true;
          if (i === opts.hideMesh) mesh.isVisible = false;
          // The cutout's `Alpha` is the whole mesh's, never the converted COLOR_0.
          if (opts.cutout && !isBright) {
            mesh.useVertexColors = false;
            mesh.hasVertexAlpha = false;
          }
          // A dark mesh's coverage is the sheet alone: the converted COLOR_0 on the skill models is noise,
          // and its alpha punched holes through the silhouette.
          if (subtract && isBright) {
            mesh.useVertexColors = false;
            mesh.hasVertexAlpha = false;
          }
          // A bright mesh takes the effects' own additive material - the
          // sheet × `colour` under (SRC_ALPHA, ONE) - so `visibility` is the
          // original's `Alpha` and the tint is its `Light`. Cached per
          // (texture, colour) in core.ts; the texture stays the GLB cache's.
          const tex = mesh.metadata.diffuseTexture as Texture | undefined;
          const sheet = opts.texture ?? tex;
          mesh.material = isBright
            ? sheet
              ? subtract
                ? subtractMaterial(scene, opts.solid ? null : (tex ?? null), fadeMats)
                : additiveMaterial(scene, sheet, colour)
              : brightFallback
            : keyed
              ? solidAlpha
              : solid;
          if (isBright && !subtract && opts.scrollU) scrollMats.push(mesh.material as StandardMaterial);
          if (isBright && !subtract && opts.texture) sheetMats.push(mesh.material as StandardMaterial);
          (scene as TestScene).look?.glow.addExcludedMesh(mesh as never);
          // Emissive skill art blooms; the opaque body of a blend-mesh model
          // and a subtractive one do not (glow.ts).
          if (isBright && !subtract) addEffectGlow(scene, mesh);
        });
        clip = gltf.animationGroups[0] ?? null;
        if (clip) {
          clip.speedRatio = ANIMATION_SPEED;
          if (opts.holdFrame !== undefined) clip.start(true, ANIMATION_SPEED, opts.holdFrame, opts.holdFrame + 0.05);
          else if (opts.holdLast) {
            // The converter closes every clip with a copy of key 0; a one-shot stops a key short of it (modelObject.ts).
            const keys = clip.targetedAnimations[0]?.animation.getKeys().length ?? 0;
            const to = keys > 2 ? clip.from + ((clip.to - clip.from) * (keys - 2)) / (keys - 1) : clip.to;
            clip.start(false, ANIMATION_SPEED, clip.from, to);
          } else clip.play(opts.loop ?? true);
        }
        meshes.push(gltf.mesh);
      })
      .catch(err => console.warn('[effects] model failed', opts.model, err));
  }

  const handle = live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1 || opts.until?.()) return false;
      source(tmp);
      node.position.set(tmp.x, tmp.y + height + rise * t, tmp.z);
      node.scaling.setAll(opts.scaleAt ? opts.scaleAt(t) * DEFAULT_SCALE : scale * lerp(1, grow, p));
      if (spin) node.rotation.y += spin * dt;
      if (opts.aim) {
        const dx = tmp.x - prevX;
        const dz = tmp.z - prevZ;
        if (dx * dx + dz * dz > 1e-8) node.rotation.y = Math.atan2(dx, dz) + (opts.aimYaw ?? 0);
        prevX = tmp.x;
        prevZ = tmp.z;
      }
      const lit = opts.intensity ? Math.max(0, Math.min(1, opts.intensity(t))) : 1;
      let vis = (opts.life ? opts.life(p) * alpha : fadeOut(p, tail) * alpha * (fadeIn > 0 ? Math.min(1, p / fadeIn) : 1)) * lit;
      for (const m of sheetMats) if (!m.diffuseTexture) vis = 0;
      // The sheet is shared, so the scroll runs off the effects clock, the same for every user (as joint.ts's thunder).
      for (const m of scrollMats) {
        const sheet = m.diffuseTexture as Texture | null;
        if (!sheet) continue;
        sheet.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        sheet.uOffset = (fxNow() * scrollU) % 1;
      }
      // A dark mesh fades through its coverage: `visibility` is clamped at 1 and the
      // coverage runs past it on the graded tiers.
      if (subtract) for (const m of fadeMats) m.alpha = cover * vis;
      else for (const m of meshes) m.visibility = vis;
      return true;
    },
    release() {
      disposed = true;
      clip?.stop();
      // Never the shared materials and textures: the bright / solid materials
      // are shared caches (core.ts, modelLoader.ts) and the textures the GLB
      // cache's - `dispose(false, true)` used to take them down with the
      // first Meteorite to land. The subtractive materials are this spawn's
      // own (their emissive is mutated per frame) and go with it.
      for (const m of fadeMats) m.dispose(false, false);
      for (const m of meshes) releaseEffectGlow(m);
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
    aimAlong(dir: Vector3) {
      // `rotation` is pitch-then-yaw, so the mesh's up axis lands on
      // (sin p·sin y, cos p, sin p·cos y): solve that for the reversed `dir`.
      const len = dir.length();
      if (len < 1e-6) return;
      node.rotation.x = Math.acos(Math.max(-1, Math.min(1, -dir.y / len)));
      node.rotation.y = Math.atan2(-dir.x, -dir.z);
    },
    pitchTo(rad: number) {
      node.rotation.x = rad;
    },
    setAngle(angle) {
      node.rotationQuaternion = muAngle(angle, node.rotationQuaternion ?? new Quaternion());
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
