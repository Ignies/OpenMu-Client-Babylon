import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { gmCommand } from '../../../../common/gmCommands';
import { searchSkins, type SkinKind } from '../../../../admin/catalogues';
import { skinCatalogue, skinDisplayName } from '../../../../admin/skins';
import { uiClick } from '../../../../libs/sfx';

/**
 * Every model the client can draw, one click to wear it.
 *
 * `/skin N` sets the server's transformation skin; the server re-sends the
 * game master to everyone in scope as that monster. This client keeps
 * drawing the hero's own body (the controller and the camera are built on
 * the player rig), so the mark here is the last skin sent, not a mirror.
 */

export const SkinsTab = observer(() => {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<SkinKind | 'all'>('all');
  const skin = gmCommand('/skin');
  const all = skinCatalogue();

  const shown = useMemo(() => searchSkins(all, query, kind, skinDisplayName), [all, query, kind]);

  const wear = (number: number) => {
    GmPanel.setSkin(number);
    GmPanel.run(skin, { skin: String(number) });
  };

  return (
    <div className="gm-skins">
      <div className="gm-toolbar">
        <input
          className="gm-search"
          type="search"
          value={query}
          placeholder={t('gm.skins.search')}
          spellCheck={false}
          autoComplete="off"
          onChange={e => setQuery(e.target.value)}
        />
        <div className="gm-toggle">
          {(['all', 'monster', 'npc'] as const).map(option => (
            <button
              key={option}
              type="button"
              className={`gm-toggle-btn${kind === option ? ' is-active' : ''}`}
              onClick={uiClick(() => setKind(option))}
            >
              {option === 'all' ? t('gm.skins.all') : option === 'monster' ? t('gm.skins.monsters') : t('gm.skins.npcs')}
            </button>
          ))}
        </div>
        <span className="gm-toolbar-count">{t('gm.skins.count', { count: shown.length })}</span>
        <button
          type="button"
          className={`gm-btn gm-btn-compact${GmPanel.skin === 0 ? ' is-armed' : ''}`}
          onClick={uiClick(() => wear(0))}
        >
          {t('gm.skins.reset')}
        </button>
      </div>

      <p className="gm-hint">{t('gm.skins.hint')}</p>

      {shown.length === 0 ? (
        <p className="gm-empty">{t('gm.skins.noMatch')}</p>
      ) : (
        <div className="gm-cards">
          {shown.map(entry => {
            const wearing = GmPanel.skin === entry.number;
            return (
              <button
                key={entry.number}
                type="button"
                className={`gm-card-btn gm-skin-${entry.kind}${wearing ? ' is-wearing' : ''}`}
                title={`/skin ${entry.number}`}
                onClick={uiClick(() => wear(entry.number))}
              >
                <span className="gm-card-num gm-mono">#{entry.number}</span>
                <span className="gm-card-name">{skinDisplayName(entry)}</span>
                <span className="gm-card-sub">
                  {entry.kind === 'npc' ? t('gm.skins.npc') : t('gm.skins.monster')}
                  {entry.level ? ` · ${t('common.level')} ${entry.level}` : ''}
                </span>
                {wearing ? <span className="gm-card-tag">{t('gm.skins.wearing')}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
