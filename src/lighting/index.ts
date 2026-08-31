import type { ENUM_WORLD } from '../common/types';
import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import type { Events } from '../libs/eventBus/events';
import type { LightingLayer } from './layer';
import { LIGHTING_LAYERS } from './layers';
import {
  LightSource,
  disposeAllLightSources,
  liveLightSources,
  tickLightSources,
  type LightAnchor,
  type LightRecipe,
} from './lightSource';
import { lightAreaSkill, lightTargetedSkill } from './skills';
import { lightCharacter, snuffCharacter, characterIsLit } from './characters';
import { lightObjectEffect } from './objectEffects';
import { moodFor, type SceneMood } from '../scenes/sceneLook';

export type { LightingLayer } from './layer';
export type { LightRecipe, LightAnchor } from './lightSource';

/**
 * The lighting layer: everything that throws light onto the map, behind one
 * object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `lighting.update` once a frame and `lighting.reset` on a
 * map change; both fan out over `LIGHTING_LAYERS` (`layers.ts`), the only
 * list of entries in the codebase. The commands below are the facade's
 * public surface for consumers; every entry file stays importable directly
 * for anything that needs a single function.
 *
 * The two sinks — `common/terrainDynamicLight.ts` and
 * `common/pointLightPool.ts` — are consumers of this folder: `LightSource`
 * registers into them, `TerrainLightSystem` steps them after `update`.
 */
class Lighting {
  private readonly layers: LightingLayer[] = [...LIGHTING_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: LightingLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): LightingLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /**
   * Step every source, then every entry. Call once a frame, before the sinks
   * are updated (`TerrainLightSystem`).
   */
  update(map: ENUM_WORLD, dt: number): void {
    tickLightSources(dt);
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /**
   * Drop everything. Call when the map changes — the terrain light field is
   * rebuilt from the new bake and no registration may outlive it.
   */
  reset(): void {
    disposeAllLightSources();
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /** What is lighting this map right now, across every entry. */
  emitters(map: ENUM_WORLD): LightSource[] {
    const out: LightSource[] = [];
    for (const layer of this.layersFor(map)) {
      const e = layer.emitters?.(map);
      if (e) out.push(...e);
    }
    return out;
  }

  /** Every live source, entries and ad-hoc flashes alike. */
  get liveCount(): number {
    return liveLightSources().size;
  }

  /** Whether an NPC/monster entity currently carries its light. */
  characterIsLit(e: Entity): boolean {
    return characterIsLit(e);
  }

  /**
   * The key lights and grade a map resolves to right now — the area override
   * (a tavern) if one is set, else the world's mood. The tables and the
   * blend stay in `scenes/sceneLook.ts` with the pipeline they drive; this
   * is the read.
   */
  moodFor(map: ENUM_WORLD): SceneMood {
    return moodFor(map);
  }

  // ---- commands ----------------------------------------------------------

  /** Light a targeted skill: cast flash, projectile, impact. */
  skillTargeted(scene: Scene, skill: number, caster: Entity, target: Entity | null): void {
    lightTargetedSkill(scene, skill, caster, target);
  }

  /** Light an area skill at a ground point. */
  skillArea(
    scene: Scene,
    skill: number,
    caster: Entity,
    at: { x: number; y: number; z: number }
  ): void {
    lightAreaSkill(scene, skill, caster, at);
  }

  /** Light a server object effect (level-up, shields, swirl) on an entity. */
  objectEffect(scene: Scene, entity: Entity, effect: Events['objectEffect']['effect']): void {
    lightObjectEffect(scene, entity, effect);
  }

  /** Attach / drop an NPC or monster's carried light (CHARACTER_LIGHTS). */
  lightCharacter(scene: Scene, e: Entity): void {
    lightCharacter(scene, e);
  }

  snuffCharacter(e: Entity): void {
    snuffCharacter(e);
  }

  /**
   * An ad-hoc light from any recipe — for a host that is not an entry (a
   * map object class, a test). Prefer a row in an entry's table.
   */
  flash(scene: Scene, recipe: LightRecipe, anchor: LightAnchor): LightSource {
    return LightSource.attach(scene, recipe, anchor);
  }
}

export const lighting = new Lighting();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
