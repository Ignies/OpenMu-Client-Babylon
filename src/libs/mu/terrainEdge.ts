import { TERRAIN_SIZE } from '../../common/terrain/consts';
import { TERRAIN_INDEX } from '../../common/terrain/utils';
import {
  type Scene,
  type IVector3Like,
  Mesh,
  VertexData,
  Vector3,
} from '../babylon/exports';

/**
 * The world's outer frame: sole writer of one mesh that carries the ground
 * past the map's last tile row, so the world ends in more of itself instead
 * of in a cut.
 *
 * The ground is a finite 256x256 sheet with no side faces
 * (`customGroundMesh.ts`). Past it there is no geometry at all, so those
 * pixels are the scene's clear colour - and where a border tile stands above
 * the water it meets, the sheet's zero-thickness edge faces the camera. The
 * original client framed neither, because its camera stopped at a distance
 * this one zooms well past.
 *
 * What goes out there is read off each border tile, not off the map. A map is
 * not one thing all the way round: Lorencia's north border is 98% water tiles
 * and its west border is 13% - sea on one side, forest on the other - and a
 * map-wide choice gets one of them wrong. A border tile that is water carries
 * its sea out at its own level, with the map's own water tile scrolling in
 * step; every other tile carries its own ground out. Where the two meet, an
 * apron drops the shore into the water.
 *
 * Outward it is rings, not one long quad (§ `RING_DEPTHS`): a single quad per
 * border tile extrudes that tile's art three hundred tiles into the distance,
 * and the border row's every step - a road, a shadow, a patch of sand - comes
 * out as a stripe converging on the horizon. The rings let the fill leave the
 * map as an exact copy of the tile it grew from, shuffle its art as it goes,
 * and settle into one open field by the time the haze has it.
 *
 * It shares the ground's `ShaderMaterial` instance rather than owning one.
 * That is the whole trick: the tile array, the water scroll, the bake in the
 * vertex colour, the sky and ground light and the haze all reach the frame
 * with no new shader code, and there is no seam at the boundary because both
 * sides are the same program with the same uniforms.
 *
 * A separate mesh, though, not extra rows in the ground: the ground is
 * ray-cast for click-to-move several times a second and carries a submesh
 * octree, and geometry reaching hundreds of tiles out would widen both.
 */

/**
 * Depth of each ring, in tiles, from the border outward. Doubling, so the
 * detail is where the eye is - the first ring is one tile deep and is a
 * straight copy of the map's own edge, which is what leaves nothing to see at
 * the join - and the last is the open field the haze closes over.
 */
const RING_DEPTHS: readonly number[] = [1, 2, 4, 8, 16, 32, 237];

/** Distance over which the fill forgets the tile it grew from, in tiles. */
const SETTLE_TILES = 48;

/** Height wobble on the open ground, in tiles. Water never takes it. */
const JITTER_TILES = 0.2;

/** Tiles per wobble, along the border. Large enough to read as ground. */
const WOBBLE_SPAN = 24;

/** Tiles over which the wobble fades out towards a corner. */
const CORNER_FADE = 16;

/** Index of the animated water tile, the same slot the terrain shader scrolls. */
const WATER_TILE = 5;

/** Aprons shorter than this are the seam they would hide; skipped. */
const MIN_APRON_DROP = 0.02;

const LAST = TERRAIN_SIZE - 1;

/** Distance from the border to each ring boundary; `RINGS + 1` entries. */
const RING_EDGES: readonly number[] = RING_DEPTHS.reduce<number[]>(
  (edges, depth) => [...edges, edges[edges.length - 1] + depth],
  [0]
);

const RINGS = RING_DEPTHS.length;

type Buffers = {
  readonly height: Float32Array;
  readonly layer1: Uint8Array;
  readonly layer2: Uint8Array;
  readonly alpha: Uint8Array;
  readonly light: readonly IVector3Like[];
  readonly ambient: Vector3;
};

type Rgb = readonly [number, number, number];

