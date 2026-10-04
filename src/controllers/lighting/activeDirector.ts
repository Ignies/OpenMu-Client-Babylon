import type { LookDirector } from './director';

// The scene's look director, held apart from director.ts so the passes the director drives (sky dome,
// horizon) can read it without importing the director back.
let active: LookDirector | null = null;

/** The scene's director, for the readers (terrain, water, area hand-off). */
export function lookDirector(): LookDirector | null {
  return active;
}

/** `createLookDirector` hands its director over here. */
export function setLookDirector(director: LookDirector): void {
  active = director;
}
