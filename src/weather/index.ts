import type { ENUM_WORLD } from '../common/types';
import type { Scene } from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import type { WeatherLayer } from './layer';
import { WEATHER_LAYERS } from './layers';
import { rainStrength } from './rainState';
import { snowCover } from './snowCover';
import { snowSinkDepth, snowUnderfoot } from './snowSink';
import { snowSprayBurst } from './snowSpray';
import { meltSnow } from './snowMelt';
import { snowCapAt } from './snowCaps';
import { inPuddles, puddleCover, wetness } from './wetness';
import { puddleUnderfoot } from './puddleUnderfoot';

export type { WeatherLayer } from './layer';

/**
 * The weather layer: everything that falls from the sky or is left behind on
 * the ground, behind one object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `weather.update` once a frame and `weather.reset` on a
 * map change; both fan out over `WEATHER_LAYERS` (`layers.ts`), which is the
 * only list of effects in the codebase. The readers below are the facade's
 * public surface for consumers that want the whole weather from one import;
 * every effect file stays importable directly for anything that needs a
 * single function.
 */
class Weather {
  private readonly layers: WeatherLayer[] = [...WEATHER_LAYERS];

  /** Add an effect at runtime (tools, experiments). Returns the unregister. */
  register(layer: WeatherLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every effect that exists on this map. */
  layersFor(map: ENUM_WORLD): WeatherLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every layer. Call once a frame, before anything reads the weather. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** Drop every layer's state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /** Live rain, 0…1, after the packet ramp. */
  get rain(): number {
    return rainStrength();
  }

  /** Settled snow on the ground, 0…1. */
  get snowCover(): number {
    return snowCover();
  }

  /** Snow an object at tile (x, z) carries, 0…1 — zero under a roof. */
  snowCapAt(x: number, z: number): number {
    return snowCapAt(x, z);
  }

  /** How soaked the ground is, 0…1. */
  get wetness(): number {
    return wetness();
  }

  /** How much of the flat ground is standing water, 0…1. */
  get puddles(): number {
    return puddleCover();
  }

  /** Whether the map has standing water anywhere on it. */
  inPuddles(): boolean {
    return inPuddles();
  }

  /** How much standing water is drawn under world (x, z), 0…1. */
  puddleUnderfoot(world: World, x: number, z: number): number {
    return puddleUnderfoot(world, x, z);
  }

  /** How snowy the ground is drawn under a point, 0…1. */
  snowUnderfoot(world: World, x: number, z: number): number {
    return snowUnderfoot(world, x, z);
  }

  /** How far into settled snow something at this position sinks, in tiles. */
  snowSinkDepth(
    world: World,
    map: ENUM_WORLD,
    x: number,
    y: number,
    z: number
  ): number {
    return snowSinkDepth(world, map, x, y, z);
  }

  /**
   * Burn a circle of settled snow off the ground: `radius` in tiles,
   * `strength` 0…1 at the centre. Called by the fire rows of
   * `common/skillVisuals.ts`; a no-op in effect on a map without snow.
   */
  meltSnow(x: number, z: number, radius: number, strength = 1): void {
    meltSnow(x, z, radius, strength);
  }

  /** Throw a puff of snow at a foot. */
  snowSpray(
    scene: Scene,
    x: number,
    y: number,
    z: number,
    strength: number
  ): void {
    snowSprayBurst(scene, x, y, z, strength);
  }
}

export const weather = new Weather();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
