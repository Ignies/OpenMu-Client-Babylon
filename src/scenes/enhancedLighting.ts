import {
  CascadedShadowGenerator,
  Color4,
  GeometryBufferRenderer,
  Material,
  PostProcess,
  RenderTargetTexture,
  SSAO2RenderingPipeline,
  ShaderStore,
  ShadowGenerator,
  SmartArray,
  Texture,
  type AbstractMesh,
  type ArcRotateCamera,
  type DirectionalLight,
  type Effect,
  type MultiRenderTarget,
  type Scene,
  type ShaderMaterial,
  type SubMesh,
} from '../libs/babylon/exports';
// Side-effect import, and the order is the whole point: this module's body is
// `ShaderStore.ShadersStore['ssaoCombinePixelShader'] = <Babylon's version>`.
// ESM evaluates it before this file's body, so the override below lands last;
// `SSAO2RenderingPipeline` then `import()`s the same specifier, gets the
// cached module, and does *not* re-run the registration over the top of ours.
// Overriding without pulling it in first loses the race the first time an
// SSAO pipeline is built in a session. See `patchSsaoCombine`.
import '@babylonjs/core/Shaders/ssaoCombine.fragment.js';
import { GameOptions } from '../common/gameOptions';
import { linearBufferActive } from '../common/lightModel';
import { skyLightOf, sunLightOf } from '../lighting/keyRig';
import {
  blobShadowRefresh,
  csmState,
  lightingTier,
  pipelineSamples,
  type LightingTier,
} from '../common/lightingQuality';

/**
 * Enhanced lighting: a cascaded shadow map on the sun, SSAO2 and an
 * exponential height fog, all behind `GameOptions.lightingQuality`.
 *
 * Governing rule: dynamic light only adds — the baked lightmap is the art
 * direction. Object materials are Standard-derived, so the CSM attenuates the
 * sun's lambert term only (the bake rides in the vertex colour, the torches
 * in the point lights). The terrain shader is hand-written; it samples the
 * cascades itself (`terrainCsmGlsl`) and clamps the bake darkening to
 * `TERRAIN_BAKE_SHADOW_FLOOR`.
 */

export const CSM_MAX_CASCADES = 3;

/**
 * How far from the camera the cascades reach, in tiles. The camera sits
 * ~10 tiles from the hero looking down, so the visible ground ends well
 * inside this; a low lambda keeps the first cascade (the one under the hero)
 * wide enough to hold the whole play area at full resolution.
 */
const CSM_MAX_Z = 32;

const CSM_LAMBDA = 0.1;

/**
 * Hardware PCF (depth compare sampler) is the path for real GPUs. Software
 * renderers (SwiftShader in the headless harness) return nothing from
 * `sampler2DArrayShadow`; `FILTER_NONE` keeps a float depth map and the
 * terrain does its own 3×3 compare instead — same look, slower. Babylon's
 * object receivers then take hard (unfiltered) shadows.
 */
const CSM_FILTER: number = ShadowGenerator.FILTER_PCF;
const CSM_BIAS = 0.004;
const CSM_NORMAL_BIAS = 0.03;
const CSM_BLEND = 0.08;

/**
 * One shadow-depth rule for every receiver (lighting_rework.md §5.2):
 * whatever a shadow cuts, it leaves 35 % of it. The terrain floor below is
 * the anchor (that darkening is the art); this applies the same rule to the
 * sun share the CSM cuts on objects, and `SHADOW_ALPHA` (objectShadow.ts)
 * derives the blobs from it. The old 0.1 was a third, darker answer in the
 * same frame — and one of the stacked darkenings behind the wall halos.
 */
const CSM_OBJECT_DARKNESS = 0.35;

/**
 * Terrain: the bake never drops below this fraction of its authored value
 * under a sun shadow. The anchor of the shadow-depth rule above.
 */
const TERRAIN_BAKE_SHADOW_FLOOR = 0.35;

/**
 * The sun share of the key budget the 0.35 floors were tuned at (sceneLook's
 * SHAPED_SUN_SHARE). Object shadows fade with the sun automatically — the
 * CSM only cuts the sun's own lambert term — but the terrain fakes its sun
 * shadow by darkening the bake, so its cut must follow the live sun share
 * too: full depth at noon, gone when the cycle takes the sun away. Without
 * this, night shadows stay pitch black on the ground while every object's
 * shadow has already faded — the tiers disagree in one frame.
 */
const NOON_SUN_SHARE = 0.45;

