import type { Entity, World } from '../../ecs/world';
import { genderedEmoteAction } from '../emotes';
import { instrumentById, type InstrumentId } from '../instruments';

/**
 * The `performing` component's two writers, in one place: the facade for the
 * hero and for remote performers, `BandSystem` when a performer moves or
 * dies. Everything else reads the component.
 */

export type Performer = Entity & Required<Pick<Entity, 'playerAnimation' | 'transform'>>;

export function startPerforming(world: World, entity: Performer, instrument: InstrumentId, local: boolean): void {
  const def = instrumentById(instrument);
  if (entity.performing) {
    if (entity.performing.instrument === instrument) return;
    stopPerforming(world, entity);
  }
  const isFemale = entity.attributeSystem?.isAboveZero('isFemale') ?? false;
  world.addComponent(entity, 'performing', {
    instrument,
    source: genderedEmoteAction(def.pose.clip, isFemale),
    clip: -1,
    local,
    hits: [],
    model: null,
  });
}

export function stopPerforming(world: World, entity: Entity): void {
  if (!entity.performing) return;
  world.removeComponent(entity, 'performing');
}

/** A hit to show at audio time `when`, in order. */
export function queueHit(entity: Entity, when: number): void {
  const p = entity.performing;
  if (!p) return;
  const hits = p.hits;
  if (hits.length === 0 || hits[hits.length - 1] <= when) {
    hits.push(when);
    return;
  }
  let i = hits.length;
  while (i > 0 && hits[i - 1] > when) i--;
  hits.splice(i, 0, when);
}