/** `[x, y, z]`, or `[x, y, z, uvX, uvZ]` when the UV must not follow position. */
type Corner =
  | readonly [number, number, number]
  | readonly [number, number, number, number, number];

function clampTile(n: number): number {
  return n < 0 ? 0 : n > LAST ? LAST : n;
}

function tileAt(x: number, y: number): number {
  return TERRAIN_INDEX(clampTile(x), clampTile(y));
}

function onBorder(x: number, y: number): boolean {
  return x <= 0 || y <= 0 || x >= LAST || y >= LAST;
}

/** Every tile on the four border rows, once each. */
function borderTiles(): number[] {
  const tiles: number[] = [];

  for (let i = 0; i < TERRAIN_SIZE; i++) {
    tiles.push(tileAt(i, 0), tileAt(i, LAST), tileAt(0, i), tileAt(LAST, i));
  }

  return tiles;
}

function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

/**
 * Seeded, so the frame is the same every time a map loads and the same on
 * every machine - the ring art is part of the map, not of this session.
 */
function hash3(a: number, b: number, c: number): number {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177) ^ Math.imul(c + 1, 2246822519);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** How settled the fill is at a ring boundary, 0 at the map, 1 in the open. */
function settledAt(edge: number): number {
  return smoothstep(RING_EDGES[edge] / SETTLE_TILES);
}

/**
 * The frame mesh, or null for a map with nothing to frame. The caller owns
 * the material and assigns the ground's own.
 */
export function createTerrainEdge(
  name: string,
  scene: Scene,
  buffers: Buffers
): Mesh | null {
  const builder = new EdgeBuilder(buffers);

  builder.build();

  const data = builder.vertexData();
  if (!data) return null;

  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh, false);

  // Scenery, not ground: nothing walks on it and click-to-move must never
  // land on it, so it stays out of every pick. `terrain` is what admits it to
  // the G-buffer the haze reads (`scenes/ambientOcclusion.ts`), which is the
  // whole reason the fill dissolves into the horizon instead of standing
  // there at full colour.
  mesh.isPickable = false;
  mesh.metadata = { terrain: true };
  mesh.receiveShadows = false;
  mesh.doNotSyncBoundingInfo = true;

  return mesh;
}

/**
 * A border, walked so the map stays on the left.
 *
 * `flip` matches the ground's own winding: a quad wound the way
 * `customGroundMesh.ts` winds its tiles faces up, and the same flag turns an
 * apron's vertical face outward on every side.
 */
type Side = {
  /** The boundary vertex at step `i`, 0..TERRAIN_SIZE. */
  readonly vertex: (i: number) => readonly [number, number];
  /** The tile whose texture, bake and alpha the segment at `i` borrows. */
  readonly tile: (i: number) => readonly [number, number];
  /** Unit vector in XZ pointing out of the map. */
  readonly out: readonly [number, number];
  readonly flip: boolean;
};

const SIDES: readonly Side[] = [
  { vertex: i => [i, 0], tile: i => [i, 0], out: [0, -1], flip: true },
  {
    vertex: i => [i, TERRAIN_SIZE],
    tile: i => [i, LAST],
    out: [0, 1],
    flip: false,
  },
  { vertex: i => [0, i], tile: i => [0, i], out: [-1, 0], flip: false },
  {
    vertex: i => [TERRAIN_SIZE, i],
    tile: i => [LAST, i],
    out: [1, 0],
    flip: true,
  },
];

class EdgeBuilder {
  private readonly positions: number[] = [];
  private readonly uvs: number[] = [];
  private readonly textures: number[] = [];
  private readonly colors: number[] = [];
  private readonly alphaColors: number[] = [];
  private readonly indices: number[] = [];

  private seaLightCache: Rgb | null = null;
  private landLightCache: Rgb | null = null;
  private openGroundCache: number | null = null;

  constructor(private readonly buffers: Buffers) {}

  build(): void {
    for (const [at, side] of SIDES.entries()) {
      for (let i = 0; i < TERRAIN_SIZE; i++) this.segment(at, side, i);
    }

    this.corners();
  }

