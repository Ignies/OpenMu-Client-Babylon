import type { ModelObject } from '../render';

/**
 * Model classes that content registers for its own types: a monster or NPC with its own look
 * (`versions/shared/monsters/<name>/model.ts`) calls `registerModelClass(type, Class)` when it loads.
 * `resolveModelFactory` asks here before the generic tables.
 */
const classes = new Map<number, typeof ModelObject>();

export function registerModelClass(types: number | readonly number[], cls: typeof ModelObject): void {
  for (const type of typeof types === 'number' ? [types] : types) classes.set(type, cls);
}

export function registeredModelClass(type: number): typeof ModelObject | undefined {
  return classes.get(type);
}
