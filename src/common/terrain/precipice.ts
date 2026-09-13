import { cmToTiles, TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';

/**
 * The precipices: what a map's `NoGround` tiles look like when you stand at
 * the edge and look down.
 *
 * `CreateGroundFromHeightMap` drops a `NoGround` tile's four corners to
 * -10000, which is past the far plane, so the tile is not drawn and the
 * pixels behind it are whatever the frame had there - on Devias, the sky
 * dome. That is the right answer for a pit the hero falls into (Chaos
 * Castle's shrinking arena, the Blood Castle gate) and the wrong one for a
 * crevasse in a snow field: Devias' ravines came out as flat panes of pale
 * sky lying in the middle of the map, brighter than the snow around them,
 * and the map reads as cut open rather than cracked.
 *
 * A map that declares a `PrecipiceSpec` gets a floor instead of a hole. The
 * ground keeps going over the `NoGround` tiles, sinking away from the rim and
 * losing its light as it goes, so the crevasse ends in darkness you cannot
 * see the bottom of.
 *
 * ### Why it is measured on corners, not tiles
 *
 * The ground mesh gives every tile its own four vertices, but it reads their
 * heights out of the shared height map, which is what keeps neighbouring
 * quads welded along their edge. A sink chosen per *tile* would move one
 * quad's corner and not its neighbour's, and every ravine would be outlined
 * in cracks. So the field is per corner: a corner that touches any tile with
 * ground on it cannot move, which pins the rim exactly where the walkable
 * ground ends and leaves the map's own silhouette untouched.
 *
 * Pure - typed arrays in, typed arrays out, no Babylon - so it runs wherever
 * the terrain is prepared.
 */

export type PrecipiceSpec = {
  /** How far below the rim the floor ends up, in tiles. */
  readonly depth: number;
  /** Tiles in from the rim over which it gets there. */
  readonly slope: number;
  /**
   * The dark, as a pair of world heights: the ground keeps all of its light
   * down to `maskTop` and none of it below `maskBottom`, smoothly between.
   *
   * A height and not a distance from the rim, because the wall between the
   * two is one quad however steep it is: a share of the light chosen per
   * corner is interpolated straight down it, and the middle of an
   * eleven-tile wall then comes out at half light - a lit blue face where
   * the whole point was a face nothing reaches. Read off the fragment's own
   * world height there is no such thing as the middle of the wall; there is
   * only how far down it is, which is the question being asked.
   *
   * `maskTop` belongs under the map's lowest walkable ground, or the mask is
   * a shadow on the field rather than a dark in the ravines.
   */
  readonly maskTop: number;
  readonly maskBottom: number;
  /** What is left of the ground under `maskBottom`. 0 is black. */
  readonly floor: number;
  /**
   * The map-object ids that stand along the sides of a bridge span.
   *
   * A bridge in this data set is not a bridge: the tiles under it stay
   * walkable ground, because that is how the hero crosses, and the span is a
   * row of scenery laid over them. So a crevasse the map cut in half is
   * bridged by a strip of snow at full height, and the suspension bridge
   * over it reads as a decoration on a path - which is what a player sees
   * and calls wrong, because a bridge that is holding nothing up is not a
   * bridge.
   *
   * Where these parts are found in pairs, the ground they bracket joins the
   * precipice: it sinks and goes dark with it, and the span is left holding
   * the crossing. The tiles stay walkable - only what is drawn changes - and
   * the run's two ends are left alone, so the ramps onto it still meet the
   * field.
   */
  readonly bridgeParts: readonly number[];
};

/** One map object, as `parseTerrainObjects` returns it. */
export type PrecipicePlacement = {
  readonly id: number;
  readonly pos: { readonly x: number; readonly y: number };
};

export type PrecipiceField = {
  /** Per corner, how far it drops below the height map, in tiles. */
  readonly sink: Float32Array;
};

/**
 * Chamfer weights for the distance transform. The diagonal step is not 1 -
 * a 4-neighbour BFS measures a diamond, and the funnel it cuts comes out with
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

/** Two bridge parts further apart than this belong to different spans. */
const BRIDGE_JOIN = 8;

/**
 * Every tile the ground is *not* drawn over: the `NoGround` ones, plus the
 * walkable strip under each bridge span.
 *
 * The map's outermost tile ring is always drawn, however it is flagged. The
 * frame that carries the world past the last tile row reads the border tiles'
 * heights out of the height map and knows nothing about any of this
 * (`terrainEdge.ts`), so a ravine that reaches the boundary - Devias has one,
 * around x 82 on its north edge - would sink the map's edge eleven tiles and
 * leave the frame hanging in the air beside it. Pinning the ring costs one
 * tile of the ravine at the one place a player cannot stand anyway.
 */
function voidTiles(
  attributes: Uint16Array,
  spec: PrecipiceSpec,
  objects: readonly PrecipicePlacement[]
): Uint8Array {
  const out = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let i = 0; i < out.length; i++) {
    out[i] = (attributes[i] & TWFlags.NoGround) === 0 ? 0 : 1;
  }

  // Each run of bridge parts, as the box its two rows bracket. The walkable
  // tiles inside it are the strip the span is laid over; the `NoGround` ones
  // are already void, and tiles outside it - the landings - are not touched,
  // which is what leaves a ramp at each end instead of a step into the dark.
  for (const span of bridgeSpans(spec.bridgeParts, objects)) {
    for (let y = span.minY; y <= span.maxY; y++) {
      for (let x = span.minX; x <= span.maxX; x++) out[TERRAIN_INDEX(x, y)] = 1;
    }
  }

  // The border ring, last: it outranks everything above it.
  for (let i = 0; i < TERRAIN_SIZE; i++) {
    out[TERRAIN_INDEX(i, 0)] = 0;
    out[TERRAIN_INDEX(i, TERRAIN_SIZE - 1)] = 0;
    out[TERRAIN_INDEX(0, i)] = 0;
    out[TERRAIN_INDEX(TERRAIN_SIZE - 1, i)] = 0;
  }

  return out;
}

