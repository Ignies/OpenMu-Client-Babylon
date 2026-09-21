import {
  Color4,
  Constants,
  EffectRenderer,
  EffectWrapper,
  Frustum,
  Plane,
  RenderTargetTexture,
  ShadowGenerator,
  Vector3,
  type AbstractEngine,
  type AbstractMesh,
  type CascadedShadowGenerator,
  type Matrix,
  type Scene,
  type UniformBuffer,
} from '../libs/babylon/exports';
import { devQuery, devQueryNumber } from '../common/devSeams';

/**
 * Cached static cascades.
 *
 * The cascades are redrawn from scratch every frame and most of what they
 * hold never moves: at the Devias spawn the shadow pass was 342 of the
 * frame's 542 draws, nearly all of it map geometry standing still. This
 * keeps one depth cache per cascade holding exactly those static casters,
 * and every frame copies the cache into the cascade layer *instead of
 * clearing it*, then draws the movers on top.
 *
 * The image is unchanged because the sampling side is untouched: same map,
 * same filter, same shader, same matrices. A cached depth image is what a
 * fresh render would have produced as long as the cascade's transform matrix
 * and the static set are the same, and that is exactly what `update` tests -
 * the matrix is compared element by element, so an input nobody thought of
 * (the director moving the sun, a tier switch, a Babylon internal) comes out
 * as a miss rather than as a stale shadow.
 *
 * Hits are made common by holding the cascade windows still: each is fitted
 * a little wider than its frustum slice needs and kept until the slice would
 * leave it. The map is enlarged by the same factor, so texels per tile - and
 * with them the PCF kernel's reach in world units - stay where they were.
 *
 * Pinned to `@babylonjs/core` 7.51.1; `csmCache.test.ts` fails if the private
 * members this leans on move.
 */

/** How much wider than its slice a cascade window is fitted. */
export const CSM_WINDOW_MARGIN = 1.125;

/** `?csmCache=0` restores the per-frame full redraw. */
export function csmCacheActive(): boolean {
  return devQuery('csmCache') !== '0';
}

export function csmWindowMargin(): number {
  const dev = devQueryNumber('csmMargin');

  return dev !== null && dev >= 1 && dev <= 2 ? dev : CSM_WINDOW_MARGIN;
}

/**
 * The shadow map grows with the margin so a held window has the texels per
 * tile a freshly fitted one would. Rounded to a multiple of 64; the margin
 * the windows actually use is read back out of the rounded size by
 * `marginOf`, so the two can never drift apart.
 */
export function csmCacheMapSize(base: number, margin: number): number {
  return Math.round((base * margin) / 64) * 64;
}

export function marginOf(base: number, mapSize: number): number {
  return mapSize / base;
}

type Held = {
  readonly center: Vector3;
  radius: number;
  valid: boolean;
};

/**
 * What this reaches into on the generator. Every name is private or
 * protected in Babylon's typings; the test pins them.
 */
type CsmPrivate = {
  _computeCascadeFrustum(cascadeIndex: number): void;
  _computeMatrices(): void;
  _splitFrustum(): void;
  _renderForShadowMap(
    opaque: unknown,
    alphaTest: unknown,
    transparent: unknown,
    depthOnly: unknown
  ): void;
  _breaksAreDirty: boolean;
  _currentLayer: number;
  _frustumCenter: Vector3[];
  _cascadeMinExtents: Vector3[];
  _cascadeMaxExtents: Vector3[];
  _transformMatrices: Matrix[];
  _sceneUBOs: UniformBuffer[] | undefined;
  _useUBO: boolean;
};

/** The prototype members `csmCache.test.ts` asserts still exist. */
export const CSM_PRIVATE_METHODS = [
  '_computeCascadeFrustum',
  '_computeMatrices',
  '_splitFrustum',
  '_renderForShadowMap',
] as const;

