import {
  Color4,
  Constants,
  GeometryBufferRenderer,
  Material,
  PostProcess,
  RenderTargetTexture,
  SSAO2RenderingPipeline,
  ShaderStore,
  SmartArray,
  Texture,
  Vector3,
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
import { devQuery, devQueryNumbers } from '../common/devSeams';
import { drawsSolidGeometry } from './shadows';
import { driveRenderList } from './renderList';

/**
 * Contact-scale SSAO2 and the effect mask (ARCHITECTURE §4.1, §4.8 step 1).
 * Sole owner of the SSAO pipeline, the geometry buffer's predicate and the
 * effect-mask render target; `heightFog.ts` reads the mask.
 *
 * Contact-scale, not ambient-scale: the baked lightmap already carries the
 * near-wall darkening (that darkening is the art) and the CSM the sun, so the
 * AO reads as contact tightening, never as a halo at gameplay zoom.
 *
 * Dev seams: `?ssao=radius,strength,base` for live tuning; `?ssao=0` builds
 * none of it (G-buffer and effect mask included).
 */
const SSAO_RADIUS = 0.35;
const SSAO_STRENGTH = 0.75;
const SSAO_BASE = 0.15;
const SSAO_MAX_Z = 45;
const SSAO_MIN_Z_ASPECT = 0.25;

function ssaoOverride(): [number, number, number] | null {
  return devQueryNumbers('ssao', 3) as [number, number, number] | null;
}

function ssaoForcedOff(): boolean {
  return devQuery('ssao') === '0';
}

/**
 * The effect mask: where the additive half of the frame landed, and how much
 * of each pixel it is.
 *
 * The AO combine and the haze both describe a pixel by the *surface* under
 * it, read from the geometry buffer, which holds only matter. Over every
 * additive thing in the game (the `_R` meshes and `BlendMesh` flames, the
 * flare sprites, fire and smoke particles, item auras, skill effects) the
 * buffer describes whatever stands behind the flame, and both passes would
 * apply it anyway. Nothing this early in the chain is HDR (SSAO2 builds its
 * passes at 8 bits), so a brightness knee cannot find them; the mask draws
 * them instead: one target holding only the additive geometry over black,
 * composited with its own blend modes.
 *
 * Both readers *subtract* it rather than threshold it. An additive pass adds
 * to the surface under it, so `surface = colour - mask` is that surface, and
 * each half then takes its own treatment: the flame keeps its own haze
 * distance and is never occluded, the water behind it keeps the haze and the
 * AO it earned. A threshold cannot do that - it hands the whole pixel to
 * whichever side won - and the sprite sheets are JPEG, so the "black" around
 * a flame carries 1-12/255 of ringing and cleared any knee low enough to
 * catch a rain streak. That is what stamped a flame's quad into the frame as
 * an un-hazed dark rectangle.
 *
 * Hence full resolution and half float. At half resolution a one-pixel rain
 * streak lands at a tenth of its brightness, and a subtraction would leave
 * the other nine tenths to be hazed as far water; at 8 bits a flame brighter
 * than white clamps to 1.0 and the surface left under it comes out too
 * bright. Neither costs anything measurable: the pass is bound by the scene
 * traversal it does, not by the pixels it fills, and its render list is a
 * handful of cards, sprites and particles.
 */

/** Mask resolution relative to the backbuffer. */
const EFFECT_MASK_RATIO = 1;

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

  // A map object's alpha-keyed cards (Noria's canopies, grass, every fence
  // and bar) are the bulk of the G-buffer's cost and occlude nothing worth
  // the pass; the haze reads the depth behind them (§4.8 step 1). A figure's
  // keyed trim stays in: it is the body's own silhouette.
  if (
    meta.mapObject === true &&
    mesh.material?.transparencyMode === Material.MATERIAL_ALPHATESTANDBLEND
  ) {
    return false;
  }

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
 * frame, glow cards included; the effect mask is subtracted out of it first
 * and added back unoccluded, because a pixel that is itself a light source
 * has nothing to occlude.
 *
 * The ground keeps a floor (§4.8 step 1): the lightmap already carries the
 * near-wall darkening, so on an up-facing surface the AO is contact
 * tightening only. "Ground" is read off the G-buffer normal (view space, so
 * it is compared against the camera's up).
 */
const SSAO_COMBINE_SHADER = 'ssaoCombinePixelShader';

const GROUND_AO_FLOOR = 0.8;
const GROUND_NORMAL_SAMPLER = 'gbufferNormal';
const GROUND_UP_UNIFORM = 'upView';

let ssaoCombinePatched = false;

function patchSsaoCombine(): void {
  if (ssaoCombinePatched) return;

  ssaoCombinePatched = true;

  ShaderStore.ShadersStore[SSAO_COMBINE_SHADER] = `
  uniform sampler2D textureSampler;
  uniform sampler2D originalColor;
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform sampler2D ${GROUND_NORMAL_SAMPLER};
  uniform vec4 viewport;
  uniform vec3 ${GROUND_UP_UNIFORM};
  varying vec2 vUV;

  const float GROUND_AO_FLOOR = ${GROUND_AO_FLOOR.toFixed(3)};

  void main(void) {
    vec2 uv = viewport.xy + vUV * viewport.zw;

    vec4 ssaoColor = texture2D(textureSampler, uv);
    vec4 sceneColor = texture2D(originalColor, uv);

    // The mask is rendered through the same camera viewport as the passes
    // above it, so it takes the same remapped uv rather than raw vUV.
    vec3 effect = min(texture2D(${EFFECT_MASK_SAMPLER}, uv).rgb,
      max(sceneColor.rgb, vec3(0.0)));
    vec3 surface = sceneColor.rgb - effect;

    vec3 normalV = texture2D(${GROUND_NORMAL_SAMPLER}, uv).xyz;
    float ground = smoothstep(0.7, 0.9, dot(normalV, ${GROUND_UP_UNIFORM}));

    vec3 ao = max(ssaoColor.rgb, vec3(ground * GROUND_AO_FLOOR));

    gl_FragColor = vec4(surface * ao + effect, sceneColor.a * ssaoColor.a);
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
      // Both readers subtract it from an HDR frame; 8 bits would clamp a
      // flame brighter than white and leave a surface that is too bright.
      type: Constants.TEXTURETYPE_HALF_FLOAT,
    }
  );

  mask.clearColor = new Color4(0, 0, 0, 1);
  mask.activeCamera = camera;
  driveRenderList(scene, mask, emits);
  mask.renderParticles = true;
  mask.renderSprites = true;
  mask.wrapU = Texture.CLAMP_ADDRESSMODE;
  mask.wrapV = Texture.CLAMP_ADDRESSMODE;

  scene.customRenderTargets.push(mask);

  return mask;
}

/**
 * Hand Babylon's combine pass the samplers and the uniform its patched shader
 * declares. An `Effect` binds by the names it was *compiled* with, so the
 * post-process is recompiled with the extra names; `onApplyObservable`
 * because the pipeline has already spent `onApply` on `viewport` and
 * `originalColor`.
 */
function bindCombine(
  ssao: SSAO2RenderingPipeline,
  camera: ArcRotateCamera,
  mask: RenderTargetTexture,
  normals: Texture | null
): void {
  const combine = (
    ssao as unknown as { _ssaoCombinePostProcess: PostProcess | null }
  )._ssaoCombinePostProcess;

  if (!combine) return;

  combine.updateEffect(
    null,
    ['viewport', GROUND_UP_UNIFORM],
    ['textureSampler', 'originalColor', EFFECT_MASK_SAMPLER, GROUND_NORMAL_SAMPLER]
  );

  const upView = new Vector3();

  combine.onApplyObservable.add(effect => {
    effect.setTexture(EFFECT_MASK_SAMPLER, mask);
    if (normals) effect.setTexture(GROUND_NORMAL_SAMPLER, normals);

    Vector3.TransformNormalToRef(Vector3.UpReadOnly, camera.getViewMatrix(), upView);
    effect.setFloat3(GROUND_UP_UNIFORM, upView.x, upView.y, upView.z);
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
  let normals: Texture | null = null;

  if (gbuffer) {
    const target = gbuffer.getGBuffer();

    driveRenderList(scene, target, occludes);
    depthWriteAlphaKeyed(target);
    normals = target.textures[
      gbuffer.getTextureIndex(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)
    ] ?? null;
  }

  const ssao = new SSAO2RenderingPipeline(
    'enhancedSsao',
    scene,
    { ssaoRatio: tier.ssaoRatio, blurRatio: tier.ssaoRatio },
    [camera],
    true,
    // The combine pass carries the scene colour on: 8-bit here quantises
    // every linear value under display 0.05 to a hard zero.
    Constants.TEXTURETYPE_HALF_FLOAT
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

  bindCombine(ssao, camera, mask, normals);

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
  const want = tier !== null && post && !ssaoForcedOff();

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
