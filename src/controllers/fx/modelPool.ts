/**
 * Spare clones of the effect models, handed out again instead of cloned anew: a bolt or an arrow
 * lives a fraction of a second, and a fresh clone each (nodes, skeleton, clips) stalled the GC in
 * a crowd. A clone comes back as it was loaded and is handed out disabled. See fx/readme.md.
 */
import type { AbstractMesh, Material, Mesh, Node, Scene } from '../render/babylon/exports';
import { disposeLoadedModel, type LoadedModel } from '../assets/modelLoader';

/** What a spawn may change on a mesh of the clone. */
interface MeshState {
  mesh: AbstractMesh;
  material: Material | null;
  metadata: Record<string, unknown> | null;
  isVisible: boolean;
  visibility: number;
  enabled: boolean;
  useVertexColors: boolean | undefined;
  hasVertexAlpha: boolean;
  isPickable: boolean;
  alwaysSelectAsActiveMesh: boolean;
}

interface Pooled {
  scene: Scene;
  path: string;
  model: LoadedModel;
  meshes: MeshState[];
  /** The clone's nodes as loaded; anything a spawn hung under it (the shine copy) goes on return. */
  nodes: Set<Node>;
}

/** Spare clones kept per model file. */
export const POOL_PER_MODEL = 24;

const spare = new Map<Scene, Map<string, Pooled[]>>();
const taken = new WeakMap<LoadedModel, Pooled>();

function spareList(scene: Scene, path: string): Pooled[] {
  let byPath = spare.get(scene);
  if (!byPath) spare.set(scene, (byPath = new Map()));
  let list = byPath.get(path);
  if (!list) byPath.set(path, (list = []));
  return list;
}

function record(scene: Scene, path: string, model: LoadedModel): Pooled {
  const meshes = [model.mesh, ...model.mesh.getChildMeshes(false)].map(mesh => ({
    mesh,
    material: mesh.material,
    metadata: mesh.metadata ? { ...mesh.metadata } : null,
    isVisible: mesh.isVisible,
    visibility: mesh.visibility,
    enabled: mesh.isEnabled(false),
    useVertexColors: (mesh as Mesh).useVertexColors,
    hasVertexAlpha: mesh.hasVertexAlpha,
    isPickable: mesh.isPickable,
    alwaysSelectAsActiveMesh: mesh.alwaysSelectAsActiveMesh,
  }));
  return { scene, path, model, meshes, nodes: new Set<Node>([model.mesh, ...model.mesh.getDescendants(false)]) };
}

/** A clone of `path` in `scene`: a spare one, else `load()`. Disabled: the spawn enables it once dressed. */
export async function takeModel(scene: Scene, path: string, load: () => Promise<LoadedModel>): Promise<LoadedModel> {
  const list = spare.get(scene)?.get(path);
  let entry = list?.pop();
  while (entry?.model.mesh.isDisposed()) entry = list?.pop();
  if (entry) {
    // As loadGLTF hands a fresh clone out: its first clip playing from its first key.
    const first = entry.model.animationGroups[0];
    if (first) {
      first.play(true);
      first.goToFrame(first.from);
    }
  } else entry = record(scene, path, await load());
  entry.model.mesh.setEnabled(false);
  taken.set(entry.model, entry);
  return entry.model;
}

/** Hands a clone from `takeModel` back, detached, so the spawn's node can be disposed after it. */
export function returnModel(model: LoadedModel): void {
  const entry = taken.get(model);
  taken.delete(model);
  const list = entry && !model.mesh.isDisposed() ? spareList(entry.scene, entry.path) : null;
  if (!entry || !list || list.length >= POOL_PER_MODEL) {
    disposeLoadedModel(model);
    return;
  }
  for (const node of model.mesh.getDescendants(false)) {
    if (!entry.nodes.has(node) && !node.isDisposed()) node.dispose(false, false);
  }
  for (const s of entry.meshes) {
    const m = s.mesh;
    m.material = s.material;
    m.metadata = s.metadata ? { ...s.metadata } : null;
    m.isVisible = s.isVisible;
    m.visibility = s.visibility;
    m.setEnabled(s.enabled);
    if (s.useVertexColors !== undefined) (m as Mesh).useVertexColors = s.useVertexColors;
    m.hasVertexAlpha = s.hasVertexAlpha;
    m.isPickable = s.isPickable;
    m.alwaysSelectAsActiveMesh = s.alwaysSelectAsActiveMesh;
  }
  for (const group of model.animationGroups) {
    group.stop();
    group.speedRatio = 1;
    // A spawn's own hooks (playKeys' hold) must not fire for the next one.
    group.onAnimationGroupEndObservable.clear();
    group.onAnimationGroupLoopObservable.clear();
  }
  model.mesh.parent = null;
  model.mesh.setEnabled(false);
  list.push(entry);
}

/** Map change: the spare clones are disposed. */
export function clearModelPool(): void {
  for (const byPath of spare.values()) for (const list of byPath.values()) for (const entry of list) disposeLoadedModel(entry.model);
  spare.clear();
}

/** How many spare clones are kept (debug). */
export function spareModelCount(): number {
  let n = 0;
  for (const byPath of spare.values()) for (const list of byPath.values()) n += list.length;
  return n;
}
