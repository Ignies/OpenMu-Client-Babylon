import type { Controller } from '../controller';
import { ENUM_WORLD } from '../../core/types';
import type { World } from '../../ecs/world';
import type { Emission } from '../fx/effectParticles';
import type { ByWorld, MapLayer, PerWorld, Room, Spawn } from './layer';
import { MAP_LAYERS } from '@versions/shared/maps/layers';

export type { ByWorld, MapLayer, PerWorld, Room, Spawn } from './layer';

/**
 * The map system: every world the client can load, behind one object. Copy `_template.ts` when adding to it.
 *
 * `loadMapIntoScene` calls `maps.create(world)` once per warp and
 * `maps.reset()` on a map change; both go through `MAP_LAYERS`
 * (`layers.ts`), which is the only list of maps in the codebase. The readers
 * below are what the renderer, the terrain loader, the weather and the sound
 * tables ask about a world; every one is a lookup over the entries' declared
 * data. The facade holds nothing of its own beyond the index it builds over
 * the list.
 */
class Maps implements Controller {
  readonly id = 'maps';
  private readonly layers: MapLayer[] = [...MAP_LAYERS];
  private readonly byWorld = new Map<ENUM_WORLD, MapLayer>();
  private readonly effectOnlySets = new Map<MapLayer, ReadonlySet<number>>();

  constructor() {
    this.reindex();
  }

  private reindex(): void {
    this.byWorld.clear();
    for (const layer of this.layers) {
      for (const world of layer.worlds) {
        const taken = this.byWorld.get(world);
        if (taken && taken !== layer) {
          console.error(
            `maps: ${ENUM_WORLD[world]} is claimed by both '${taken.name}' and '${layer.name}'`
          );
        }
        this.byWorld.set(world, layer);
      }
    }
  }