/**
 * Contact-scale AO, not ambient-scale (lighting_rework.md §5.1). The old
 * 0.9-tile radius at half resolution was a soft-blob generator, and it landed
 * on top of the baked lightmap's own near-wall darkening (that darkening *is*
 * the art) and the CSM — three darkenings of the same crease made the halos
 * that hug walls and objects. AO should read as contact tightening, never as
 * a visible halo at gameplay zoom.
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
 * The effect mask: where the additive half of the frame actually landed.
 *
 * The AO combine and the height fog both describe a pixel by the *surface*
 * under it — how enclosed it is, how far away it is — and both read that from
 * the geometry buffer. The geometry buffer holds only matter: `occludes`
 * rejects `brightMesh`, the glow cards do not write depth at all, and sprites
 * and particles were never candidates. So over every additive thing in the
 * game — the `_R` meshes and `BlendMesh` flames (blendMeshes.ts), the flare
 * sprites (effectLights.ts), fire and smoke particles, item auras, skill
 * effects — the buffer describes *whatever stands behind the flame*, and both
 * passes apply it anyway:
 *
 *  - the AO stamps the wall crease or the bridge deck's contact shadow across
 *    the fire as dark blotches that swim as the camera moves;
 *  - the fog mixes the flame toward fog colour by the *background's* distance,
 *    which is why a torch over Lorencia's far water comes out pale salmon
 *    while the same torch against a near wall does not.
 *
 * A brightness knee was tried here first and is the wrong instrument, for a
 * reason worth recording: **nothing this early in the chain is HDR.** SSAO2
 * builds its passes at `TEXTURETYPE_UNSIGNED_BYTE` (its `textureType`
 * argument defaults to 0) and the fog is a plain `PostProcess` given no type
 * argument either, so the frame is resolved to 8 bits *before* either of them
 * runs and every value they can read is already clamped to 1.0 — the tone
 * mapper is further down the chain, in `sceneLook`. A knee pitched above 1.0
 * therefore never fires at all. Worse, once flattened there is no threshold
 * left to pitch: on the Lorencia bridge a fogged flame peaks at ~0.78 and the
 * sunlit sand beside it at ~0.75.
 *
 * So instead of inferring the answer, draw it. One low-resolution target holds
 * only the additive geometry — meshes tagged `brightMesh`, plus sprites and
 * particles — composited over black with its own blend modes. What comes out
 * *is* those passes' contribution to the frame, at the same pixels, and the AO
 * and the fog back off in proportion to it. No threshold, no assumption about
 * the colour space, and it costs one extra pass over a handful of cards.
 *
 * `FOG_BLACK_KNEE` stays. It is the other end of the same problem — a *dark*
 * blend mesh, a tree or a bush, carrying the background's fog — and the mask
 * does not cover it, because those meshes are not `brightMesh`.
 */
const EFFECT_MASK_LO = 0.02;
const EFFECT_MASK_HI = 0.25;

/** Mask resolution relative to the backbuffer. */
const EFFECT_MASK_RATIO = 0.5;

/** Mask value at which the fog treats a pixel as fully an effect (see the fog shader). */
const FOG_MASK_HI = 0.05;

/**
 * The distance an effect pixel is fogged as if it were at, in tiles, when the
 * depth behind it says further. The camera orbits ~10 tiles out, so this is
 * roughly "standing where the player is". See the note in the fog shader.
 */
const EFFECT_FOG_DISTANCE = 12;

const EFFECT_MASK_SAMPLER = 'effectMask';

const FOG_SHADER = 'muHeightFog';

export type FogSettings = {
  readonly color: readonly [number, number, number];
  /** Fog density at the base height; 0 disables the pass. */
  readonly density: number;
  /** Height falloff — how fast the fog thins going up (per tile). */
  readonly falloff: number;
  /** Base height relative to the camera target's height (tiles). */
  readonly base: number;
  /** Ceiling on the fog opacity; MU has no sky, so the ground must survive. */
  readonly maxOpacity: number;
};

export const NO_FOG: FogSettings = {
  color: [0, 0, 0],
  density: 0,
  falloff: 1,
  base: 0,
  maxOpacity: 0,
};

const fogShown = {
  color: [0, 0, 0] as [number, number, number],
  density: 0,
  falloff: 1,
  base: 0,
  maxOpacity: 0,
  /** The mood's regraded exposure, divided out of the colour at bind. */
  exposure: 1,
};

/**
 * The fog colour on screen right now — the nearest thing the frame has to a
 * sky colour, for a surface that reflects the sky (standing water in the
 * terrain shader). Black when there is no fog; callers fall back.
 */
export function shownFogColor(): readonly [number, number, number] {
  return fogShown.density > 0 ? fogShown.color : NO_FOG.color;
}

const FOG_BASE_EASE = 2.5;

let fogBaseY = 0;
let fogBaseSeeded = false;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  tier: LightingTier;
  csm: CascadedShadowGenerator | null;
  /** `GameOptions.shadows` as of the last sync — see `syncCsm`. */
  shadows: boolean;
  ssao: SSAO2RenderingPipeline | null;
  fog: PostProcess | null;
  /** The additive half of the frame; see `EFFECT_MASK_LO`. */
  mask: RenderTargetTexture | null;
  postOn: boolean;
};

let runtime: Runtime | null = null;

// --- terrain hook ----------------------------------------------------------

export const TERRAIN_CSM_UNIFORMS = [
  'csmParams',
  'csmLightMatrices',
  'csmFrustumZ',
  'csmMapSize',
] as const;

const terrainMaterials = new Set<ShaderMaterial>();

/**
 * The terrain shader is compiled per lighting state: no shadow sampler at
 * all while Classic, one of the two otherwise. Every declared sampler must
 * be bound — an unset one defaults to unit 0, which another sampler of a
 * different type already uses, and that is a GL draw error (the terrain
 * renders flat). Switching the define recompiles the material.
 */
export function terrainCsmDefines(): string[] {
  const defines = [`#define CSM_MAX_CASCADES ${CSM_MAX_CASCADES}`];

  const csm = runtime?.csm;

  if (csm) {
    defines.push(
      csm.filter === ShadowGenerator.FILTER_PCF
        ? '#define CSM_PCF'
        : '#define CSM_FLOAT'
    );
  }

  return defines;
}

export function registerTerrainMaterial(material: ShaderMaterial): void {
  terrainMaterials.add(material);
  material.onDisposeObservable.addOnce(() => terrainMaterials.delete(material));
}

