import type { IVector2Like } from './babylon/exports';
import type { Entity } from '../ecs/world';

/**
 * Per-entity dispatch for projected screen positions.
 *
 * This used to ride on the global `EventBus`: `CalculateScreenPositionSystem`
 * emitted once per tracked entity per frame, and every mounted name tag,
 * guild mark and damage label subscribed to the same global event and threw
 * away everything that was not its own entity. With n entities and n overlay
 * components that is n² handler calls a frame — 900 of them for 30 characters
 * on screen, before any DOM work.
 *
 * Here a listener is registered against one entity and only ever hears about
 * that entity.
 */

export type ScreenPositionListener = (screenPosition: IVector2Like) => void;

const listeners = new Map<Entity, Set<ScreenPositionListener>>();

export function onScreenPosition(
  entity: Entity,
  listener: ScreenPositionListener
): () => void {
  let forEntity = listeners.get(entity);

  if (!forEntity) {
    forEntity = new Set();
    listeners.set(entity, forEntity);
  }

  forEntity.add(listener);

  return () => {
    const current = listeners.get(entity);
    if (!current) return;

    current.delete(listener);
    if (current.size === 0) listeners.delete(entity);
  };
}

export type AnyScreenPositionListener = (
  entity: Entity,
  screenPosition: IVector2Like
) => void;

const anyListeners = new Set<AnyScreenPositionListener>();

/**
 * For the handful of consumers that genuinely want every entity — the name
 * tag layout pass keeps one slot table for all of them, so a per-entity
 * subscription would just be the old n² pattern wearing a new hat.
 */
export function onAnyScreenPosition(
  listener: AnyScreenPositionListener
): () => void {
  anyListeners.add(listener);
  return () => anyListeners.delete(listener);
}

/** True when anything is listening — lets the producer skip the projection. */
export function hasScreenPositionListener(entity: Entity): boolean {
  return listeners.has(entity) || anyListeners.size > 0;
}

export function emitScreenPosition(
  entity: Entity,
  screenPosition: IVector2Like
): void {
  const forEntity = listeners.get(entity);

  if (forEntity) {
    for (const listener of forEntity) listener(screenPosition);
  }

  for (const listener of anyListeners) listener(entity, screenPosition);
}

/** Drops every listener for an entity that is going away. */
export function clearScreenPositionListeners(entity: Entity): void {
  listeners.delete(entity);
}
