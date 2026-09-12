import type {
  AbstractMesh,
  Observer,
  RenderTargetTexture,
  Scene,
} from '../libs/babylon/exports';

/**
 * A render list filled from a predicate without Babylon's per-frame dirty
 * storm.
 *
 * Babylon's own `renderListPredicate` rebuilds the list every frame by
 * setting its length to zero and pushing every match, and it observes the
 * array: on every transition between empty and non-empty it marks the
 * lighting defines of *every mesh in the scene* dirty, because a shadow
 * map's caster set changing is what can turn a light's shadows on or off.
 * Emptying and refilling is two such transitions per pass per frame - the
 * cascades, the G-buffer and the effect mask were re-dirtying 1 500 meshes
 * six times a frame, and every material then re-checked its defines on the
 * next draw. Measured at ~2 ms of a 19 ms Noria frame.
 *
 * This fills the same list in place by index, which the observer does not
 * see, and raises the one notification that matters itself: when a list
 * really goes from empty to holding something, or back.
 */
type Driven = {
  readonly rt: RenderTargetTexture;
  predicate: (mesh: AbstractMesh) => boolean;
  readonly list: AbstractMesh[];
  wasEmpty: boolean;
  release: () => void;
};

type SceneDrivers = {
  driven: Driven[];
  frame: number;
  observer: Observer<Scene>;
};

const drivers = new WeakMap<Scene, SceneDrivers>();

function fill(scene: Scene, d: Driven): void {
  const meshes = scene.meshes;
  const list = d.list;
  let n = 0;

  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (d.predicate(mesh)) list[n++] = mesh;
  }

  list.length = n;

  const empty = n === 0;

  if (empty !== d.wasEmpty) {
    d.wasEmpty = empty;
    for (const mesh of meshes) {
      (mesh as unknown as { _markSubMeshesAsLightDirty(): void })
        ._markSubMeshesAsLightDirty();
    }
  }
}

function driversFor(scene: Scene): SceneDrivers {
  let entry = drivers.get(scene);
  if (entry) return entry;

  const created: SceneDrivers = {
    driven: [],
    frame: -1,
    observer: null as unknown as Observer<Scene>,
  };

  // Fires before the custom targets in `render()` and again before each
  // camera's own targets; one fill per frame serves both.
  created.observer = scene.onBeforeRenderTargetsRenderObservable.add(() => {
    const frame = scene.getFrameId();
    if (frame === created.frame) return;
    created.frame = frame;

    for (const d of created.driven) fill(scene, d);
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
  predicate: (mesh: AbstractMesh) => boolean
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

  if (existing) {
    existing.predicate = predicate;
    rt.renderList = existing.list;

    return existing.release;
  }

  const d: Driven = {
    rt,
    predicate,
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
