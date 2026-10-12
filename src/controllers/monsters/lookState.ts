/**
 * Event states a monster's look turns on (Kanturu's Maya direction state for the Maya hands), filled by the module
 * that owns each when it installs and read by the monster folders' rows. 0 until set.
 */
export type LookStateName = 'kanturuMaya';

const readers = new Map<LookStateName, () => number>();

/** The owning module: where `name` is read from from now on. */
export function setLookState(name: LookStateName, read: () => number): void {
  readers.set(name, read);
}

/** A row: the state now, 0 when nothing owns it. */
export function lookState(name: LookStateName): number {
  return readers.get(name)?.() ?? 0;
}
