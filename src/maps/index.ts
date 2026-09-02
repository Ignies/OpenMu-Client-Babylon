import { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import type { Emission } from '../common/effectParticles';
import type { MapLayer, Room, Spawn } from './layer';
import { MAP_LAYERS } from './layers';

export type { MapLayer, Room, Spawn } from './layer';

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
class Maps {
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

  /** Where the offline hero lands, in tiles. */
  spawn(world: ENUM_WORLD): Spawn | undefined {
    return this.layerFor(world)?.spawn;
  }

  /** Has a sky — rain may fall here. */
  isOutdoor(world: ENUM_WORLD): boolean {
    return this.layerFor(world)?.outdoor === true;
  }

  /** The sky belongs to snow. */
  isSnow(world: ENUM_WORLD): boolean {
    return this.layerFor(world)?.snow === true;
  }

  /**
   * How much of the day/night cycle a world takes, 0..1: the entry's
   * `dayCycle`, else 1 where it is outdoor (the flag already means "has a
   * sky") and 0 everywhere else.
   */
  cycleScaleFor(world: ENUM_WORLD): number {
    const layer = this.layerFor(world);
    if (!layer) return 0;
    return layer.dayCycle ?? (layer.outdoor === true ? 1 : 0);
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

export const maps = new Maps();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
