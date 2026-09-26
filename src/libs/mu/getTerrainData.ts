import {
  CreatePlane,
  RawTexture,
  StandardMaterial,
  Texture,
  Vector3,
} from '../babylon/exports';
import type { IVector3Like, Scene } from '../babylon/exports';
import { createGroundMesh } from './customGroundMesh';
import {
  createTileTextureArray,
  type TileTextureArray,
} from './tileTextureArray';
import { updateTerrainHeightMap } from './terrainHeightMap';
import {
  USE_TILE_TEXTURE_ARRAY,
  createTerrainMaterial,
} from './terrainMaterial';
import { terrainOverlaysFor } from './terrainOverlay';
import { createTerrainEdge } from './terrainEdge';
import { disposeGrassField, installGrassField } from './terrainGrass';
import { loadGrassCards } from './terrainGrassCards';
import {
  createTerrainWaterRuntime,
  disposeTerrainWaterFrames,
  loadTerrainWaterFlipbook,
  terrainWaterFor,
} from './terrainWater';
import { ENUM_WORLD } from '../../common';
import {
  createOZJTexture,
  isFlagInBinaryMask,
  readOJZBufferAsJPEGBuffer,
} from '../../common/utils';
import { consumeTerrainFile, terrainFilesFor } from './prefetchWorld';
import { unpackTerrainLight } from './unpackTerrainLight';
import {
  parseTerrainBulk,
  parseTerrainLightJpegOffThread,
  parseTerrainLightOffThread,
  buildGroundOffThread,
} from './terrainParseClient';
import { getTilesList } from '../../common/terrain/getTilesList';
import {
  SpecialHeight,
  TERRAIN_SIZE,
  TERRAIN_SIZE_MASK,
  TWFlags,
} from '../../common/terrain/consts';
import {
  initTerrainDynamicLight,
  packBakedTerrainLight,
  requestBodyTerrainLight,
  requestTerrainLight,
} from '../../common/terrainDynamicLight';
import { lightingTier } from '../../common/lightingQuality';
import { World, type TerrainLayers } from '../../ecs/world';
import { DEBUG_SHOW_TERRAIN_ATTRIBUTES } from '../../consts';
import { assetWorldNum } from '../../common/worldAssets';
import { devQuery } from '../../common/devSeams';
import { maps } from '../../maps';

const TERRAIN_AMBIENT = 0;

/**
 * `?lightDecode=gpu`: the light map through a GPU texture and a synchronous
 * `readPixels`, and a texture per tile beside the array, as loads used to be.
 */
const LIGHT_DECODE_GPU = devQuery('lightDecode') === 'gpu';

function GetTerrainIndex(x: number, y: number) {
  return ~~(~~y * TERRAIN_SIZE + ~~x);
}

/**
 * Everything `getTerrainData` needs that can fail - the downloads, the worker
 * parse (incl. the anti-tamper probe), the JPEG decodes - gathered *before*
 * the current map is torn down, so a failed warp leaves the old map standing
 * (`loadMapIntoScene`). Holds GPU textures: `disposePreparedTerrain` if the
 * build never happens.
 */
export type PreparedTerrain = Awaited<ReturnType<typeof prepareTerrain>>;

