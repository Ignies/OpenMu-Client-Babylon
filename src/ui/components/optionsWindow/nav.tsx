import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../muSprite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import { CATEGORIES, type Page } from './catalogue';
import { FitText } from './controls';

const SEARCH_PLATE = 'delete_secret_number.OZT';
const SEARCH_HEIGHT = 23;

/**
 * The search field on the message box's input plate. Typing never reaches
 * the hot keys (the keyboard system skips input fields); Escape here clears
 * the field and lets go, so the next Escape closes the window.
 */
export const SearchField = ({
  width,
  value,
  onChange,
}: {
  width: number;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="options-search" data-no-drag="true" style={{ width }}>
    <MuSpriteFrame
      file={SEARCH_PLATE}
      width={width}
      height={SEARCH_HEIGHT}
      style={{ position: 'absolute', inset: 0, backgroundSize: '100% 100%' }}
    />
    <input
      className="options-search-input"
      type="text"
      value={value}
      placeholder={t('search.placeholder')}
      spellCheck={false}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onChange('');
        e.currentTarget.blur();
      }}
    />
    {value && (
      <span
        className="options-search-clear"
        title={t('common.close')}
        onClick={uiClick(() => onChange(''))}
      >
        ×
      </span>
    )}
  </div>
);

/**
 * Every category and page at once, nothing folded away: the whole window is
 * one glance. The page on screen is bracketed by the yellow markers the
 * quick command window puts round its hovered row.
 */
export const PageTree = observer(
  ({
    active,
    onOpen,
  }: {
    /** Null while a search is showing instead of a page. */
    active: Page | null;
    onOpen: (page: Page) => void;
  }) => (
    <div className="options-tree">
      {CATEGORIES.map(category => (
        <div key={category.id} className="options-tree-group">
          <div className="options-tree-category">
            <FitText align="left">{t(category.labelKey)}</FitText>
          </div>
          {category.pages.map(page => {
            const current = page === active;

            return (
              <div
                key={page.id}
                className={`options-tree-page${current ? ' is-active' : ''}`}
                data-options-nav={`${category.id}-${page.id}`}
                data-no-drag="true"
                onClick={uiClick(() => onOpen(page))}
              >
                {current && (
                  <MuSpriteFrame
                    file="newui_arrow(L).OZT"
                    width={6}
                    height={9}
                    className="options-tree-marker is-left"
                  />
                )}
                <FitText align="left" className="options-tree-name">
                  {t(page.labelKey)}
                </FitText>
                {current && (
                  <MuSpriteFrame
                    file="newui_arrow(R).OZT"
                    width={6}
                    height={9}
                    className="options-tree-marker is-right"
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  )
);
