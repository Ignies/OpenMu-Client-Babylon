import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { AdminFeed } from '../../../../admin/feed';
import type { WorldView } from '../../../../gmWorld';
import { className, type TrackedPlayer } from '../../../../common/adminProtocol';
import { GM_MAPS, mapName } from '../../../../common/gmMaps';
import { gmCommand } from '../../../../common/gmCommands';
import { uiClick } from '../../../../libs/sfx';
import { MapView } from '../mapView';
import { TileMenu } from '../tileMenu';
import { PlayerMenu } from '../playerMenu';
import { FeedNotice, playerMatches } from '../shared';

/**
 * Every map, and everyone on it, moving.
 *
 * The picker lists the maps that have players first (with the count), then
 * the rest of the server's map table. The dots are the tracker's positions;
 * the game master's own dot and the monsters and NPCs the client itself has
 * in scope ride on top when the map is the one they stand on. A right-click
 * opens what can be done at that tile (`tileMenu.tsx`), or to that player
 * (`playerMenu.tsx`).
 */

type MenuAt =
  | { kind: 'tile'; x: number; y: number; left: number; top: number }
  | { kind: 'player'; player: TrackedPlayer; left: number; top: number };

export const MapTab = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;
  const byMap = AdminFeed.byMap;
  const map = GmPanel.mapView ?? hero?.map ?? 0;
  const onThisMap = (byMap.get(map) ?? []).filter(p => playerMatches(p, GmPanel.search));
  const selected = GmPanel.selectedPlayerId ? AdminFeed.players.get(GmPanel.selectedPlayerId) : null;
  const move = gmCommand('/move');
  const [menu, setMenu] = useState<MenuAt | null>(null);

  // A menu belongs to the map it was opened on.
  useEffect(() => setMenu(null), [map]);

  const populated = [...byMap.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);
  const populatedSet = new Set(populated.map(([number]) => number));
  const rest = GM_MAPS.filter(entry => !populatedSet.has(entry.number));

  const pick = (player: TrackedPlayer) => {
    GmPanel.selectPlayer(player.id === GmPanel.selectedPlayerId ? null : player.id);
    if (player.character) GmPanel.setTarget(player.character);
  };

  return (
    <div className="gm-maptab">
      <aside className="gm-maptab-side">
        <h4 className="gm-section-title">{t('gm.map.pick')}</h4>
        <div className="gm-maplist">
          {hero ? (
            <button
              type="button"
              className={`gm-maplist-row${GmPanel.mapView === null ? ' is-active' : ''}`}
              onClick={uiClick(() => GmPanel.setMapView(null))}
            >
              <span>{t('gm.map.myMap')}</span>
              <small>{mapName(hero.map)}</small>
            </button>
          ) : null}
          {populated.map(([number, players]) => (
            <button
              key={number}
              type="button"
              className={`gm-maplist-row${GmPanel.mapView === number ? ' is-active' : ''}`}
              onClick={uiClick(() => GmPanel.setMapView(number))}
            >
              <span>{mapName(number)}</span>
              <b className="gm-badge">{players.length}</b>
            </button>
          ))}
          {rest.map(entry => (
            <button
              key={entry.number}
              type="button"
              className={`gm-maplist-row is-quiet${GmPanel.mapView === entry.number ? ' is-active' : ''}`}
              onClick={uiClick(() => GmPanel.setMapView(entry.number))}
            >
              <span>{entry.name}</span>
              <small className="gm-mono">#{entry.number}</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="gm-maptab-main">
        <header className="gm-maptab-head">
          <h3>
            {mapName(map)} <small className="gm-mono">#{map}</small>
          </h3>
          <span className="gm-maptab-count">{t('gm.map.onMap', { count: onThisMap.length })}</span>
          {hero && hero.map !== map ? (
            <button
              type="button"
              className="gm-btn gm-btn-compact"
              onClick={uiClick(() => GmPanel.run(move, { target: hero.name, mapIdOrName: String(map) }))}
            >
              {t('gm.map.goHere')}
            </button>
          ) : null}
          {hero && GmPanel.target && GmPanel.target !== hero.name ? (
            <button
              type="button"
              className="gm-btn gm-btn-compact"
              onClick={uiClick(() =>
                GmPanel.run(move, {
                  target: GmPanel.target,
                  mapIdOrName: String(map),
                  ...(hero.map === map ? { x: String(hero.x), y: String(hero.y) } : {}),
                })
              )}
            >
              {t('gm.map.bringTarget', { name: GmPanel.target })}
            </button>
          ) : null}
          <span className="gm-legend">
            <i className="gm-dot gm-dot-player" /> {t('gm.map.legendPlayers')}
            <i className="gm-dot gm-dot-player is-gm" /> {t('gm.map.legendGm')}
            <i className="gm-dot gm-dot-hero" /> {t('gm.map.you')}
            <i className="gm-dot gm-dot-monster" /> {t('gm.map.legendScope')}
          </span>
        </header>

        <FeedNotice />

        <MapView
          map={map}
          players={onThisMap}
          hero={hero && hero.map === map ? { x: hero.x, y: hero.y } : null}
          scope={hero && hero.map === map ? view.nearby.filter(e => e.kind !== 'player') : []}
          selectedId={GmPanel.selectedPlayerId}
          onPick={pick}
          onMenu={(x, y, left, top) => setMenu({ kind: 'tile', x, y, left, top })}
          onPlayerMenu={(player, left, top) => setMenu({ kind: 'player', player, left, top })}
          onTile={
            hero
              ? (x, y) =>
                  GmPanel.run(move, {
                    target: hero.name,
                    mapIdOrName: String(map),
                    x: String(x),
                    y: String(y),
                  })
              : undefined
          }
        />
        <p className="gm-hint">
          {t('gm.map.warpHint')} {t('gm.map.menuHint')}
        </p>

        {menu?.kind === 'tile' ? (
          <TileMenu
            map={map}
            x={menu.x}
            y={menu.y}
            at={{ left: menu.left, top: menu.top }}
            hero={hero}
            onClose={() => setMenu(null)}
          />
        ) : null}
        {menu?.kind === 'player' ? (
          <PlayerMenu
            player={menu.player}
            at={{ left: menu.left, top: menu.top }}
            hero={hero}
            onClose={() => setMenu(null)}
          />
        ) : null}

        {onThisMap.length > 0 ? (
          <ul className="gm-rows gm-maptab-players">
            {onThisMap.map(player => (
              <li
                key={player.id}
                className={`gm-row${player.id === selected?.id ? ' is-selected' : ''}`}
              >
                <button type="button" className="gm-row-main" onClick={uiClick(() => pick(player))}>
                  <span className={`gm-dot gm-dot-player${player.gm ? ' is-gm' : ''}`} />
                  <span className="gm-row-name">
                    {player.character ?? player.account}
                    <small> {player.cls !== null ? className(player.cls) : ''} {player.level || ''}</small>
                  </span>
                  <span className="gm-row-pos gm-mono">
                    {player.x}, {player.y}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
});
