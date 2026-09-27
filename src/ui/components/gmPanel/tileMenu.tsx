import { useMemo, useState } from 'react';
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
  type ItemSpec,
  type SkinEntry,
} from '../../../admin/catalogues';
import { itemDisplayName, skinDisplayName, spawnCatalogue } from '../../../admin/skins';
import { GmLibrary, spread, type Macro, type MacroVars } from '../../../admin/gmLibrary';
import { uiClick } from '../../../libs/sfx';
import { ItemIcon } from '../itemIcon';
import { ContextMenu, type MenuPoint } from './contextMenu';

/**
 * What can be done at one tile of the map, on a right-click.
 *
 * Items and monsters land where the game master stands (`/item` and
 * `/createmonster` take no coordinate), and `/fireworks` takes one only on
 * their own map, so anything done at a tile they are not on takes them there
 * and back to where they were - the panel's queue sends the lines in order.
 * Several at once stand on the tiles round it, each one visited in turn.
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

/** The most spawned in one go. */
const MAX_COUNT = 30;

const clampTile = (v: number) => Math.max(0, Math.min(255, v));

export const TileMenu = observer(
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
    at: MenuPoint;
    hero: Hero | null;
    onClose: () => void;
  }) => {
    const [kind, setKind] = useState<Kind>('items');
    const [query, setQuery] = useState('');
    const [count, setCount] = useState(1);
    const [spec, setSpec] = useState<ItemSpec>(DEFAULT_ITEM_SPEC);
    const move = gmCommand('/move');
    const standing = !!hero && hero.map === map && hero.x === x && hero.y === y;
    const target = GmPanel.target && GmPanel.target !== hero?.name ? GmPanel.target : '';

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

    const moveMe = (toMap: number, tx: number, ty: number) => {
      if (hero) GmPanel.run(move, { target: hero.name, mapIdOrName: String(toMap), x: String(tx), y: String(ty) });
    };
    const goTo = (tx: number, ty: number) => moveMe(map, tx, ty);
    // Where the game master was when the menu opened, to be put back after.
    const goBack = () => {
      if (hero) moveMe(hero.map, hero.x, hero.y);
    };

    /** Do `act` at the tile: at once when standing on it, otherwise there and back. */
    const there = (act: () => void) => {
      if (standing) {
        act();
      } else {
        goTo(x, y);
        act();
        goBack();
      }
      onClose();
    };

    /** `spawn` on `count` tiles round this one, visiting each in turn, then back. */
    const several = (spawn: () => void) => {
      let left = false;
      spread(count).forEach(([dx, dy]) => {
        const tx = clampTile(x + dx);
        const ty = clampTile(y + dy);
        if (!(standing && tx === x && ty === y)) {
          goTo(tx, ty);
          left = true;
        }
        spawn();
      });
      if (left) goBack();
      onClose();
    };

    const spawnItem = (entry: ItemEntry) =>
      several(() => GmPanel.run(gmCommand('/item'), itemCommandValues(entry, spec)));

    const spawnSkin = (entry: SkinEntry) =>
      several(() =>
        GmPanel.run(gmCommand('/createmonster'), {
          number: String(entry.number),
          intelligence: entry.kind === 'monster' ? '1' : '0',
        })
      );

    // On the game master's own map the command takes the tile itself.
    const fireworks = (command: '/fireworks' | '/xmasfireworks') => {
      const fire = () => GmPanel.run(gmCommand(command), { x: String(x), y: String(y) });
      if (hero?.map === map) {
        fire();
        onClose();
      } else {
        there(fire);
      }
    };

    /** A macro at the tile, with the way back as its last step when it went there. */
    const macroHere = (macro: Macro) => {
      if (!vars || !hero) return;
      if (!standing) goTo(x, y);
      GmPanel.runMacro(
        standing
          ? macro
          : {
              ...macro,
              steps: [...macro.steps, { line: `/move ${hero.name} ${hero.map} ${hero.x} ${hero.y}`, delayMs: 0 }],
            },
        vars
      );
      onClose();
    };

    const vars: MacroVars | null = hero ? { x, y, map, me: hero.name, target: GmPanel.target } : null;

    const copy = () => {
      void navigator.clipboard?.writeText(`${map} ${x} ${y}`).catch(() => undefined);
      onClose();
    };

    return (
      <ContextMenu at={at} onClose={onClose}>
        <header className="gm-menu-head">
          <b>{mapName(map)}</b>
          <span className="gm-mono">
            {x}, {y}
          </span>
        </header>
        {hero && !standing ? <p className="gm-menu-note">{t('gm.map.menu.movesYou')}</p> : null}

        {hero ? (
          <>
            <button
              type="button"
              className="gm-menu-item"
              onClick={uiClick(() => {
                goTo(x, y);
                onClose();
              })}
              disabled={standing}
            >
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
              <div className="gm-menu-spawn-head">
                <span className="gm-menu-label">{t('gm.spawn.spawn')}</span>
                <span className="gm-stepper" title={t('gm.map.menu.count')}>
                  <button type="button" onClick={uiClick(() => setCount(Math.max(1, count - 1)))}>
                    −
                  </button>
                  <span className="gm-mono">×{count}</span>
                  <button type="button" onClick={uiClick(() => setCount(Math.min(MAX_COUNT, count + 1)))}>
                    +
                  </button>
                </span>
              </div>
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
              {kind === 'items' ? (
                <div className="gm-menu-presets">
                  <button
                    type="button"
                    className={`gm-chip${spec === DEFAULT_ITEM_SPEC ? ' is-active' : ''}`}
                    onClick={uiClick(() => setSpec(DEFAULT_ITEM_SPEC))}
                  >
                    {t('gm.presets.plain')}
                  </button>
                  {GmLibrary.presets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`gm-chip${spec === preset.spec ? ' is-active' : ''}`}
                      onClick={uiClick(() => setSpec(preset.spec))}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              ) : null}
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

            {vars && GmLibrary.macros.length > 0 ? (
              <>
                <div className="gm-menu-sep" />
                <span className="gm-menu-label gm-menu-label-pad">{t('gm.map.menu.macros')}</span>
                {GmLibrary.macros.map(macro => (
                  <button
                    key={macro.id}
                    type="button"
                    className="gm-menu-item"
                    onClick={uiClick(() => macroHere(macro))}
                  >
                    <span className="gm-menu-name">▸ {macro.name}</span>
                    <small className="gm-mono">{macro.steps.length}</small>
                  </button>
                ))}
              </>
            ) : null}

            <div className="gm-menu-sep" />
          </>
        ) : null}

        <button type="button" className="gm-menu-item" onClick={uiClick(copy)}>
          {t('gm.map.menu.copy')}
        </button>
      </ContextMenu>
    );
  }
);
