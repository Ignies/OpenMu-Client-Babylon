import {
  GlowLayer,
  type AbstractMesh,
  type Mesh,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions, onGameOptionsChanged } from '../common/gameOptions';
import { devQueryNumber } from '../common/devSeams';

/**
 * The halo around effect art - the light a bolt or a flare throws into the
 * frame around itself.
 *
 * The scene's other `GlowLayer` (`scenes/sceneLook.ts`) is the *item* halo:
 * it has no render list, draws every active mesh, and its emissive selectors
 * answer for item tiers and PBR trim maps. Effect art was excluded from it
 * for that reason and got no bloom of its own, which on a scene-referred
 * frame leaves a skill flat: the bolt and the ground it is drawn over land at
 * the same display value once the tone curve has compressed them
 * (documentation/effects_exposure). What the original reads as is a hot core
 * inside a wide coloured halo, and the halo is this file.
 *
 * Three things separate it from the item layer:
 *
 *  - **an include list, not the whole scene.** The only meshes it draws are
 *    the ones an entry hands it, so a halo costs the cards that are on
 *    screen, not a second pass over the map.
 *  - **their own material.** What lands in the glow map is the card as drawn
 *    - sheet x tint x `visibility`, at the map's `lightCardGain` - rather
 *    than a flat quad of the tint an emissive selector would produce.
 *  - **its own strength.** The item ladder rings a silhouette at 0.25; a
 *    skill has to read as light thrown into the scene.
 *
 * Only emissive art joins: a `RENDER_DARK` card removes light and blooming it
 * would add back what it just took, and alpha art is matter, not light. Off
 * with post processing, where the frame is display-referred and the art is
 * already at the value it was authored for.
 *
 * `effects/core.ts` (cards), `joint.ts` (ribbons) and `model.ts` (skill
 * meshes) are the only callers; `disposePools` takes the layer down with the
 * map.
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
  layer?.dispose();
  layer = null;
  layerScene = null;
}