type Span = { minX: number; maxX: number; minY: number; maxY: number };

/**
 * The bridge parts, grouped into spans by proximity, each as the tile box its
 * placements cover. Single-link at `BRIDGE_JOIN`: Devias' five crossings sit
 * tens of tiles apart and each is a row of parts three tiles from the next,
 * so nothing has to be authored beyond which ids they are.
 */
function bridgeSpans(
  ids: readonly number[],
  objects: readonly PrecipicePlacement[]
): Span[] {
  const parts = objects
    .filter(o => ids.includes(o.id))
    .map(o => ({ x: cmToTiles(o.pos.x), y: cmToTiles(o.pos.y) }));

  const spans: Span[] = [];
  const taken = new Array<boolean>(parts.length).fill(false);

  for (let i = 0; i < parts.length; i++) {
    if (taken[i]) continue;

    taken[i] = true;

    const group = [parts[i]];

    // Single link: a part joins the group if it is near any part already in
    // it, so a span that steps its way across a ravine comes out as one box.
    for (let g = 0; g < group.length; g++) {
      for (let j = 0; j < parts.length; j++) {
        if (taken[j]) continue;
        if (
          Math.abs(parts[j].x - group[g].x) > BRIDGE_JOIN ||
          Math.abs(parts[j].y - group[g].y) > BRIDGE_JOIN
        ) {
          continue;
        }

        taken[j] = true;
        group.push(parts[j]);
      }
    }

    const xs = group.map(p => p.x);
    const ys = group.map(p => p.y);

    spans.push({
      minX: clampTile(Math.floor(Math.min(...xs))),
      maxX: clampTile(Math.floor(Math.max(...xs))),
      minY: clampTile(Math.floor(Math.min(...ys))),
      maxY: clampTile(Math.floor(Math.max(...ys))),
    });
  }

  return spans;
}

function clampTile(v: number): number {
  return v < 0 ? 0 : v > TERRAIN_SIZE - 1 ? TERRAIN_SIZE - 1 : v;
}

/** Whether the tile at `(x, y)` is one the ground is drawn over. */
function hasGround(drawn: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= TERRAIN_SIZE || y >= TERRAIN_SIZE) return true;

  return drawn[TERRAIN_INDEX(x, y)] === 0;
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
function rimDistance(drawn: Uint8Array): Float32Array {
  const d = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const onRim =
        hasGround(drawn, x - 1, y - 1) ||
        hasGround(drawn, x, y - 1) ||
        hasGround(drawn, x - 1, y) ||
        hasGround(drawn, x, y);

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
 * How far each corner drops, for a map that has precipices. Identically zero
 * anywhere a corner still touches ground, so a map with no `NoGround` tile at
 * all builds the same mesh it always did.
 */
export function buildPrecipiceField(
  attributes: Uint16Array,
  spec: PrecipiceSpec,
  objects: readonly PrecipicePlacement[] = []
): PrecipiceField {
  const d = rimDistance(voidTiles(attributes, spec, objects));
  const sink = new Float32Array(d.length);

  const slope = Math.max(spec.slope, 1e-3);

  for (let i = 0; i < d.length; i++) sink[i] = spec.depth * smooth(d[i] / slope);

  return { sink };
}