export async function prepareTerrain(scene: Scene, map: ENUM_WORLD) {
  // Blood / Chaos Castle instances all read one folder (worldAssets.ts).
  const worldNum = assetWorldNum(map);
  const textureNames = getTilesList(map);

  // The five terrain files and the tiles go out together; a prefetch started
  // on the gate trigger / warp request is the same promise (prefetchWorld.ts).
  const [
    terrainAttributeBytes,
    terrainHeightBytes,
    terrainMappingBytes,
    terrainLightBytes,
    objsBuffer,
    ...tileBytes
  ] = await Promise.all(terrainFilesFor(map).map(consumeTerrainFile));

  // Height, attributes, tile mapping and the object list are pure typed-array
  // work - no engine, no DOM - so they run in a worker (todo C8) instead of
  // blocking the frame for the length of a map change. The client falls back
  // to running them inline if the worker is unavailable.
  const bulk = await parseTerrainBulk(
    map,
    terrainHeightBytes,
    terrainAttributeBytes,
    terrainMappingBytes,
    objsBuffer
  );

  const lightName = `World${worldNum}/TerrainLight.OZJ`;

  let terrainTextures: Texture[] = [];
  let tileArrayReady: Promise<TileTextureArray | null> = Promise.resolve(null);
  let lightReady: Promise<Float32Array>;

  // The bake's border vignette comes off on the tiers that can frame it
  // (`common/terrain/borderVignette.ts`); Classic keeps the original's fade.
  if (LIGHT_DECODE_GPU) {
    const [lightTextureData, textures] = await Promise.all([
      readOJZBufferAsJPEGBuffer(scene, lightName, terrainLightBytes),
      createTileTextures(scene, worldNum, textureNames, tileBytes),
    ]);
    lightTextureData.Texture.dispose();
    terrainTextures = textures;
    lightReady = parseTerrainLightOffThread(
      lightTextureData.BufferFloat,
      bulk.height,
      lightingTier() !== null
    );
  } else {
    if (terrainLightBytes.length < 24) {
      throw new Error(`The file ${lightName} is too small to be as a OZJ`);
    }

    // A CPU decode in the worker, like the original's OpenTerrainLight; the
    // tiles decode and pack for the array meanwhile.
    const lightJpeg = terrainLightBytes.slice(24);
    if (USE_TILE_TEXTURE_ARRAY) {
      tileArrayReady = createTileArray(scene, tileBytes);
    }
    lightReady = parseTerrainLightJpegOffThread(
      lightJpeg,
      bulk.height,
      lightingTier() !== null
    );
  }

  try {
    const lightPacked = await lightReady;
    const terrainLight = unpackTerrainLight(lightPacked);

    // The ground's vertex arrays, built in the worker while the tiles pack
    // and the water frames load; `getTerrainData` only uploads them.
    const ground = buildGroundOffThread(
      bulk.height,
      bulk.attributes,
      bulk.layer1,
      bulk.layer2,
      bulk.alpha,
      lightPacked,
      TERRAIN_AMBIENT
    );

    if (LIGHT_DECODE_GPU) tileArrayReady = createTileArray(scene, tileBytes);
    const tileArray = await tileArrayReady;

    // With an array the splat shader never binds a per-tile texture; they are
    // built only for the sampler chain it falls back to.
    if (!LIGHT_DECODE_GPU && !tileArray) {
      terrainTextures = await createTileTextures(
        scene,
        worldNum,
        textureNames,
        tileBytes
      );
    }

    // Animated water (terrainWater.ts): the option and the registry are read
    // here, at load, so a map without water - or the option off - hands the
    // material nothing and the shader compiles exactly as before.
    const waterSpec = terrainWaterFor(map);
    const waterFrames = waterSpec
      ? await loadTerrainWaterFlipbook(scene, waterSpec)
      : [];

    // The grass cards: which layer-1 slots grow anything here, and what colour.
    // Deliberately not in `terrainFilesFor` - that list is destructured
    // positionally above, and these are optional files besides.
    const grassCards = await loadGrassCards(scene, worldNum);

    return {
      worldNum,
      bulk,
      terrainLight,
      terrainTextures,
      tileArray,
      waterSpec,
      waterFrames,
      grassCards,
      ground: await ground,
    };
  } catch (error) {
    for (const texture of terrainTextures) texture.dispose();
    // A light map that fails first leaves the array still packing.
    void tileArrayReady.then(array => array?.texture.dispose());
    throw error;
  }
}

/**
 * Packs the tiles into one sampler2DArray so the splat shader does two
 * fetches per pixel instead of a guarded one per layer (tileTextureArray.ts).
 * OZJ is a JPEG behind a 24-byte header. A failure here is not fatal: the
 * material falls back to the per-tile sampler chain.
 */
function createTileArray(
  scene: Scene,
  tileBytes: readonly Uint8Array[]
): Promise<TileTextureArray | null> {
  return createTileTextureArray(
    scene,
    tileBytes.map(bytes => bytes.slice(24))
  ).catch((error: unknown) => {
    console.warn(
      'Tile texture array unavailable, using per-tile samplers:',
      error
    );
    return null;
  });
}

