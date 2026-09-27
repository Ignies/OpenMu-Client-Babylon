import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import { GmPanel } from '../../../gmPanel';
import { mapName } from '../../../common/gmMaps';
import { gmCommand } from '../../../common/gmCommands';
import {
  DEFAULT_ITEM_SPEC,
  itemCommandValues,
  searchItems,
  searchSkins,
  type ItemEntry,
  type SkinEntry,
} from '../../../admin/catalogues';
import { itemDisplayName, skinDisplayName, spawnCatalogue } from '../../../admin/skins';
import { uiClick } from '../../../libs/sfx';
import { ItemIcon } from '../itemIcon';

/**
 * What can be done at one tile of the map, on a right-click.
 *
 * Fireworks, items and monsters all land where the game master stands
 * (`/fireworks` takes the coordinate but only on their own map; `/item` and
 * `/createmonster` take none), so anything done at a tile they are not on
 * moves them there first - the panel's queue sends the lines in order.
 */

type Hero = { name: string; map: number; x: number; y: number };

type Kind = 'items' | 'monsters' | 'npcs';

const KINDS: { id: Kind; key: 'gm.spawn.items' | 'gm.spawn.monsters' | 'gm.spawn.npcs' }[] = [
  { id: 'items', key: 'gm.spawn.items' },
  { id: 'monsters', key: 'gm.spawn.monsters' },
  { id: 'npcs', key: 'gm.spawn.npcs' },
];

/** Matches listed in the menu; the Spawn tab has the whole catalogue. */
const SHOWN = 7;

/** Room kept between the menu and the window's edge, px. */
const EDGE = 8;