  vertexData(): VertexData | null {
    if (this.indices.length === 0) return null;

    const normals: number[] = [];
    VertexData.ComputeNormals(this.positions, this.indices, normals);

    const data = new VertexData();

    data.positions = this.positions;
    data.indices = this.indices;
    data.normals = normals;
    data.uvs = this.uvs;
    data.uvs2 = this.textures;
    data.colors = this.colors;
    data.matricesWeights = this.alphaColors;

    return data;
  }

  private segment(at: number, side: Side, i: number): void {
    const [x0, z0] = side.vertex(i);
    const [x1, z1] = side.vertex(i + 1);
    const [tx, tz] = side.tile(i);
    const tile = tileAt(tx, tz);
    const [ox, oz] = side.out;

    const top0 = this.heightAt(x0, z0);
    const top1 = this.heightAt(x1, z1);
    const foot0 = this.fillHeight(side, i, 0);
    const foot1 = this.fillHeight(side, i + 1, 0);

    // The apron, where the border stands above what it falls into. Its foot's
    // UVs run outward by the drop, so the face carries the tile at the
    // ground's own scale instead of one texel smeared down it.
    if (top0 - foot0 > MIN_APRON_DROP || top1 - foot1 > MIN_APRON_DROP) {
      const drop0 = top0 - foot0;
      const drop1 = top1 - foot1;
      const cliff = this.lightOf(tile);

      this.quad(
        [x0, top0, z0],
        [x1, top1, z1],
        [x1, foot1, z1, x1 + ox * drop1, z1 + oz * drop1],
        [x0, foot0, z0, x0 + ox * drop0, z0 + oz * drop0],
        this.opaqueTextureOf(tile),
        cliff,
        cliff,
        side.flip
      );
    }

    for (let ring = 0; ring < RINGS; ring++) {
      const near = RING_EDGES[ring];
      const far = RING_EDGES[ring + 1];
      const source = this.sourceTile(at, i, ring, tile);

      this.quad(
        [x0 + ox * near, this.fillHeight(side, i, ring), z0 + oz * near],
        [x1 + ox * near, this.fillHeight(side, i + 1, ring), z1 + oz * near],
        [
          x1 + ox * far,
          this.fillHeight(side, i + 1, ring + 1),
          z1 + oz * far,
        ],
        [x0 + ox * far, this.fillHeight(side, i, ring + 1), z0 + oz * far],
        this.fillTexture(source),
        this.fillLight(tile, settledAt(ring)),
        this.fillLight(tile, settledAt(ring + 1)),
        side.flip
      );
    }
  }

  /**
   * The four squares the sides leave between them, ringed the same way so
   * they settle on the same schedule. Flat at the corner's own level: the
   * wobble is faded out there (`CORNER_FADE`) precisely so these meet both
   * neighbouring fills along their whole edge with nothing to stitch.
   */
  private corners(): void {
    const corners: readonly (readonly [number, number, number, number])[] = [
      [0, 0, -1, -1],
      [TERRAIN_SIZE, 0, 1, -1],
      [0, TERRAIN_SIZE, -1, 1],
      [TERRAIN_SIZE, TERRAIN_SIZE, 1, 1],
    ];

    for (const [cx, cz, ox, oz] of corners) {
      const tile = tileAt(cx === 0 ? 0 : LAST, cz === 0 ? 0 : LAST);
      const level = this.fillLevelAt(cx, cz);

      for (let a = 0; a < RINGS; a++) {
        for (let b = 0; b < RINGS; b++) {
          const x = [cx + ox * RING_EDGES[a], cx + ox * RING_EDGES[a + 1]];
          const z = [cz + oz * RING_EDGES[b], cz + oz * RING_EDGES[b + 1]];
          const ring = Math.max(a, b);
          // No shuffling out here: a corner has no border row of its own to
          // borrow along, and the open field is where it is heading anyway.
          const source =
            ring === 0 || this.isWater(tile) ? tile : this.openGround();
          const light = this.fillLight(tile, settledAt(ring + 1));

          this.quad(
            [x[0], level, z[0]],
            [x[1], level, z[0]],
            [x[1], level, z[1]],
            [x[0], level, z[1]],
            this.fillTexture(source),
            light,
            light,
            ox * oz < 0
          );
        }
      }
    }
  }

