import {
  CreatePlane,
  RawTexture,
  StandardMaterial,
  Texture,
  Vector3,
} from '../babylon/exports';
import type { IVector3Like, Scene } from '../babylon/exports';
import { CreateGroundFromHeightMap } from './customGroundMesh';
import { createTileTextureArray } from './tileTextureArray';
import { updateTerrainHeightMap } from './terrainHeightMap';
import { createTerrainMaterial } from './terrainMaterial';
import { terrainOverlaysFor } from './terrainOverlay';
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
  parseTerrainLightOffThread,
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
  requestTerrainLight,
} from '../../common/terrainDynamicLight';
import { World, type TerrainLayers } from '../../ecs/world';
import { DEBUG_SHOW_TERRAIN_ATTRIBUTES } from '../../consts';
import { assetWorldNum } from '../../common/worldAssets';

const TERRAIN_AMBIENT = 0;

function GetTerrainIndex(x: number, y: number) {
  return ~~(~~y * TERRAIN_SIZE + ~~x);
}

/**
 * Everything `getTerrainData` needs that can fail — the downloads, the worker
 * parse (incl. the anti-tamper probe), the JPEG decodes — gathered *before*
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
  // work — no engine, no DOM — so they run in a worker (todo C8) instead of
  // blocking the frame for the length of a map change. The client falls back
  // to running them inline if the worker is unavailable.
  const bulk = await parseTerrainBulk(
    map,
    terrainHeightBytes,
    terrainAttributeBytes,
    terrainMappingBytes,
    objsBuffer
  );

  // The lightmap decode has to stay here: it goes through the engine's
  // texture path. Only the normal/luminosity pass over the result is
  // offloaded. The per-tile textures only need the GPU copy (no readback):
  // `createOZJTexture`.
  const [lightTextureData, terrainTextures] = await Promise.all([
    readOJZBufferAsJPEGBuffer(
      scene,
      `World${worldNum}/TerrainLight.OZJ`,
      terrainLightBytes
    ),
    Promise.all(
      textureNames.map((t, i) =>
        createOZJTexture(
          scene,
          `World${worldNum}/${t}.OZJ`.replace('.', `_${i}.`),
          tileBytes[i]
        )
      )
    ),
  ]);
  lightTextureData.Texture.dispose();

  const terrainLight = unpackTerrainLight(
    await parseTerrainLightOffThread(lightTextureData.BufferFloat, bulk.height)
  );

  // Packs the same tiles into one sampler2DArray so the splat shader does two
  // fetches per pixel instead of a guarded one per layer (tileTextureArray.ts).
  // OZJ is a JPEG behind a 24-byte header. A failure here is not fatal: the
  // material falls back to the per-tile sampler chain.
  const tileArray = await createTileTextureArray(
    scene,
    tileBytes.map(bytes => bytes.slice(24))
  ).catch((error: unknown) => {
    console.warn(
      'Tile texture array unavailable, using per-tile samplers:',
      error
    );
    return null;
  });

  return { worldNum, bulk, terrainLight, terrainTextures, tileArray };
}

export function disposePreparedTerrain(prepared: PreparedTerrain): void {
  for (const texture of prepared.terrainTextures) texture.dispose();
  prepared.tileArray?.texture.dispose();
}

export async function getTerrainData(
  world: World,
  map: ENUM_WORLD,
  prepared?: PreparedTerrain
) {
  const scene = world.scene;
  const { worldNum, bulk, terrainLight, terrainTextures, tileArray } =
    prepared ?? (await prepareTerrain(scene, map));

  const terrainHeight = bulk.height;
  const terrainAttrs = bulk.attributes;
  const terrainMapping = {
    layer1: bulk.layer1,
    layer2: bulk.layer2,
    alpha: bulk.alpha,
  };
  const objects = bulk.objects;

  updateTerrainHeightMap(scene, terrainHeight);

  const terrain = CreateGroundFromHeightMap(
    '_world_' + worldNum,
    scene,
    terrainHeight,
    terrainMapping.layer1,
    terrainMapping.layer2,
    terrainMapping.alpha,
    terrainLight,
    terrainAttrs,
    Vector3.One().setAll(TERRAIN_AMBIENT)
  );
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
    }
  );

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
    for (let yi = y; yi < y + h; yi++) {
      if (yi < 0 || yi >= TERRAIN_SIZE) continue;
      for (let xi = x; xi < x + w; xi++) {
        if (xi < 0 || xi >= TERRAIN_SIZE) continue;
        const i = GetTerrainIndex(xi, yi);
        terrainAttrs[i] = set ? terrainAttrs[i] | flag : terrainAttrs[i] & ~flag;
      }
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

    if (requestTerrainLight(x, y, lightScratch)) return lightScratch;

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
