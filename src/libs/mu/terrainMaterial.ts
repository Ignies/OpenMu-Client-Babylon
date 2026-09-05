import { type Scene, ShaderMaterial, type Texture } from '../babylon/exports';
import {
  bindTerrainOverlays,
  terrainOverlayDeclarationsGlsl,
  terrainOverlayGlsl,
  terrainOverlayLitGlsl,
  terrainOverlayReflectGlsl,
  terrainOverlayUniforms,
  hasTrail,
  type TerrainOverlay,
} from './terrainOverlay';
import type { TileTextureArray } from './tileTextureArray';
import { getTerrainLightTexture } from '../../common/terrainDynamicLight';
import {
  linearBufferActive,
  linearLightActive,
} from '../../common/lightModel';
import { lookDirector } from '../../lighting/director';
import {
  TERRAIN_CSM_UNIFORMS,
  bindTerrainCsm,
  registerTerrainMaterial,
  terrainCsmDefines,
  terrainCsmGlsl,
} from '../../scenes/shadows';
import {
  bindTerrainWater,
  disposeTerrainWaterFrames,
  terrainWaterAlphaSkipGlsl,
  terrainWaterCausticsGlsl,
  terrainWaterGrassWindGlsl,
  terrainWaterSamplers,
  terrainWaterUniforms,
  terrainWaterVertexDeclarationsGlsl,
  terrainWaterVertexGlsl,
  type TerrainWaterRuntime,
} from './terrainWater';

const FINAL_COLOR_VAR_NAME = `finalColor`;

/**
 * Index of the animated water tile in `getTilesList` - the one layer whose UV
 * scrolls. Kept as the same magic 5 the branch chain used.
 */
const WATER_LAYER = 5;

/**
 * Flip to false to go back to the per-texture `if` chain (one `sampler2D`
 * array, 2N conditional fetches per pixel). Kept so the two can be measured
 * against each other, and as a one-line escape hatch if the packed array
 * turns out to sample differently on some driver.
 */
const USE_TILE_TEXTURE_ARRAY = true;

/**
 * The hue-preserving soft ceiling on the ground light sum, tiers >= 1
 * (ARCHITECTURE §4.5): linear below the knee, bent toward the asymptote
 * above it, so a torch core keeps its hue where the original's per-channel
 * clamp would have gone white.
 */
const GROUND_CEIL_KNEE = 0.85;
const GROUND_CEIL_ASYMPTOTE = 1.1;

/**
 * The old path: `textures[i]` cannot be indexed by a per-fragment value in
 * GLSL, so every layer got its own guarded `texture2D`, twice.
 */
function branchChainGlsl(
  texturesData: { texture: Texture; scale: number }[]
): string {
  return texturesData
    .map((textureData, i) => {
      const uv = `vUV * ${textureData.scale.toFixed(1)}${
        i === WATER_LAYER ? ` + vec2(WaterMove,GrassWind)` : ''
      }`;

      return `
  if (m1 >= ${i}.0 && m1 < ${i}.5) {
      opaqueColor = texture2D(textures[${i}], ${uv}).rgb;
  }
  if (m2 >= ${i}.0 && m2 < ${i}.5) {
      alphaColor = texture2D(textures[${i}], ${uv}).rgb;
      alphaRendered = true;
  }
  `;
    })
    .join('');
}

/**
 * The packed path: two array fetches, layer picked by the splat index.
 *
 * The `valid` tests reproduce what the branch chain did by omission - a tile
 * index the map references but the world has no texture for matched no branch
 * and left the colour black. Here the same index would read past
 * `tileScales`, which is undefined behaviour, so it is tested rather than
 * clamped. `vAlphaTexture` is -1 when a tile has no second layer.
 */
function textureArrayGlsl(layers: number): string {
  return `
  int layer1 = int(m1);
  int layer2 = int(m2);

  bool valid1 = layer1 >= 0 && layer1 < ${layers};
  bool valid2 = vAlphaTexture >= 0.0 && layer2 >= 0 && layer2 < ${layers};

  int index1 = valid1 ? layer1 : 0;
  int index2 = valid2 ? layer2 : 0;

  vec2 uv1 = vUV * tileScales[index1];
  vec2 uv2 = vUV * tileScales[index2];

  if (index1 == ${WATER_LAYER}) uv1 += vec2(WaterMove, GrassWind);
  if (index2 == ${WATER_LAYER}) uv2 += vec2(WaterMove, GrassWind);

  if (valid1) {
      opaqueColor = texture2D(tileTextures, vec3(uv1, float(index1))).rgb;
  }

  if (valid2) {
      alphaColor = texture2D(tileTextures, vec3(uv2, float(index2))).rgb;
      alphaRendered = true;
  }
  `;
}

