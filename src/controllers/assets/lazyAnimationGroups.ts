/**
 * A model clone's clips, each cloned the first time it is read: `instantiateModelsToScene` cloned
 * every clip for every copy (the player rig carries 284) while a copy plays a handful. See readme.
 */
import type { AnimationGroup, Node } from '../render/babylon/exports';

type Hook = (group: AnimationGroup, index: number) => void;

interface Lazy {
  sources: (AnimationGroup | undefined)[];
  slots: (AnimationGroup | undefined)[];
  hooks: Hook[];
  make: (source: AnimationGroup) => AnimationGroup | null;
}

const LAZY = Symbol('lazyAnimationGroups');

function lazyOf(groups: readonly AnimationGroup[]): Lazy | undefined {
  return (groups as { [LAZY]?: Lazy })[LAZY];
}

function clipAt(lazy: Lazy, index: number): AnimationGroup | undefined {
  const held = lazy.slots[index];
  const source = lazy.sources[index];
  if (held || !source) return held;
  const group = lazy.make(source);
  if (!group) return undefined;
  lazy.slots[index] = group;
  for (const hook of lazy.hooks) hook(group, index);
  return group;
}

function cloned(lazy: Lazy): AnimationGroup[] {
  return lazy.slots.filter((group): group is AnimationGroup => !!group);
}

/**
 * An array over `sources` whose index `i` clones clip `i` with `make` on first read (`make` returns
 * null once the copy is gone). `length` counts every clip; iterating walks only the clips cloned so
 * far, with their own index: one never cloned is not playing and holds nothing to stop or dispose.
 */
export function lazyAnimationGroups(sources: readonly AnimationGroup[], make: Lazy['make']): AnimationGroup[] {
  const lazy: Lazy = { sources: [...sources], slots: sources.map(() => undefined), hooks: [], make };
  const methods: Record<PropertyKey, unknown> = {
    [LAZY]: lazy,
    [Symbol.iterator]: () => cloned(lazy)[Symbol.iterator](),
    forEach: (fn: Hook) => lazy.slots.forEach((group, i) => group && fn(group, i)),
    some: (fn: (group: AnimationGroup, index: number) => boolean) => lazy.slots.some((group, i) => !!group && fn(group, i)),
    // A clip made later (band/music/instrumentClip.ts) goes on the end as it is, as on an array.
    push: (...added: AnimationGroup[]) => lazy.slots.push(...added),
  };
  return new Proxy([] as AnimationGroup[], {
    get(_target, prop) {
      if (typeof prop === 'string') {
        const c = prop.charCodeAt(0);
        if (c >= 48 && c <= 57) return clipAt(lazy, Number(prop));
        if (prop === 'length') return lazy.slots.length;
      }
      if (prop in methods) return methods[prop];
      // Anything else (map, filter, ...) sees the clips cloned so far.
      const list = cloned(lazy);
      const value: unknown = Reflect.get(list, prop);
      return typeof value === 'function' ? value.bind(list) : value;
    },
  });
}

/** Runs `fn` on every clip there is and, on a lazy list, on each one cloned later. */
export function forEachAnimationGroup(groups: readonly AnimationGroup[], fn: Hook): void {
  groups.forEach(fn);
  lazyOf(groups)?.hooks.push(fn);
}

/** Clip `index` for reading its keys and range, without cloning it (a clone shares its source's animations). */
export function animationGroupSource(groups: readonly AnimationGroup[], index: number): AnimationGroup | undefined {
  const lazy = lazyOf(groups);
  return lazy ? (lazy.slots[index] ?? lazy.sources[index]) : groups[index];
}

/** A node's names from its model's root down: the loader names each clone after its source. */
function pathOf(node: Node): string {
  let path = node.name;
  for (let n = node.parent; n; n = n.parent) path = `${n.name}/${path}`;
  return path;
}

function eachNode(roots: readonly Node[], fn: (node: Node) => void): void {
  for (const root of roots) {
    fn(root);
    for (const node of root.getDescendants(false)) fn(node);
  }
}

/** Source nodes onto their clones by name path; null when a path is shared or missing. */
export function cloneTargets(sourceRoots: readonly Node[], cloneRoots: readonly Node[]): Map<Node, Node> | null {
  const byPath = new Map<string, Node | null>();
  eachNode(cloneRoots, node => {
    const path = pathOf(node);
    byPath.set(path, byPath.has(path) ? null : node);
  });
  const map = new Map<Node, Node>();
  let complete = true;
  eachNode(sourceRoots, node => {
    const clone = byPath.get(pathOf(node));
    if (clone) map.set(node, clone);
    else complete = false;
  });
  return complete ? map : null;
}
