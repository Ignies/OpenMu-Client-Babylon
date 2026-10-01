import type { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../src/controllers/render/modelObject';
import { npcModelFile } from '../../../src/controllers/actors/npcModelTable';

const cache = new Map<string, typeof ModelObject>();

export function npcFactoryFor(file: string, scale: number): typeof ModelObject {
  const key = `${file}:${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const path = npcModelFile(file);

  class GenericNpc extends ModelObject {
    static {
      GenericNpc.OverrideScale = scale;
    }

    async init(world: World) {
      this.load(await loadGLTF(path, world));
    }
  }

  Object.defineProperty(GenericNpc, 'name', { value: file });

  cache.set(key, GenericNpc);

  return GenericNpc;
}
