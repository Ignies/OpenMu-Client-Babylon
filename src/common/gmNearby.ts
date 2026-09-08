import { monsterDisplayName } from './monstersDatabase';
import type { Entity } from '../ecs/world';

/**
 * What is around the hero, from the entities the world holds.
 *
 * Split from `gmWorld.ts` so it can be tested: that one reads `Store`, which
 * pulls in the whole client and a DOM with it. Everything here is arithmetic
 * and sorting over data it is handed.
 */

/** MU tiles. Scope is smaller than this; it bounds the radar, not the query. */
export const RADAR_RANGE = 16;

export type NearbyKind = 'player' | 'monster' | 'npc';

export type Nearby = {
  netId: number;
  kind: NearbyKind;
  name: string;
  x: number;
  y: number;
  /** Chebyshev distance in tiles, which is how MU measures range. */
  distance: number;
  /** Players only. */
  isGm: boolean;
  guildId: number | null;
  dying: boolean;
};

/**
 * A monster with a name the server sent (a summon, a boss) keeps it; anything
 * else is looked up by its type number, which is what `/removenpc` and the
 * monster commands take anyway.
 */
function nameOf(entity: Entity, kind: NearbyKind): string {
  const given = entity.objectNameInWorld?.trim();
  if (given) return given;
  if (kind === 'player') return `#${entity.netId}`;
  return monsterDisplayName(entity.npcType ?? -1, `NPC ${entity.npcType ?? '?'}`);
}

function kindOf(entity: Entity): NearbyKind | null {
  if (entity.playerAnimation) return 'player';
  if (entity.monsterAnimation) return 'monster';
  // In scope with a type but no animation set: a stall, a gate guard, a
  // shopkeeper. Worth listing - `/removenpc` works on them too.
  return entity.npcType === undefined ? null : 'npc';
}

/**
 * The sorting and the arithmetic. `hx`/`hy` are the hero's tile; `entities` is
 * everything the world holds, hero and out-of-scope bodies included, which are
 * dropped here.
 */
export function nearbyOf(entities: Iterable<Entity>, hx: number, hy: number): Nearby[] {
  const nearby: Nearby[] = [];

  for (const entity of entities) {
    if (entity.localPlayer || entity.objOutOfScope) continue;
    if (entity.netId === undefined || !entity.transform) continue;

    const kind = kindOf(entity);
    if (!kind) continue;

    const x = Math.floor(entity.transform.pos.x);
    const y = Math.floor(entity.transform.pos.z);

    nearby.push({
      netId: entity.netId,
      kind,
      name: nameOf(entity, kind),
      x,
      y,
      distance: Math.max(Math.abs(x - hx), Math.abs(y - hy)),
      isGm: !!entity.isGm,
      guildId: entity.guild?.id ?? null,
      dying: !!entity.dying,
    });
  }

  // Players first, then by how close they are: the row a game master wants is
  // almost always the nearest person, not the nearest scorpion.
  nearby.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'player' ? -1 : b.kind === 'player' ? 1 : 0;
    return a.distance - b.distance;
  });

  return nearby;
}