/** A texture per tile, for the per-tile sampler chain. */
function createTileTextures(
  scene: Scene,
  worldNum: number,
  textureNames: readonly string[],
  tileBytes: readonly Uint8Array[]
): Promise<Texture[]> {
  // `allSettled`, not `all`: one bad tile used to leave every texture that
  // did decode on the GPU with nothing left holding it.
  return Promise.allSettled(
    textureNames.map((t, i) =>
      createOZJTexture(
        scene,
        `World${worldNum}/${t}.OZJ`.replace('.', `_${i}.`),
        tileBytes[i]
      )
    )
  ).then(results => {
    const made = results.flatMap(r =>
      r.status === 'fulfilled' ? [r.value] : []
    );
    const failed = results.find(r => r.status === 'rejected');
    if (failed) {
      for (const texture of made) texture.dispose();
      throw failed.reason;
    }
    return made;
  });
}

export function disposePreparedTerrain(prepared: PreparedTerrain): void {
  for (const texture of prepared.terrainTextures) texture.dispose();
  prepared.tileArray?.texture.dispose();
  disposeTerrainWaterFrames(prepared.waterFrames);
}

export async function getTerrainData(
  world: World,
  map: ENUM_WORLD,
  prepared?: PreparedTerrain
) {
  const scene = world.scene;
  const {
    worldNum,
    bulk,
    terrainLight,
    terrainTextures,
    tileArray,
    waterSpec,
    waterFrames,
    grassCards,
    ground,
  } = prepared ?? (await prepareTerrain(scene, map));

  const terrainHeight = bulk.height;
  const terrainAttrs = bulk.attributes;
  const terrainMapping = {
    layer1: bulk.layer1,
    layer2: bulk.layer2,
    alpha: bulk.alpha,
  };
  const objects = bulk.objects;

  updateTerrainHeightMap(scene, terrainHeight);

  const terrain = createGroundMesh('_world_' + worldNum, scene, ground);
  terrain.isPickable = true;

  // Click-to-move, the cursor sampler and the right-click ground pick all
  // ray-cast against this mesh, several times a second while a button is
  // held. Without an octree `Mesh.intersects` walks every one of its 131 072
  // triangles per pick; with one it descends to a handful of blocks.
  terrain.createOrUpdateSubmeshesOctree(64, 4);

  terrain.metadata = {
    terrain: true,
  };

  const texturesData = terrainTextures.map(texture => {
    const size = texture.getSize().height;
    let scale = size;
    if (scale === 256) {
      scale /= 4;
    }
    return { texture, scale };
  });

  terrain.material = createTerrainMaterial(
    scene,
    { name: 'TerrainMaterial' },
    {
      texturesData,
      tileArray,
      // Ground-contact weather for this map: wet stone and puddles on
      // Lorencia and Noria, settled snow on Devias. Empty everywhere else,
      // and the shader is then exactly what it always was.
      overlays: terrainOverlaysFor(map),
      // The `AlphaTile*` slot, where this map has one: those tiles are a hole
      // in the ground, not a texture. Null everywhere else, and the shader is
      // then exactly what it always was.
      cutout: maps.cutoutTileFor(map),
      // Animated water: Atlans' wave deformation and caustics flipbook.
      water: waterSpec
        ? createTerrainWaterRuntime(waterSpec, waterFrames)
        : null,
    }
  );

  // The world's outer frame: the ground carried past the last tile row, so
  // the map ends in a coast instead of a cut (terrainEdge.ts). It shares this
  // material, which is what keeps the sea outside the map in step with the
  // sea inside it. Classic draws none of it, the way it draws no sky dome.
  if (lightingTier()) {
    const edge = createTerrainEdge('_worldEdge_' + worldNum, scene, {
      height: terrainHeight,
      layer1: terrainMapping.layer1,
      layer2: terrainMapping.layer2,
      alpha: terrainMapping.alpha,
      light: terrainLight,
      ambient: Vector3.One().setAll(TERRAIN_AMBIENT),
    });

    if (edge) {
      edge.material = terrain.material;
      edge.renderingGroupId = terrain.renderingGroupId;
      // Goes with the ground it frames. Its own dispose leaves the material
      // alone: the two share one, and the teardown already disposes it.
      terrain.onDisposeObservable.addOnce(() => edge.dispose(false, false));
    }
  }

  // The grass layer stands on this ground and is lit by it (terrainGrass.ts).
  // Built from the same arrays the mesh above was: the splat says which tiles
  // grow anything, the height array where the roots sit, `terrainLight` what
  // the bake says, and the cards which slots have grass at all and what
  // colour it is. A map that ships no card builds nothing, and neither does
  // density 0.
  installGrassField(scene, map, {
    layer1: terrainMapping.layer1,
    layer2: terrainMapping.layer2,
    alpha: terrainMapping.alpha,
    attributes: terrainAttrs,
    height: terrainHeight,
    light: terrainLight,
    cards: grassCards,
  });

  if (DEBUG_SHOW_TERRAIN_ATTRIBUTES) {
    const plane = CreatePlane('_terrainPlane', { size: 256 }, scene);
    plane.isPickable = false;
    plane.position.set(128 + 0.5, 128 - 0.5, 1.68);
    plane.rotationQuaternion = null;
    plane.rotation.y = Math.PI;
    const planeMat = new StandardMaterial('_terrainPlaneMat', scene);
    planeMat.disableLighting = true;
    planeMat.specularColor.set(0, 0, 0);
    plane.material = planeMat;
    const pixels = new Uint8Array(256 * 256 * 4);
    for (let i = 0; i < TERRAIN_SIZE; i++) {
      for (let j = 0; j < TERRAIN_SIZE; j++) {
        const ind = i * TERRAIN_SIZE + j;

        const index =
          ((TERRAIN_SIZE - i) * TERRAIN_SIZE + (TERRAIN_SIZE - j)) * 4;

        const attr = terrainAttrs[ind];
        pixels[index + 0] = attr & TWFlags.NoMove ? 255 : 0;
        pixels[index + 1] = attr & TWFlags.SafeZone ? 255 : 0;
      }
    }

    planeMat.transparencyMode = 2;
    planeMat.alpha = 0.5;
    planeMat.emissiveTexture = RawTexture.CreateRGBATexture(
      pixels,
      256,
      256,
      scene,
      false,
      false,
      Texture.NEAREST_NEAREST
    );
  }

  // Off the 256×256 grid there is no ground: `x >= 256` used to read the next
  // row and `y >= 256` read `undefined` (a walkable 0), so paths could leave
  // the map. The original clamps the caller; the clone answers a wall.
  const OFF_MAP_FLAGS = TWFlags.NoMove | TWFlags.NoGround;

  function RequestTerrainFlag(xf: number, yf: number) {
    if (xf < 0 || yf < 0 || xf >= TERRAIN_SIZE || yf >= TERRAIN_SIZE) {
      return OFF_MAP_FLAGS;
    }

    const xi = ~~xf;
    const yi = ~~yf;

    return terrainAttrs[GetTerrainIndex(xi, yi)];
  }

  /**
   * `AddTerrainAttributeRange` (ZzzOpenData.cpp): set or clear one flag over a
   * `w`×`h` block of tiles. The Chaos Castle arena closes its rings and the
   * Blood Castle gate opens its pit through this, and so does the server's
   * `ChangeTerrainAttributes` packet (terrainAttributeUpdates.ts).
   */
  function SetTerrainFlags(
    x: number,
    y: number,
    w: number,
    h: number,
    flag: number,
    set: boolean
  ) {
    const openedIds: number[] = [];
    const closedIds: number[] = [];

    for (let yi = y; yi < y + h; yi++) {
      if (yi < 0 || yi >= TERRAIN_SIZE) continue;
      for (let xi = x; xi < x + w; xi++) {
        if (xi < 0 || xi >= TERRAIN_SIZE) continue;
        const i = GetTerrainIndex(xi, yi);
        terrainAttrs[i] = set ? terrainAttrs[i] | flag : terrainAttrs[i] & ~flag;

        if (world.pathfinder) {
          const id = xi * TERRAIN_SIZE + yi;
          if (IsWalkable(xi, yi)) {
            openedIds.push(id);
          } else {
            closedIds.push(id);
          }
        }
      }
    }

    if (openedIds.length > 0) {
      world.pathfinder.applyOpenedPatch(openedIds);
    }
    if (closedIds.length > 0) {
      world.pathfinder.applyClosedPatch(closedIds);
    }
  }

  function RequestTerrainHeight(xf: number, yf: number) {
    if (xf < 0 || yf < 0) return 0;

const xi = ~~xf;
    const yi = ~~yf;

    const index = GetTerrainIndex(xi, yi);

const xd = xf - xi;
    const yd = yf - yi;

    const x1 = xi & TERRAIN_SIZE_MASK,
      y1 = yi & TERRAIN_SIZE_MASK;
    const x2 = (xi + 1) & TERRAIN_SIZE_MASK,
      y2 = (yi + 1) & TERRAIN_SIZE_MASK;

    const i1 = y1 * TERRAIN_SIZE + x1;
    const i2 = y1 * TERRAIN_SIZE + x2;
    const i3 = y2 * TERRAIN_SIZE + x2;
    const i4 = y2 * TERRAIN_SIZE + x1;

    const h1 = terrainHeight[i1];
    const h2 = terrainHeight[i2];
    const h3 = terrainHeight[i3];
    const h4 = terrainHeight[i4];

    return (
      (1 - xd) * (1 - yd) * h1 +
      xd * (1 - yd) * h2 +
      xd * yd * h3 +
      (1 - xd) * yd * h4
    );
  }

  function IsWalkable(x: number, y: number) {
    const terrainFlag = RequestTerrainFlag(x, y);
    return (
      !isFlagInBinaryMask(terrainFlag, TWFlags.NoMove) &&
      !isFlagInBinaryMask(terrainFlag, TWFlags.NoGround)
    );
  }

  function GetTerrainTile(x: number, y: number) {
    if (x < 0 || y < 0 || x >= TERRAIN_SIZE || y >= TERRAIN_SIZE) return 0;

    const xi = ~~x;
    const yi = ~~y;

    return terrainMapping.layer1[GetTerrainIndex(xi, yi)];
  }

  /**
   * Both mapping layers and their blend, as the ground mesh draws them
   * (`customGroundMesh.addTile`): a tile whose alpha is full everywhere is
   * drawn as layer 2 alone, otherwise layer 2 is mixed over layer 1 by the
   * per-vertex alpha. The tile's own corner alpha stands in for the mesh's
   * interpolation here.
   */
  function GetTerrainLayers(x: number, y: number, out: TerrainLayers) {
    if (x < 0 || y < 0 || x >= TERRAIN_SIZE || y >= TERRAIN_SIZE) {
      out.layer1 = 0;
      out.layer2 = 255;
      out.alpha = 0;
      return;
    }

    const i = GetTerrainIndex(~~x, ~~y);
    const layer2 = terrainMapping.layer2[i];

    out.layer1 = terrainMapping.layer1[i];
    out.layer2 = layer2;
    out.alpha = layer2 === 255 ? 0 : terrainMapping.alpha[i] / 255;
  }

  initTerrainDynamicLight(
    packBakedTerrainLight(terrainLight, TERRAIN_AMBIENT)
  );

  const lightScratch = new Vector3();

  function RequestTerrainLight(x: number, y: number): IVector3Like {
    if (x < 0 || y < 0 || x >= TERRAIN_SIZE || y >= TERRAIN_SIZE) {
      return Vector3.OneReadOnly;
    }

    // Classic: PrimaryTerrainLight (bake + delta), the original's BodyLight.
    // Tiers >= 1: the bake, floored by the dynamic light on the tile - the
    // pool lights reach a surface per pixel, but only through the bake they
    // are multiplied by.
    const lit = lightingTier()
      ? requestBodyTerrainLight(x, y, lightScratch)
      : requestTerrainLight(x, y, lightScratch);

    if (lit) return lightScratch;

    const light = terrainLight[GetTerrainIndex(~~x, ~~y)];

    if (!light) return Vector3.OneReadOnly;

    return lightScratch.set(
      TERRAIN_AMBIENT + light.x * (1 - TERRAIN_AMBIENT),
      TERRAIN_AMBIENT + light.y * (1 - TERRAIN_AMBIENT),
      TERRAIN_AMBIENT + light.z * (1 - TERRAIN_AMBIENT)
    );
  }

  return {
    objects,
    terrain,
    terrainHeight,
    RequestTerrainHeight,
    IsWalkable,
    RequestTerrainFlag,
    SetTerrainFlags,
    GetTerrainTile,
    GetTerrainLayers,
    RequestTerrainLight,
  };
}
