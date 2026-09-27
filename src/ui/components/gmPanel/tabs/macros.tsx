import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import type { WorldView } from '../../../../gmWorld';
import { GmLibrary, MAX_DELAY_MS, type Macro, type MacroStep } from '../../../../admin/gmLibrary';
import { uiClick } from '../../../../libs/sfx';

/**
 * Macros for events: lines sent one after another, each with its own wait
 * after it (none sends the next as soon as chat allows). Placeholders are
 * filled in where it runs - here, where the game master stands; from the
 * map's menu, at the tile. Kept in this browser (`admin/gmLibrary.ts`).
 */

/** Steps offered as a start, by the command they send. */
const SNIPPETS: { labelKey: TextKey; line: string }[] = [
  { labelKey: 'gm.cmd.fireworks.label', line: '/fireworks {x} {y}' },
  { labelKey: 'gm.cmd.xmasfireworks.label', line: '/xmasfireworks {x} {y}' },
  { labelKey: 'gm.cmd.item.label', line: '/item 14 13' },
  { labelKey: 'gm.cmd.createmonster.label', line: '/createmonster 3 1' },
  { labelKey: 'gm.cmd.move.label', line: '/move {me} {map} {x} {y}' },
  { labelKey: 'gm.cmd.goldnotice.label', line: '/goldnotice ' },
];

const TOKENS: { token: string; key: TextKey }[] = [
  { token: '{x} {y}', key: 'gm.macros.tokenWhere' },
  { token: '{map}', key: 'gm.macros.tokenMap' },
  { token: '{me}', key: 'gm.macros.tokenMe' },
  { token: '{target}', key: 'gm.macros.tokenTarget' },
];

const StepRow = observer(
  ({ macro, step, index }: { macro: Macro; step: MacroStep; index: number }) => {
    const change = (next: Partial<MacroStep>) =>
      GmLibrary.updateMacro(macro.id, m => ({
        ...m,
        steps: m.steps.map((s, i) => (i === index ? { ...s, ...next } : s)),
      }));
    const moveBy = (by: number) =>
      GmLibrary.updateMacro(macro.id, m => {
        const steps = [...m.steps];
        const [taken] = steps.splice(index, 1);
        steps.splice(Math.max(0, Math.min(steps.length, index + by)), 0, taken);
        return { ...m, steps };
      });
    const remove = () =>
      GmLibrary.updateMacro(macro.id, m => ({ ...m, steps: m.steps.filter((_, i) => i !== index) }));
    const running = GmPanel.macroRun?.id === macro.id && GmPanel.macroRun.step === index + 1;

    return (
      <li className={`gm-step${running ? ' is-running' : ''}`}>
        <span className="gm-step-n gm-mono">{index + 1}</span>
        <input
          className="gm-input gm-mono gm-step-line"
          type="text"
          value={step.line}
          placeholder="/fireworks {x} {y}"
          spellCheck={false}
          autoComplete="off"
          onChange={e => change({ line: e.target.value })}
          onKeyDown={e => e.stopPropagation()}
        />
        <label className="gm-step-wait" title={t('gm.macros.waitHint')}>
          <input
            className="gm-input gm-mono"
            type="number"
            min={0}
            max={MAX_DELAY_MS}
            step={100}
            value={step.delayMs}
            onChange={e =>
              change({ delayMs: Math.max(0, Math.min(MAX_DELAY_MS, Math.round(Number(e.target.value) || 0))) })
            }
            onKeyDown={e => e.stopPropagation()}
          />
          <span>ms</span>
        </label>
        <span className="gm-step-tools">
          <button type="button" aria-label="up" disabled={index === 0} onClick={uiClick(() => moveBy(-1))}>
            ↑
          </button>
          <button
            type="button"
            aria-label="down"
            disabled={index === macro.steps.length - 1}
            onClick={uiClick(() => moveBy(1))}
          >
            ↓
          </button>
          <button type="button" aria-label={t('common.close')} onClick={uiClick(remove)}>
            ×
          </button>
        </span>
      </li>
    );
  }
);

