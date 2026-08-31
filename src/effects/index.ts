import type { ENUM_WORLD } from '../common/types';
import type { Scene, Vector3 } from '../libs/babylon/exports';
import type { EffectHandle, EffectLayer } from './layer';
import { EFFECT_LAYERS } from './layers';
import { clearTimers, disposePools, stepClock } from './core';

export type { EffectHandle, EffectLayer } from './layer';
export { DEAD_HANDLE } from './layer';
export { delay, fxNow } from './core';

/**
 * The effects layer: everything a skill, a packet or a buff draws in the
 * world for a while — bolts, columns, rings, trails, auras — behind one
 * object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `effects.update` once a frame
 * (`ecs/systems/effectSystem.ts`) and `effects.reset` on a map change
 * (`libs/mu/loadMapIntoScene.ts`); both fan out over `EFFECT_LAYERS`
 * (`layers.ts`), the only list of entries. `spawn(name, …)` is the one
 * command: the name is an entry's `name`, the options its own type.
 *
 * `common/skillVisuals.ts` is the consumer that maps skill ids and buff ids
 * to spawns; this facade holds no state of its own.
 */

type Layers = (typeof EFFECT_LAYERS)[number];

/** Every entry name, from the list. */
export type EffectName = Layers['name'];

/** The options type an entry takes, from its `EffectLayer<TOptions, name>`. */
export type EffectOptions<N extends EffectName> =
  Extract<Layers, { name: N }> extends EffectLayer<infer O, N> ? O : never;

class Effects {
  private readonly layers: EffectLayer[] = [...EFFECT_LAYERS];
  private readonly byName = new Map<string, EffectLayer>(
    EFFECT_LAYERS.map(l => [l.name, l as EffectLayer])
  );

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: EffectLayer): () => void {
    this.layers.push(layer);
    this.byName.set(layer.name, layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
      if (this.byName.get(layer.name) === layer) this.byName.delete(layer.name);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): EffectLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every entry. Call once a frame, before anything reads the effects. */
  update(map: ENUM_WORLD, dt: number): void {
    // The clock first: a step that comes due spawns into this same frame.
    stepClock(dt);
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** End every live effect, cancel every pending step and drop every pool. Call when the map changes. */
  reset(): void {
    clearTimers();
    for (const layer of this.layers) layer.reset?.();
    disposePools();
  }

  // ---- commands ----------------------------------------------------------

  /** Start one effect of entry `name` at `at` (world tiles). */
  spawn<N extends EffectName>(
    name: N,
    scene: Scene,
    at: Vector3,
    opts: EffectOptions<N>
  ): EffectHandle {
    const layer = this.byName.get(name);
    if (!layer) throw new Error(`[effects] no entry named ${name}`);
    return layer.spawn(scene, at, opts);
  }
}

export const effects = new Effects();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