export function createTerrainMaterial(
  scene: Scene,
  { name }: { name: string },
  config: {
    texturesData: { texture: Texture; scale: number }[];
    /** Packed layers; when present the shader takes the array path. */
    tileArray?: TileTextureArray | null;
    /** Ground-contact weather layers for this map; empty = shader unchanged. */
    overlays?: readonly TerrainOverlay[];
    /** Animated water for this map (terrainWater.ts); null = shader unchanged. */
    water?: TerrainWaterRuntime | null;
  }
) {
  const tileArray = USE_TILE_TEXTURE_ARRAY ? config.tileArray ?? null : null;
  const water = config.water ?? null;
  // The ploughed-trail map is one more sampler, and the per-tile fallback
  // path already spends every one of WebGL's guaranteed 16 fragment units
  // (13 tiles + the light map + two cascades). On that path the trail is
  // dropped rather than the whole terrain failing to link.
  const overlays = (config.overlays ?? []).map(o =>
    o.trail && !tileArray ? { ...o, trail: false } : o
  );

  const finalColorStr = tileArray
    ? textureArrayGlsl(tileArray.layers)
    : branchChainGlsl(config.texturesData);

  const terrainMaterial = new ShaderMaterial(
    'SplatTerrainMaterial' + name,
    scene,
    {
      vertexSource: `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  attribute vec2 uv2;
  attribute vec4 color;
  attribute vec4 matricesWeights; // used for alpha blending
  uniform mat4 viewProjection;
  uniform mat4 view;
  uniform mat4 world;
  varying vec2 vUV;
  flat varying float vOpaqueTexture;
  flat varying float vAlphaTexture;
  varying vec4 vColor;
  varying vec4 vAlphaColor;
  varying vec2 vWorldXZ;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vViewZ;

${water ? terrainWaterVertexDeclarationsGlsl() : ''}

  void main() {
      vec4 p = vec4(position, 1.);
      vec4 worldPosition = world * p;
${water ? terrainWaterVertexGlsl(water.spec) : ''}
      vUV = uv;
      vOpaqueTexture = uv2.x;
      vAlphaTexture = uv2.y;
      vColor = color;
      vAlphaColor = matricesWeights;
      vWorldXZ = worldPosition.xz;
      vWorldPos = worldPosition.xyz;
      // Guarded: ComputeNormals leaves a zero normal on any degenerate quad,
      // and normalize(vec3(0)) is a NaN that the overlay's slope test would
      // carry straight into gl_FragColor as a black fragment.
      vec3 n = (world * vec4(normal, 0.0)).xyz;
      vNormal = dot(n, n) > 0.0 ? normalize(n) : vec3(0.0, 1.0, 0.0);
      vViewZ = (view * worldPosition).z;
      gl_Position = viewProjection * worldPosition;
  }
  `,
      fragmentSource: `
  precision highp float;
  uniform float time;
  uniform float linearOut;
  uniform float linearLight;
  uniform float keyGain;
  uniform vec2 roomParams; // x: a room is the active area, y: gain on the delta (AreaLook.candles)
${
  tileArray
    ? `  uniform highp sampler2DArray tileTextures;
  uniform float tileScales[${tileArray.layers}];`
    : `  uniform sampler2D textures[${config.texturesData.length}];`
}
  uniform sampler2D dynamicLight;
${water && water.frames.length ? `  uniform sampler2D waterFlip;` : ''}
  varying vec2 vUV;
  flat varying float vOpaqueTexture;
  flat varying float vAlphaTexture;
  varying vec4 vColor;
  varying vec4 vAlphaColor;
  varying vec2 vWorldXZ;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vViewZ;

  const float GROUND_CEIL_KNEE = ${GROUND_CEIL_KNEE.toFixed(3)};
  const float GROUND_CEIL_ROOM = ${(GROUND_CEIL_ASYMPTOTE - GROUND_CEIL_KNEE).toFixed(3)};

${terrainOverlayDeclarationsGlsl(overlays)}

  ${terrainCsmGlsl()}

  void main()
  {
    float m1 = vOpaqueTexture + 0.1;
    float m2 = vAlphaTexture + 0.1;
    bool alphaRendered = false;

    float WaterMove = float(int(time*50.0) % 20000) * 0.0005;
    float WindSpeed = float(int(time*200.0) % 72000) * 0.004;
    float GrassWind = ${water ? terrainWaterGrassWindGlsl() : '0.0'};

    vec4 ${FINAL_COLOR_VAR_NAME} = vec4(0.0);

    vec3 opaqueColor = vec3(0.0);
    vec3 alphaColor = vec3(0.0);

    ${finalColorStr}
${water ? terrainWaterAlphaSkipGlsl(water) : ''}
    ${FINAL_COLOR_VAR_NAME} = vec4(opaqueColor, 1.0);

    if(alphaRendered){
      ${FINAL_COLOR_VAR_NAME} *= (1.0 - vAlphaColor.a);
      ${FINAL_COLOR_VAR_NAME} += vec4(alphaColor, 1.0) * vAlphaColor.a;
    }

    // One fetch, two jobs: rgb is the torches' radial light, and alpha is the
    // roof mask the ground overlays need (terrainMask.ts). Sampled before the
    // overlay so skyOpen is in scope for it.
    vec4 dynSample = texture2D(dynamicLight, (vWorldXZ + 0.5) / 256.0);
    vec3 dynLight = dynSample.rgb * 2.0 * roomParams.y;
    float skyOpen = dynSample.a;

    ${terrainOverlayGlsl(overlays, FINAL_COLOR_VAR_NAME, 'skyOpen')}

    // The sun's cascaded shadow, weighted by the openness mask: both
    // interiors take their roof *out* of the shadow map on purpose so the
    // camera can see in (Lorencia lifts HOUSE_WALL05/06 past the caster
    // range, Devias fades its ceiling), so under a roof the cascades are not
    // the authority and the bake keeps the room it was authored for - until
    // the room itself is the active area (roomShadow): then its furniture
    // and figures cast on the floor under the roof as well.
    float sunShadow = mix(1.0, csmShadow(vWorldPos, vViewZ), max(skyOpen, roomParams.x));

    // The one shadow rule: a shadow removes the sun and leaves the sky share
    // (csmParams.y, the policy floor). 1 while Classic (no cascades).
    float bakeShadow = mix(csmParams.y, 1.0, sunShadow);

    // The ground light sum. Tiers >= 1 (linearLight): lin(bake) x floor +
    // delta, the delta linear-authored and added after the decode. Classic:
    // the original's gamma-space bake + delta (ZzzLodTerrain.cpp:481-505),
    // untouched. Under a roof the bake is the room's own dark value and the
    // delta its candles; the ground takes no key term there either (§13 F14).
    vec3 bake = max(vColor.rgb, vec3(0.0));
    vec3 bakeLit = mix(bake, pow(bake, vec3(2.2)), linearLight) * bakeShadow;
    vec3 groundLight = max(bakeLit + dynLight, vec3(0.0));

    // The original clamps glColor at 1.0 per channel; tiers >= 1 bend the
    // sum toward the asymptote above the knee so a torch core keeps its hue.
    float peak = max(groundLight.r, max(groundLight.g, groundLight.b));
    float bent = peak > GROUND_CEIL_KNEE
      ? GROUND_CEIL_KNEE + GROUND_CEIL_ROOM * (1.0 - exp(-(peak - GROUND_CEIL_KNEE) / GROUND_CEIL_ROOM))
      : peak;
    vec3 softCeil = peak > 0.0 ? groundLight * (bent / peak) : groundLight;
    groundLight = mix(min(groundLight, vec3(1.0)), softCeil, linearLight);

    // The map's level (2^ev) is the light's, applied after the clamps so
    // they keep the original's units; 1.0 on Classic.
    groundLight *= keyGain;

    // The overlays and the reflections below work in the art's display
    // space; the linear sum is re-encoded for them and the final decode
    // lands the product exactly at lin(texel) x groundLight.
    vec3 groundLit = mix(groundLight, pow(groundLight, vec3(1.0 / 2.2)), linearLight);
    vec3 extraLit = mix(dynLight, pow(dynLight * keyGain, vec3(1.0 / 2.2)), linearLight);

    // A ground overlay that is its own material (snow) takes over its share
    // of this term - see terrainOverlayLitGlsl.
${terrainOverlayLitGlsl(
  overlays,
  'lit',
  'groundLit',
  'vColor',
  'sunShadow',
  'extraLit'
)}
    vec3 f = ${FINAL_COLOR_VAR_NAME}.rgb * max(lit, 0.0);

    // Standing water reflects the sky and the torches - light the ground
    // under it never had, so it is added after the lighting.
${terrainOverlayReflectGlsl(overlays, 'f', 'sunShadow')}
${water ? terrainWaterCausticsGlsl(water, 'f') : ''}

    // When image processing runs in post the buffer is linear, and
    // Babylon's Standard fragment ends with toLinearSpace(color) - the same
    // pow(2.2). linearOut is 0 whenever the objects skip the decode too.
    f = mix(f, pow(max(f, vec3(0.0)), vec3(2.2)), linearOut);

    gl_FragColor = vec4(f, 1.0);
  }
  `,
    },
    {
      attributes: [
        'position',
        'normal',
        'uv',
        'uv2',
        'color',
        'matricesWeights',
      ],
      uniforms: [
        'view',
        'world',
        'viewProjection',
        'time',
        'linearOut',
        'linearLight',
        'keyGain',
        'roomParams',
        ...(tileArray ? ['tileScales'] : []),
        ...terrainOverlayUniforms(overlays),
        ...(water ? terrainWaterUniforms() : []),
        ...TERRAIN_CSM_UNIFORMS,
      ],
      // `textures[N]` is expanded to N consecutive units starting at its own
      // slot; if it comes first, the shadow-map array samplers land on units
      // the 2D array already uses - two sampler types on one unit is a GL
      // draw error and the terrain renders flat. Keep the array last. The
      // packed path has no sampler array at all, but the ordering rule costs
      // nothing to keep.
      samplers: [
        'dynamicLight',
        ...(hasTrail(overlays) ? ['ovTrail'] : []),
        ...(water ? terrainWaterSamplers(water) : []),
        'csmShadowMap',
        'csmShadowMapF',
        ...(tileArray ? ['tileTextures'] : ['textures']),
      ],
      defines: terrainCsmDefines(),
      needAlphaBlending: false,
      needAlphaTesting: false,
    }
  ) as ShaderMaterial;

  terrainMaterial.fogEnabled = false;
  terrainMaterial.backFaceCulling = true;
  terrainMaterial.transparencyMode = 0;

  const st = Date.now();

  const textures = config.texturesData.map(t => t.texture);

  const dynamicLight = getTerrainLightTexture(scene);

  terrainMaterial.onBindObservable.add(m => {
    const effect = m.material?.getEffect();

    if (!effect) return;

    const et = (Date.now() - st) / 1000;
    effect.setFloat('time', et);
    effect.setFloat('linearOut', linearBufferActive(scene) ? 1 : 0);
    effect.setFloat('linearLight', linearLightActive(scene) ? 1 : 0);
    const look = lookDirector()?.state();
    effect.setFloat('keyGain', look?.keyGain ?? 1);
    effect.setFloat2('roomParams', look?.area ? 1 : 0, look?.key.emitterGain ?? 1);
    if (tileArray) {
      effect.setTexture('tileTextures', tileArray.texture);
      effect.setFloatArray('tileScales', tileArray.scales);
    } else {
      effect.setTextureArray('textures', textures);
    }
    effect.setTexture('dynamicLight', dynamicLight);
    bindTerrainOverlays(effect, overlays, scene);
    if (water) bindTerrainWater(effect, water, et, scene);
    bindTerrainCsm(effect);
  });

  registerTerrainMaterial(terrainMaterial);

  terrainMaterial.freeze();

  terrainMaterial.onDisposeObservable.addOnce(() => {
    textures.forEach(t => {
      t.dispose();
    });
    tileArray?.texture.dispose();
    if (water) disposeTerrainWaterFrames(water.frames);
  });

  return terrainMaterial;
}