/**
 * A caster that cannot move, so its depth can be drawn once and kept.
 *
 * Two kinds. A prop-batch chunk is a thin-instance clone with a frozen world
 * matrix and `doNotSyncBoundingInfo` (common/propBatches.ts), placed when its
 * cell is built and never touched again. A per-object map object carries
 * `staticCaster` while no clip of its own is running (`ModelObject`); the
 * node itself never moves, because the render system writes a map object's
 * location only when it changes and a map object's never does. At the Devias
 * spawn the two are 46 and 143 of the 221 casters, so leaving either out
 * leaves most of the pass behind.
 *
 * Anything mid-fade is a mover: the depth pass dithers a transparent
 * caster's shadow by the mesh's `visibility`, so a ceiling piece fading out
 * writes a different map every frame.
 */
export function isStaticCaster(mesh: AbstractMesh): boolean {
  const meta = mesh.metadata;

  if (!meta || mesh.visibility < 1) return false;

  return meta.propBatch === true || meta.staticCaster === true;
}

const BLIT_VERT = `
attribute vec2 position;
varying vec2 vUV;
void main(void) {
  vUV = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/*
 * Writes the cached depth back as this fragment's depth. gl_FragColor is
 * written too: under PCF colour writes are off and it is dropped, and white
 * is what Babylon's own clear would have left there anyway. No comments
 * inside the source - a `;` in a `//` line is a statement to Babylon's
 * preprocessor and the effect never becomes ready.
 */
const BLIT_FRAG = `
precision highp float;
varying vec2 vUV;
uniform highp sampler2D cacheDepth;
void main(void) {
  gl_FragDepth = texture2D(cacheDepth, vUV).r;
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`;

/** A plane every point is in front of: the slot of a test that is skipped. */
const PASS_PLANE = new Plane(0, 0, 0, 1);

const WHITE = new Color4(1, 1, 1, 1);

export type CsmCacheStats = {
  statics: number;
  dynamics: number;
  /** Cache re-renders since the hook went in, per cascade. */
  misses: number[];
  frames: number;
  /** Whether each cache stands for the live matrix. */
  valid: boolean[];
  /** Held window radius per cascade, world units. */
  radius: number[];
  mapSize: number;
};

export class CsmCache {
  private readonly priv: CsmPrivate;
  private readonly engine: AbstractEngine;
  private readonly held: Held[] = [];
  private readonly caches: (RenderTargetTexture | null)[] = [];
  private readonly cachedMatrix: Float32Array[] = [];
  private readonly valid: boolean[] = [];
  private readonly misses: number[] = [];
  private readonly radius: number[] = [];

  /**
   * The two halves of the union the driver sweeps. Filled by index and
   * trimmed with `length`, never `push`: Babylon hooks a render list's push
   * and splice and marks every mesh in the scene light-dirty on an
   * empty-to-filled transition (objectRenderer.js:88), which is the storm
   * scenes/renderList.ts exists to avoid.
   */
  private readonly statics: AbstractMesh[] = [];
  private readonly dynamics: AbstractMesh[] = [];
  private staticCount = 0;
  private dynamicCount = 0;
  private signature = 0;
  private lastSignature = -1;
  private sweepFrame = -1;
  private updateFrame = -1;

  private readonly planes = [0, 1, 2, 3, 4, 5].map(() => new Plane(0, 0, 0, 0));
  private readonly sides: Plane[];
  private readonly culled: AbstractMesh[][] = [];

  private blit: EffectWrapper | null = null;
  private quad: EffectRenderer | null = null;

  private frames = 0;
  private disposed = false;

  constructor(
    private readonly csm: CascadedShadowGenerator,
    private readonly scene: Scene,
    private readonly map: RenderTargetTexture,
    private readonly cascades: number,
    private readonly margin: number
  ) {
    this.priv = csm as unknown as CsmPrivate;
    this.engine = scene.getEngine();
    this.sides = [
      PASS_PLANE,
      PASS_PLANE,
      this.planes[2],
      this.planes[3],
      this.planes[4],
      this.planes[5],
    ];

    for (let i = 0; i < cascades; i++) {
      this.caches.push(null);
      this.cachedMatrix.push(new Float32Array(16));
      this.valid.push(false);
      this.misses.push(0);
      this.radius.push(0);
      this.culled.push([]);
    }

    this.makeSticky();
    this.installClear();
  }

  // --- sticky windows ------------------------------------------------------