function recompileTerrainMaterials(): void {
  const defines = terrainCsmDefines();

  for (const material of terrainMaterials) {
    material.options.defines = [...defines];
    material.markDirty(true);
  }
}

/**
 * GLSL for the terrain fragment: a PCF 3×3 lookup into the sun's cascades,
 * mirroring Babylon's `computeShadowWithCSMPCF3`; see `terrainCsmDefines`
 * for the variants.
 */
export function terrainCsmGlsl(): string {
  return `
  uniform vec4 csmParams; // x: enabled, y: bake floor, z: cascades, w: darkness

#if defined(CSM_PCF) || defined(CSM_FLOAT)
  uniform mat4 csmLightMatrices[CSM_MAX_CASCADES];
  uniform float csmFrustumZ[CSM_MAX_CASCADES];
  uniform vec2 csmMapSize; // size, 1/size
#ifdef CSM_PCF
  uniform highp sampler2DArrayShadow csmShadowMap;
#else
  uniform highp sampler2DArray csmShadowMapF;
#endif

  float csmShadow(vec3 worldPos, float viewZ) {
    if (csmParams.x < 0.5) return 1.0;

    int cascade = -1;
    for (int i = 0; i < CSM_MAX_CASCADES; i++) {
      if (i >= int(csmParams.z)) break;
      if (csmFrustumZ[i] - viewZ >= 0.0) { cascade = i; break; }
    }
    if (cascade < 0) return 1.0;

    vec4 fromLight = csmLightMatrices[cascade] * vec4(worldPos, 1.0);
    vec3 clipSpace = fromLight.xyz / fromLight.w;
    vec3 uvDepth = vec3(0.5 * clipSpace + vec3(0.5));
    if (uvDepth.x < 0.0 || uvDepth.x > 1.0 || uvDepth.y < 0.0 || uvDepth.y > 1.0) return 1.0;
    uvDepth.z = clamp(uvDepth.z, 0.0, 0.99999994);

    vec2 uv = uvDepth.xy * csmMapSize.x + 0.5;
    vec2 st = fract(uv);
    vec2 baseUv = (floor(uv) - 0.5) * csmMapSize.y;
    vec2 uvw0 = 3.0 - 2.0 * st;
    vec2 uvw1 = 1.0 + 2.0 * st;
    vec2 u = vec2((2.0 - st.x) / uvw0.x - 1.0, st.x / uvw1.x + 1.0) * csmMapSize.y;
    vec2 v = vec2((2.0 - st.y) / uvw0.y - 1.0, st.y / uvw1.y + 1.0) * csmMapSize.y;
    float layer = float(cascade);
    float shadow = 0.0;

#ifdef CSM_FLOAT
    // Float map: manual 3×3 compare (see CSM_FILTER).
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y)) * csmMapSize.y;
        float d = texture2D(csmShadowMapF, vec3(uvDepth.xy + o, layer)).r;
        shadow += uvDepth.z <= d ? 1.0 : 0.0;
      }
    }
    shadow /= 9.0;
#else
    shadow += uvw0.x * uvw0.y * texture2D(csmShadowMap, vec4(baseUv + vec2(u[0], v[0]), layer, uvDepth.z));
    shadow += uvw1.x * uvw0.y * texture2D(csmShadowMap, vec4(baseUv + vec2(u[1], v[0]), layer, uvDepth.z));
    shadow += uvw0.x * uvw1.y * texture2D(csmShadowMap, vec4(baseUv + vec2(u[0], v[1]), layer, uvDepth.z));
    shadow += uvw1.x * uvw1.y * texture2D(csmShadowMap, vec4(baseUv + vec2(u[1], v[1]), layer, uvDepth.z));
    shadow /= 16.0;
#endif

    // Soft edge at the last cascade's far end instead of a hard cut.
    float edge = smoothstep(0.8, 1.0, clamp(dot(clipSpace.xy, clipSpace.xy), 0.0, 1.0));
    return mix(mix(csmParams.w, 1.0, shadow), 1.0, edge);
  }
#else
  float csmShadow(vec3 worldPos, float viewZ) { return 1.0; }
#endif
  `;
}

const lightMatrices = new Float32Array(CSM_MAX_CASCADES * 16);
const frustumZ = new Array<number>(CSM_MAX_CASCADES).fill(0);

/** Per-bind terrain uniforms; cheap no-op while Classic. */
export function bindTerrainCsm(effect: Effect): void {
  const csm = runtime?.csm;
  const map = csm?.getShadowMap();

  // Only the variant compiled for the live state carries the samplers; a
  // stale effect (recompile pending) must not bind what it does not declare.
  if (!csm || !map || !effect.defines.includes('CSM_')) {
    effect.setFloat4('csmParams', 0, 1, 0, 1);
    return;
  }

  const count = csm.numCascades;

  for (let i = 0; i < count; i++) {
    csm.getCascadeTransformMatrix(i)?.copyToArray(lightMatrices, i * 16);
  }

  // Babylon keeps the per-cascade far planes private; they are exactly what
  // `lightFragment` compares the view depth against.
  const zs = (csm as unknown as { _viewSpaceFrustumsZ: number[] })
    ._viewSpaceFrustumsZ;

  for (let i = 0; i < CSM_MAX_CASCADES; i++) {
    frustumZ[i] = i < count ? zs[i] : 0;
  }

  const size = map.getSize().width;

  const pcf = csm.filter === ShadowGenerator.FILTER_PCF;

  // Terrain shadow depth follows the live sun share (see NOON_SUN_SHARE).
  const sun = csm.getLight();
  const sky = skyLightOf(sun.getScene());
  let sunFactor = 1;
  if (sky) {
    const total = sun.intensity + sky.intensity;
    sunFactor =
      total > 0 ? Math.min(1, sun.intensity / total / NOON_SUN_SHARE) : 0;
  }

  effect.setFloat4(
    'csmParams',
    pcf ? 1 : 2,
    1 - (1 - TERRAIN_BAKE_SHADOW_FLOOR) * sunFactor,
    count,
    CSM_OBJECT_DARKNESS
  );
  effect.setMatrices('csmLightMatrices', lightMatrices);
  effect.setArray('csmFrustumZ', frustumZ);
  effect.setFloat2('csmMapSize', size, 1 / size);

  if (pcf) effect.setDepthStencilTexture('csmShadowMap', map);
  else effect.setTexture('csmShadowMapF', map);
}

