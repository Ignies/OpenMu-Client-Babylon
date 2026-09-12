import {
  CascadedShadowGenerator,
  Material,
  ShadowGenerator,
  type AbstractMesh,
  type DirectionalLight,
  type Effect,
  type Scene,
  type ShaderMaterial,
} from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { devQueryNumber } from '../common/devSeams';
import { sunLightOf } from '../lighting/keyRig';
import {
  blobShadowRefresh,
  csmState,
  type LightingTier,
} from '../common/lightingQuality';
import type { ShadowCasters, ShadowPolicy } from '../lighting/shadowPolicy';

/**
 * The cascaded shadow map on the sun: sole owner of the
 * `CascadedShadowGenerator` (ARCHITECTURE §4.1), and the terrain's hook into
 * it. Reads the `ShadowPolicy` the director hands it; `csm.darkness` is 0 (a
 * shadow removes the sun and nothing else, §3.2) and the terrain floor is
 * `1 - strength`, the sky share, applied in linear by the terrain shader.
 */

export const CSM_MAX_CASCADES = 3;

/**
 * How far from the camera the cascades reach, in tiles. The camera sits
 * ~10 tiles from the hero looking down, so the visible ground ends well
 * inside this; a low lambda keeps the first cascade (the one under the hero)
 * wide enough to hold the whole play area at full resolution.
 */
const CSM_MAX_Z = 32;

/**
 * The reach inside a room (`casters: 'all'`): the far wall of the pub or the
 * reading room is under 20 tiles from the camera, so the map is spent on the
 * room instead of on the black past its walls. One cascade covers it: the
 * room's furniture is drawn once into the map, not three times, and 20 tiles
 * over 2048 texels is still 100 texels a tile.
 */
const CSM_ROOM_MAX_Z = 20;
const CSM_ROOM_CASCADES = 1;

const CSM_LAMBDA = 0.1;

/**
 * Constant bias is a fraction of a cascade's depth range (~20 tiles for the
 * first), so 0.004 was 8 cm and lifted every shadow off its caster's feet;
 * the normal bias (world units) carries the self-shadowing instead.
 */
const CSM_BIAS = 0.0006;
const CSM_NORMAL_BIAS = 0.03;
const CSM_BLEND = 0.08;

const biasDev = devQueryNumber('csmBias');
const normalBiasDev = devQueryNumber('csmNormalBias');
const softnessDev = devQueryNumber('csmSoftness');
const cascadesDev = devQueryNumber('csmCascades');
const mapSizeDev = devQueryNumber('csmMapSize');
const refreshDev = devQueryNumber('csmRefresh');
const minCasterDev = devQueryNumber('csmMinCaster');

type Runtime = {
  scene: Scene;
  tier: LightingTier;
  csm: CascadedShadowGenerator | null;
  /** `GameOptions.shadows` as of the last sync. */
  shadows: boolean;
};

let runtime: Runtime | null = null;

/** The terrain's bake floor under a sun shadow: the sky share, linear. */
let terrainFloor = 1;

/** Who the render-list predicate admits; the policy's, as of the last sync. */
let casters: ShadowCasters = 'dynamic';

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
 * be bound - an unset one defaults to unit 0, which another sampler of a
 * different type already uses, and that is a GL draw error (the terrain
 * renders flat). Switching the define recompiles the material.
 */