  /**
   * Holds each cascade's window until its frustum slice would leave it.
   * Babylon refits the window to the slice's bounding sphere every frame
   * (`_computeCascadeFrustum`, cascadedShadowGenerator.js:446), which walks
   * the light's view and its texel snap along with the camera and so makes
   * every frame's depth image a different one.
   *
   * Patched on the instance rather than subclassed: the method is private in
   * the typings, and a subclass would have to survive a base constructor
   * that runs before its own fields exist.
   */
  private makeSticky(): void {
    const priv = this.priv;
    const base = priv._computeCascadeFrustum.bind(priv);

    priv._computeCascadeFrustum = (cascadeIndex: number) => {
      base(cascadeIndex);

      if (this.disposed || cascadeIndex >= this.cascades) return;

      // `stabilizeCascades` is what makes the window a sphere. Without it
      // the extents are an AABB around the slice and holding x and y alone
      // would skew the fit.
      if (!this.csm.stabilizeCascades) return;

      const fresh = priv._frustumCenter[cascadeIndex];
      const freshRadius = priv._cascadeMaxExtents[cascadeIndex].x;
      const h = (this.held[cascadeIndex] ??= {
        center: new Vector3(),
        radius: 0,
        valid: false,
      });

      const covers = Vector3.Distance(fresh, h.center) + freshRadius <= h.radius;
      // A window held wider than the slice now needs is a coarser window.
      // Refitting once the slice has shrunk past the margin keeps texel
      // density from dropping below what the enlarged map was sized for.
      const dense = freshRadius * this.margin * this.margin >= h.radius;

      if (!h.valid || !covers || !dense) {
        h.center.copyFrom(fresh);
        // Babylon rounds the radius to 1/16; so does the refit.
        h.radius = Math.ceil(freshRadius * this.margin * 16) / 16;
        h.valid = true;
      }

      this.radius[cascadeIndex] = h.radius;

      priv._frustumCenter[cascadeIndex].copyFrom(h.center);
      priv._cascadeMaxExtents[cascadeIndex].copyFromFloats(
        h.radius,
        h.radius,
        h.radius
      );
      priv._cascadeMinExtents[cascadeIndex].copyFromFloats(
        -h.radius,
        -h.radius,
        -h.radius
      );
    };
  }

  // --- the caster split ----------------------------------------------------

  /**
   * Rides the render-list driver's sweep: it asks this of every mesh once a
   * frame to fill `map.renderList`, and the split is taken on the way
   * through instead of sweeping the scene a second time. The map's list
   * stays the union, which it has to be - Babylon compiles the shadow
   * defines into a receiver only while the list holds something
   * (materialHelper.functions.js:563), so the statics belong in it even on
   * the frames they are not drawn.
   */
  sink(mesh: AbstractMesh, casts: boolean): boolean {
    const frame = this.scene.getFrameId();

    if (frame !== this.sweepFrame) {
      this.sweepFrame = frame;
      this.staticCount = 0;
      this.dynamicCount = 0;
      this.signature = 0;
    }

    if (!casts) return false;

    if (isStaticCaster(mesh)) {
      this.statics[this.staticCount++] = mesh;
      // Order-independent and cheap: catches a cell turning on or off, a
      // prop arriving late, a chunk going away with its map.
      this.signature = (this.signature + mesh.uniqueId) | 0;
    } else {
      this.dynamics[this.dynamicCount++] = mesh;
    }

    return true;
  }

  // --- per frame -----------------------------------------------------------

