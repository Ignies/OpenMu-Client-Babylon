/**
 * Linked model - a skill mesh hung off a character's bone and posed by the
 * character's own clip: MODEL_EFFECT_FLAME_STRIKE's blade, which
 * `RotationPosition(BoneTransform[33])` makes the parent of its root bones
 * (ZzzBMD.cpp:724-735, :291-303) and whose `AnimationFrame` is copied from
 * the owner's every tick (MoveHandlers.cpp:7734-7746).
 *
 * The node sits in the bone's own frame exactly as a held item does
 * (modelObject.ts: rotX(270 deg) with a Y mirror undoes the loader basis the
 * model root carries), so the mesh's BMD space is the bone's. Its clip plays
 * at the owner's speed from the owner's key and is nudged back when the two
 * drift; `lock(frame, 0)` holds it on a key with a looping sliver, never a
 * paused clip (a paused group writes bones nothing drawn follows).
 *
 * Driven by: `effects.spawn('linkedModel', …)` from the skill table, which
 * steps it a tick at a time (alpha, lock) and reads its bones for blurs.
 * Read by: nobody.
 */
import { Quaternion, TransformNode, VertexBuffer, type AbstractMesh, type AnimationGroup, type Mesh, type Scene, type Texture, type Vector3 } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { loadGLTF } from '../common/modelLoader';
import { PLAY_SPEED_TO_RATIO } from '../common/playSpeed';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, additiveMaterial, fxNow, WHITE, type RGB } from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Drift (keys) past which the clip is put back on the owner's key. */
const RESYNC_KEYS = 0.25;

/** Width of the looping sliver a held key plays, in keys. */
const HOLD_SLIVER = 0.05;

// ---- 2. state + readers ----------------------------------------------------

export interface LinkedModelOptions {
  /** `Effect/…glb` (recipes.ts `MODEL`). */
  model: string;
  /** The character it hangs off. */
  entity: Entity;
  /** MU bone index on `entity`. */
  bone: number;
  /** Tint of the bright meshes (`BodyLight`). */
  colour?: RGB;
  /** Upper bound on its life; the driver's `stop()` ends it sooner. */
  seconds: number;
  /** One mesh's V stepped through a sheet by `offset(ms)` (the original's `RenderMesh(…, fV)`). */
  vStep?: { mesh: number; offset: (ms: number) => number };
}

export interface LinkedModelHandle extends EffectHandle {
  /** `o->Alpha`: the bright meshes' visibility. */
  setAlpha(alpha: number): void;
  /** Show clip key `frame` and play on at `speed` keys a tick (`PlaySpeed`); 0 holds the key. */
  lock(frame: number, speed: number): void;
  /** World position of this model's own MU bone `index`; false until the mesh is in. */
  bonePos(index: number, out: Vector3): boolean;
}

const live = new LiveList();

/** How many linked models are up (debug). */
export function linkedModelCount(): number {
  return live.size;
}

/** The loader basis every model root carries, undone by the bone socket (modelObject.ts DEFAULT_BONE_LINK_ROTATION). */
const SOCKET = Quaternion.FromEulerAngles(Math.PI * 1.5, 0, 0);
const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);

