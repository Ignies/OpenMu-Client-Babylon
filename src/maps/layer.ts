import type { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import type { Emission } from '../common/effectParticles';

/**
 * The contract every map entry implements. One folder per map,
 * `maps/<name>/index.ts` exports one `<name>Layer`, listed once in
 * `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * A map entry is mostly *data*: which `ENUM_WORLD` values it serves, which
 * `Data/World<n>` folder it draws, its tile slots, its offline spawn, its sky
 * kind and the per-object-type tables (`blendMeshes`, `effectOnly`,
 * `emissions`) the renderer reads. The one piece of behaviour, `create`,
 * loads the map's object classes on demand — see the field.
 *
 * The convention's common core is `name` / `maps?` / `update?` / `reset?`. A
 * map entry has no per-frame step, and "maps" would be the set of worlds it
 * *is*, so the field is spelled `worlds` here; `reset?` keeps its meaning.
 */
export interface MapLayer {
  /** Unique camelCase, identical to the folder name. */
  readonly name: string;

  /**
   * The `ENUM_WORLD` values this entry serves. Most maps are one world; the
   * event maps are a range of server instances on one art set (Blood Castle
   * 11…17 + 52, Chaos Castle 18…23 + 53, Kalima 24…29 + 36, Illusion Temple
   * 45…50, Devil Square 9 + 32). A world appears in exactly one entry.
   */
  readonly worlds: readonly ENUM_WORLD[];

  /**
   * The `Data/World<n>` / `Data/Object<n>` folder number, when it is not the
   * default `world + 1` (`CMapManager::LoadWorld`, MapManager.cpp:1206-1225):
   * every Blood Castle floor draws `World12`, every Chaos Castle `World19`,
   * every Kalima floor `World25`, every Illusion Temple level `World47`, and
   * Devil Square 5-7 (map 32) folds into `World10`.
   */
  readonly assetWorld?: number;

  /**
   * Tile textures by slot — 0 Grass01, 1 Grass02, 2 Ground01, 3 Ground02,
   * 4 Ground03, 5 Water01, 6 Wood01, 7 Rock01 … 13 Rock07 — the list
   * `LoadWorld` (MapManager.cpp:1362-1420) binds from `World<n>`. A slot the
   * folder cannot fill (missing file, or a `.tga` the OZJ-only loader cannot
   * read) names a tile the folder *does* have, so the indices
   * `EncTerrain<n>.map` uses stay put. `recipes.ts` has the common shapes.
   */
  readonly tiles: readonly string[];

  /** Where the offline hero lands, in tiles. Omit = keep the current position. */
  readonly spawn?: Spawn;

  /**
   * Has a sky: rain may fall here when the weather byte says so. Interiors,
   * caves and towers omit it. Read by the rain slot in
   * `ecs/systems/ambientParticleSystem.ts`.
   */
  readonly outdoor?: boolean;

  /**
   * The sky belongs to snow: rain never falls here however the weather byte
   * reads (`CreateDeviasSnow` gates on the world alone), objects carry snow
   * caps, footsteps read as snow. Read through `weather/ambientWeather.ts`'s
   * `SNOW_MAPS`.
   */
  readonly snow?: boolean;

  /**
   * `SetWorldClearColor` (SceneManager.cpp:336-365) as the original's 0…255
   * bytes; omit for black. Applied by `loadMapIntoScene` before `create`.
   */
  readonly clearColor?: readonly [number, number, number];

  /** Lit interiors, when the map enumerates any (Devias). */
  readonly rooms?: readonly Room[];

  /**
   * Object type → mesh index drawn additively (`CreateObject`'s `BlendMesh`
   * assignments, ZzzObject.cpp:4643-4651). Read by `common/blendMeshes.ts`.
   */
  readonly blendMeshes?: Readonly<Record<number, number>>;

  /**
   * Object types that are an emitter and nothing else — the model is never
   * drawn, only its `emissions`. Read by `common/effectOnlyObjects.ts`.
   */
  readonly effectOnly?: readonly number[];

  /** Object type → particle emissions. Read by `common/effectParticles.ts`. */
  readonly emissions?: Partial<Record<number, readonly Emission[]>>;

  /**
   * Bind this map's object classes into `world.terrain.MapTileObjects` and
   * add whatever entities the map owns. Runs once per warp, after the terrain
   * exists and before the objects are created.
   *
   * Written as `world => import('./create').then(m => m.createX(world))`:
   * the classes extend `ModelObject`, and `ModelObject`'s own imports read
   * this system's tables, so a static import here would be an import cycle
   * that resolves to a TDZ crash depending on who loads first. The dynamic
   * import breaks it and gives each map its own chunk as a side effect.
   */
  create?(world: World): Promise<void>;

  /** Map changed: drop anything belonging to the world just left. */
  reset?(): void;
}

/** A tile position on the 256×256 grid. */
export type Spawn = { readonly x: number; readonly y: number };

/** An interior footprint in tiles, with the point its ambience centres on. */
export type Room = {
  readonly min: { readonly x: number; readonly y: number };
  readonly max: { readonly x: number; readonly y: number };
  readonly centre: { readonly x: number; readonly z: number };
};