// --- casters ---------------------------------------------------------------

/**
 * Slack (tiles) past `CSM_MAX_Z` before a mesh is ruled out as a caster. The
 * cascades are fitted to the camera frustum out to CSM_MAX_Z, so nothing
 * further than that from the camera can land in any of them — but a caster
 * *behind* the camera still shadows what is in front of it, so the test is on
 * plain distance, not on the view frustum, and it keeps a wide margin.
 */
const CSM_CASTER_SLACK = 16;

const CSM_CASTER_RANGE_SQ = (CSM_MAX_Z + CSM_CASTER_SLACK) ** 2;

function castsSunShadow(mesh: AbstractMesh): boolean {
  const meta = mesh.metadata;

  if (!meta || meta.csmCaster !== true) return false;

  // The blend mesh is an additive glow card — light, not matter — with one
  // exception: the objects that say the card *is* their body. That is wings
  // (`ModelObject.ShadowBlendMeshCasts`), where the membrane is the whole of
  // what the wing is, and a wing that casts nothing is the thing that reads
  // as broken. It is a caster only — `occludes` still keeps it out of the
  // G-buffer, where a glow card is not a surface.
  const blendCaster = meta.shadowBlendCaster === true;

  if (meta.brightMesh && !blendCaster) return false;

  return drawsSolidGeometry(mesh, blendCaster);
}

/**
 * A mesh that is drawn as matter rather than as light, and is near enough to
 * be worth a pass over. Shared by the cascades and the G-buffer: both want
 * "surfaces that are really there", and both are re-run over every mesh in
 * the scene on every refresh (`RenderTargetTexture.render`), so the distance
 * test comes first as the cheapest filter available.
 */
function drawsSolidGeometry(mesh: AbstractMesh, allowBlend = false): boolean {
  if (!mesh.isEnabled() || !mesh.isVisible) return false;

  const camera = mesh.getScene().activeCamera;

  if (camera) {
    const centre = mesh.getBoundingInfo().boundingSphere.centerWorld;
    const dx = centre.x - camera.globalPosition.x;
    const dy = centre.y - camera.globalPosition.y;
    const dz = centre.z - camera.globalPosition.z;

    if (dx * dx + dy * dy + dz * dz > CSM_CASTER_RANGE_SQ) return false;
  }

  const material = mesh.material;
  if (!material) return false;

  // Pure blend meshes (effects) are light, not matter; MU's alpha-keyed
  // meshes are ALPHATESTANDBLEND and go through the alpha test (in the
  // cascades that is what `transparencyShadow` buys). `allowBlend` is the
  // wing-membrane exception, and only `castsSunShadow` passes it.
  return (
    allowBlend || material.transparencyMode !== Material.MATERIAL_ALPHABLEND
  );
}

/**
 * What SSAO and the fog see.
 *
 * This has to be *everything the camera sees that is matter*, and the reason
 * is the fog rather than the AO. The fog reads one number per pixel — this
 * buffer's depth — and its thickness is exponential in that number, so a
 * pixel that is missing here does not merely lose a little haze: it inherits
 * the depth of whatever stands behind it and is fogged for that distance
 * instead. At Lorencia's density a surface 12 tiles out wants ~3% fog and the
 * ground 25 tiles behind it wants the full `maxOpacity`. Getting the second
 * number on the first surface is the "Enhanced makes objects transparent"
 * report: straw bales, carts and steel railings washed to fog colour while
 * the plain-JPEG wall beside them stayed solid.
 *
 * Two rules were doing that, and neither was about occlusion:
 *
 *  - the alpha-keyed meshes were dropped wholesale. `modelLoader` promotes
 *    every TGA-textured mesh to ALPHATESTANDBLEND, which is 52 of Lorencia's
 *    237 object materials — mostly solid wood and iron with a keyed edge, not
 *    cards. They are in now, and `useMeshAlphaTestTexture` is what makes that
 *    safe: the G-buffer alpha-tests against the mesh's own texture, so grass
 *    and leaves cut their silhouette instead of writing the solid quads that
 *    smeared AO across the ground and got them excluded in the first place.
 *  - the whitelist was `csmCaster`, which answers a different question. An
 *    object the map marks `CastsShadow = false`, and every torch, candle and
 *    lamp (`Lights.emitsLight`), casts no sun shadow and is still solid
 *    geometry standing in front of the camera.
 */
