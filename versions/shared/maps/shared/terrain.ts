import type { RestObject } from '@/controllers/terrain';

/**
 * Building blocks the maps' ground rows (`MapTerrain`) share. Plain data.
 * `useObjectAngle`: the hero takes the object's facing, not their own.
 */

/** A seat. */
export const sit = (useObjectAngle: boolean): RestObject => ({
  kind: 'sit',
  useObjectAngle,
});

/** A lean or a pose box. */
export const pose = (useObjectAngle: boolean): RestObject => ({
  kind: 'pose',
  useObjectAngle,
});

/** A healing spot (Noria's fountain). */
export const healing = (useObjectAngle: boolean): RestObject => ({
  kind: 'healing',
  useObjectAngle,
});
