import {
  Color4,
  PostProcess,
  RenderTargetTexture,
  SSAO2RenderingPipeline,
  ShaderStore,
  SmartArray,
  Texture,
  type AbstractMesh,
  type ArcRotateCamera,
  type MultiRenderTarget,
  type Scene,
  type SubMesh,
} from '../libs/babylon/exports';
// Side-effect import, and the order is the whole point: this module's body is
// `ShaderStore.ShadersStore['ssaoCombinePixelShader'] = <Babylon's version>`.
// ESM evaluates it before this file's body, so the override below lands last;
// `SSAO2RenderingPipeline` then `import()`s the same specifier, gets the
// cached module, and does *not* re-run the registration over the top of ours.
import '@babylonjs/core/Shaders/ssaoCombine.fragment.js';
import { pipelineSamples, type LightingTier } from '../common/lightingQuality';
import { drawsSolidGeometry } from './shadows';

/**
 * Contact-scale SSAO2 and the effect mask (ARCHITECTURE §4.1, §4.8 step 1).
 * Sole owner of the SSAO pipeline, the geometry buffer's predicate and the
 * effect-mask render target; `heightFog.ts` reads the mask.
 *
 * Contact-scale, not ambient-scale: the baked lightmap already carries the
 * near-wall darkening (that darkening is the art) and the CSM the sun, so the
 * AO reads as contact tightening, never as a halo at gameplay zoom.
 *
 * Dev override: `?ssao=radius,strength,base` for live tuning.
 */
const SSAO_RADIUS = 0.35;
const SSAO_STRENGTH = 0.75;
const SSAO_BASE = 0.15;
const SSAO_MAX_Z = 45;
const SSAO_MIN_Z_ASPECT = 0.25;

function ssaoOverride(): [number, number, number] | null {
  try {
    const raw = new URLSearchParams(location.search).get('ssao');
    if (!raw) return null;
    const parts = raw.split(',').map(Number);
    return parts.length === 3 && parts.every(n => !isNaN(n))
      ? (parts as [number, number, number])
      : null;
  } catch {
    return null;
  }
}

/**
 * The effect mask: where the additive half of the frame landed.
 *
 * The AO combine and the haze both describe a pixel by the *surface* under
 * it, read from the geometry buffer, which holds only matter. Over every
 * additive thing in the game (the `_R` meshes and `BlendMesh` flames, the
 * flare sprites, fire and smoke particles, item auras, skill effects) the
 * buffer describes whatever stands behind the flame, and both passes would
 * apply it anyway. Nothing this early in the chain is HDR (SSAO2 builds its
 * passes at 8 bits), so a brightness knee cannot find them; the mask draws
 * them instead: one low-resolution target holding only the additive
 * geometry over black, and the two passes back off in proportion to it.
 */
const EFFECT_MASK_LO = 0.02;
const EFFECT_MASK_HI = 0.25;

/** Mask resolution relative to the backbuffer. */
const EFFECT_MASK_RATIO = 0.5;

export const EFFECT_MASK_SAMPLER = 'effectMask';

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  tier: LightingTier;
  ssao: SSAO2RenderingPipeline;
  mask: RenderTargetTexture;
};

let runtime: Runtime | null = null;

/** The live effect mask, for the haze; null while the AO is not built. */
export function effectMask(): RenderTargetTexture | null {
  return runtime?.mask ?? null;
}

/**
 * What SSAO and the haze see: everything the camera sees that is matter.
 *
 * The haze reads one number per pixel - this buffer's depth - so a pixel that
 * is missing here inherits the depth of whatever stands behind it and is
 * hazed for that distance instead. Alpha-keyed meshes are in
 * (`useMeshAlphaTestTexture` makes that safe: the G-buffer alpha-tests
 * against the mesh's own texture), and the whitelist is `depthOccluder`, not
 * `csmCaster`: an object the map marks `CastsShadow = false`, and every
 * torch, candle and lamp, casts no sun shadow and is still solid geometry
 * standing in front of the camera.
 */