  /**
   * Before the frame's render targets: settle the cascade matrices, work out
   * which caches still stand, redraw the ones that do not.
   *
   * Babylon computes the matrices at shadow-map bind time, which is too late
   * to know what to redraw. Calling it here is safe because it is a pure
   * function of the camera, the light and the held windows, so Babylon's own
   * call a moment later lands on the same numbers.
   */
  update(): void {
    if (this.disposed) return;

    // The observable fires again before each camera's own targets; one pass
    // a frame serves them all, as the render-list driver's does.
    const frame = this.scene.getFrameId();

    if (frame === this.updateFrame) return;

    this.updateFrame = frame;
    this.frames++;
    this.statics.length = this.staticCount;
    this.dynamics.length = this.dynamicCount;

    if (this.priv._breaksAreDirty) this.priv._splitFrustum();
    this.priv._computeMatrices();

    const setMoved = this.signature !== this.lastSignature;
    this.lastSignature = this.signature;

    let missed = false;

    for (let i = 0; i < this.cascades; i++) {
      const live = this.priv._transformMatrices[i];

      if (!live) continue;

      if (!setMoved && this.valid[i] && matches(live, this.cachedMatrix[i])) {
        continue;
      }

      live.copyToArray(this.cachedMatrix[i]);
      this.valid[i] = this.renderCache(i);
      this.misses[i]++;
      missed = true;
    }

    // A cascade that fell back to drawing the union would otherwise find its
    // statics already stamped with this render id and skip them.
    if (missed) this.scene.incrementRenderId();
  }

  /**
   * Draws the static casters into cascade `index`'s cache through the
   * generator's own path, so the depth is produced by the same shader with
   * the same bias, clamp, bones and alpha test the live map would use.
   */
  private renderCache(index: number): boolean {
    const cache = this.caches[index] ?? this.createCache(index);

    if (!cache) return false;

    const scene = this.scene;
    const saved = scene.getSceneUniformBuffer();

    try {
      cache.render(false, false);
    } finally {
      if (this.priv._sceneUBOs) scene.setSceneUniformBuffer(saved);
      scene.updateTransformMatrix();
      this.engine.setColorWrite(true);
    }

    // A submesh already drawn under the scene's current render id is skipped
    // (shadowGenerator.js:832). Babylon bumps the id between the layers of a
    // multi-layer target; these are single-layer targets rendered back to
    // back, so the bump is ours to make or the next cache comes out empty.
    scene.incrementRenderId();
    scene.resetCachedMaterial();

    return true;
  }

  private createCache(index: number): RenderTargetTexture | null {
    const size = this.map.getSize().width;

    const cache = new RenderTargetTexture(
      `csmStaticCache${index}`,
      { width: size, height: size },
      this.scene,
      {
        generateMipMaps: false,
        // Keeps the matrices we set: the target would otherwise overwrite
        // them with the camera's (renderTargetTexture.js:368).
        doNotChangeAspectRatio: true,
        generateDepthBuffer: true,
        generateStencilBuffer: false,
        noColorAttachment: true,
      }
    );

    // Comparison off, nearest: the blit reads this back as a plain float,
    // not through a shadow sampler.
    cache.createDepthStencilTexture(
      0,
      false,
      false,
      1,
      Constants.TEXTUREFORMAT_DEPTH32_FLOAT
    );

    cache.noPrePassRenderer = true;
    cache.renderParticles = false;
    cache.renderSprites = false;
    cache.ignoreCameraViewport = true;
    // Assigned once: the array is refilled in place, never pushed to.
    cache.renderList = this.statics;
    // Not in scene.customRenderTargets - it is rendered by hand, on a miss.

    cache.getCustomRenderList = (_pass, list, length) =>
      this.cull(index, list, length);

    cache.customRenderFunction = (opaque, alphaTest, transparent, depthOnly) =>
      this.priv._renderForShadowMap(opaque, alphaTest, transparent, depthOnly);

    // The per-layer setup the generator makes for a cascade
    // (cascadedShadowGenerator.js:588), and the clear the shadow generator
    // installs for PCF (shadowGenerator.js:715).
    cache.onBeforeRenderObservable.add(() => {
      if (this.priv._sceneUBOs) {
        this.scene.setSceneUniformBuffer(this.priv._sceneUBOs[index]);
      }

      this.priv._currentLayer = index;

      if (this.csm.filter === ShadowGenerator.FILTER_PCF) {
        this.engine.setColorWrite(false);
      }

      this.scene.setTransformMatrix(
        this.csm.getCascadeViewMatrix(index)!,
        this.csm.getCascadeProjectionMatrix(index)!
      );

      if (this.priv._useUBO) {
        this.scene.getSceneUniformBuffer().unbindEffect();
        this.scene.finalizeSceneUbo();
      }
    });

    cache.onClearObservable.add(engine => {
      engine.clear(WHITE, false, true, false);
    });

    this.caches[index] = cache;

    return cache;
  }