  /**
   * Which tile's art a ring cell wears.
   *
   * Near the map it is the tile the cell grew from, which is what makes the
   * join invisible; out in the open it is the field's own tile, so the
   * border row's road and sand and shadow do not run to the horizon as
   * stripes. Where a column changes over is its own seeded threshold, so the
   * changeover wanders along the border instead of landing on one ring as a
   * line across the whole side.
   *
   * Nothing is borrowed from elsewhere along the border. Art carries the
   * bake it was painted under, and a cell wearing a neighbour's turns into a
   * bright slab lying on dark ground.
   */
  private sourceTile(at: number, i: number, ring: number, tile: number): number {
    if (this.isWater(tile)) return tile;

    return settledAt(ring + 1) > hash3(at, i, 3) ? this.openGround() : tile;
  }

  private heightAt(x: number, z: number): number {
    return this.buffers.height[tileAt(x, z)];
  }

  private isWater(tile: number): boolean {
    return this.buffers.layer1[tile] === WATER_TILE;
  }

  /**
   * Where the fill sits under a boundary vertex, at the map's own edge.
   *
   * A pure function of the position and never of which side is asking, so the
   * two sides that meet at a corner - and every pair of neighbouring
   * segments - put their shared edge in exactly the same place, and the ring
   * has no cracks in it.
   *
   * Water on any border tile touching the vertex pulls it down to that
   * water's own surface: that is the shore, and the apron above covers the
   * drop. Everywhere else the ground simply carries on at its own height.
   */
  private fillLevelAt(x: number, z: number): number {
    const ground = this.heightAt(x, z);
    let water = Infinity;

    for (const [tx, tz] of [
      [x - 1, z - 1],
      [x, z - 1],
      [x - 1, z],
      [x, z],
    ]) {
      const cx = clampTile(tx);
      const cz = clampTile(tz);

      if (!onBorder(cx, cz)) continue;

      const tile = TERRAIN_INDEX(cx, cz);
      if (this.isWater(tile)) water = Math.min(water, this.buffers.height[tile]);
    }

    return water === Infinity ? ground : Math.min(water, ground);
  }

  /** Whether a boundary vertex is standing in water rather than on ground. */
  private isShore(x: number, z: number): boolean {
    for (const [tx, tz] of [
      [x - 1, z - 1],
      [x, z - 1],
      [x - 1, z],
      [x, z],
    ]) {
      const cx = clampTile(tx);
      const cz = clampTile(tz);

      if (onBorder(cx, cz) && this.isWater(TERRAIN_INDEX(cx, cz))) return true;
    }

    return false;
  }

  /**
   * The fill's height at one ring boundary. Pure in (position, boundary), so
   * neighbouring cells and neighbouring rings agree on every shared vertex.
   *
   * Open water stays dead level - a lake with a wobble in it is a lake with a
   * bug in it. Ground takes a small seeded wobble that grows with distance,
   * so the plain outside the map is not a mirror of the last row of tiles
   * stretched to the horizon. It fades to nothing towards a corner, which is
   * what lets the corner squares stay flat and still meet both sides.
   */
  private fillHeight(side: Side, along: number, edge: number): number {
    const [x, z] = side.vertex(along);
    const base = this.fillLevelAt(x, z);

    if (this.isShore(x, z)) return base;

    const toCorner = Math.min(along, TERRAIN_SIZE - along);
    const fade = smoothstep(toCorner / CORNER_FADE) * settledAt(edge);

    // Value noise along the border rather than per tile: a fresh number every
    // tile is static, not ground.
    const cell = along / WOBBLE_SPAN;
    const at = Math.floor(cell);
    const wobble = mix(
      hash3(at, edge, 5),
      hash3(at + 1, edge, 5),
      smoothstep(cell - at)
    );

    return base + (wobble - 0.5) * 2 * JITTER_TILES * fade;
  }

