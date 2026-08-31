/**
 * Stable React keys for objects that carry no id of their own (miniplex
 * entities, notice lines, items): the first time an object is seen it is
 * numbered, and it keeps that number for as long as it lives. Keying a list
 * by index instead re-mounts every node after a head removal and restarts
 * their CSS animations.
 */
const ids = new WeakMap<object, number>();
let next = 1;

export function stableKeyOf(target: object): number {
  let id = ids.get(target);
  if (id === undefined) {
    id = next++;
    ids.set(target, id);
  }
  return id;
}
