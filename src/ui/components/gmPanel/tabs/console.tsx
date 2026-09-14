import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { uiClick } from '../../../../libs/sfx';
import { CommandCard } from '../commandForm';

/** A raw line, and every command in the catalogue, searchable. */
export const ConsoleTab = observer(() => {
  const [raw, setRaw] = useState('');

  return (
    <div className="gm-console">
      <label className="gm-field">
        <span className="gm-field-label">{t('gm.console.typeLine')}</span>
        <input
          className="gm-input gm-mono"
          type="text"
          value={raw}
          placeholder="/item 7 3 13"
          spellCheck={false}
          autoComplete="off"
          onChange={e => setRaw(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            GmPanel.sendRaw(raw);
            setRaw('');
          }}
        />
      </label>
      <p className="gm-hint">{t('gm.console.rawHint')}</p>

      <input
        className="gm-search"
        type="search"
        value={GmPanel.query}
        placeholder={t('gm.console.search')}
        spellCheck={false}
        autoComplete="off"
        onChange={e => GmPanel.setQuery(e.target.value)}
      />

      <div className={`gm-console-body${GmPanel.selected ? ' has-detail' : ''}`}>
        <div className="gm-console-list">
          {GmPanel.consoleGroups.length === 0 ? (
            <p className="gm-empty">{t('gm.console.noMatch')}</p>
          ) : (
            GmPanel.consoleGroups.map(group => (
              <div key={group.titleKey}>
                <h4 className="gm-section-title">{t(group.titleKey)}</h4>
                <div className="gm-commands">
                  {group.commands.map(command => (
                    <button
                      key={command.command}
                      type="button"
                      className={`gm-command${
                        GmPanel.selected?.command === command.command ? ' is-active' : ''
                      }${command.confirm ? ' is-heavy' : ''}`}
                      onClick={uiClick(() => GmPanel.select(command))}
                      title={t(command.helpKey)}
                    >
                      <span className="gm-command-label">{t(command.labelKey)}</span>
                      <code className="gm-command-slash">{command.command}</code>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {GmPanel.selected ? (
          <aside className="gm-detail">
            <CommandCard command={GmPanel.selected} />
          </aside>
        ) : null}
      </div>
    </div>
  );
});