function occludes(mesh: AbstractMesh): boolean {
  const meta = mesh.metadata;

  if (!meta) return false;
  if (meta.terrain === true) return true;

  // Not `csmCaster`: see above. `depthOccluder` is on every mesh a model
  // draws; the flattened shadow clones replace their metadata wholesale and
  // so never carry it, which is what keeps them out of the depth they would
  // otherwise poison.
  if (meta.depthOccluder !== true || meta.brightMesh) return false;

  return drawsSolidGeometry(mesh);
}

/** Frozen materials skip the light-dirty pass; force the rebuild once. */
function rebuildFrozenMaterials(scene: Scene): void {
  for (const material of scene.materials) {
    if (material.isFrozen) material.markDirty(true);
  }
}

// --- setup -----------------------------------------------------------------

function createCsm(
  scene: Scene,
  sun: DirectionalLight,
  tier: LightingTier
): CascadedShadowGenerator {
  const csm = new CascadedShadowGenerator(tier.shadowMapSize, sun, true);

  csm.numCascades = tier.cascades;
  csm.lambda = CSM_LAMBDA;
  csm.shadowMaxZ = CSM_MAX_Z;
  csm.stabilizeCascades = true;
  csm.depthClamp = true;
  csm.filter = CSM_FILTER;
  csm.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  csm.bias = CSM_BIAS;
  csm.normalBias = CSM_NORMAL_BIAS;
  csm.cascadeBlendPercentage = CSM_BLEND;
  csm.darkness = CSM_OBJECT_DARKNESS;
  csm.frustumEdgeFalloff = 0.2;

  // Without this Babylon drops every *transparent* submesh from the shadow
  // map (`_renderForShadowMap`: the transparent bucket is skipped unless
  // `transparencyShadow`), and `modelLoader` promotes every TGA-textured mesh
  // to ALPHATESTANDBLEND — which `needAlphaBlendingForMesh` calls transparent.
  // That is most of what a character wears: wings, robes, a weapon's keyed
  // parts, armour trim. They were in the render list (`castsSunShadow` lets
  // ALPHATESTANDBLEND through on purpose) and then thrown away one step later,
  // so a winged character cast the same shadow as a bare one.
  //
  // They land in the alpha-tested depth pass, keyed by their own texture (the
  // per-mesh `diffuseSampler` bind below) — `enableSoftTransparentShadow`
  // stays off, so nothing is dithered by alpha; the key alone cuts the shape.
  csm.transparencyShadow = true;

  const map = csm.getShadowMap();

  if (map) {
    map.renderListPredicate = castsSunShadow;
    map.refreshRate = 1;
  }

  // The object materials are shared and carry a placeholder diffuse; the
  // real texture is per mesh (`metadata.diffuseTexture`, see itemMaterial).
  // The depth pass alpha-tests against `diffuseSampler`, so bind it here.
  let current: AbstractMesh | null = null;

  csm.onBeforeShadowMapRenderMeshObservable.add(mesh => {
    current = mesh;
  });

  csm.onBeforeShadowMapRenderObservable.add(effect => {
    const texture = current?.metadata?.diffuseTexture;

    if (texture) effect.setTexture('diffuseSampler', texture);
  });

  return csm;
}

/** Stand-in for a bucket a pass is not meant to draw this time round. */
const NO_SUBMESHES = new SmartArray<SubMesh>(0);

/**
 * Draw the G-buffer's alpha-keyed meshes with depth writes on.
 *
 * `occludes` now lets them in, but Babylon files anything whose material
 * needs alpha blending — which ALPHATESTANDBLEND does — into the *transparent*
 * bucket, and the geometry buffer draws that bucket last with
 * `setDepthWrite(false)`. Worse, `RenderingGroup.render` hands a custom render
 * function its buckets **unsorted** (only `_renderTransparentSorted` sorts,
 * and the custom path returns before it), so with no depth writes the last
 * keyed mesh dispatched wins every pixel it covers, whatever its distance. A
 * railing behind a cart would hand the cart the railing's depth and the fog
 * would go straight back to washing it out.
 *
 * So they are drawn a second time round through the *opaque* slot, where depth
 * writes are still on and the depth test resolves them against each other. The
 * pass is the same `renderSubMesh` either way — the G-buffer writes depth as a
 * colour attachment and never blends — so "opaque" here only means "sorted by
 * the depth buffer", which is exactly what is wanted.
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
 * Ambient occlusion must not be painted over the things that emit light.
 *
 * Babylon's combine pass is one line — `sceneColor * ssaoColor` — run over the
 * *finished* frame. By then the colour buffer holds every additive glow card
 * in the game on top of the opaque pass: the `_R` meshes and `BlendMesh`
 * flames (blendMeshes.ts), the flare sprites (effectLights.ts), the fire and
 * smoke particles, item auras, skill effects. None of them are in the
 * G-buffer — `occludes` rejects `brightMesh`, sprites and particles were never
 * candidates, and the glow cards do not write depth at all — so the AO under
 * such a pixel was computed from whatever solid stands *behind* the flame.
 *
 * Multiply that in and the wall's corner darkening, the bridge deck's contact
 * shadow, the crease behind a candelabra get stamped across the fire as dark
 * blotches that swim over it as the camera moves. That is the "fire looks like
 * it has a filter with dark spots on it" report, and it is worst on Ultra,
 * where the AO runs at full resolution with 16 samples and an expensive blur
 * and so has the sharpest, highest-contrast blotches to donate.
 *
 * Occlusion describes how much ambient light *reaches* a surface, and a pixel
 * that is itself a light source has nothing to occlude — so wherever the
 * effect mask says an additive pass landed, the AO is faded out. See
 * `EFFECT_MASK_LO` for why that mask is drawn rather than inferred.
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

/** The additive half of the frame — everything the G-buffer refuses. */
function emits(mesh: AbstractMesh): boolean {
  return mesh.metadata?.brightMesh === true;
}

