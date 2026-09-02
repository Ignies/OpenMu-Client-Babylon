import { ENUM_WORLD } from '../../../../common/types';
import { registerDebugModule } from '../../../../common/debugMenu';
import { maps } from '../../../../maps';
import { EventBus } from '../../../../libs/eventBus';
import { Store } from '../../../../store';

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
        const world = Store.world?.mapIndex;
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
                Store.world !== null &&
                layer.worlds.includes(Store.world.mapIndex),
              onClick: () => warpTo(target),
            },
          ];
        }),
    },
  ],
});
