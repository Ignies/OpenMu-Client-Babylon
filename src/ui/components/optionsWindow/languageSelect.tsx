/**
 * The language picker on Options → Game.
 *
 * A `<select>` would be the browser's chrome dropped into the middle of a
 * stone window, so this is the window's own: a closed plate with the current
 * flag and the language's own name for itself, and a list that drops over the
 * rows below it in the same gold-on-black the tabs and key boxes use.
 *
 * It commands `i18n.setLanguage`; the choice is stored by the facade and every
 * `observer` on screen redraws itself.
 */

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { i18n, t } from '../../../i18n';
import { MuFlag } from '../muFlag';

const ROW_HEIGHT = 18;
const PLATE_HEIGHT = 18;
const FLAG_WIDTH = 18;

/** How many languages the list shows before it scrolls. */
const VISIBLE_ROWS = 8;

export const LanguageSelect = observer(
  ({ left, top, width }: { left: number; top: number; width: number }) => {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    // A click anywhere else closes the list, the way the emote menu does.
    useEffect(() => {
      if (!open) return;

      const onDown = (e: PointerEvent) => {
        if (!root.current?.contains(e.target as Node)) setOpen(false);
      };

      document.addEventListener('pointerdown', onDown, true);
      return () => document.removeEventListener('pointerdown', onDown, true);
    }, [open]);

    const current = i18n.current;

    return (
      <div
        ref={root}
        className="options-language"
        style={{ left, top, width }}
      >
        <span className="options-label" style={{ left: 0, top: 0 }}>
          {t('options.tab.language')}
        </span>

        <div
          className={`options-combo${open ? ' is-open' : ''}`}
          style={{ top: 12, width, height: PLATE_HEIGHT }}
          title={t('options.languageHint')}
          onClick={uiClick(() => setOpen(v => !v))}
        >
          <MuFlag region={current.region} width={FLAG_WIDTH} />
          <span className="options-combo-name">{current.label}</span>
          <span className="options-combo-arrow">{open ? '▲' : '▼'}</span>
        </div>

        {open && (
          <div
            className="options-combo-list scrollable"
            style={{
              top: 12 + PLATE_HEIGHT + 2,
              width,
              maxHeight: VISIBLE_ROWS * ROW_HEIGHT + 4,
            }}
          >
            {i18n.languages.map(language => (
              <div
                key={language.code}
                className={`options-combo-row${
                  language.code === current.code ? ' is-active' : ''
                }`}
                style={{ height: ROW_HEIGHT }}
                title={t(
                  language.dataPack ? 'options.packHint' : 'options.noPackHint'
                )}
                onClick={uiClick(() => {
                  i18n.setLanguage(language.code);
                  setOpen(false);
                })}
              >
                <MuFlag region={language.region} width={FLAG_WIDTH} />
                <span className="options-combo-name">{language.label}</span>
                {language.dataPack && (
                  <span className="options-combo-mark">
                    {t('options.packMark')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