/**
 * The mask itself: the effect geometry, in its own blend modes, over black.
 *
 * No depth buffer, deliberately. Additive compositing is order-independent, so
 * there is nothing to sort, and the cost is that a flame hidden behind a wall
 * in the real frame still marks the wall here — a little AO and fog lost on
 * the few pixels of wall in front of a fire, in proportion to how bright the
 * fire is. That is cheaper than keeping a second depth attachment in step
 * with the G-buffer's.
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
 * Hand Babylon's combine pass the sampler its patched shader now declares.
 *
 * An `Effect` binds textures by the names it was *compiled* with — a sampler
 * the list does not mention has no uniform location, and `setTexture` on it is
 * a silent no-op. The pipeline builds this post-process with a fixed list, so
 * the effect has to be recompiled with the extra name; `textureSampler` is
 * repeated because the replacement list is used verbatim.
 *
 * `onApplyObservable` rather than `onApply`: the setter behind `onApply`
 * registers a single observer, and the pipeline has already spent it binding
 * `viewport` and `originalColor`.
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

/**
 * Why the void is not fogged, and why the two guards below are load-bearing.
 *
 * This post-process has one input that describes the scene: the geometry
 * buffer's depth. That buffer is built from the opaque pass, so it holds **no
 * blend or alpha-tested mesh** — no tree, no bush, no waterfall, no effect
 * quad, no water plane. Those are all drawn into the colour buffer and are
 * invisible to the depth one, which means a bush's pixel carries the depth of
 * whatever stands *behind* the bush.
 *
 * That has one benign case and one fatal one:
 *
 *   - Something opaque behind it. The pixel gets that surface's fog, which is
 *     close enough, and `FOG_BLACK_KNEE` trims the rest.
 *   - Nothing behind it — the bush stands against the sky, or the map edge.
 *     Depth is 0. There is no distance to fog by, and no way from inside this
 *     shader to tell "empty sky" from "a bush against empty sky".
 *
 * So an empty pixel returns unfogged. The cost is real and is recorded in todo
 * 3.3: an outdoor map ends in a hard silhouette against the clear colour
 * instead of fading into haze.
 *
 * Fogging it anyway — treating depth 0 as a ray to a horizon distance — was
 * tried, and it is the reason this note exists. Every alpha card standing
 * against the sky was fogged to maximum thickness, with the black knee
 * switched off (the void is black by definition, so the knee cancels exactly
 * the pixels the change was for). Lorencia's bushes and Devias' trees turned
 * into flat grey cards, and Icarus — which draws no terrain at all, so every
 * pixel of it is empty depth — went uniformly white.
 *
 * The map edge is a real problem with a real fix, and the fix is not here: it
 * is a sky or fog dome drawn as actual geometry, which puts a depth value
 * behind the horizon and makes both cases above the benign one. Until that
 * exists, an empty pixel is left alone.
 */
