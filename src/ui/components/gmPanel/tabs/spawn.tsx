import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import type { WorldView } from '../../../../gmWorld';
import { gmCommand } from '../../../../common/gmCommands';
import {
  DEFAULT_ITEM_SPEC,
  ITEM_GROUPS,
  itemCommandValues,
  searchItems,
  searchSkins,
  type ItemEntry,
  type ItemSpec,
  type SkinKind,
} from '../../../../admin/catalogues';
import { itemDisplayName, skinDisplayName, spawnCatalogue } from '../../../../admin/skins';
import { uiClick } from '../../../../libs/sfx';
import { ItemIcon } from '../../itemIcon';
import { CommandCard, QuickButton } from '../commandForm';

/**
 * Items, monsters and NPCs from the tables rather than from typed numbers.
 *
 * The item grid is the whole item table with its icons; picking one opens
 * the `/item` options beside it. Monsters and NPCs are the server's monster
 * table (any number it defines can be created), with the intelligence
 * switch `/createmonster` takes. The Tools pane keeps the commands that
 * act on a monster already standing there.
 */

type Pane = 'items' | 'monsters' | 'npcs' | 'tools';

const PANES: { id: Pane; key: TextKey }[] = [
  { id: 'items', key: 'gm.spawn.items' },
  { id: 'monsters', key: 'gm.spawn.monsters' },
  { id: 'npcs', key: 'gm.spawn.npcs' },
  { id: 'tools', key: 'gm.spawn.tools' },
];

const GROUP_KEY: Record<number, TextKey> = {
  0: 'gm.itemGroup.swords',
  1: 'gm.itemGroup.axes',
  2: 'gm.itemGroup.maces',
  3: 'gm.itemGroup.spears',
  4: 'gm.itemGroup.bows',
  5: 'gm.itemGroup.staffs',
  6: 'gm.itemGroup.shields',
  7: 'gm.itemGroup.helms',
  8: 'gm.itemGroup.armors',
  9: 'gm.itemGroup.pants',
  10: 'gm.itemGroup.gloves',
  11: 'gm.itemGroup.boots',
  12: 'gm.itemGroup.wings',
  13: 'gm.itemGroup.helpers',
  14: 'gm.itemGroup.potions',
  15: 'gm.itemGroup.etc',
};

