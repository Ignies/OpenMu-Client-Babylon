import { ENUM_WORLD } from '@/core/types';
import { registerDebugModule } from '@/modules/gm/debugMenu';
import { maps } from '@/controllers/maps';
import { EventBus } from '@/core/eventBus';
import { Ecs } from '@/ecs/current';

/**
 * Move: one row per map entry the client stages, current map highlighted.
 * A click emits `requestWarp` - the same seam the offline move window uses -
 * and rewrites the `?map=` query so a dev-server reload lands on the same
 * map (the `playOffline` contract). The menu stays open: map-hopping is the
 * use case.
 */

/** Menu scenes; warping the world hero into them makes no sense. */
const PREGAME_WORLDS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_55LOGINSCENE,
  ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
  ENUM_WORLD.WD_74NEW_CHARACTER_SCENE,
]);

function warpTo(map: ENUM_WORLD): void {
  EventBus.emit('requestWarp', { map });

  const search = new URLSearchParams(location.search);
  search.set('map', String(map));
  history.replaceState(null, '', '/offline?' + search.toString());
}

registerDebugModule({
  id: 'move',
  title: 'Move',
  order: 10,
  rows: () => [
    {
      kind: 'info',
      id: 'current',
      label: 'Current map',
      value: () => {
        const world = Ecs.world?.mapIndex;
        return world === undefined ? '-' : `${ENUM_WORLD[world]} (${world})`;
      },
    },
    {
      kind: 'list',
      id: 'maps',
      items: () =>
        maps.all.flatMap(layer => {
          const target = layer.worlds.find(w => !PREGAME_WORLDS.has(w));
          if (target === undefined) return [];
          return [
            {
              id: layer.name,
              label: `${layer.name.charAt(0).toUpperCase()}${layer.name.slice(1)} (${target})`,
              active: () =>
                Ecs.world !== null &&
                layer.worlds.includes(Ecs.world.mapIndex),
              onClick: () => warpTo(target),
            },
          ];
        }),
    },
  ],
});
