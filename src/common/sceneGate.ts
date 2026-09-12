import type { Entity } from '../ecs/world';

/**
 * Work the loading screen has to wait for besides the map itself.
 *
 * `sceneReadySystem` gates the screen on the map: terrain in, every visible
 * object's model in. What that misses is content a system stages *after* the
 * map lands - the character select line-up is spawned only once the terrain
 * is up and the server's character list has arrived - so the gate lifted on
 * an empty scene and the characters walked in afterwards, in front of the
 * player. A system that owns such content holds the gate by name while its
 * content is still on its way; `sceneReadySystem` is the only reader.
 */
const holds = new Set<string>();

export function setSceneHold(name: string, held: boolean): void {
  if (held) holds.add(name);
  else holds.delete(name);
}

export function sceneHeld(): boolean {
  return holds.size > 0;
}

/**
 * Everything an entity needs before it is worth showing: the model, the body
 * and equipment parts loaded under it after `Ready` flips (`PartsPending`),
 * and the appearance pass that asks for those parts (`charAppearance.changed`
 * is cleared by AppearanceSystem once it has). Waiting on `Ready` alone let a
 * character appear in its default body and put its armour on afterwards.
 *
 * A model that failed to load counts as finished - it is never arriving.
 */
export function isStaged(entity: Entity | undefined): boolean {
  if (!entity) return false;

  const model = entity.modelObject;
  if (!model) return false;
  if (model.LoadFailed) return true;
  if (!model.Ready || model.PartsPending > 0) return false;
  return !entity.charAppearance?.changed;
}
