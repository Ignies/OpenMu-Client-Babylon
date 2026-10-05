import { EventBus } from '@/core/eventBus';
import type { Events } from '@/core/eventBus/events';

/** Calls `fn` with the map's number each time the hero stands on a new map (its terrain is up). Returns the unsubscribe. */
export function onMapChanged(fn: (map: number) => void): () => void {
  const listener = ({ map }: Events['warpCompleted']) => fn(map);
  EventBus.on('warpCompleted', listener);
  return () => EventBus.off('warpCompleted', listener);
}
