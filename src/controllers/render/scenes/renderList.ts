import type {
  AbstractMesh,
  Observer,
  RenderTargetTexture,
  Scene,
} from '../babylon/exports';

/**
 * Fills a render list in place from a predicate and dirties the lights only when
 * it goes empty or non-empty. `scene`: every mesh; `active`: the camera's meshes.
 */
export type RenderListScope = 'scene' | 'active';

type Driven = {
  readonly rt: RenderTargetTexture;
  predicate: (mesh: AbstractMesh) => boolean;
  readonly scope: RenderListScope;
  readonly list: AbstractMesh[];
  wasEmpty: boolean;
  release: () => void;
};

type SceneDrivers = {
  driven: Driven[];
  frame: number;
  beforeTargets: Observer<Scene>;
  afterEvaluation: Observer<Scene>;
};

const drivers = new WeakMap<Scene, SceneDrivers>();

function fill(
  scene: Scene,
  d: Driven,
  meshes: readonly AbstractMesh[],
  count: number
): void {
  const list = d.list;
  let n = 0;

  for (let i = 0; i < count; i++) {
    const mesh = meshes[i];
    if (d.predicate(mesh)) list[n++] = mesh;
  }

  list.length = n;

  const empty = n === 0;

  // The dirtying is for the lights (a caster set appearing or vanishing turns
  // shadow defines on or off); a screen-space list compiles nothing.
  if (empty !== d.wasEmpty) {
    d.wasEmpty = empty;

    if (d.scope === 'scene') {
      for (const mesh of scene.meshes) {
        (mesh as unknown as { _markSubMeshesAsLightDirty(): void })
          ._markSubMeshesAsLightDirty();
      }
    }
  }
}

function driversFor(scene: Scene): SceneDrivers {
  const entry = drivers.get(scene);
  if (entry) return entry;

  const created: SceneDrivers = {
    driven: [],
    frame: -1,
    beforeTargets: null as unknown as Observer<Scene>,
    afterEvaluation: null as unknown as Observer<Scene>,
  };

  // Fires before the custom targets in `render()` and again before each
  // camera's own targets; one fill per frame serves both.
  created.beforeTargets = scene.onBeforeRenderTargetsRenderObservable.add(() => {
    const frame = scene.getFrameId();
    if (frame === created.frame) return;
    created.frame = frame;

    const meshes = scene.meshes;

    for (const d of created.driven) {
      if (d.scope === 'scene') fill(scene, d, meshes, meshes.length);
    }
  });

  // End of `_evaluateActiveMeshes`, once per camera, before its targets.
  created.afterEvaluation = scene.onAfterActiveMeshesEvaluationObservable.add(() => {
    const active = scene.getActiveMeshes();

    for (const d of created.driven) {
      if (d.scope === 'active') fill(scene, d, active.data, active.length);
    }
  });

  drivers.set(scene, created);
  return created;
}

/**
 * Takes over `rt`'s render list: cleared of its predicate, given a list this
 * module keeps filled. Returns the release, which also runs when the target
 * is disposed.
 */
export function driveRenderList(
  scene: Scene,
  rt: RenderTargetTexture,
  predicate: (mesh: AbstractMesh) => boolean,
  scope: RenderListScope = 'scene'
): () => void {
  const entry = driversFor(scene);

  // Typed non-nullable, checked for truthiness at runtime (objectRenderer.js).
  (rt as unknown as { renderListPredicate: null }).renderListPredicate = null;

  // One driver per target, whatever the caller does. Stacking a second one
  // added a second sweep of every mesh in the scene to every frame, and only
  // the last list was ever drawn - so the extra sweeps were pure cost with
  // nothing to show for them. The cascades re-hook their map whenever the
  // caster set is re-chosen, which is once a frame while a room is the active
  // area, so an interior grew one dead sweep per frame for as long as the hero
  // stood in it.
  const existing = entry.driven.find(d => d.rt === rt);

  if (existing && existing.scope === scope) {
    existing.predicate = predicate;
    rt.renderList = existing.list;

    return existing.release;
  }

  existing?.release();

  const d: Driven = {
    rt,
    predicate,
    scope,
    list: [],
    wasEmpty: true,
    release: () => {},
  };

  d.release = () => {
    const index = entry.driven.indexOf(d);
    if (index >= 0) entry.driven.splice(index, 1);
    if (rt.renderList === d.list) rt.renderList = null;
  };

  rt.renderList = d.list;
  entry.driven.push(d);
  rt.onDisposeObservable.addOnce(d.release);

  return d.release;
}
