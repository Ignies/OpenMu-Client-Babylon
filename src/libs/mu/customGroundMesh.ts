import { TERRAIN_SIZE, TWFlags } from '../../common/terrain/consts';
import { TERRAIN_INDEX } from '../../common/terrain/utils';
import { isFlagInBinaryMask } from '../../common/utils';
import {
  type Scene,
  VertexData,
  Mesh,
  Scalar,
  IVector2Like,
  IVector3Like,
  Vector3,
} from '../babylon/exports';

function clamp(n: number) {
  return n >= TERRAIN_SIZE ? TERRAIN_SIZE - 1 : n;
}

function getTerrainIndex(x: number, y: number) {
  return TERRAIN_INDEX(clamp(x), clamp(y));
}

const tilesCountPerSide = 256;
const v3Temp = Vector3.Zero();

export function CreateGroundFromHeightMap(
  name: string,
  scene: Scene,
  heightBuffer: Float32Array,
  layer1: Uint8Array,
  layer2: Uint8Array,
  alpha: Uint8Array,
  backTerrainLight: IVector3Like[],
  terrainFlags: Uint16Array,
  ambientLight: Vector3
): Mesh {
  const ground = new Mesh(name, scene);

  const indices: number[] = [];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const textures: number[] = [];
  const colors: number[] = [];
  const alphaColors: number[] = [];

  function buildVertexLight(index: number, pos?: IVector2Like) {
    const count = backTerrainLight.length;
    const color = v3Temp;

    if (index < count) {
      color.copyFrom(backTerrainLight[index] as any);
    }

    color.x = ambientLight.x + color.x * (1 - ambientLight.x);
    color.y = ambientLight.y + color.y * (1 - ambientLight.y);
    color.z = ambientLight.z + color.z * (1 - ambientLight.z);

return color.asArray();
  }

  function applyAlphaToLights(a1: number, a2: number, a3: number, a4: number) {
    let index = alphaColors.length - 4 * 4;

    a1 = a1 / 255;
    a2 = a2 / 255;
    a3 = a3 / 255;
    a4 = a4 / 255;

    alphaColors[index++] *= a1;
    alphaColors[index++] *= a1;
    alphaColors[index++] *= a1;
    alphaColors[index++] = a1;
    alphaColors[index++] *= a2;
    alphaColors[index++] *= a2;
    alphaColors[index++] *= a2;
    alphaColors[index++] = a2;
    alphaColors[index++] *= a3;
    alphaColors[index++] *= a3;
    alphaColors[index++] *= a3;
    alphaColors[index++] = a3;
    alphaColors[index++] *= a4;
    alphaColors[index++] *= a4;
    alphaColors[index++] *= a4;
    alphaColors[index++] = a4;
  }

  function prepareVertices(
    x: number,
    y: number,
    idx1: number,
    idx2: number,
    idx3: number,
    idx4: number
  ) {
    const flag = terrainFlags[getTerrainIndex(x, y)];
    const noGround = isFlagInBinaryMask(flag, TWFlags.NoGround);

    const h1 = noGround ? -10000 : heightBuffer[idx1];
    const h2 = noGround ? -10000 : heightBuffer[idx2];
    const h3 = noGround ? -10000 : heightBuffer[idx3];
    const h4 = noGround ? -10000 : heightBuffer[idx4];

    positions.push(x, h1, y);
    positions.push(x + 1, h2, y);
    positions.push(x + 1, h3, y + 1);
    positions.push(x, h4, y + 1);

    normals.push(0, 0, 0);
    normals.push(0, 0, 0);
    normals.push(0, 0, 0);
    normals.push(0, 0, 0);
  }

  function prepareLights(
    x: number,
    y: number,
    idx1: number,
    idx2: number,
    idx3: number,
    idx4: number
  ) {
    colors.push(...buildVertexLight(idx1), 1);
    colors.push(...buildVertexLight(idx2), 1);
    colors.push(...buildVertexLight(idx3), 1);
    colors.push(...buildVertexLight(idx4), 1);

    alphaColors.push(...buildVertexLight(idx1), 0);
    alphaColors.push(...buildVertexLight(idx2), 0);
    alphaColors.push(...buildVertexLight(idx3), 0);
    alphaColors.push(...buildVertexLight(idx4), 0);
  }

  function prepareUVs(x: number, y: number) {
    x = x < 0 ? 0 : x;
    y = y < 0 ? 0 : y;

    uvs.push(x / tilesCountPerSide, y / tilesCountPerSide);
    uvs.push((x + 1) / tilesCountPerSide, y / tilesCountPerSide);
    uvs.push((x + 1) / tilesCountPerSide, (y + 1) / tilesCountPerSide);
    uvs.push(x / tilesCountPerSide, (y + 1) / tilesCountPerSide);
  }

  function addTile(x: number, y: number) {
    const idx = getTerrainIndex(x, y);
    const idx2 = getTerrainIndex(x + 1, y);
    const idx3 = getTerrainIndex(x + 1, y + 1);
    const idx4 = getTerrainIndex(x, y + 1);

    prepareVertices(x, y, idx, idx2, idx3, idx4);
    prepareLights(x, y, idx, idx2, idx3, idx4);
    prepareUVs(x, y);

    const a1 = idx < alpha.length ? alpha[idx] : 0;
    const a2 = idx2 < alpha.length ? alpha[idx2] : 0;
    const a3 = idx3 < alpha.length ? alpha[idx3] : 0;
    const a4 = idx4 < alpha.length ? alpha[idx4] : 0;

    const isOpaque = (a1 & a2 & a3 & a4) === 255;
    const hasAlpha = (a1 | a2 | a3 | a4) !== 0;

    const opaqueTexture = isOpaque ? layer2[idx] : layer1[idx];
    const alphaTexture = !isOpaque && hasAlpha ? layer2[idx] : -1;

    textures.push(opaqueTexture, alphaTexture);
    textures.push(opaqueTexture, alphaTexture);
    textures.push(opaqueTexture, alphaTexture);
    textures.push(opaqueTexture, alphaTexture);

    if (!isOpaque && hasAlpha) {
      applyAlphaToLights(a1, a2, a3, a4);
    }

    if (isOpaque) {
    } else {
    }
  }

  for (let y = 0; y < tilesCountPerSide; y++) {
    for (let x = 0; x < tilesCountPerSide; x++) {
      addTile(x, y);

      const idxOffset = (y * tilesCountPerSide + x) * 4;
      const idx1 = idxOffset + 0;
      const idx2 = idxOffset + 1;
      const idx3 = idxOffset + 2;
      const idx4 = idxOffset + 3;

      indices.push(idx1);
      indices.push(idx2);
      indices.push(idx3);

      indices.push(idx4);
      indices.push(idx1);
      indices.push(idx3);
    }
  }

  VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new VertexData();

  vertexData.indices = indices;
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.uvs2 = textures;
  vertexData.colors = colors;
  vertexData.matricesWeights = alphaColors;

  vertexData.applyToMesh(ground, true);

  return ground;
}