  private fillTexture(tile: number): number {
    return this.isWater(tile) ? WATER_TILE : this.opaqueTextureOf(tile);
  }

  /**
   * The fill's colour: the tile it grew from at the map's edge, the open
   * field's own by the time it has settled. Carrying the border tile's bake
   * the whole way out draws every step in the border row as a stripe running
   * to the horizon; starting from the settled value instead puts a hard line
   * along the boundary. Easing between them has neither.
   */
  private fillLight(tile: number, settled: number): Rgb {
    if (this.isWater(tile)) return this.seaLight();

    return mixRgb(this.lightOf(tile), this.landLight(), settled);
  }

  /**
   * `addTile`'s own rule (customGroundMesh.ts): a tile covered everywhere by
   * its second layer draws that layer, otherwise the first.
   */
  private opaqueTextureOf(tile: number): number {
    const a = tile < this.buffers.alpha.length ? this.buffers.alpha[tile] : 0;

    return a === 255 ? this.buffers.layer2[tile] : this.buffers.layer1[tile];
  }

  private lightOf(tile: number): Rgb {
    const { light, ambient } = this.buffers;
    const source = tile < light.length ? light[tile] : null;
    const r = source ? source.x : 0;
    const g = source ? source.y : 0;
    const b = source ? source.z : 0;

    return [
      ambient.x + r * (1 - ambient.x),
      ambient.y + g * (1 - ambient.y),
      ambient.z + b * (1 - ambient.z),
    ];
  }

  /** The tile the open field is made of: the commonest dry one on the border. */
  private openGround(): number {
    if (this.openGroundCache !== null) return this.openGroundCache;

    const counts = new Map<number, number>();
    let best = 0;
    let bestCount = -1;

    for (const tile of borderTiles()) {
      if (this.isWater(tile)) continue;

      const next = (counts.get(tile) ?? 0) + 1;
      counts.set(tile, next);

      if (next > bestCount) {
        best = tile;
        bestCount = next;
      }
    }

    this.openGroundCache = best;

    return best;
  }

  /**
   * What open water settles to: the mean bake over the water on the border
   * rows. The map's water as a whole is the wrong average - an inland river
   * runs under trees and through shadow, and the open sea does not.
   */
  private seaLight(): Rgb {
    this.seaLightCache ??= this.meanLightOver(
      borderTiles().filter(tile => this.isWater(tile))
    );

    return this.seaLightCache;
  }

  /** What open ground settles to: the mean bake over the dry border tiles. */
  private landLight(): Rgb {
    this.landLightCache ??= this.meanLightOver(
      borderTiles().filter(tile => !this.isWater(tile))
    );

    return this.landLightCache;
  }

  private meanLightOver(tiles: readonly number[]): Rgb {
    if (tiles.length === 0) return this.lightOf(tileAt(0, 0));

    let r = 0;
    let g = 0;
    let b = 0;

    for (const tile of tiles) {
      const [lr, lg, lb] = this.lightOf(tile);
      r += lr;
      g += lg;
      b += lb;
    }

    return [r / tiles.length, g / tiles.length, b / tiles.length];
  }

  /** `a` and `b` are the quad's inner edge, `c` and `d` its outer one. */
  private quad(
    a: Corner,
    b: Corner,
    c: Corner,
    d: Corner,
    texture: number,
    inner: Rgb,
    outer: Rgb,
    flip: boolean
  ): void {
    const base = this.positions.length / 3;
    const lights = [inner, inner, outer, outer];

    for (const [at, corner] of [a, b, c, d].entries()) {
      const [x, y, z] = corner;
      const uvX = corner.length === 5 ? corner[3] : x;
      const uvZ = corner.length === 5 ? corner[4] : z;
      const [lr, lg, lb] = lights[at];

      this.positions.push(x, y, z);
      this.uvs.push(uvX / TERRAIN_SIZE, uvZ / TERRAIN_SIZE);
      this.textures.push(texture, -1);
      this.colors.push(lr, lg, lb, 1);
      this.alphaColors.push(lr, lg, lb, 0);
    }

    if (flip) {
      this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}