export function spawnLinkedModel(scene: Scene, _at: Vector3, opts: LinkedModelOptions): LinkedModelHandle {
  const world = Store.world;
  const boneNode = opts.entity.modelObject?.gltf?.skeleton?.bones[opts.bone + 1]?.getTransformNode();
  if (!world || !boneNode) return { ...DEAD_HANDLE, setAlpha() {}, lock() {}, bonePos: () => false };

  const node = new TransformNode('fxLinkedModel', scene);
  node.parent = boneNode;
  node.rotationQuaternion = SOCKET.clone();
  node.scaling.set(1, -1, 1);

  const colour = opts.colour ?? WHITE;
  let meshes: AbstractMesh[] = [];
  let bones: (TransformNode | null)[] = [];
  let clip: AnimationGroup | null = null;
  let keyFrames = 1;
  let disposed = false;
  let alpha = 0;
  let frame = 0;
  let speed = 0;
  let held = -1;
  let t = 0;
  // vStep: the stepped mesh, its own UVs and the offset last written.
  let stepMesh: Mesh | null = null;
  let baseUv: Float32Array | null = null;
  let workUv: Float32Array | null = null;
  let lastOffset = NaN;

  const applyLock = (): void => {
    if (!clip) return;
    const from = clip.from;
    if (speed <= 0) {
      if (held === frame) return;
      held = frame;
      clip.stop();
      const f = from + frame * keyFrames;
      clip.start(true, 1, f, f + HOLD_SLIVER * keyFrames);
      return;
    }
    const ratio = speed * PLAY_SPEED_TO_RATIO;
    if (held >= 0 || !clip.isStarted) {
      held = -1;
      clip.stop();
      clip.start(false, ratio, from, clip.to);
      clip.goToFrame(from + frame * keyFrames);
      return;
    }
    clip.speedRatio = ratio;
    const at = clip.animatables[0];
    const cur = at ? (at.masterFrame - from) / keyFrames : frame;
    if (Math.abs(cur - frame) > RESYNC_KEYS) clip.goToFrame(from + frame * keyFrames);
  };

  void loadGLTF(opts.model, world)
    .then(gltf => {
      if (disposed) {
        gltf.mesh.dispose(false, false);
        return;
      }
      gltf.mesh.setParent(null);
      gltf.mesh.parent = node;
      gltf.mesh.position.setAll(0);
      gltf.mesh.scaling.set(1, -1, 1);
      gltf.mesh.rotationQuaternion = UPRIGHT.clone();
      meshes = gltf.mesh.getChildMeshes(false).sort((a, b) => a.name.localeCompare(b.name));
      meshes.forEach((mesh, i) => {
        mesh.metadata ??= {};
        mesh.metadata.brightMesh = true;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        const tex = mesh.metadata.diffuseTexture as Texture | undefined;
        if (tex) mesh.material = additiveMaterial(scene, tex, colour);
        mesh.visibility = alpha;
        (scene as TestScene).look?.glow.addExcludedMesh(mesh as never);
        addEffectGlow(scene, mesh);
        if (opts.vStep && i === opts.vStep.mesh) {
          // Clones share one Geometry: the stepped UVs must be this spawn's own.
          const m = mesh as Mesh;
          m.makeGeometryUnique();
          const uv = m.getVerticesData(VertexBuffer.UVKind);
          if (uv) {
            baseUv = Float32Array.from(uv);
            workUv = new Float32Array(baseUv.length);
            m.setVerticesData(VertexBuffer.UVKind, workUv, true);
            stepMesh = m;
          }
        }
      });
      bones = (gltf.skeleton?.bones ?? []).map(b => b.getTransformNode());
      meshes.push(gltf.mesh);
      clip = gltf.animationGroups[0] ?? null;
      if (clip) {
        const anim = clip.targetedAnimations[0]?.animation;
        const keys = anim?.getKeys();
        keyFrames = keys && keys.length > 1 ? keys[1].frame - keys[0].frame : (clip.to - clip.from) / 14;
        clip.stop();
        applyLock();
      }
    })
    .catch(err => console.warn('[effects] linked model failed', opts.model, err));

  const handle = live.push({
    update(dt) {
      t += dt;
      if (t >= opts.seconds || boneNode.isDisposed()) return false;
      if (stepMesh && baseUv && workUv && opts.vStep) {
        const off = opts.vStep.offset(fxNow() * 1000);
        if (off !== lastOffset) {
          lastOffset = off;
          for (let i = 0; i < baseUv.length; i += 2) {
            workUv[i] = baseUv[i];
            workUv[i + 1] = baseUv[i + 1] + off;
          }
          stepMesh.updateVerticesData(VertexBuffer.UVKind, workUv);
        }
      }
      return true;
    },
    release() {
      disposed = true;
      clip?.stop();
      for (const m of meshes) releaseEffectGlow(m);
      // Never the materials (core.ts's cache) or the textures (the GLB cache's).
      node.dispose(false, false);
    },
  });

  return {
    get alive() {
      return handle.alive;
    },
    stop: () => handle.stop(),
    setAlpha(a: number) {
      alpha = Math.max(0, Math.min(1, a));
      for (const m of meshes) m.visibility = alpha;
    },
    lock(f: number, s: number) {
      frame = f;
      speed = s;
      applyLock();
    },
    bonePos(index: number, out: Vector3): boolean {
      const b = bones[index + 1];
      if (!b || disposed) return false;
      out.copyFrom(b.getAbsolutePosition());
      return true;
    },
  };
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const linkedModelLayer: EffectLayer<LinkedModelOptions, 'linkedModel'> = {
  name: 'linkedModel',
  update,
  reset,
  spawn: spawnLinkedModel,
};
