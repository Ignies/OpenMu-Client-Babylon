/**
 * Event states a monster's look turns on (Kanturu's Maya direction state for the Maya hands, Selupan's Raklion
 * pattern), filled by the module that owns each when it installs and read by the monster folders' rows. 0 until set.
 */
export type LookStateName = 'kanturuMaya' | 'raklionSelupan';

const readers = new Map<LookStateName, () => number>();

/** The owning module: where `name` is read from from now on. */
export function setLookState(name: LookStateName, read: () => number): void {
  readers.set(name, read);
}

/** A row: the state now, 0 when nothing owns it. */
export function lookState(name: LookStateName): number {
  return readers.get(name)?.() ?? 0;
}

/** One-shot event cues: an event state just reached, which the first body that reads it takes (Crywolf's START). */
export type LookCueName = 'crywolfStart';

const cues = new Set<LookCueName>();

/** The owning module: the state was just reached (`true`), or the cue is dropped (`false`, a warp). */
export function cueLook(name: LookCueName, on = true): void {
  if (on) cues.add(name);
  else cues.delete(name);
}

/** A body: true once after `cueLook`, then false until it is cued again. */
export function takeLookCue(name: LookCueName): boolean {
  return cues.delete(name);
}