const NumberField = observer(({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <label className="gm-field gm-field-inline">
    <span className="gm-field-label">{label}</span>
    <input
      className="gm-input gm-input-short"
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
    />
  </label>
));

const ItemsPane = observer(() => {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<number | null>(null);
  const [picked, setPicked] = useState<ItemEntry | null>(null);
  const [spec, setSpec] = useState<ItemSpec>(DEFAULT_ITEM_SPEC);
  const item = gmCommand('/item');

  const shown = useMemo(() => searchItems(query, group, itemDisplayName), [query, group]);
  const values = picked ? itemCommandValues(picked, spec) : null;

  return (
    <div className={`gm-spawn-items${picked ? ' has-detail' : ''}`}>
      <div className="gm-spawn-items-main">
        <div className="gm-toolbar">
          <input
            className="gm-search"
            type="search"
            value={query}
            placeholder={t('gm.spawn.searchItems')}
            spellCheck={false}
            autoComplete="off"
            onChange={e => setQuery(e.target.value)}
          />
          <span className="gm-toolbar-count">{shown.length}</span>
        </div>
        <div className="gm-kinds">
          <button
            type="button"
            className={`gm-chip${group === null ? ' is-active' : ''}`}
            onClick={uiClick(() => setGroup(null))}
          >
            {t('gm.spawn.allGroups')}
          </button>
          {ITEM_GROUPS.map(g => (
            <button
              key={g}
              type="button"
              className={`gm-chip${group === g ? ' is-active' : ''}`}
              onClick={uiClick(() => setGroup(group === g ? null : g))}
            >
              {t(GROUP_KEY[g])}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="gm-empty">{t('gm.spawn.noMatch')}</p>
        ) : (
          <div className="gm-cards gm-item-cards">
            {shown.map(entry => {
              const active = picked?.group === entry.group && picked.number === entry.number;
              return (
                <button
                  key={`${entry.group}-${entry.number}`}
                  type="button"
                  className={`gm-card-btn gm-item-card${active ? ' is-active' : ''}`}
                  title={`${entry.group}/${entry.number}`}
                  onClick={uiClick(() => setPicked(active ? null : entry))}
                >
                  <span className="gm-item-icon">
                    <ItemIcon item={{ group: entry.group, num: entry.number, lvl: 0 }} />
                  </span>
                  <span className="gm-item-text">
                    <span className="gm-card-name">{itemDisplayName(entry)}</span>
                    <span className="gm-card-sub">
                      {t(GROUP_KEY[entry.group])} · {t('gm.spawn.dropLevel', { level: entry.dropLevel })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {picked && values ? (
        <aside className="gm-detail">
          <header className="gm-detail-head">
            <h3>{itemDisplayName(picked)}</h3>
            <button type="button" className="gm-chip-x" aria-label={t('common.close')} onClick={uiClick(() => setPicked(null))}>
              ×
            </button>
          </header>
          <p className="gm-hint">
            {t(GROUP_KEY[picked.group])} {picked.group}/{picked.number} · {picked.width}x{picked.height} ·{' '}
            {t('gm.spawn.reqLevel', { level: picked.requiredLevel })}
          </p>
          <div className="gm-spec">
            <NumberField label={t('gm.param.level')} value={spec.level} min={0} max={15} onChange={level => setSpec({ ...spec, level })} />
            <NumberField label={t('gm.param.option')} value={spec.option} min={0} max={7} onChange={option => setSpec({ ...spec, option })} />
            <NumberField label={t('gm.param.excellent')} value={spec.excellent} min={0} max={63} onChange={excellent => setSpec({ ...spec, excellent })} />
            <NumberField label={t('gm.param.ancient')} value={spec.ancient} min={0} max={2} onChange={ancient => setSpec({ ...spec, ancient })} />
            <label className={`gm-toggle-check${spec.luck ? ' is-on' : ''}`}>
              <input type="checkbox" checked={spec.luck} onChange={e => setSpec({ ...spec, luck: e.target.checked })} />
              {t('gm.param.luck')}
            </label>
            <label className={`gm-toggle-check${spec.skill ? ' is-on' : ''}`}>
              <input type="checkbox" checked={spec.skill} onChange={e => setSpec({ ...spec, skill: e.target.checked })} />
              {t('gm.param.skill')}
            </label>
          </div>
          <output className="gm-preview">{GmPanel.preview(item, values)}</output>
          <p className="gm-hint">{t('gm.spawn.itemHint')}</p>
          <div className="gm-card-actions">
            <button type="button" className="gm-btn" onClick={uiClick(() => GmPanel.run(item, values))}>
              {t('gm.spawn.give')}
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
});

const MonstersPane = observer(({ kind }: { kind: SkinKind }) => {
  const [query, setQuery] = useState('');
  const [intelligent, setIntelligent] = useState(kind === 'monster');
  const create = gmCommand('/createmonster');
  const all = spawnCatalogue();
  const shown = useMemo(() => searchSkins(all, query, kind, skinDisplayName), [all, query, kind]);

  return (
    <div className="gm-spawn-monsters">
      <div className="gm-toolbar">
        <input
          className="gm-search"
          type="search"
          value={query}
          placeholder={t('gm.spawn.searchMonsters')}
          spellCheck={false}
          autoComplete="off"
          onChange={e => setQuery(e.target.value)}
        />
        <div className="gm-toggle">
          <button
            type="button"
            className={`gm-toggle-btn${intelligent ? ' is-active' : ''}`}
            onClick={uiClick(() => setIntelligent(true))}
          >
            {t('gm.spawn.intelligent')}
          </button>
          <button
            type="button"
            className={`gm-toggle-btn${!intelligent ? ' is-active' : ''}`}
            onClick={uiClick(() => setIntelligent(false))}
          >
            {t('gm.spawn.still')}
          </button>
        </div>
        <span className="gm-toolbar-count">{shown.length}</span>
      </div>
      <p className="gm-hint">{t('gm.spawn.monsterHint')}</p>

      {shown.length === 0 ? (
        <p className="gm-empty">{t('gm.spawn.noMatch')}</p>
      ) : (
        <div className="gm-cards">
          {shown.map(entry => (
            <button
              key={entry.number}
              type="button"
              className={`gm-card-btn gm-skin-${entry.kind}`}
              title={`/createmonster ${entry.number}${intelligent ? ' 1' : ' 0'}`}
              onClick={uiClick(() =>
                GmPanel.run(create, { number: String(entry.number), intelligence: intelligent ? '1' : '0' })
              )}
            >
              <span className="gm-card-num gm-mono">#{entry.number}</span>
              <span className="gm-card-name">{skinDisplayName(entry)}</span>
              <span className="gm-card-sub">
                {entry.level ? `${t('common.level')} ${entry.level}` : ''}
              </span>
              <span className="gm-card-tag is-quiet">{t('gm.spawn.spawn')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const ToolsPane = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;
  const here = hero ? { x: String(hero.x), y: String(hero.y) } : undefined;

  return (
    <div className="gm-spawn-tools">
      <h4 className="gm-section-title">{t('gm.spawn.monstersInFront')}</h4>
      <p className="gm-hint">{t('gm.spawn.idsHint')}</p>
      <div className="gm-quick">
        <QuickButton command={gmCommand('/showids')} />
      </div>
      <div className="gm-grid-2">
        <CommandCard command={gmCommand('/movemonster')} overrides={here} hide={here ? ['x', 'y'] : undefined} />
        <CommandCard command={gmCommand('/walkmonster')} />
        <CommandCard command={gmCommand('/removenpc')} />
        <CommandCard command={gmCommand('/npc')} />
      </div>
    </div>
  );
});

export const SpawnTab = observer(({ view }: { view: WorldView }) => {
  const [pane, setPane] = useState<Pane>('items');

  return (
    <div className="gm-spawn">
      <div className="gm-subtabs">
        {PANES.map(entry => (
          <button
            key={entry.id}
            type="button"
            className={`gm-subtab${pane === entry.id ? ' is-active' : ''}`}
            onClick={uiClick(() => setPane(entry.id))}
          >
            {t(entry.key)}
          </button>
        ))}
      </div>

      {pane === 'items' ? <ItemsPane /> : null}
      {pane === 'monsters' ? <MonstersPane kind="monster" /> : null}
      {pane === 'npcs' ? <MonstersPane kind="npc" /> : null}
      {pane === 'tools' ? <ToolsPane view={view} /> : null}
    </div>
  );
});
