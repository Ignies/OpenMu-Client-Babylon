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
import {
  bindTerrainDetail,
  terrainDetailGlsl,
  TERRAIN_DETAIL_SAMPLER,
  TERRAIN_DETAIL_UNIFORM,
} from './terrainDetail';
import {
  CLOUD_UNIFORMS,
  TERRAIN_CSM_SAMPLERS,
  TERRAIN_LIGHT_UNIFORMS,
  bindTerrainLight,
  startTerrainClock,
  terrainClock,
  terrainGroundLightGlsl,
  terrainLightDeclarationsGlsl,
  terrainLightDefines,
  terrainLightSamplers,
  terrainSkyLightGlsl,
} from './terrainLighting';
import { registerTerrainMaterial } from '../../scenes/shadows';
import { grassBurnActive, grassBurnTexture } from '../../weather/grassBurn';
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

/**
 * What the ground keeps where the fire has been over it. A multiplier, so a
 * scar still takes the sun and the torches rather than sitting on the map as
 * a flat decal - and not zero, because ash is dark, not a hole.
 */
const BURN_GROUND = [0.13, 0.11, 0.10] as const;

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
${
  tileArray
    ? `  uniform highp sampler2DArray tileTextures;
  uniform float tileScales[${tileArray.layers}];
  uniform sampler2D terrainBurn;
  uniform float terrainBurnOn;`
    : `  uniform sampler2D textures[${config.texturesData.length}];`
}
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

${terrainLightDeclarationsGlsl(!!tileArray)}
${terrainOverlayDeclarationsGlsl(overlays)}
${tileArray ? terrainDetailGlsl() : ''}

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

    // On the art, before any light touches it: the ground keeps its colour and
    // its level and only gains a grain to hold the eye at close range. Packed
    // path only, like the cloud field - the per-tile fallback has no sampler
    // unit left to spend.
${tileArray ? `    ${FINAL_COLOR_VAR_NAME}.rgb *= muGroundGrain(vWorldXZ, vViewZ);` : ''}

${terrainSkyLightGlsl()}

    ${terrainOverlayGlsl(overlays, FINAL_COLOR_VAR_NAME, 'skyOpen')}

${terrainGroundLightGlsl({ bake: 'vColor.rgb', clouds: !!tileArray })}
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

    // A torch does not only brighten the stone beside it, it colours it. The
    // light the texel was multiplied by is handed back in, so both arguments
    // are in one space and a neutral bake tints nothing.
    f = muLightTint(f, max(lit, 0.0));

    // Standing water reflects the sky and the torches - light the ground
    // under it never had, so it is added after the lighting.
${terrainOverlayReflectGlsl(overlays, 'f', 'sunShadow')}
${water ? terrainWaterCausticsGlsl(water, 'f') : ''}

${
  tileArray
    ? `
    // Ground the fire has been over (weather/grassBurn.ts). The grass above
    // it dissolves blade by blade, and on its own that reads as nothing: a
    // field with fewer blades in it is still a green field, and what a burnt
    // patch actually is on screen is *dark ground*. So the same scar the
    // blades read darkens what they stand on.
    //
    // Multiplied, not mixed to a colour: burnt ground still takes the sun, the
    // torches and the cascades, and a scar that ignored them would be a decal
    // lying on the map rather than part of it.
    //
    // Packed path only, like the detail grain and the cloud field above it -
    // the per-tile fallback has already spent every one of WebGL's guaranteed
    // sixteen fragment units, and a seventeenth is a draw error that takes the
    // terrain with it.
    float burnt = texture2D(terrainBurn, vWorldXZ / 256.0).r * terrainBurnOn;
    f *= mix(vec3(1.0), vec3(${BURN_GROUND[0].toFixed(3)}, ${BURN_GROUND[1].toFixed(3)}, ${BURN_GROUND[2].toFixed(3)}), burnt);`
    : ''
}

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
        ...TERRAIN_LIGHT_UNIFORMS,
        ...(tileArray ? CLOUD_UNIFORMS : []),
        ...(tileArray ? [TERRAIN_DETAIL_UNIFORM] : []),
        ...(tileArray ? ['tileScales', 'terrainBurnOn'] : []),
        ...terrainOverlayUniforms(overlays),
        ...(water ? terrainWaterUniforms() : []),
      ],
      // `textures[N]` is expanded to N consecutive units starting at its own
      // slot; if it comes first, the shadow-map array samplers land on units
      // the 2D array already uses - two sampler types on one unit is a GL
      // draw error and the terrain renders flat. Keep the array last. The
      // packed path has no sampler array at all, but the ordering rule costs
      // nothing to keep.
      samplers: [
        ...terrainLightSamplers(!!tileArray),
        // The grain rides the packed path only, like the cloud field: the
        // per-tile fallback already spends every one of WebGL's guaranteed
        // 16 fragment units.
        ...(tileArray ? [TERRAIN_DETAIL_SAMPLER] : []),
        ...(hasTrail(overlays) ? ['ovTrail'] : []),
        ...(tileArray ? ['terrainBurn'] : []),
        ...(water ? terrainWaterSamplers(water) : []),
        ...TERRAIN_CSM_SAMPLERS,
        ...(tileArray ? ['tileTextures'] : ['textures']),
      ],
      defines: terrainLightDefines(),
      needAlphaBlending: false,
      needAlphaTesting: false,
    }
  ) as ShaderMaterial;

  terrainMaterial.fogEnabled = false;
  terrainMaterial.backFaceCulling = true;
  terrainMaterial.transparencyMode = 0;

  // The clock the grass rooted in this ground shares (terrainLighting.ts).
  startTerrainClock();

  const textures = config.texturesData.map(t => t.texture);

  terrainMaterial.onBindObservable.add(m => {
    const effect = m.material?.getEffect();

    if (!effect) return;

    bindTerrainLight(effect, scene, !!tileArray);

    if (tileArray) {
      effect.setTexture('tileTextures', tileArray.texture);
      effect.setFloatArray('tileScales', tileArray.scales);
      bindTerrainDetail(effect, scene);
      // Always bound, burnt or not: an unbound sampler here is a draw error
      // and it takes the whole terrain with it. A map nothing has burned on
      // holds a zero texture, and `terrainBurnOn` is what saves the fetch.
      effect.setTexture('terrainBurn', grassBurnTexture(scene));
      effect.setFloat('terrainBurnOn', grassBurnActive() ? 1 : 0);
    } else {
      effect.setTextureArray('textures', textures);
    }
    bindTerrainOverlays(effect, overlays, scene);
    if (water) bindTerrainWater(effect, water, terrainClock(), scene);
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
