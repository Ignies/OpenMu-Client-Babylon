import {
  GlowLayer,
  type AbstractMesh,
  type Mesh,
  type Observer,
  type RenderTargetTexture,
  type Scene,
} from '../render/babylon/exports';
import { GameOptions, onGameOptionsChanged } from '@/controllers/settings';
import { devQuery, devQueryNumber } from '../../core/devSeams';
import { driveRenderList } from '../render/scenes/renderList';

/**
 * The halo around effect art: its own `GlowLayer` that draws only the meshes entries hand it,
 * apart from the item halo (`controllers/render/scenes/sceneLook.ts`). Off without post processing. See fx/readme.md.
 */

const SLIDER_MAX = 9;

/**
 * Layer strength at the top notch of the Glow slider (the default 5/9 lands
 * on 0.5). Twice the item ladder's 0.45: that one is a rim around armour and
 * a bolt at it does not survive the tone curve.
 *
 * Measured, not guessed - sweep at `?fxglow=` over 0.4 / 0.7 / 0.9 / 1.2 /
 * 1.8 on Lightning and Ice. Under 0.7 a bolt has no halo worth the pass; over
 * 1.2 a *model* loses its own shape, because a mesh covers area where a
 * ribbon covers a line and the same blur turns it into a dome. 0.9 is where
 * the bolt reads as light and the ice shards still read as shards.
 */
const FX_GLOW_MAX_INTENSITY = 0.9;

/**
 * Glow map resolution as a share of the canvas, and the blur kernel in its
 * pixels. A lightning ribbon is a few pixels wide: at the item layer's fixed
 * 256 it rasterises to a dashed line and the halo crawls along it, so the
 * effect map is half-res. The kernel is then ~16 % of the frame width at
 * 1080p, which is the reference halo's reach.
 */
const FX_TEXTURE_RATIO = 0.5;
const FX_BLUR_KERNEL = 64;

let layer: GlowLayer | null = null;
let layerScene: Scene | null = null;
let offOptions: (() => void) | null = null;

/** Meshes drawn into the halo right now. */
const included = new Set<AbstractMesh>();

/**
 * Meshes already handed to the layer as own-material. Referencing adds an
 * `onDispose` observer every call, and a pooled card is acquired thousands of
 * times a session - so it is referenced once and its *participation* is the
 * include list.
 */
let referenced = new WeakSet<AbstractMesh>();

// With no list the target walks every active mesh and drops all but the
// included few (`?fxHaloList=0`). A resize rebuilds it list-less, so a new
// target is driven again, as the item layer's is (`sceneLook.ts`).
const HALO_LIST = devQuery('fxHaloList') !== '0';

let frameTick: Observer<Scene> | null = null;
let drivenTexture: RenderTargetTexture | null = null;
let releaseHaloList: (() => void) | null = null;

const isIncluded = (mesh: AbstractMesh): boolean => included.has(mesh);

// Before the frame's active meshes are chosen, never from `addEffectGlow`: a
// list driven after them is empty for that frame, an undriven target is not.
function driveHaloList(): void {
  if (!layer || !layerScene || !layer.isEnabled) return;

  const texture = (layer as unknown as { _mainTexture?: RenderTargetTexture })
    ._mainTexture;

  if (!texture || texture === drivenTexture) return;

  drivenTexture = texture;
  releaseHaloList = driveRenderList(layerScene, texture, isIncluded, 'active');
}

function syncIntensity(): void {
  if (!layer) return;

  // Dev seam for the sweep: `?fxglow=`.
  const max = devQueryNumber('fxglow') ?? FX_GLOW_MAX_INTENSITY;

  layer.intensity = GameOptions.postProcessing
    ? (Math.max(0, GameOptions.glow) / SLIDER_MAX) * max
    : 0;

  syncEnabled();
}

function syncEnabled(): void {
  if (!layer) return;

  const on = included.size > 0 && layer.intensity > 0;

  if (layer.isEnabled !== on) layer.isEnabled = on;
}

function ensureLayer(scene: Scene): GlowLayer | null {
  if (layer && layerScene === scene) return layer;
  if (layer) disposeEffectGlow();

  layer = new GlowLayer('fxGlow', scene, {
    mainTextureRatio: FX_TEXTURE_RATIO,
    blurKernelSize: FX_BLUR_KERNEL,
  });
  layer.isEnabled = false;
  layerScene = scene;
  offOptions = onGameOptionsChanged(syncIntensity);

  if (HALO_LIST) frameTick = scene.onBeforeRenderObservable.add(driveHaloList);

  syncIntensity();

  return layer;
}

/** Draw `mesh` into the halo. Idempotent; only emissive art should ask. */
export function addEffectGlow(scene: Scene, mesh: AbstractMesh): void {
  const gl = ensureLayer(scene);

  if (!gl || included.has(mesh)) return;

  if (!referenced.has(mesh)) {
    referenced.add(mesh);
    gl.referenceMeshToUseItsOwnMaterial(mesh);
  }

  // The include list is typed `Mesh` and keyed on `uniqueId`; a skill mesh
  // arrives as the AbstractMesh the GLB cache handed over.
  gl.addIncludedOnlyMesh(mesh as Mesh);
  included.add(mesh);

  syncEnabled();
}

/** Stop drawing `mesh`. A pooled card comes back through `addEffectGlow`. */
export function dropEffectGlow(mesh: AbstractMesh): void {
  if (!included.delete(mesh)) return;

  layer?.removeIncludedOnlyMesh(mesh as Mesh);

  syncEnabled();
}

/**
 * …and forget it: the mesh is about to be disposed. Babylon's own dispose
 * hook drops a mesh from the include and exclude lists but *not* from the
 * own-material list, so a spawn that disposes its meshes has to say so.
 */
export function releaseEffectGlow(mesh: AbstractMesh): void {
  dropEffectGlow(mesh);

  if (!referenced.has(mesh)) return;

  referenced.delete(mesh);
  layer?.unReferenceMeshFromUsingItsOwnMaterial(mesh);
}

/** Map change: the layer goes with the pools it drew from. */
export function disposeEffectGlow(): void {
  included.clear();
  // A mesh that outlives the layer has to be referenced again by the next one.
  referenced = new WeakSet();
  offOptions?.();
  offOptions = null;
  layerScene?.onBeforeRenderObservable.remove(frameTick);
  frameTick = null;
  releaseHaloList?.();
  releaseHaloList = null;
  drivenTexture = null;
  layer?.dispose();
  layer = null;
  layerScene = null;
}
