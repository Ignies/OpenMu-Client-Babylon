import { makeObservable, observable } from 'mobx';
import type { World } from './world';

/**
 * The live ECS world: null until `app/boot.tsx` builds it. Observable, so a window that reads
 * `Ecs.world` draws again once it exists. Imports nothing at run time but mobx, so any layer can read it.
 */
export const Ecs = new (class {
  world: World | null = null;

  constructor() {
    makeObservable(this, { world: observable });
  }
})();

// A second instance after a hot update would hand later importers an empty world.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