function occludes(mesh: AbstractMesh): boolean {
  const meta = mesh.metadata;

  if (!meta) return false;
  if (meta.terrain === true) return true;

  // The flattened shadow clones replace their metadata wholesale and so never
  // carry `depthOccluder`, which keeps them out of the depth they would
  // otherwise poison.
  if (meta.depthOccluder !== true || meta.brightMesh) return false;

  return drawsSolidGeometry(mesh);
}

/** Stand-in for a bucket a pass is not meant to draw this time round. */
const NO_SUBMESHES = new SmartArray<SubMesh>(0);

/**
 * Draw the G-buffer's alpha-keyed meshes with depth writes on.
 *
 * Babylon files anything whose material needs alpha blending - which
 * ALPHATESTANDBLEND does - into the *transparent* bucket, and the geometry
 * buffer draws that bucket last with `setDepthWrite(false)` and unsorted
 * (`RenderingGroup.render` hands a custom render function its buckets
 * unsorted), so the last keyed mesh dispatched would win every pixel it
 * covers whatever its distance. They are drawn a second time round through
 * the *opaque* slot, where depth writes are on and the depth test resolves
 * them; the G-buffer writes depth as a colour attachment and never blends,
 * so "opaque" here only means "sorted by the depth buffer".
 */
function depthWriteAlphaKeyed(gbuffer: MultiRenderTarget): void {
  const inner = gbuffer.customRenderFunction;

  if (!inner) return;

  gbuffer.customRenderFunction = (
    opaque,
    alphaTest,
    transparent,
    depthOnly,
    beforeTransparents
  ) => {
    inner(opaque, alphaTest, NO_SUBMESHES, depthOnly, beforeTransparents);

    if (transparent.length) {
      inner(transparent, NO_SUBMESHES, NO_SUBMESHES, NO_SUBMESHES);
    }
  };
}

/**
 * Babylon's combine pass is `sceneColor * ssaoColor` over the *finished*
 * frame, glow cards included; wherever the effect mask says an additive pass
 * landed, the AO is faded out (a pixel that is itself a light source has
 * nothing to occlude).
 */
const SSAO_COMBINE_SHADER = 'ssaoCombinePixelShader';

let ssaoCombinePatched = false;

function patchSsaoCombine(): void {
  if (ssaoCombinePatched) return;

  ssaoCombinePatched = true;

  ShaderStore.ShadersStore[SSAO_COMBINE_SHADER] = `
  uniform sampler2D textureSampler;
  uniform sampler2D originalColor;
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform vec4 viewport;
  varying vec2 vUV;

  const float EFFECT_MASK_LO = ${EFFECT_MASK_LO.toFixed(3)};
  const float EFFECT_MASK_HI = ${EFFECT_MASK_HI.toFixed(3)};

  void main(void) {
    vec2 uv = viewport.xy + vUV * viewport.zw;

    vec4 ssaoColor = texture2D(textureSampler, uv);
    vec4 sceneColor = texture2D(originalColor, uv);

    // The mask is rendered through the same camera viewport as the passes
    // above it, so it takes the same remapped uv rather than raw vUV.
    vec3 effect = texture2D(${EFFECT_MASK_SAMPLER}, uv).rgb;
    float lit = smoothstep(EFFECT_MASK_LO, EFFECT_MASK_HI,
      max(effect.r, max(effect.g, effect.b)));

    vec3 ao = mix(ssaoColor.rgb, vec3(1.0), lit);

    gl_FragColor = vec4(sceneColor.rgb * ao, sceneColor.a * ssaoColor.a);
  }
  `;
}

/** The additive half of the frame - everything the G-buffer refuses. */
function emits(mesh: AbstractMesh): boolean {
  return mesh.metadata?.brightMesh === true;
}

/**
 * The mask itself: the effect geometry, in its own blend modes, over black.
 * No depth buffer: additive compositing is order-independent, and a flame
 * hidden behind a wall costs a little AO and haze on the wall in front of
 * it, cheaper than a second depth attachment in step with the G-buffer's.
 */
