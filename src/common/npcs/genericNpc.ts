import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';
import { npcModelFile } from './npcModelTable';

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
