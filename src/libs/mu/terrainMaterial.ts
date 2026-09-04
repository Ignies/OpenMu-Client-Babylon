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
import { linearBufferActive } from '../../common/lightModel';
import {
  terrainBakeTint,
  terrainInteriorAmbient,
} from '../../scenes/sceneLook';
import {
  TERRAIN_CSM_UNIFORMS,
  bindTerrainCsm,
  registerTerrainMaterial,
  terrainCsmDefines,
  terrainCsmGlsl,
} from '../../scenes/enhancedLighting';
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
 * Index of the animated water tile in `getTilesList` — the one layer whose UV
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
 * The `valid` tests reproduce what the branch chain did by omission — a tile
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
  uniform vec3 bakeTint;
  uniform float linearOut;
  uniform vec3 interiorAmbient;
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
    vec3 dynLight = dynSample.rgb * 2.0;
    float skyOpen = dynSample.a;

    ${terrainOverlayGlsl(overlays, FINAL_COLOR_VAR_NAME, 'skyOpen')}

    // Enhanced lighting: the sun's cascaded shadow takes the bake
    // only down to csmParams.y of its authored value — the lightmap stays
    // the art direction. The dynamic layer is the torches' radial light, not
    // sunlight, so a roof or a wall between the ground and the sun must not
    // touch it (indoors everything sits in the sun's shadow).
    //
    // …and indoors is exactly where the cascades stop being the authority on
    // that, because both interiors take their roof *out* of the shadow map on
    // purpose so the camera can see in:
    //
    //  - Lorencia lifts HOUSE_WALL05/06 by 100 units (loadMapIntoScene),
    //    which puts them past CSM_CASTER_RANGE_SQ and out of the cascades
    //    entirely. What is left casting into the room is the *walls*, so the
    //    pub floor takes the outside walls' sun shadows in bands — a hard
    //    diagonal edge across a floor that has no sky over any of it.
    //  - Devias fades its ceiling with CeilingHideSystem, which only touches
    //    visibility; the slab still renders into the shadow map, so the
    //    room is uniformly shadowed and the bake is cut to csmParams.y (0.35)
    //    a second time — on top of a lightmap that already spent its light
    //    being an interior. That doubling is the near-black reading-room
    //    floor: 2.9× darker than the same floor on Classic, under furniture
    //    the hemispheric key still lights at full strength.
    //
    // The openness mask answers what the cascades no longer can — no sky over
    // this tile, no sun to shadow it — and it is already in scope for the
    // overlays. Indoors the bake keeps the room, which is what it was
    // authored to do.
    float sunShadow = mix(1.0, csmShadow(vWorldPos, vViewZ), skyOpen);
    float bakeShadow = mix(csmParams.y, 1.0, sunShadow);

    // Indoors the ground gets a share of the hemispheric key back
    // (INTERIOR_GROUND_KEY in sceneLook). Under a roof the bake is the room's
    // own dark authored value and this shader has no key term at all, so the
    // candles end up being the *entire* light on the floor and it takes all
    // of their hue — while the benches standing on it, which the hemispheric
    // light reaches whatever is overhead, read as warm wood. This is the base
    // that lets the candles tint the floor instead of defining it. Weighted
    // by the mask, so it stops at the door and no open ground ever sees it.
    vec3 roomKey = interiorAmbient * (1.0 - skyOpen);

    // A ground overlay that is its own material (snow) takes over its share
    // of this term — see terrainOverlayLitGlsl.
${terrainOverlayLitGlsl(
  overlays,
  'lit',
  // `bakeTint` is the mood grade's material-side pre-multiply and the
  // post-side `exposure` is what pays it back, so it has to cover the whole
  // ground light rather than the baked half alone. With the torches added
  // outside it they never paid the tint but still took the payback, landing
  // 1/luma(bakeTint) - 1.44x on Lorencia - over everything they lit. That is
  // the molten-orange wash torch-lit ground came out with on the graded
  // tiers. Ungraded the tint is white and this is a no-op.
  '(vColor.rgb * bakeShadow + dynLight) * bakeTint + roomKey',
  'vColor',
  'sunShadow',
  'dynLight + roomKey'
)}
    vec3 f = ${FINAL_COLOR_VAR_NAME}.rgb * max(lit, 0.0);

    // Standing water reflects the sky and the torches - light the ground
    // under it never had, so it is added after the lighting.
${terrainOverlayReflectGlsl(overlays, 'f', 'sunShadow')}
${water ? terrainWaterCausticsGlsl(water, 'f') : ''}

    // When image processing runs in post the buffer is linear, and
    // Babylon's Standard fragment ends with toLinearSpace(color) — the same
    // pow(2.2) of texel × light. Without it the floor arrived gamma-encoded
    // and read ~x^(1/2.2) lighter than the objects on it — a gamma
    // off. linearOut is 0 whenever the objects skip the decode too.
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
        'bakeTint',
        'linearOut',
        'interiorAmbient',
        ...(tileArray ? ['tileScales'] : []),
        ...terrainOverlayUniforms(overlays),
        ...(water ? terrainWaterUniforms() : []),
        ...TERRAIN_CSM_UNIFORMS,
      ],
      // `textures[N]` is expanded to N consecutive units starting at its own
      // slot; if it comes first, the shadow-map array samplers land on units
      // the 2D array already uses — two sampler types on one unit is a GL
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
    effect.setFloat3(
      'bakeTint',
      terrainBakeTint[0],
      terrainBakeTint[1],
      terrainBakeTint[2]
    );
    effect.setFloat('linearOut', linearBufferActive(scene) ? 1 : 0);
    effect.setFloat3(
      'interiorAmbient',
      terrainInteriorAmbient[0],
      terrainInteriorAmbient[1],
      terrainInteriorAmbient[2]
    );
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
