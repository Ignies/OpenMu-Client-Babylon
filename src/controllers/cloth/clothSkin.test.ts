import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer, type Mesh } from '../render/babylon/exports';
import { BMDReader } from '../assets/bmd';
import { cornerOrder, weldCorners } from './clothSkin';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** Mesh `index` of a shipped GLB as `ModelObject.getMesh` finds it, and the same mesh of its BMD. */
async function meshes(file: string, index: number) {
  const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
  await import('@babylonjs/loaders/glTF/2.0/index');
  const bytes = readFileSync(`public/game-assets/${file}.glb`);
  const model = await SceneLoader.LoadAssetContainerAsync('', `data:;base64,${bytes.toString('base64')}`, scene, null, '.glb');
  const glb = model.meshes[0].getChildMeshes(false)[index];
  const bmd = new BMDReader().read(new Uint8Array(readFileSync(`Data/${file}.bmd`)), `${file.split('/')[0]}/`).Meshes[index];
  return { glb, bmd, dispose: () => model.dispose() };
}

describe('the mesh cloths\' meshes as the converter shipped them', () => {
  it('weld back into the BMD\'s vertices, bone for bone and triangle for triangle: the Magic Skeleton\'s and the Divine Pants\'', async () => {
    for (const [file, index, bone, pinned] of [
      ['Monster/Monster63', 2, 18, 7],
      ['Player/PantMaleTest20', 3, 2, 40],
    ] as const) {
      const { glb, bmd, dispose } = await meshes(file, index);
      const welded = weldCorners(
        glb.getVerticesData(VertexBuffer.PositionKind) ?? [],
        glb.getVerticesData(VertexBuffer.MatricesIndicesKind) ?? [],
        cornerOrder(glb as Mesh)
      );
      expect([...welded.nodes], file).toEqual(bmd.Vertices.map(v => v.Node));
      expect([...welded.triangles], file).toEqual(bmd.Triangles.flatMap(t => t.VertexIndex.slice(0, 3)));
      expect(bmd.Vertices.filter(v => v.Node === bone).length, file).toBe(pinned);
      dispose();
    }
  }, 60_000);

  it('hold the soul pants\' grids in mesh 2, two triangles a quad: 5 x 8 in t_PantMale19, 7 x 5 in PantMale23', async () => {
    for (const [file, hor, ver] of [
      ['Player/t_PantMale19', 5, 8],
      ['Player/PantMale23', 7, 5],
    ] as const) {
      const { glb, bmd, dispose } = await meshes(file, 2);
      expect([cornerOrder(glb as Mesh).length, bmd.Vertices.length], file).toEqual([(hor - 1) * (ver - 1) * 6, hor * ver]);
      dispose();
    }
  }, 60_000);
});
