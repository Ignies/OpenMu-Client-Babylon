/**
 * Afterimage - a still copy of a body's parts in the pose of one clip's first key, each part placed, turned and faded
 * by its spawner: the original drawing a character's parts again at another Position, Angle, action and Alpha
 * (DarksideRendering's extra RenderPartObject passes, MonkSystem.cpp:697-857). See fx/readme.md.
 *
 * Driven by: `effects.spawn('afterimage', ...)`, then `place` / `hide` from the spawner's own tick. Read by: nobody.
 */
import {
  Quaternion,
  TransformNode,
  type AbstractMesh,
  type AnimationGroup,
  type Mesh,
  type Node,
  type Scene,
  type Skeleton,
  type Vector3,
} from '../render/babylon/exports';
import { setMeshFadeBlend } from '../assets/modelLoader';
import type { TestScene } from '../render/scenes/testScene';
import { LiveList } from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

const DEG = Math.PI / 180;

// ---- 2. state + readers ----------------------------------------------------

/** What is read of a body or a part: its node and its loaded model (a `ModelObject`). */
export interface AfterimageBody {
  readonly node: TransformNode;
  readonly gltf: { mesh: AbstractMesh; skeleton: Skeleton; animationGroups: AnimationGroup[] } | null;
}

interface AfterimageOptions {
  /** The body whose skeleton and clips pose the copy (a player rig). */
  body: AfterimageBody;
  /** The parts copied, numbered for `place` in this order; a part with nothing drawn is left out. */
  parts: readonly AfterimageBody[];
  /** The clip whose first key the copy stands in. */
  clip: number;
  /** Hard end of life, seconds. */
  seconds: number;
}

export interface AfterimageHandle extends EffectHandle {
  /** How many parts were copied. */
  readonly parts: number;
  /** Draw part `i` at `at` (tiles) turned to the MU angle `angle` (degrees) at `alpha`; 0 or less hides it. */
  place(i: number, at: Vector3, angle: number, alpha: number): void;
  /** Hide every part until it is placed again. */
  hide(): void;
}

/** One copied part: its node and its meshes. */
interface Part {
  node: TransformNode;
  meshes: AbstractMesh[];
  alpha: number;
  blend: boolean;
}

const live = new LiveList();

const DEAD: AfterimageHandle = { alive: false, parts: 0, stop() {}, place() {}, hide() {} };

/** A mesh the body draws now. */
const drawn = (m: AbstractMesh): boolean => m.isEnabled() && m.isVisible && m.visibility > 0 && m.getTotalVertices() > 0;

/** The body's skeleton cloned, unlinked from its nodes and stood on `clip`'s first key (bones it does not move keep theirs). */
function posedSkeleton(body: NonNullable<AfterimageBody['gltf']>, clip: number): Skeleton {
  const src = body.skeleton;
  const skeleton = src.clone(`${src.name}_afterimage`);
  const keys = new Map<Node, Map<string, unknown>>();
  for (const { target, animation } of body.animationGroups[clip]?.targetedAnimations ?? []) {
    const value = animation.getKeys()[0]?.value;
    if (value === undefined) continue;
    let byProperty = keys.get(target as Node);
    if (!byProperty) keys.set(target as Node, (byProperty = new Map()));
    byProperty.set(animation.targetProperty, value);
  }
  skeleton.bones.forEach((bone, i) => {
    const node = src.bones[i]?.getTransformNode();
    bone.linkTransformNode(null);
    const key = node ? keys.get(node) : undefined;
    const position = key?.get('position') as Vector3 | undefined;
    const rotation = key?.get('rotationQuaternion') as Quaternion | undefined;
    const scaling = key?.get('scaling') as Vector3 | undefined;
    if (position) bone.position = position;
    if (rotation) bone.rotationQuaternion = rotation;
    if (scaling) bone.scaling = scaling;
  });
  return skeleton;
}

function spawn(scene: Scene, _at: Vector3, opts: AfterimageOptions): AfterimageHandle {
  const rig = opts.body.gltf;
  if (!rig?.skeleton) return DEAD;
  const glow = (scene as TestScene).look?.glow;
  const skeleton = posedSkeleton(rig, opts.clip);
  const toBody = opts.body.node.computeWorldMatrix(true).clone().invert();
  const parts: Part[] = [];
  for (const source of opts.parts) {
    const meshes = source.gltf?.mesh.getChildMeshes(false).filter(drawn) ?? [];
    if (!meshes.length) continue;
    const node = new TransformNode('fxAfterimage', scene);
    node.parent = opts.body.node.parent;
    node.rotationQuaternion = null;
    node.scaling.copyFrom(opts.body.node.scaling);
    node.setEnabled(false);
    const part: Part = { node, meshes: [], alpha: 1, blend: false };
    for (const mesh of meshes) {
      const copy = (mesh as Mesh).clone(`${mesh.name}_afterimage`, node, true);
      if (!copy) continue;
      // Where the mesh sits on the body, wherever the body stands; the node turns and places it.
      copy.position.setAll(0);
      copy.rotationQuaternion = Quaternion.Identity();
      copy.scaling.setAll(1);
      copy.setPreTransformMatrix(mesh.computeWorldMatrix(true).multiply(toBody));
      copy.skeleton = skeleton;
      copy.metadata = { ...mesh.metadata, csmCaster: false, depthOccluder: false };
      copy.isPickable = false;
      glow?.addExcludedMesh(copy as never);
      part.meshes.push(copy);
    }
    parts.push(part);
  }

  let t = 0;
  const handle = live.push({
    update(dt) {
      t += dt;
      return t < opts.seconds;
    },
    release() {
      for (const part of parts) {
        for (const mesh of part.meshes) {
          glow?.removeExcludedMesh(mesh as never);
          // Geometry and materials are the body's.
          mesh.dispose(false, false);
        }
        part.node.dispose();
      }
      parts.length = 0;
      skeleton.dispose();
    },
  });

  return {
    get alive() {
      return handle.alive;
    },
    parts: parts.length,
    stop: () => handle.stop(),
    place(i, at, angle, alpha) {
      const part = parts[i];
      if (!part || !handle.alive) return;
      part.node.position.copyFrom(at);
      // The body's turn: MU's Angle[2] flipped as renderAngles.ts flips it.
      part.node.rotation.set(0, Math.PI * 2 - angle * DEG, 0);
      part.node.setEnabled(alpha > 0);
      if (alpha <= 0 || alpha === part.alpha) return;
      part.alpha = alpha;
      const blend = alpha < 1;
      for (const mesh of part.meshes) {
        mesh.visibility = alpha;
        // Below 1 the opaque meshes draw on their blended twin, as a fading body does (setFadeAlpha).
        if (blend !== part.blend) setMeshFadeBlend(mesh, blend);
      }
      part.blend = blend;
    },
    hide() {
      for (const part of parts) part.node.setEnabled(false);
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

export const afterimageLayer: EffectLayer<AfterimageOptions, 'afterimage'> = {
  name: 'afterimage',
  update,
  reset,
  spawn,
};