function registerFogShader(): void {
  if (ShaderStore.ShadersStore[`${FOG_SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${FOG_SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform mat4 invView;
  uniform vec2 viewport;   // tan(fov/2) * aspect, tan(fov/2)
  uniform vec3 fogColor;
  uniform vec4 fogParams;  // density, falloff, base height, max opacity

  // Scene value below which the fog fades out (see the knee comment below).
  // Compared against *display-space* luma, the domain it was tuned in.
  const float FOG_BLACK_KNEE = 0.3;

  // The mood's regraded exposure while the buffer is linear (unified light
  // model + post), 1 otherwise - see the blend comment below.
  uniform float fogExposure;

  // …and the mask that says this pixel is an additive pass rather than a
  // surface. See EFFECT_MASK_LO; the fog's own, lower knee is explained at
  // its use below.
  const float FOG_MASK_HI = ${FOG_MASK_HI.toFixed(3)};

  // How far away an effect pixel is allowed to be told it is (tiles).
  const float EFFECT_FOG_DISTANCE = ${EFFECT_FOG_DISTANCE.toFixed(1)};

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float depth = texture2D(depthSampler, vUV).r;

    if (fogParams.x <= 0.0) {
      gl_FragColor = color;
      return;
    }

    // No depth means no fog. This looks like the one thing worth changing
    // here — it is why an outdoor map ends in a hard silhouette against the
    // clear colour rather than fading out (todo 3.3) — and it must not be
    // changed from inside this shader. Fogging the empty pixel to a horizon
    // distance was tried and reverted; see the long note above
    // registerFogShader.
    if (depth <= 0.0) {
      gl_FragColor = color;
      return;
    }

    vec3 viewDir = vec3((vUV.x * 2.0 - 1.0) * viewport.x, (vUV.y * 2.0 - 1.0) * viewport.y, 1.0);
    vec3 camPos = invView[3].xyz;

    // The rotation of invView, by column. Not mat3(invView): a
    // matrix-from-matrix constructor is GLSL 1.20 / ESSL 3.00 and is a
    // compile error under ESSL 1.00, which is what this post-process gets on
    // a WebGL1 context.
    vec3 worldDir =
      invView[0].xyz * viewDir.x +
      invView[1].xyz * viewDir.y +
      invView[2].xyz * viewDir.z;

    float dist = length(worldDir) * depth;
    vec3 rd = normalize(worldDir);

    // The depth under an additive pixel belongs to whatever stands behind the
    // flame, so the fog it earns is that surface's — a torch over Lorencia's
    // water was being given forty tiles of haze and coming out pale salmon.
    //
    // Cancelling the fog outright was the first try and overshoots the other
    // way: the flame comes out at full saturation against a scene that is
    // hazed, and reads as a sticker laid over the frame rather than something
    // standing in it. Fire in this game is a handful of additive smears — the
    // atmosphere was doing real work softening them.
    //
    // Cap the distance instead. A flame is drawn on top of its background so
    // it is never further away than the depth says, and it is nearly always
    // inside the play area, so min() can only ever take fog away. Near fire
    // keeps exactly the fog it had; far fire is fogged as something standing
    // at arm's length rather than as the water behind it.
    //
    // The fog's knee on the mask is far lower than the AO's. Rain is the
    // case: a streak one or two pixels wide, drawn additively over the far
    // water, lands in the half-resolution mask at a tenth of its own
    // brightness - under the AO knee - and so was given the water's forty
    // tiles of haze and came out as the night fog colour: "black rain" with
    // post-processing on. Anything the mask registers at all is an additive
    // pass and deserves the cap; the AO keeps its knee because a faint
    // registration there would un-occlude a wall behind a wisp of smoke.
    vec3 effect = texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb;
    float lit = smoothstep(0.0, FOG_MASK_HI,
      max(effect.r, max(effect.g, effect.b)));

    dist = mix(dist, min(dist, EFFECT_FOG_DISTANCE), lit);

    float falloff = fogParams.y;
    float ry = rd.y;
    if (abs(ry) < 1e-3) ry = ry < 0.0 ? -1e-3 : 1e-3;

    // Exponential height fog (Quilez): density * exp(-falloff * (y - base))
    // integrated along the view ray.
    float amount = fogParams.x * exp(-(camPos.y - fogParams.z) * falloff)
      * (1.0 - exp(-dist * ry * falloff)) / (ry * falloff);

    float f = clamp(1.0 - exp(-max(amount, 0.0)), 0.0, fogParams.w);

    // The bake is the art direction: where the lightmap goes to black (the
    // precipices in Devias, the void under bridges) the ground must stay
    // black, not lift to the fog colour. Fog only adds where there is light.
    //
    // It is also what keeps the fog off the blend meshes. The depth here is
    // the G-buffer's, which holds no blend mesh, so a tree or an effect quad
    // carries the depth of whatever stands behind it, and the knee is what
    // cancels the fog it would otherwise be given.
    //
    // A *dark* blend mesh, that is. The bright ones are handled further up,
    // by the effect mask, and they need the opposite treatment: this knee
    // would only ever have cancelled fog on the ones that are barely lit.
    // The fog was authored against the old buffer, which image processing
    // consumed as-is - so an old buffer value and today's linear value for
    // the same content differ exactly by the mood's regraded exposure
    // (fogExposure; 1 outside the unified model). Scaling the scene up by
    // it, blending with the authored colour, and dividing back reproduces
    // the authored veil and knee bit for bit under any regrade.
    vec3 scaled = color.rgb * fogExposure;

    float luma = max(scaled.r, max(scaled.g, scaled.b));

    f *= smoothstep(0.0, FOG_BLACK_KNEE, luma);

    gl_FragColor = vec4(mix(scaled, fogColor, f) / fogExposure, color.a);
  }
  `;
}

function createFog(
  scene: Scene,
  camera: ArcRotateCamera,
  mask: RenderTargetTexture
): PostProcess {
  registerFogShader();

  const fog = new PostProcess(
    'enhancedHeightFog',
    FOG_SHADER,
    ['invView', 'viewport', 'fogColor', 'fogParams', 'fogExposure'],
    ['depthSampler', EFFECT_MASK_SAMPLER],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine()
  );

  fog.onApply = effect => {
    effect.setTexture(EFFECT_MASK_SAMPLER, mask);

    const gbuffer = scene.geometryBufferRenderer;

    if (!gbuffer) return;

    const depthIndex = gbuffer.getTextureIndex(
      GeometryBufferRenderer.DEPTH_TEXTURE_TYPE
    );

    effect.setTexture('depthSampler', gbuffer.getGBuffer().textures[depthIndex]);

    effect.setMatrix('invView', camera.getViewMatrix().clone().invert());

    const tanHalf = Math.tan(camera.fov / 2);

    effect.setFloat2(
      'viewport',
      tanHalf * scene.getEngine().getAspectRatio(camera, true),
      tanHalf
    );

    effect.setFloat3('fogColor', ...fogShown.color);
    effect.setFloat(
      'fogExposure',
      linearBufferActive(scene) ? fogShown.exposure : 1
    );
    effect.setFloat4(
      'fogParams',
      fogShown.density,
      fogShown.falloff,
      fogBaseY + fogShown.base,
      fogShown.maxOpacity
    );
  };

  camera.attachPostProcess(fog);

  return fog;
}

/**
 * Post-process chain order: SSAO → fog → map gradient → look pipeline. The
 * look pipeline re-attaches itself (to the end) whenever one of its toggles
 * changes, which is how the gradient has always ended up ahead of it; this
 * just moves it behind the new passes so AO and fog get tone mapped.
 */
function reorderPostChain(scene: Scene, camera: ArcRotateCamera): void {
  const manager = scene.postProcessRenderPipelineManager;

  if (manager.supportedPipelines.some(p => p.name === 'sceneLook')) {
    manager.detachCamerasFromRenderPipeline('sceneLook', camera);
    manager.attachCamerasToRenderPipeline('sceneLook', camera);
  }
}

function destroyPostFx(): void {
  if (!runtime) return;

  const { scene, camera } = runtime;

  if (runtime.fog) {
    camera.detachPostProcess(runtime.fog);
    runtime.fog.dispose(camera);
    runtime.fog = null;
  }

  if (runtime.ssao) {
    runtime.ssao.dispose(true);
    runtime.ssao = null;
  }

  if (runtime.mask) {
    const index = scene.customRenderTargets.indexOf(runtime.mask);

    if (index >= 0) scene.customRenderTargets.splice(index, 1);

    runtime.mask.dispose();
    runtime.mask = null;
  }

  scene.disableGeometryBufferRenderer();
  runtime.postOn = false;
}

function createPostFx(): void {
  if (!runtime || runtime.postOn) return;

  const { scene, camera, tier } = runtime;

  runtime.mask = createEffectMask(scene, camera);
  runtime.ssao = createSsao(scene, camera, tier, runtime.mask);
  runtime.fog = createFog(scene, camera, runtime.mask);
  runtime.postOn = true;

  reorderPostChain(scene, camera);
}

function destroyRuntime(): void {
  if (!runtime) return;

  destroyPostFx();

  const { scene } = runtime;

  if (runtime.csm) {
    runtime.csm.dispose();
    runtime.csm = null;
  }

  runtime = null;
  csmState.active = false;

  recompileTerrainMaterials();
  rebuildFrozenMaterials(scene);
  blobShadowRefresh.fn?.(scene);
}

/**
 * Bring the scene in line with `GameOptions.lightingQuality` /
 * `postProcessing`. Idempotent; safe to call from the options listener.
 */
export function syncEnhancedLighting(
  scene: Scene,
  camera: ArcRotateCamera
): void {
  const tier = lightingTier();

  if (!tier) {
    destroyRuntime();
    return;
  }

  if (runtime && (runtime.tier !== tier || runtime.scene !== scene)) {
    destroyRuntime();
  }

  if (!runtime) {
    runtime = {
      scene,
      camera,
      tier,
      csm: null,
      shadows: false,
      ssao: null,
      fog: null,
      mask: null,
      postOn: false,
    };
  }

  syncCsm();

  if (GameOptions.postProcessing) createPostFx();
  else destroyPostFx();
}

/**
 * Build or tear down the cascades to match `GameOptions.shadows` — the
 * player's "Object shadows" toggle.
 *
 * The toggle used to reach only the projected blobs (`objectShadow.ts`), so on
 * Enhanced and Ultra — where the blobs are parked *because* the cascades are
 * running — unchecking it changed nothing at all on screen. One toggle, every
 * shadow: that is the whole of this function.
 *
 * It is a rebuild rather than a flag because the CSM is compiled into the
 * terrain and object materials (the `CSM_` defines), so the same three
 * invalidations the tier change already does have to run either way.
 */
function syncCsm(): void {
  if (!runtime) return;

  const want = GameOptions.shadows;
  if (want === runtime.shadows) return;

  const { scene, tier } = runtime;

  runtime.shadows = want;

  if (runtime.csm) {
    runtime.csm.dispose();
    runtime.csm = null;
  }

  if (want) {
    const sun = sunLightOf(scene);
    if (sun) runtime.csm = createCsm(scene, sun, tier);
  }

  csmState.active = runtime.csm !== null;

  recompileTerrainMaterials();
  rebuildFrozenMaterials(scene);
  blobShadowRefresh.fn?.(scene);
}

export function enhancedLightingActive(): boolean {
  return runtime !== null;
}

/**
 * Mood hand-off (sceneLook): the fog colour/density the map asks for, plus
 * the mood's exposure. The colours are authored at screen brightness against
 * the old ~1.0 exposures; the unified regrade raised each mood's exposure
 * ~a stop to pay for the linear terrain and the bake multiply — neither
 * applies to fog, so the bind divides it back out again.
 */
export function setEnhancedFog(fog: FogSettings, moodExposure = 1): void {
  fogShown.color[0] = fog.color[0];
  fogShown.color[1] = fog.color[1];
  fogShown.color[2] = fog.color[2];
  fogShown.density = fog.density;
  fogShown.falloff = fog.falloff;
  fogShown.base = fog.base;
  fogShown.maxOpacity = fog.maxOpacity;
  fogShown.exposure = Math.max(moodExposure, 0.01);
}

/**
 * Per frame: the fog base follows the camera target's height so it hugs
 * the ground around the hero instead of a fixed sea level — maps step up
 * and down by tens of tiles.
 */
export function updateEnhancedLighting(scene: Scene): void {
  if (!runtime) return;

  const targetY = runtime.camera.target.y;

  if (!fogBaseSeeded) {
    fogBaseY = targetY;
    fogBaseSeeded = true;
    return;
  }

  const dt = scene.getEngine().getDeltaTime() / 1000;
  const k = Math.min(1, dt * FOG_BASE_EASE);

  fogBaseY += (targetY - fogBaseY) * k;
}