  /** Add a map at runtime (tools, experiments). Returns the unregister. */
  register(layer: MapLayer): () => void {
    this.layers.push(layer);
    this.reindex();
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
      this.reindex();
    };
  }

  /** Every entry, list order. */
  get all(): readonly MapLayer[] {
    return this.layers;
  }

  /** The entry that serves this world, if any. */
  layerFor(world: ENUM_WORLD): MapLayer | undefined {
    return this.byWorld.get(world);
  }

  /** The worlds an entry serves, by name; empty for an unknown name. */
  worldsOf(name: string): readonly ENUM_WORLD[] {
    return this.layers.find(l => l.name === name)?.worlds ?? [];
  }

  /** Every world whose entry satisfies `pick`. */
  worldsWhere(pick: (layer: MapLayer) => boolean): readonly ENUM_WORLD[] {
    return this.layers.filter(pick).flatMap(l => l.worlds);
  }

  // ---- the map's own rows --------------------------------------------------

  /**
   * The row `pick` reads off this world's entry, resolved for the world
   * (`PerWorld`): undefined when no entry claims the world or it has no row.
   * What a controller calls at run time instead of keeping a per-world table.
   */
  rowFor<T>(
    world: ENUM_WORLD,
    pick: (layer: MapLayer) => PerWorld<T> | undefined
  ): T | undefined {
    const layer = this.byWorld.get(world);
    return layer ? forWorld(pick(layer), world) : undefined;
  }

  /**
   * A live set of the worlds whose entry satisfies `pick`: asked on every
   * call, so it can stand in a module-level constant (a layer's `maps`)
   * without reading the entries at load.
   */
  worldSet(
    pick: (layer: MapLayer, world: ENUM_WORLD) => boolean
  ): ReadonlySet<ENUM_WORLD> {
    return new WorldSet(this, pick);
  }

  /**
   * A live map from each claimed world to what `read` answers for it,
   * leaving out the worlds it answers undefined for.
   */
  worldMap<T>(read: (world: ENUM_WORLD) => T | undefined): ReadonlyMap<ENUM_WORLD, T> {
    return new WorldMap(this, read);
  }

  // ---- lifecycle ---------------------------------------------------------

  /** Bind the current map's object classes and entities. Once per warp. */
  async create(world: World): Promise<void> {
    const layer = this.layerFor(world.mapIndex);
    if (!layer) {
      // The terrain still loads (folder `world + 1`), but no entry claims
      // this world: no tiles list, no spawn, no object classes.
      console.error(`No map entry for world ${world.mapIndex}`);
      return;
    }
    await layer.create?.(world);
  }

  /** Drop every entry's state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /**
   * Which `Data/World<n>` / `Data/Object<n>` folder a world draws from: the
   * entry's `assetWorld`, else `world + 1` (also for a world no entry claims).
   */
  assetWorldNum(world: ENUM_WORLD): number {
    return this.layerFor(world)?.assetWorld ?? world + 1;
  }

  /** Tile textures by slot; empty (and an error) for a world without an entry. */
  tiles(world: ENUM_WORLD): readonly string[] {
    const layer = this.layerFor(world);
    if (!layer) {
      console.error(`Not implemented for ${ENUM_WORLD[world]}`);
      return [];
    }
    return layer.tiles;
  }

  /** The `AlphaTile*` slot, the one that means "no ground here", or null. */
  cutoutTileFor(world: ENUM_WORLD): number | null {
    return this.layerFor(world)?.cutoutTile ?? null;
  }

  /** Where the offline hero lands, in tiles. */
  spawn(world: ENUM_WORLD): Spawn | undefined {
    return this.layerFor(world)?.spawn;
  }

  /** Has a sky. Whether rain may fall out of it is `canRain`. */
  isOutdoor(world: ENUM_WORLD): boolean {
    return this.layerFor(world)?.outdoor === true;
  }

  /**
   * Rain may fall here: the map has a sky, and its climate is not something
   * else. The one place that answers the question - a caller that assembles
   * its own version of it from the flags will drift the first time a fourth
   * climate is added.
   *
   * `outdoor` is necessary and not sufficient. Each climate below has its own
   * reason and its own other effects (snow caps and footsteps; the sea's
   * ambience), so they stay separate flags rather than one "dry" bit.
   */
  canRain(world: ENUM_WORLD): boolean {
    const layer = this.layerFor(world);
    if (!layer) return false;
    return (
      layer.outdoor === true &&
      layer.rain !== false &&
      layer.snow !== true &&
      layer.underwater !== true &&
      layer.desert !== true
    );
  }

  /**
   * The map's climate is snow. That is all it says: whether anything falls
   * out of it is `SNOWFALL_MAPS` and whether any of it settles is
   * `SNOW_GROUND_MAPS`, and the ice fields are snow-climate with neither.
   */
  isSnow(world: ENUM_WORLD): boolean {
    return this.layerFor(world)?.snow === true;
  }

  /** Under water - no rain, and the sea's own ambience. */
  isUnderwater(world: ENUM_WORLD): boolean {
    return this.layerFor(world)?.underwater === true;
  }

  /** `SetWorldClearColor` bytes, or undefined for black. */
  clearColorFor(
    world: ENUM_WORLD
  ): readonly [number, number, number] | undefined {
    return this.layerFor(world)?.clearColor;
  }

  /** The map's lit interiors. */
  roomsOf(world: ENUM_WORLD): readonly Room[] {
    return this.layerFor(world)?.rooms ?? [];
  }

  /** Additive mesh index for an object type, or undefined for none. */
  blendMeshFor(world: ENUM_WORLD, type: number): number | undefined {
    return this.layerFor(world)?.blendMeshes?.[type];
  }

  /** Whether an object type is an emitter with no drawn model. */
  isEffectOnly(world: ENUM_WORLD, type: number): boolean {
    const layer = this.layerFor(world);
    if (!layer?.effectOnly) return false;
    let set = this.effectOnlySets.get(layer);
    if (!set) {
      set = new Set(layer.effectOnly);
      this.effectOnlySets.set(layer, set);
    }
    return set.has(type);
  }

  /** Particle emissions for an object type. */
  emissionsFor(
    world: ENUM_WORLD,
    type: number
  ): readonly Emission[] | undefined {
    return this.layerFor(world)?.emissions?.[type];
  }
}

function isByWorld<T>(row: PerWorld<T>): row is ByWorld<T> {
  return typeof row === 'object' && row !== null && 'byWorld' in row;
}