function createEffectMask(
  scene: Scene,
  camera: ArcRotateCamera
): RenderTargetTexture {
  const mask = new RenderTargetTexture(
    'effectMask',
    { ratio: EFFECT_MASK_RATIO },
    scene,
    {
      generateDepthBuffer: false,
      generateMipMaps: false,
      samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    }
  );

  mask.clearColor = new Color4(0, 0, 0, 1);
  mask.activeCamera = camera;
  mask.renderListPredicate = emits;
  mask.renderParticles = true;
  mask.renderSprites = true;
  mask.wrapU = Texture.CLAMP_ADDRESSMODE;
  mask.wrapV = Texture.CLAMP_ADDRESSMODE;

  scene.customRenderTargets.push(mask);

  return mask;
}

/**
 * Hand Babylon's combine pass the sampler its patched shader declares. An
 * `Effect` binds textures by the names it was *compiled* with, so the
 * post-process is recompiled with the extra name; `onApplyObservable`
 * because the pipeline has already spent `onApply` on `viewport` and
 * `originalColor`.
 */
function bindEffectMask(
  ssao: SSAO2RenderingPipeline,
  mask: RenderTargetTexture
): void {
  const combine = (
    ssao as unknown as { _ssaoCombinePostProcess: PostProcess | null }
  )._ssaoCombinePostProcess;

  if (!combine) return;

  combine.updateEffect(null, null, [
    'textureSampler',
    'originalColor',
    'viewport',
    EFFECT_MASK_SAMPLER,
  ]);

  combine.onApplyObservable.add(effect => {
    effect.setTexture(EFFECT_MASK_SAMPLER, mask);
  });
}

function createSsao(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier,
  mask: RenderTargetTexture
): SSAO2RenderingPipeline {
  patchSsaoCombine();

  const gbuffer = scene.enableGeometryBufferRenderer(tier.ssaoRatio);

  if (gbuffer) {
    const target = gbuffer.getGBuffer();

    target.renderListPredicate = occludes;
    depthWriteAlphaKeyed(target);
  }

  const ssao = new SSAO2RenderingPipeline(
    'enhancedSsao',
    scene,
    { ssaoRatio: tier.ssaoRatio, blurRatio: tier.ssaoRatio },
    [camera],
    true
  );

  const [radius, strength, base] = ssaoOverride() ?? [
    SSAO_RADIUS,
    SSAO_STRENGTH,
    SSAO_BASE,
  ];
  ssao.radius = radius;
  ssao.totalStrength = strength;
  ssao.base = base;
  ssao.samples = tier.ssaoSamples;
  ssao.expensiveBlur = tier.ssaoRatio >= 1;
  ssao.maxZ = SSAO_MAX_Z;
  ssao.minZAspect = SSAO_MIN_Z_ASPECT;
  ssao.textureSamples = pipelineSamples();

  bindEffectMask(ssao, mask);

  return ssao;
}

export function disposeAmbientOcclusion(): void {
  if (!runtime) return;

  const { scene, ssao, mask } = runtime;

  ssao.dispose(true);

  const index = scene.customRenderTargets.indexOf(mask);
  if (index >= 0) scene.customRenderTargets.splice(index, 1);
  mask.dispose();

  scene.disableGeometryBufferRenderer();

  runtime = null;
}

/**
 * Build or tear down the AO to match the tier and the post option. Returns
 * true when the chain changed, so the director can re-order the post chain.
 */
export function syncAmbientOcclusion(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier | null,
  post: boolean
): boolean {
  const want = tier !== null && post;

  if (runtime && (!want || runtime.tier !== tier || runtime.scene !== scene)) {
    disposeAmbientOcclusion();
    if (!want) return true;
  }

  if (!want || runtime) return false;

  const mask = createEffectMask(scene, camera);
  const ssao = createSsao(scene, camera, tier, mask);

  runtime = { scene, camera, tier, ssao, mask };

  return true;
}
