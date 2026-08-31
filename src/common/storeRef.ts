/**
 * A late-bound handle on `Store` for modules that `store.ts` itself (through
 * `logic.ts` → `modelFactoryPerId.ts` → the monster classes) depends on.
 *
 * `common/modelObject.ts` needs `Store.world` at *call* time only, but a
 * value import of `../store` closed the cycle
 * `monsterObject → modelObject → store → logic → modelFactoryPerId →
 * genericMonster → monsterObject`; on a vite HMR re-evaluation the
 * `class MonsterObject extends ModelObject` line ran before `ModelObject`
 * was initialised ("Cannot access 'ModelObject' before initialization",
 * B14). `store.ts` registers itself here once it exists; this file imports
 * nothing at runtime, so it can sit anywhere in the graph.
 */
import type { Store as StoreType } from '../store';

type StoreInstance = typeof StoreType;

let current: StoreInstance | null = null;

/** Called once by `store.ts` right after `Store` is constructed. */
export function registerStore(store: StoreInstance): void {
  current = store;
}

/** The live `Store`; throws if asked for before `store.ts` has evaluated. */
export function storeRef(): StoreInstance {
  if (!current) throw new Error('storeRef(): Store is not registered yet');
  return current;
}