  /** The four side planes of cascade `index`, as `cullPerCascade` does. */
  private cull(
    index: number,
    list: readonly AbstractMesh[] | null,
    length: number
  ): AbstractMesh[] | null {
    const transform = this.csm.getCascadeTransformMatrix(index);

    if (!list || !transform) return null;

    Frustum.GetPlanesToRef(transform, this.planes);

    const out = this.culled[index];
    let n = 0;

    for (let i = 0; i < length; i++) {
      const mesh = list[i];
      if (mesh.isInFrustum(this.sides)) out[n++] = mesh;
    }

    out.length = n;

    return out;
  }

  /**
   * What the live cascade has left to draw: the movers alone while its cache
   * stands for the frame's matrix, and null - meaning the whole union - when
   * it does not.
   */
  dynamicsFor(index: number): AbstractMesh[] | null {
    return this.valid[index] ? this.dynamics : null;
  }

  // --- the blit ------------------------------------------------------------

  /**
   * The cached depth takes the place of the clear, so everything the cascade
   * holds that never moved is already in the layer when the movers are drawn
   * over it - and the layer never keeps last frame's movers.
   */
  private installClear(): void {
    const map = this.map;

    map.onClearObservable.clear();

    map.onClearObservable.add(engine => {
      const layer = (map as unknown as { _currentLayer: number })._currentLayer;

      if (this.valid[layer] && this.drawCache(layer)) return;

      if (this.csm.filter === ShadowGenerator.FILTER_PCF) {
        engine.clear(WHITE, false, true, false);
      } else {
        engine.clear(WHITE, true, true, false);
      }
    });
  }

  private drawCache(layer: number): boolean {
    const cache = this.caches[layer];

    if (!cache) return false;

    const blit = (this.blit ??= new EffectWrapper({
      engine: this.engine,
      name: 'csmCacheBlit',
      vertexShader: BLIT_VERT,
      fragmentShader: BLIT_FRAG,
      attributeNames: ['position'],
      uniformNames: [],
      samplerNames: ['cacheDepth'],
    }));

    if (!blit.isReady()) return false;

    const quad = (this.quad ??= new EffectRenderer(this.engine));
    const depth = this.engine.depthCullingState;
    const wasTest = depth.depthTest;
    const wasMask = depth.depthMask;
    const wasFunc =
      depth.depthFunc ??
      (this.engine.useReverseDepthBuffer ? Constants.GEQUAL : Constants.LEQUAL);

    quad.applyEffectWrapper(blit);
    blit.effect.setDepthStencilTexture('cacheDepth', cache);

    // Every fragment takes the cached value: this is a copy, not a test.
    depth.depthTest = true;
    depth.depthFunc = Constants.ALWAYS;
    depth.depthMask = true;

    quad.draw();

    depth.depthFunc = wasFunc;
    depth.depthMask = wasMask;
    depth.depthTest = wasTest;

    this.scene.resetCachedMaterial();

    return true;
  }

  // --- housekeeping --------------------------------------------------------

  /** Everything the caches stand on has changed; redraw them all. */
  invalidate(): void {
    for (let i = 0; i < this.cascades; i++) this.valid[i] = false;
  }

  stats(): CsmCacheStats {
    return {
      statics: this.staticCount,
      dynamics: this.dynamicCount,
      misses: [...this.misses],
      frames: this.frames,
      valid: [...this.valid],
      radius: [...this.radius],
      mapSize: this.map.getSize().width,
    };
  }

  dispose(): void {
    this.disposed = true;

    for (const cache of this.caches) cache?.dispose();
    this.caches.length = 0;

    this.blit?.dispose();
    this.blit = null;
    this.quad?.dispose();
    this.quad = null;
  }
}

function matches(live: Matrix, held: Float32Array): boolean {
  const m = live.m;

  for (let i = 0; i < 16; i++) {
    if (m[i] !== held[i]) return false;
  }

  return true;
}