/** A `PerWorld` row as one world sees it. */
export function forWorld<T>(
  row: PerWorld<T> | undefined,
  world: ENUM_WORLD
): T | undefined {
  if (row === undefined) return undefined;
  return isByWorld(row) ? row.byWorld[world] : row;
}

/** Every world the entries serve, list order, with the entry serving it. */
function* claimed(owner: Maps): Generator<[ENUM_WORLD, MapLayer]> {
  for (const world of new Set(owner.all.flatMap(l => l.worlds))) {
    const layer = owner.layerFor(world);
    if (layer) yield [world, layer];
  }
}

/** `maps.worldSet`: `has` is one lookup; iterating walks the entries. */
class WorldSet implements ReadonlySet<ENUM_WORLD> {
  constructor(
    private readonly owner: Maps,
    private readonly pick: (layer: MapLayer, world: ENUM_WORLD) => boolean
  ) {}

  has(world: ENUM_WORLD): boolean {
    const layer = this.owner.layerFor(world);
    return layer !== undefined && this.pick(layer, world);
  }

  private list(): ENUM_WORLD[] {
    const out: ENUM_WORLD[] = [];
    for (const [world, layer] of claimed(this.owner)) {
      if (this.pick(layer, world)) out.push(world);
    }
    return out;
  }

  /** The worlds as a plain `Set` today, for the set algebra below. */
  private snapshot(): Set<ENUM_WORLD> {
    return new Set(this.list());
  }

  union<U>(other: ReadonlySetLike<U>): Set<ENUM_WORLD | U> {
    return this.snapshot().union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<ENUM_WORLD & U> {
    return this.snapshot().intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<ENUM_WORLD> {
    return this.snapshot().difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<ENUM_WORLD | U> {
    return this.snapshot().symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.snapshot().isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.snapshot().isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    return this.snapshot().isDisjointFrom(other);
  }

  get size(): number {
    return this.list().length;
  }

  forEach(
    fn: (value: ENUM_WORLD, key: ENUM_WORLD, set: ReadonlySet<ENUM_WORLD>) => void
  ): void {
    for (const w of this.list()) fn(w, w, this);
  }

  entries(): SetIterator<[ENUM_WORLD, ENUM_WORLD]> {
    return this.snapshot().entries();
  }

  keys(): SetIterator<ENUM_WORLD> {
    return this.snapshot().keys();
  }

  values(): SetIterator<ENUM_WORLD> {
    return this.snapshot().values();
  }

  [Symbol.iterator](): SetIterator<ENUM_WORLD> {
    return this.values();
  }
}

/** `maps.worldMap`: `get` is one lookup; iterating walks the entries. */
class WorldMap<T> implements ReadonlyMap<ENUM_WORLD, T> {
  constructor(
    private readonly owner: Maps,
    private readonly read: (world: ENUM_WORLD) => T | undefined
  ) {}

  get(world: ENUM_WORLD): T | undefined {
    return this.owner.layerFor(world) ? this.read(world) : undefined;
  }

  has(world: ENUM_WORLD): boolean {
    return this.get(world) !== undefined;
  }

  private snapshot(): Map<ENUM_WORLD, T> {
    const out = new Map<ENUM_WORLD, T>();
    for (const [world] of claimed(this.owner)) {
      const row = this.read(world);
      if (row !== undefined) out.set(world, row);
    }
    return out;
  }

  get size(): number {
    return this.snapshot().size;
  }

  forEach(
    fn: (value: T, key: ENUM_WORLD, map: ReadonlyMap<ENUM_WORLD, T>) => void
  ): void {
    for (const [w, row] of this.snapshot()) fn(row, w, this);
  }

  entries(): MapIterator<[ENUM_WORLD, T]> {
    return this.snapshot().entries();
  }

  keys(): MapIterator<ENUM_WORLD> {
    return this.snapshot().keys();
  }

  values(): MapIterator<T> {
    return this.snapshot().values();
  }

  [Symbol.iterator](): MapIterator<[ENUM_WORLD, T]> {
    return this.entries();
  }
}

export const maps = new Maps();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as app/store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