export const MapMenu = observer(
  ({
    map,
    x,
    y,
    at,
    hero,
    onClose,
  }: {
    map: number;
    x: number;
    y: number;
    /** Where the right-click was, on screen. */
    at: { left: number; top: number };
    hero: Hero | null;
    onClose: () => void;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [place, setPlace] = useState(at);
    const [kind, setKind] = useState<Kind>('items');
    const [query, setQuery] = useState('');
    const move = gmCommand('/move');
    const onMap = !!hero && hero.map === map;
    const standing = onMap && hero.x === x && hero.y === y;
    const target = GmPanel.target && GmPanel.target !== hero?.name ? GmPanel.target : '';

    // Kept inside the window: flipped left or up when it would run off.
    useLayoutEffect(() => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const left = at.left + box.width + EDGE > window.innerWidth ? at.left - box.width : at.left;
      const top =
        at.top + box.height + EDGE > window.innerHeight
          ? Math.max(EDGE, window.innerHeight - box.height - EDGE)
          : at.top;
      setPlace({ left: Math.max(EDGE, left), top });
    }, [at]);

    // Closed by a press anywhere else, or by Escape before the panel sees it.
    useEffect(() => {
      const press = (event: PointerEvent) => {
        if (!ref.current?.contains(event.target as Node)) onClose();
      };
      const key = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.stopImmediatePropagation();
        event.preventDefault();
        onClose();
      };
      window.addEventListener('pointerdown', press, true);
      window.addEventListener('keydown', key, true);
      return () => {
        window.removeEventListener('pointerdown', press, true);
        window.removeEventListener('keydown', key, true);
      };
    }, [onClose]);

    const items = useMemo(
      () => (kind === 'items' ? searchItems(query, null, itemDisplayName).slice(0, SHOWN) : []),
      [kind, query]
    );
    const skins = useMemo(
      () =>
        kind === 'items'
          ? []
          : searchSkins(spawnCatalogue(), query, kind === 'monsters' ? 'monster' : 'npc', skinDisplayName).slice(
              0,
              SHOWN
            ),
      [kind, query]
    );

    /** Go to the tile unless already on it, then do `then` there. */
    const there = (then?: () => void) => {
      if (hero && !standing) {
        GmPanel.run(move, { target: hero.name, mapIdOrName: String(map), x: String(x), y: String(y) });
      }
      then?.();
      onClose();
    };

    const spawnItem = (entry: ItemEntry) =>
      there(() => GmPanel.run(gmCommand('/item'), itemCommandValues(entry, DEFAULT_ITEM_SPEC)));

    const spawnSkin = (entry: SkinEntry) =>
      there(() =>
        GmPanel.run(gmCommand('/createmonster'), {
          number: String(entry.number),
          intelligence: entry.kind === 'monster' ? '1' : '0',
        })
      );

    const fireworks = (command: '/fireworks' | '/xmasfireworks') =>
      there(() => GmPanel.run(gmCommand(command), { x: String(x), y: String(y) }));

    const copy = () => {
      void navigator.clipboard?.writeText(`${map} ${x} ${y}`).catch(() => undefined);
      onClose();
    };

    return (
      <div
        ref={ref}
        className="gm-menu"
        role="menu"
        style={{ left: place.left, top: place.top }}
        onContextMenu={event => event.preventDefault()}
      >
        <header className="gm-menu-head">
          <b>{mapName(map)}</b>
          <span className="gm-mono">
            {x}, {y}
          </span>
        </header>
        {hero && !standing ? <p className="gm-menu-note">{t('gm.map.menu.movesYou')}</p> : null}

        {hero ? (
          <>
            <button type="button" className="gm-menu-item" onClick={uiClick(() => there())} disabled={standing}>
              {t('gm.map.menu.goHere')}
            </button>
            {target ? (
              <button
                type="button"
                className="gm-menu-item"
                onClick={uiClick(() => {
                  GmPanel.run(move, { target, mapIdOrName: String(map), x: String(x), y: String(y) });
                  onClose();
                })}
              >
                {t('gm.map.bringTarget', { name: target })}
              </button>
            ) : null}
            <button type="button" className="gm-menu-item" onClick={uiClick(() => fireworks('/fireworks'))}>
              {t('gm.cmd.fireworks.label')}
            </button>
            <button type="button" className="gm-menu-item" onClick={uiClick(() => fireworks('/xmasfireworks'))}>
              {t('gm.cmd.xmasfireworks.label')}
            </button>

            <div className="gm-menu-sep" />

            <div className="gm-menu-spawn">
              <span className="gm-menu-label">{t('gm.spawn.spawn')}</span>
              <div className="gm-toggle">
                {KINDS.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`gm-toggle-btn${kind === entry.id ? ' is-active' : ''}`}
                    onClick={uiClick(() => setKind(entry.id))}
                  >
                    {t(entry.key)}
                  </button>
                ))}
              </div>
              <input
                className="gm-search"
                type="search"
                value={query}
                autoFocus
                placeholder={t(kind === 'items' ? 'gm.spawn.searchItems' : 'gm.spawn.searchMonsters')}
                spellCheck={false}
                autoComplete="off"
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
              <div className="gm-menu-list">
                {kind === 'items'
                  ? items.map(entry => (
                      <button
                        key={`${entry.group}-${entry.number}`}
                        type="button"
                        className="gm-menu-item gm-menu-thing"
                        onClick={uiClick(() => spawnItem(entry))}
                      >
                        <span className="gm-menu-icon">
                          <ItemIcon item={{ group: entry.group, num: entry.number, lvl: 0 }} />
                        </span>
                        <span className="gm-menu-name">{itemDisplayName(entry)}</span>
                        <small className="gm-mono">
                          {entry.group}/{entry.number}
                        </small>
                      </button>
                    ))
                  : skins.map(entry => (
                      <button
                        key={entry.number}
                        type="button"
                        className="gm-menu-item gm-menu-thing"
                        onClick={uiClick(() => spawnSkin(entry))}
                      >
                        <span className="gm-menu-name">{skinDisplayName(entry)}</span>
                        <small className="gm-mono">#{entry.number}</small>
                      </button>
                    ))}
                {(kind === 'items' ? items.length : skins.length) === 0 ? (
                  <p className="gm-menu-note">{t('gm.spawn.noMatch')}</p>
                ) : null}
              </div>
            </div>

            <div className="gm-menu-sep" />
          </>
        ) : null}

        <button type="button" className="gm-menu-item" onClick={uiClick(copy)}>
          {t('gm.map.menu.copy')}
        </button>
      </div>
    );
  }
);
