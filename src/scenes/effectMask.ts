import {
  Color4,
  Constants,
  ParticleSystem,
  RenderTargetTexture,
  Texture,
  type AbstractEngine,
  type AbstractMesh,
  type ArcRotateCamera,
  type IParticleSystem,
  type Observer,
  type RenderTargetWrapper,
  type Scene,
} from '../libs/babylon/exports';
import { driveRenderList } from './renderList';
import { sceneRenderSize } from './upscale';

/**
 * The effect mask (effects_composite ARCHITECTURE §3): where the additive
 * half of the frame landed, and how much of each pixel it is. Sole owner of
 * the target; the AO combine, the haze, the ink lines, the room mask and the
 * tone pass read it.
 *
 * Every reader describes a pixel by the *surface* under it, and over every
 * additive thing in the game - cards, ribbons, skill meshes, flare sprites,
 * fire particles, the map objects' blend meshes - the surface is whatever
 * stands behind the flame. The mask holds only the additive geometry, in
 * its own blend modes, over black, so `surface = colour - mask` is that
 * surface; the tone pass then puts the mask back after the curve, at the
 * value the art was authored at.
 *
 * It is exact, which the readers always assumed and it never was. It is
 * drawn *after* the frame, from `onAfterDrawPhaseObservable`, depth-tested
 * against the depth the camera just wrote: the camera's first post-process
 * target lends its depth attachment (`RenderTargetWrapper.shareDepth`, what
 * Babylon's own depth peeling and fluid renderers use), so a flame behind a
 * wall is not in it. Nothing here writes depth - the effect materials, the
 * sprite managers and the particle systems all have depth writes off - and
 * the target clears colour only, with the per-group depth clear off, so the
 * borrowed depth is never touched.
 *
 * Full resolution and half float: at half resolution a one-pixel rain
 * streak lands at a tenth of its brightness, and at 8 bits a flame brighter
 * than white clamps to 1.0 and leaves a surface too bright to subtract from.
 * The size is explicit rather than a ratio: Babylon's ratio resize disposes
 * the wrapper, and a wrapper's dispose deletes the depth buffer it holds,
 * which would be the scene's. Every path that could dispose or rebuild the
 * target drops the borrowed handle first.
 */

export const EFFECT_MASK_SAMPLER = 'effectMask';

/** The additive half of the frame: emissive art, wherever it is drawn (the halo's rule). */
function emits(mesh: AbstractMesh): boolean {
  return mesh.metadata?.brightMesh === true && mesh.isEnabled();
}

function additive(ps: IParticleSystem): boolean {
  return (
    ps.blendMode === ParticleSystem.BLENDMODE_ADD ||
    ps.blendMode === ParticleSystem.BLENDMODE_ONEONE
  );
}

/** What the lender exposes and what the borrow touches; both are Babylon internals. */
type Borrower = { _depthStencilBuffer: unknown };

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  mask: RenderTargetTexture;
  /** The camera target whose depth the mask holds right now, and at which sample count. */
  lender: RenderTargetWrapper | null;
  borrower: RenderTargetWrapper | null;
  samples: number;
  /** Additive particle systems, refilled per frame for `particleSystemList`. */
  particles: IParticleSystem[];
  afterDraw: Observer<Scene>;
  resize: Observer<AbstractEngine>;
};

let runtime: Runtime | null = null;

/** The live mask, for the readers; null while no graded tier is drawing. */
export function effectMask(): RenderTargetTexture | null {
  return runtime?.mask ?? null;
}

/**
 * The size of the frame, which is the drawing buffer's only while the upscale
 * is off: the mask borrows the depth of the target the scene is drawn into,
 * and a borrowed depth buffer of the wrong size is an incomplete framebuffer.
 */
function canvasSize(scene: Scene): { width: number; height: number } {
  return sceneRenderSize(scene.getEngine());
}

/** Forget the lender's depth without deleting it: the mask never owned it. */
function dropBorrow(rt: Runtime): void {
  if (rt.borrower) (rt.borrower as unknown as Borrower)._depthStencilBuffer = null;
  rt.borrower = null;
  rt.lender = null;
}

/**
 * Take the lender's depth for the mask's current wrapper, at the lender's
 * sample count. Re-done whenever either side or the count changes: the
 * lender is rebuilt with the post chain, the mask with the canvas.
 */