const Editor = observer(({ macro, view, onDeleted }: { macro: Macro; view: WorldView; onDeleted: () => void }) => {
  const [deleting, setDeleting] = useState(false);
  const hero = view.hero;
  const running = GmPanel.macroRun?.id === macro.id;
  const pinned = GmLibrary.isFavourite({ kind: 'macro', id: macro.id });

  const addStep = (line: string) =>
    GmLibrary.updateMacro(macro.id, m => ({
      ...m,
      // A blank last step is filled rather than followed.
      steps:
        m.steps.length && !m.steps[m.steps.length - 1].line.trim()
          ? [...m.steps.slice(0, -1), { ...m.steps[m.steps.length - 1], line }]
          : [...m.steps, { line, delayMs: 0 }],
    }));

  return (
    <section className="gm-macro-edit">
      <label className="gm-field">
        <span className="gm-field-label">{t('gm.macros.name')}</span>
        <input
          className="gm-input"
          type="text"
          value={macro.name}
          spellCheck={false}
          autoComplete="off"
          onChange={e => GmLibrary.updateMacro(macro.id, m => ({ ...m, name: e.target.value }))}
          onKeyDown={e => e.stopPropagation()}
        />
      </label>

      <h4 className="gm-section-title">{t('gm.macros.steps')}</h4>
      <p className="gm-hint">{t('gm.macros.waitHint')}</p>
      <ol className="gm-steps">
        {macro.steps.map((step, i) => (
          <StepRow key={i} macro={macro} step={step} index={i} />
        ))}
      </ol>

      <div className="gm-quick gm-snippets">
        <button type="button" className="gm-btn gm-btn-compact" onClick={uiClick(() => addStep(''))}>
          + {t('gm.macros.addStep')}
        </button>
        {SNIPPETS.map(snippet => (
          <button
            key={snippet.line}
            type="button"
            className="gm-chip"
            title={snippet.line}
            onClick={uiClick(() => addStep(snippet.line))}
          >
            {t(snippet.labelKey)}
          </button>
        ))}
      </div>

      <dl className="gm-tokens">
        {TOKENS.map(entry => (
          <div key={entry.token}>
            <dt className="gm-mono">{entry.token}</dt>
            <dd>{t(entry.key)}</dd>
          </div>
        ))}
      </dl>

      <div className="gm-macro-actions">
        <button
          type="button"
          className={`gm-btn gm-btn-heavy${deleting ? ' is-armed' : ''}`}
          onClick={uiClick(() => {
            if (!deleting) {
              setDeleting(true);
              return;
            }
            GmLibrary.deleteMacro(macro.id);
            onDeleted();
          })}
          onBlur={() => setDeleting(false)}
        >
          {deleting ? t('gm.confirm') : t('gm.macros.delete')}
        </button>
        <button
          type="button"
          className="gm-btn gm-macro-pin"
          onClick={uiClick(() => GmLibrary.toggleFavourite({ kind: 'macro', id: macro.id }))}
        >
          {pinned ? t('gm.fav.unpin') : t('gm.fav.pin')}
        </button>
        {running ? (
          <button type="button" className="gm-btn gm-macro-stop" onClick={uiClick(() => GmPanel.stopMacro())}>
            {t('gm.macros.stop')}
          </button>
        ) : (
          <button
            type="button"
            className="gm-btn gm-btn-primary"
            disabled={!hero}
            onClick={uiClick(() => {
              if (hero) {
                GmPanel.runMacro(macro, { x: hero.x, y: hero.y, map: hero.map, me: hero.name, target: GmPanel.target });
              }
            })}
          >
            ▸ {t('gm.macros.runHere')}
          </button>
        )}
      </div>
    </section>
  );
});

export const MacrosTab = observer(({ view }: { view: WorldView }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const macros = GmLibrary.macros;
  const open = macros.find(m => m.id === openId) ?? macros[0] ?? null;

  return (
    <div className="gm-macros">
      <aside className="gm-macros-side">
        <button
          type="button"
          className="gm-btn gm-btn-compact"
          onClick={uiClick(() => setOpenId(GmLibrary.addMacro(t('gm.macros.untitled')).id))}
        >
          + {t('gm.macros.new')}
        </button>
        <div className="gm-maplist">
          {macros.map(macro => (
            <button
              key={macro.id}
              type="button"
              className={`gm-maplist-row${macro.id === open?.id ? ' is-active' : ''}`}
              onClick={uiClick(() => setOpenId(macro.id))}
            >
              <span>{macro.name || t('gm.macros.untitled')}</span>
              <small className="gm-mono">{macro.steps.length}</small>
            </button>
          ))}
        </div>
      </aside>

      {open ? (
        <Editor key={open.id} macro={open} view={view} onDeleted={() => setOpenId(null)} />
      ) : (
        <p className="gm-empty gm-macros-empty">{t('gm.macros.empty')}</p>
      )}
    </div>
  );
});
