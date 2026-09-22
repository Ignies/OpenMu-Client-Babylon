import { type Scene, VertexData, Mesh } from '../babylon/exports';
import type { GroundArrays } from '../../common/terrain/groundArrays';

/** Uploads the arrays `buildGroundArrays` built, in the terrain worker on a map load. */
export function createGroundMesh(
  name: string,
  scene: Scene,
  arrays: GroundArrays
): Mesh {
  const ground = new Mesh(name, scene);

  const vertexData = new VertexData();

  vertexData.indices = arrays.indices;
  vertexData.positions = arrays.positions;
  vertexData.normals = arrays.normals;
  vertexData.uvs = arrays.uvs;
  vertexData.uvs2 = arrays.textures;
  vertexData.colors = arrays.colors;
  vertexData.matricesWeights = arrays.alphaColors;

  vertexData.applyToMesh(ground, true);

  return ground;
}