export function terrainCsmDefines(): string[] {
  const defines = [`#define CSM_MAX_CASCADES ${CSM_MAX_CASCADES}`];

  const csm = runtime?.csm;

  if (csm) {
    defines.push(
      csm.filter === ShadowGenerator.FILTER_NONE
        ? '#define CSM_FLOAT'
        : '#define CSM_PCF'
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
 * GLSL for the terrain fragment: a PCF 3x3 lookup into the sun's cascades,
 * mirroring Babylon's `computeShadowWithCSMPCF3`; see `terrainCsmDefines`
 * for the variants. Returns the sun factor, 1 lit .. 0 fully shadowed; the
 * caller applies the policy floor.
 */
export function terrainCsmGlsl(): string {
  return `
  uniform vec4 csmParams; // x: enabled, y: bake floor (sky share), z: cascades

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
    return mix(shadow, 1.0, edge);
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
    effect.setFloat4('csmParams', 0, 1, 0, 0);
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

  const compare = csm.filter !== ShadowGenerator.FILTER_NONE;

  effect.setFloat4('csmParams', compare ? 1 : 2, terrainFloor, count, 0);
  effect.setMatrices('csmLightMatrices', lightMatrices);
  effect.setArray('csmFrustumZ', frustumZ);
  effect.setFloat2('csmMapSize', size, 1 / size);

  if (compare) effect.setDepthStencilTexture('csmShadowMap', map);
  else effect.setTexture('csmShadowMapF', map);
}

// --- casters ---------------------------------------------------------------

/**
 * Slack (tiles) past `CSM_MAX_Z` before a mesh is ruled out as a caster. The
 * cascades are fitted to the camera frustum out to CSM_MAX_Z, so nothing
 * further than that from the camera can land in any of them - but a caster
 * *behind* the camera still shadows what is in front of it, so the test is on
 * plain distance, not on the view frustum, and it keeps a wide margin.
 */
const CSM_CASTER_SLACK = 16;

const CSM_CASTER_RANGE_SQ = (CSM_MAX_Z + CSM_CASTER_SLACK) ** 2;

/**
 * A map object under this height (tiles) is ground clutter - grass, a flower,
 * a ground decal, a small mushroom - and its shadow is a card's noise at
 * gameplay zoom, while Noria stands 600 of them in one frame (22 -> 28 fps
 * without them). A cost rule, not a look one: inside a room the whole room is
 * the frame and everything standing in it casts, however small.
 *
 * It is the only thing between a map object and the cascades. What stood here
 * before was a bake test (§13 F1/F15): the lightmap was read for an authored
 * shadow under each static object and the object kept out of the map wherever
 * one seemed to be there. The premise does not hold - MU's bakes carry pockets
 * of darkening, not object shadows - so what it removed was the object's only
 * shadow, and half of a town cast nothing.
 */
const CLUTTER_HEIGHT = 1;

function isGroundClutter(mesh: AbstractMesh): boolean {
  // A prop batch's box is the union of every placement in its chunk; the
  // type's own height rides in its metadata (common/propBatches.ts).
  const own = mesh.metadata?.casterHeight;

  let height: number;

  if (typeof own === 'number') {
    height = own;
  } else {
    const box = mesh.getBoundingInfo().boundingBox;
    height = box.maximumWorld.y - box.minimumWorld.y;
  }

  return height < (minCasterDev ?? CLUTTER_HEIGHT);
}

function castsSunShadow(mesh: AbstractMesh): boolean {
  const meta = mesh.metadata;

  if (!meta || meta.csmCaster !== true) return false;

  // The blend mesh is an additive glow card - light, not matter - with one
  // exception: the objects that say the card *is* their body (wings,
  // `ModelObject.ShadowBlendMeshCasts`). A caster only; `occludes` in
  // ambientOcclusion.ts still keeps it out of the G-buffer.
  const blendCaster = meta.shadowBlendCaster === true;

  if (meta.brightMesh && !blendCaster) return false;

  if (!drawsSolidGeometry(mesh, blendCaster)) return false;

  return !(
    casters === 'dynamic' &&
    meta.mapObject === true &&
    isGroundClutter(mesh)
  );
}

/**
 * A mesh that is drawn as matter rather than as light, and is near enough to
 * be worth a pass over. Shared by the cascades and the G-buffer: both want
 * "surfaces that are really there", and both are re-run over every mesh in
 * the scene on every refresh (`RenderTargetTexture.render`), so the distance
 * test comes first as the cheapest filter available.
 */
export function drawsSolidGeometry(mesh: AbstractMesh, allowBlend = false): boolean {
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
  // cascades that is what `transparencyShadow` buys).
  return (
    allowBlend || material.transparencyMode !== Material.MATERIAL_ALPHABLEND
  );
}

function reachFor(who: ShadowCasters): number {
  return who === 'all' ? CSM_ROOM_MAX_Z : CSM_MAX_Z;
}

function cascadesFor(who: ShadowCasters, tier: LightingTier): number {
  return who === 'all' ? CSM_ROOM_CASCADES : cascadesDev ?? tier.cascades;
}

/** Frozen materials skip the light-dirty pass; force the rebuild once. */
function rebuildFrozenMaterials(scene: Scene): void {
  for (const material of scene.materials) {
    if (material.isFrozen) material.markDirty(true);
  }
}

// --- setup -----------------------------------------------------------------

/**
 * Who enters the map, and how often it is drawn. Both live on the shadow map
 * itself, and Babylon builds a *new* one on every `numCascades` change
 * (`recreateShadowMap`), carrying over the render list's contents but neither
 * the predicate that fills it nor the refresh rate. Left un-hooked, the caster
 * set freezes to whatever stood in it when the room was entered: nothing
 * loaded afterwards ever casts, and nothing already in it ever leaves.
 */
function hookShadowMap(csm: CascadedShadowGenerator): void {
  const map = csm.getShadowMap();

  if (!map) return;

  map.renderListPredicate = castsSunShadow;
  map.refreshRate = refreshDev ?? 1;
}

function createCsm(
  scene: Scene,
  sun: DirectionalLight,
  tier: LightingTier,
  policy: ShadowPolicy
): CascadedShadowGenerator {
  const csm = new CascadedShadowGenerator(
    mapSizeDev ?? tier.shadowMapSize,
    sun,
    true
  );

  csm.numCascades = cascadesFor(policy.casters, tier);
  csm.lambda = CSM_LAMBDA;
  csm.shadowMaxZ = reachFor(policy.casters);
  csm.stabilizeCascades = true;
  csm.depthClamp = true;
  csm.filter = tier.pcss
    ? ShadowGenerator.FILTER_PCSS
    : ShadowGenerator.FILTER_PCF;
  csm.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  csm.contactHardeningLightSizeUVRatio = softnessDev ?? policy.softness;
  csm.bias = biasDev ?? CSM_BIAS;
  csm.normalBias = normalBiasDev ?? CSM_NORMAL_BIAS;
  csm.cascadeBlendPercentage = CSM_BLEND;
  csm.darkness = 0;
  csm.frustumEdgeFalloff = 0.2;

  // Without this Babylon drops every *transparent* submesh from the shadow
  // map (`_renderForShadowMap`), and `modelLoader` promotes every
  // TGA-textured mesh to ALPHATESTANDBLEND - most of what a character wears.
  // They land in the alpha-tested depth pass, keyed by their own texture.
  csm.transparencyShadow = true;

  hookShadowMap(csm);

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

function destroyCsm(): void {
  if (!runtime?.csm) return;

  runtime.csm.dispose();
  runtime.csm = null;
}

function invalidate(scene: Scene): void {
  csmState.active = runtime !== null && runtime.csm !== null;

  recompileTerrainMaterials();
  rebuildFrozenMaterials(scene);
  blobShadowRefresh.fn?.(scene);
}

export function disposeShadows(): void {
  if (!runtime) return;

  const { scene } = runtime;

  destroyCsm();
  runtime = null;

  invalidate(scene);
}

/**
 * Bring the cascades in line with the tier, the shadows option and the
 * policy. Idempotent; called from the director's tick.
 *
 * `GameOptions.shadows` is the player's "Object shadows" toggle; it gates the
 * cascades and the blobs alike, so unchecking it removes every shadow. The
 * toggle is a rebuild rather than a flag because the CSM is compiled into
 * the terrain and object materials (the `CSM_` defines).
 */
export function syncShadows(
  scene: Scene,
  tier: LightingTier | null,
  policy: ShadowPolicy
): void {
  terrainFloor = 1 - policy.strength;
  // The predicate runs on the next refresh; a room switching the set does not
  // need a rebuild, and the reach is a re-split, not a rebuild either.
  casters = policy.casters;

  if (runtime?.csm) {
    runtime.csm.shadowMaxZ = reachFor(casters);
    // A cascade count change recreates the map; once per room entered.
    const cascades = cascadesFor(casters, runtime.tier);

    if (runtime.csm.numCascades !== cascades) {
      runtime.csm.numCascades = cascades;
      hookShadowMap(runtime.csm);
    }
  }

  if (!tier) {
    disposeShadows();
    return;
  }

  if (runtime && (runtime.tier !== tier || runtime.scene !== scene)) {
    disposeShadows();
  }

  if (!runtime) {
    runtime = { scene, tier, csm: null, shadows: false };
  }

  const want = GameOptions.shadows;

  if (want === runtime.shadows) return;

  runtime.shadows = want;

  destroyCsm();

  if (want) {
    const sun = sunLightOf(scene);

    // No rig to hang the cascades on yet: leave the option unapplied so the
    // next tick tries again instead of latching it as done.
    if (sun) runtime.csm = createCsm(scene, sun, tier, policy);
    else runtime.shadows = false;
  }

  invalidate(scene);
}

export function shadowsActive(): boolean {
  return runtime !== null && runtime.csm !== null;
}