function borrowDepth(rt: Runtime, lender: RenderTargetWrapper): void {
  const target = rt.mask.renderTarget;
  if (!target) return;

  const samples = lender.samples;

  if (rt.lender === lender && rt.borrower === target && rt.samples === samples) return;

  dropBorrow(rt);

  // Changing the count rebuilds the wrapper's attachments and would delete a
  // depth buffer it found there.
  if (rt.mask.samples !== samples) rt.mask.samples = samples;

  const after = rt.mask.renderTarget;
  if (!after) return;

  lender.shareDepth(after);

  rt.lender = lender;
  rt.borrower = after;
  rt.samples = samples;
}

function createMask(scene: Scene, camera: ArcRotateCamera): Runtime {
  const engine = scene.getEngine();

  const mask = new RenderTargetTexture(EFFECT_MASK_SAMPLER, canvasSize(scene), scene, {
    generateDepthBuffer: false,
    generateMipMaps: false,
    samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    type: Constants.TEXTURETYPE_HALF_FLOAT,
  });

  mask.clearColor = new Color4(0, 0, 0, 1);
  mask.activeCamera = camera;
  mask.renderParticles = true;
  // Every pool, subtract ones too (they darken the additive art under them); each
  // draws the vertices the camera uploaded this frame (`libs/babylon/spriteReplay.ts`).
  mask.renderSprites = true;
  mask.wrapU = Texture.CLAMP_ADDRESSMODE;
  mask.wrapV = Texture.CLAMP_ADDRESSMODE;
  driveRenderList(scene, mask, emits, 'active');

  // Colour only: the depth is the scene's.
  mask.onClearObservable.add(e => e.clear(mask.clearColor, true, false, false));
  for (let group = 0; group < 4; group++) {
    mask.setRenderingAutoClearDepthStencil(group, false);
  }

  const rt: Runtime = {
    scene,
    camera,
    mask,
    lender: null,
    borrower: null,
    samples: 1,
    particles: [],
    afterDraw: null as unknown as Observer<Scene>,
    resize: null as unknown as Observer<AbstractEngine>,
  };

  rt.afterDraw = scene.onAfterDrawPhaseObservable.add(() => {
    if (scene.activeCamera !== camera) return;

    // The target the camera just drew into, with its depth. Bound only
    // while a post chain is live, which is the only time anything reads
    // the mask.
    const lender = (engine as unknown as { _currentRenderTarget: RenderTargetWrapper | null })
      ._currentRenderTarget;
    if (!lender) return;

    borrowDepth(rt, lender);

    const list = rt.particles;
    let n = 0;
    for (const ps of scene.particleSystems) {
      if (additive(ps)) list[n++] = ps;
    }
    list.length = n;
    mask.particleSystemList = list;

    mask.render(false, false);

    // The render unbinds to the back buffer: put the camera's target back
    // for the glow layers and the post chain.
    engine.bindFramebuffer(lender, 0, undefined, undefined, true);
  });

  rt.resize = engine.onResizeObservable.add(() => {
    dropBorrow(rt);
    mask.resize(canvasSize(scene));
  });

  return rt;
}

export function disposeEffectMask(): void {
  if (!runtime) return;

  const { scene, mask } = runtime;

  dropBorrow(runtime);
  scene.onAfterDrawPhaseObservable.remove(runtime.afterDraw);
  scene.getEngine().onResizeObservable.remove(runtime.resize);
  mask.particleSystemList = null;
  mask.dispose();

  runtime = null;
}

/**
 * Build or tear down the mask to match the tier and the post option. It is
 * not a pass on the camera, so the chain order never depends on it; the
 * readers take it live through `effectMask()`.
 */
export function syncEffectMask(scene: Scene, camera: ArcRotateCamera, want: boolean): void {
  if (runtime && (!want || runtime.scene !== scene || runtime.camera !== camera)) {
    disposeEffectMask();
  }

  // The render-scale slider resizes the scene's target without resizing the
  // drawing buffer while the upscale is on, so the engine's resize is not the
  // only thing that can leave the borrowed depth the wrong size.
  if (runtime) {
    const size = canvasSize(scene);

    if (
      runtime.mask.getSize().width !== size.width ||
      runtime.mask.getSize().height !== size.height
    ) {
      dropBorrow(runtime);
      runtime.mask.resize(size);
    }
  }

  if (!want || runtime) return;

  runtime = createMask(scene, camera);
}
