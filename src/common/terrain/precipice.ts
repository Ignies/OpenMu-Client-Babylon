import { TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';

/**
 * The precipices: what a map's `NoGround` tiles look like from the rim.
 *
 * `CreateGroundFromHeightMap` drops a `NoGround` tile's four corners to
 * -10000, which is past the far plane, so the tile is not drawn and the
 * pixels behind it are whatever the frame had there - on Devias, the sky
 * dome. That is the right answer for a pit the hero falls into (Chaos
 * Castle's shrinking arena, the Blood Castle gate) and the wrong one for a
 * crevasse in a snow field: Devias' ravines came out as flat panes of pale
 * sky lying in the middle of the map, *brighter* than the snow they are cut
 * out of, and the map reads as cut open rather than cracked.
 *
 * A map that declares a `PrecipiceSpec` draws those tiles instead, at their
 * own height, and takes the light off them: full at the rim, gone a few tiles
 * in. That is what the original does - it draws every tile, and Devias'
 * `TerrainLight` is near black down the ravines - and it is why a crevasse
 * there is a white lip, a short fade, and then nothing you can see into.
 *
 * ### Why nothing is moved
 *
 * The first cut of this sank the tiles into a real canyon, eleven tiles deep.
 * It is worse on every count: the ground's UV comes from its world xz, so a
 * near-vertical wall smears the tile art down itself and the map gains a
 * texture it never had; the strip a bridge crosses on is walkable ground, so
 * it stayed up as a lit mesa with the span sitting on it; and a wall that is
 * one quad however tall it is cannot carry a gradient in its vertex colours.
 * Drawn flat, the fade is a handful of tiles wide with a vertex at every one
 * of them, the map keeps its own silhouette, and a bridge keeps its deck.
 *
 * ### Why it is measured on corners, not tiles
 *
 * The ground mesh gives every tile its own four vertices, so a share chosen
 * per *tile* would step at every tile edge. Per corner it interpolates across
 * the quads into one smooth fade, and a corner that touches ground anywhere
 * keeps all of its light - which pins the fade's start exactly at the line
 * where the walkable ground ends.
 *
 * Pure - typed arrays in, typed arrays out, no Babylon - so it runs wherever
 * the terrain is prepared.
 */

export type PrecipiceSpec = {
  /** Tiles in from the rim over which the light goes out. */
  readonly fade: number;
  /**
   * What is left of the ground light past that. 0 is black, which is what
   * the original leaves and what makes a ravine read as having no bottom.
   */
  readonly floor: number;
};

export type PrecipiceField = {
  /**
   * Per corner, the share of the ground light it keeps: 1 everywhere the map
   * has ground, `floor` a few tiles into a ravine. Rides the ground mesh's
   * vertex colour alpha, where 1 is the neutral every other writer already
   * puts there.
   */
  readonly light: Float32Array;
  /**
   * The same numbers as bytes, for the one reader that is not the ground
   * mesh: the distance haze (`scenes/heightFog.ts`).
   *
   * A ravine drawn black still comes out grey, because the haze mixes the
   * horizon colour into every surface by distance and eight per cent of a
   * bright linear colour is a third of the way to white once the tone curve
   * has it. There is no lit air in a crevasse to scatter, so the haze is
   * scaled by this and the dark survives the trip to the camera. Nothing
   * else about the fog changes - every other pixel on the map fades exactly
   * as it did, and on a map without precipices this is never bound.
   */
  readonly bytes: Uint8Array;
};

/**
 * Chamfer weights for the distance transform. The diagonal step is not 1 -
 * a 4-neighbour sweep measures a diamond, and the fade it cuts comes out with
 * four flat sides and a point in the middle of every ravine.
 */
const STEP_ORTHO = 1;
const STEP_DIAG = Math.SQRT2;

/** Far enough that it never survives a pass; not Infinity, which is not a float32. */
const FAR = 1e6;

function smooth(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;

  return c * c * (3 - 2 * c);
}

/** Whether the tile at `(x, y)` is one the map has ground on. */
function hasGround(attributes: Uint16Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= TERRAIN_SIZE || y >= TERRAIN_SIZE) return true;

  return (attributes[TERRAIN_INDEX(x, y)] & TWFlags.NoGround) === 0;
}

/**
 * Distance, in tiles, from each corner to the nearest corner that still
 * touches ground. Zero on the rim and outward; the interior of a ravine
 * climbs from there.
 *
 * The corner grid is indexed exactly the way the mesh indexes it
 * (`customGroundMesh.getTerrainIndex`): corner `(x, y)` is entry `(x, y)`,
 * with the row and column past the last tile clamped onto it.
 */
function rimDistance(attributes: Uint16Array): Float32Array {
  const d = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const onRim =
        hasGround(attributes, x - 1, y - 1) ||
        hasGround(attributes, x, y - 1) ||
        hasGround(attributes, x - 1, y) ||
        hasGround(attributes, x, y);

      d[TERRAIN_INDEX(x, y)] = onRim ? 0 : FAR;
    }
  }

  const relax = (i: number, from: number, step: number) => {
    const v = d[from] + step;

    if (v < d[i]) d[i] = v;
  };

  // Forward pass: every neighbour already visited this sweep.
  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const i = TERRAIN_INDEX(x, y);

      if (d[i] === 0) continue;

      if (x > 0) relax(i, i - 1, STEP_ORTHO);
      if (y > 0) relax(i, i - TERRAIN_SIZE, STEP_ORTHO);
      if (x > 0 && y > 0) relax(i, i - TERRAIN_SIZE - 1, STEP_DIAG);
      if (x < TERRAIN_SIZE - 1 && y > 0) relax(i, i - TERRAIN_SIZE + 1, STEP_DIAG);
    }
  }

  // Backward pass: the other half of the neighbourhood.
  for (let y = TERRAIN_SIZE - 1; y >= 0; y--) {
    for (let x = TERRAIN_SIZE - 1; x >= 0; x--) {
      const i = TERRAIN_INDEX(x, y);

      if (d[i] === 0) continue;

      if (x < TERRAIN_SIZE - 1) relax(i, i + 1, STEP_ORTHO);
      if (y < TERRAIN_SIZE - 1) relax(i, i + TERRAIN_SIZE, STEP_ORTHO);
      if (x < TERRAIN_SIZE - 1 && y < TERRAIN_SIZE - 1) {
        relax(i, i + TERRAIN_SIZE + 1, STEP_DIAG);
      }
      if (x > 0 && y < TERRAIN_SIZE - 1) {
        relax(i, i + TERRAIN_SIZE - 1, STEP_DIAG);
      }
    }
  }

  return d;
}

/**
 * The light share, per corner, for a map that has precipices. Identically 1
 * anywhere a corner still touches ground, so a map with no `NoGround` tile at
 * all builds the same mesh it always did.
 */
export function buildPrecipiceField(
  attributes: Uint16Array,
  spec: PrecipiceSpec
): PrecipiceField {
  const d = rimDistance(attributes);
  const light = new Float32Array(d.length);
  const bytes = new Uint8Array(d.length * 4);
  const fade = Math.max(spec.fade, 1e-3);

  for (let i = 0; i < d.length; i++) {
    light[i] = 1 + (spec.floor - 1) * smooth(d[i] / fade);
    bytes[i * 4] = Math.round(Math.max(0, Math.min(1, light[i])) * 255);
    bytes[i * 4 + 3] = 255;
  }

  return { light, bytes };
}
