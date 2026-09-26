import { playUiSound } from '../../../libs/sfx';
import './style.less';
import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { useEventBus } from '../../../hooks/useEventBus';
import { MuTableFrame } from '../muWindow';
import { MuResizeGrip, useWindowChrome } from '../muWindow/useWindowChrome';
import { MuWindows } from '../muWindow/windowState';
import {
  defaultGameOption,
  setGameOption,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import { invalidateShadowState } from '../../../common/objectShadow';
import { installApp } from '../../../common/pwaInstall';
import { reloadMapObjects } from '../../../libs/mu/loadMapIntoScene';
import {
  KeyBindings,
  isKey,
  isReservedKey,
  keyLabel,
  resetKeyBindings,
  setCapturingKey,
  setKeyBinding,
  type KeyAction,
} from '../../../common/keyBindings';
import { SessionExit, type ExitKind } from '../../../common/sessionExit';
import { t, type TextKey } from '../../../i18n';
import { EN_TEXT } from '../../../i18n/recipes';
import { applyTierPreset, type TierPreset } from './presets';
import {
  ALL_PAGES,
  categoryOf,
  findOptionRow,
  helpKeyOf,
  optionKeyOf,
  rowId,
  type ButtonRow,
  type Page,
  type Row,
  type Section,
} from './catalogue';
import { blockerOf, hiddenByStyle, type Blocker } from './gating';
import { matchesQuery } from './search';
import { OptionsFrame } from './frame';
import { FitText, OptionsButton } from './controls';
import { PageTree, SearchField } from './nav';
import { OptionRow, type RowActions } from './rows';
import { ScrollBar } from './scrollbar';
import { ConfirmBox, NoticeBox } from './dialogs';

const WINDOW_ID = 'options';
const HOT_KEY = 'options';

const WIN_WIDTH = 640;
const WIN_HEIGHT = 540;

const PANEL_TOP = 36;
const PANEL_BOTTOM = WIN_HEIGHT - 52;
const PANEL_PAD = 6;

const RAIL_X = 16;
const RAIL_WIDTH = 178;

const CONTENT_X = RAIL_X + RAIL_WIDTH + 8;
const CONTENT_WIDTH = WIN_WIDTH - CONTENT_X - 16;

const HELP_HEIGHT = 80;
const HELP_TOP = PANEL_BOTTOM - HELP_HEIGHT;
const CONTENT_BOTTOM = HELP_TOP - 6;

const HEADER_HEIGHT = 36;
const ROWS_TOP = PANEL_TOP + HEADER_HEIGHT;
const ROWS_HEIGHT = CONTENT_BOTTOM - PANEL_PAD - ROWS_TOP;
const SCROLL_WIDTH = 15;
const ROWS_WIDTH = CONTENT_WIDTH - PANEL_PAD * 2 - SCROLL_WIDTH - 4;

const DEFAULTS_WIDTH = 96;

const FOOTER_Y = WIN_HEIGHT - 47;
const FOOTER_X = 24;
const EXIT_WIDTH = 116;
const EXIT_GAP = 6;
const CLOSE_WIDTH = 108;

const FLASH_MS = 1400;

/** The ways out, in the footer: whichever the game can take right now. */
const EXITS: { exit: ExitKind; labelKey: TextKey; helpKey: TextKey }[] = [
  {
    exit: 'characters',
    labelKey: 'options.switchCharacter',
    helpKey: 'options.help.switchCharacter',
  },
  {
    exit: 'servers',
    labelKey: 'options.selectServer',
    helpKey: 'options.help.selectServer',
  },
  { exit: 'quit', labelKey: 'options.exitGame', helpKey: 'options.help.exitGame' },
];

const CONFIRM_TEXT: Record<ExitKind, TextKey> = {
  quit: 'exit.confirmQuit',
  servers: 'exit.confirmServers',
  characters: 'exit.confirmCharacters',
};

/**
 * The page the window reopens on, for this session. The ways out sit in the
 * footer on every page, so reopening where the player left off costs
 * nothing - Escape still reaches Exit game in one press.
 */
let lastPage: Page = ALL_PAGES[0];

type Hovered =
  | { kind: 'row'; row: Row }
  | { kind: 'exit'; labelKey: TextKey; helpKey: TextKey }
  | null;

type Match = { page: Page; rows: Row[] };

function sectionsOf(page: Page): Section[] {
  return page.sections
    .map(section => ({
      ...section,
      rows: section.rows.filter(
        row => row.kind === 'key' || !hiddenByStyle(row.needs)
      ),
    }))
    .filter(section => section.rows.length > 0);
}

function searchTexts(row: Row, page: Page, section: Section): string[] {
  const keys: TextKey[] = [row.labelKey, helpKeyOf(row), page.labelKey];
  if (section.titleKey) keys.push(section.titleKey);
  keys.push(categoryOf(page).labelKey);

  const texts = keys.flatMap(key => [t(key), EN_TEXT[key]]);
  if (row.kind === 'key') texts.push(keyLabel(KeyBindings[row.action]));
  return texts;
}

function search(query: string): Match[] {
  return ALL_PAGES.flatMap(page => {
    const rows = page.sections.flatMap(section =>
      section.rows.filter(row => matchesQuery(query, searchTexts(row, page, section)))
    );
    return rows.length ? [{ page, rows }] : [];
  });
}

const HelpStrip = observer(({ hovered, page }: { hovered: Hovered; page: Page | null }) => {
  let title = '';
  let body = t(page?.hintKey ?? 'options.help.idle');
  let blocker: Blocker | null = null;
  let applies: TextKey | undefined;

  if (hovered?.kind === 'exit') {
    title = t(hovered.labelKey);
    body = t(hovered.helpKey);
  } else if (hovered?.kind === 'row') {
    const { row } = hovered;
    title = t(row.labelKey);
    body = t(helpKeyOf(row));
    if (row.kind !== 'key') {
      blocker = blockerOf(row.needs);
      applies = row.appliesKey;
    }
  }

  return (
    <div
      className="options-help"
      style={{
        left: CONTENT_X + PANEL_PAD + 4,
        top: HELP_TOP + PANEL_PAD,
        width: CONTENT_WIDTH - PANEL_PAD * 2 - 8,
        height: HELP_HEIGHT - PANEL_PAD * 2,
      }}
    >
      {title && <div className="options-help-title">{title}</div>}
      <div className="options-help-body">{body}</div>
      {blocker ? (
        <div className="options-help-blocker">
          {t(blocker.text, blocker.params)}
          {blocker.target && ` ${t('options.needs.click')}`}
        </div>
      ) : (
        applies && <div className="options-help-applies">{t(applies)}</div>
      )}
    </div>
  );
});

export const OptionsWindow = observer(() => {
  const [page, setPage] = useState<Page>(lastPage);
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<Hovered>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  // Key being rebound: the next key press goes to it instead of the game.
  const [capturing, setCapturing] = useState<KeyAction | null>(null);
  const [confirming, setConfirming] = useState<ExitKind | null>(null);
  const [confirmingDefaults, setConfirmingDefaults] = useState(false);
  const [notice, setNotice] = useState<TextKey | null>(null);

  useEffect(() => {
    setCapturingKey(capturing !== null);
    if (capturing === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code !== 'Escape' && !isReservedKey(e.code)) {
        setKeyBinding(capturing, e.code);
      }
      setCapturing(null);
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      setCapturingKey(false);
    };
  }, [capturing]);

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      Store.optionsEnabled = !Store.optionsEnabled;
      playUiSound('click');
    }
  });

  // A stack member: Escape reaches it through the window stack (`onClose`).
  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    onClose: () => {
      Store.optionsEnabled = false;
      // NewUIOptionWindow.cpp:525.
      playUiSound('click');
    },
  });

  useEffect(() => {
    if (Store.optionsEnabled) return;
    setCapturing(null);
    setConfirming(null);
    setConfirmingDefaults(false);
    setNotice(null);
    setQuery('');
    setHovered(null);
  }, [Store.optionsEnabled]);

  useEffect(() => {
    lastPage = page;
  }, [page]);

  // The jump from a greyed row: bring the unlocking row into view and light it.
  useEffect(() => {
    if (!flash) return;

    const pane = rowsRef.current;
    const target = pane?.querySelector<HTMLElement>(`[data-row-id="${flash}"]`);
    if (pane && target) {
      pane.scrollTop = Math.max(
        0,
        target.offsetTop - (pane.clientHeight - target.offsetHeight) / 2
      );
    }

    const timer = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!Store.optionsEnabled) return null;

  const openPage = (next: Page) => {
    setPage(next);
    setQuery('');
    setHovered(null);
    setCapturing(null);
    if (rowsRef.current) rowsRef.current.scrollTop = 0;
  };

  const set = <K extends keyof GameOptionsType>(
    key: K,
    value: GameOptionsType[K]
  ) => {
    setGameOption(key, value);

    if (key === 'shadows') {
      // Each ModelObject re-applies its own slots next frame; `shadowSlotActive`
      // already reads GameOptions.shadows.
      invalidateShadowState();
    }

    if (key === 'propBatching') {
      // Which path a record takes is decided when it is created.
      void reloadMapObjects();
    }
  };

  const applyPreset = (preset: TierPreset) => {
    applyTierPreset(preset);
    invalidateShadowState();
  };

  const press = (row: ButtonRow) => {
    setCapturing(null);

    if (row.id === 'resetWindows') {
      MuWindows.resetAll();
      return;
    }

    void installApp().then(result => {
      // The browser never offered, or took the offer back: say where its own
      // install lives rather than doing nothing.
      if (result === 'unavailable') setNotice('options.installHint');
    });
  };

  const jump = (blocker: Blocker) => {
    if (!blocker.target) return;
    const found = findOptionRow(blocker.target);
    if (!found) return;

    openPage(found.page);
    setHovered({ kind: 'row', row: found.row });
    setFlash(rowId(found.row));
  };

  const actions: RowActions = {
    set,
    applyPreset,
    capturing,
    capture: setCapturing,
    press,
    hover: row => setHovered({ kind: 'row', row }),
    jump,
  };

  const optionKeys = page.sections.flatMap(section =>
    section.rows.flatMap(row => {
      const key = optionKeyOf(row);
      return key ? [key] : [];
    })
  );
  const isKeysPage = page.sections.some(section =>
    section.rows.some(row => row.kind === 'key')
  );

  const restoreDefaults = () => {
    if (isKeysPage) resetKeyBindings();
    for (const key of optionKeys) set(key, defaultGameOption(key));
  };

  // A hundred-odd rows: cheap enough to match on every render, which also
  // keeps the results in the language on screen.
  const matches = query.trim() ? search(query) : null;
  const searching = matches !== null;
  const category = categoryOf(page);

  const renderRows = (rows: Row[]) =>
    rows.map(row => (
      <OptionRow
        key={rowId(row)}
        row={row}
        flash={flash === rowId(row)}
        actions={actions}
      />
    ));

  return (
    <div className="options-window-page">
      <div
        ref={chrome.ref as React.Ref<HTMLDivElement>}
        className="options-window"
        style={{
          ...chrome.style,
          position: chrome.anchored ? 'relative' : 'absolute',
          transformOrigin: chrome.anchored ? 'center' : '0 0',
        }}
      >
        <OptionsFrame width={WIN_WIDTH} height={WIN_HEIGHT} />

        {/* The whole title bar is the handle, so the grab point stays put. */}
        <div
          className="options-titlebar"
          style={{ width: WIN_WIDTH }}
          onPointerDown={chrome.onPointerDown}
        >
          {t('options.title')}
        </div>

        <MuTableFrame
          className="options-panel"
          left={RAIL_X}
          top={PANEL_TOP}
          width={RAIL_WIDTH}
          height={PANEL_BOTTOM - PANEL_TOP}
        />
        <div
          className="options-rail"
          style={{
            left: RAIL_X + PANEL_PAD,
            top: PANEL_TOP + PANEL_PAD,
            width: RAIL_WIDTH - PANEL_PAD * 2,
            height: PANEL_BOTTOM - PANEL_TOP - PANEL_PAD * 2,
          }}
        >
          <SearchField
            width={RAIL_WIDTH - PANEL_PAD * 2}
            value={query}
            onChange={next => {
              setQuery(next);
              setHovered(null);
              setCapturing(null);
              if (rowsRef.current) rowsRef.current.scrollTop = 0;
            }}
          />
          <PageTree active={searching ? null : page} onOpen={openPage} />
        </div>

        <MuTableFrame
          className="options-panel"
          left={CONTENT_X}
          top={PANEL_TOP}
          width={CONTENT_WIDTH}
          height={CONTENT_BOTTOM - PANEL_TOP}
        />
        <div
          className="options-page-title"
          style={{
            left: CONTENT_X + PANEL_PAD + 6,
            top: PANEL_TOP + PANEL_PAD,
            width: CONTENT_WIDTH - PANEL_PAD * 2 - DEFAULTS_WIDTH - 18,
            height: HEADER_HEIGHT - PANEL_PAD * 2,
          }}
        >
          <FitText align="left">
            {searching ? (
              t('options.search.results')
            ) : (
              <>
                <span className="options-page-category">{t(category.labelKey)}</span>
                {t(page.labelKey)}
              </>
            )}
          </FitText>
        </div>
        {!searching && (optionKeys.length > 0 || isKeysPage) && (
          <OptionsButton
            label={t('options.defaults')}
            width={DEFAULTS_WIDTH}
            onClick={() => {
              setCapturing(null);
              setConfirmingDefaults(true);
            }}
            style={{
              left: CONTENT_X + CONTENT_WIDTH - PANEL_PAD - DEFAULTS_WIDTH - 2,
              top: PANEL_TOP + 3,
            }}
          />
        )}

        <div
          ref={rowsRef}
          className="options-rows scrollable"
          style={{
            left: CONTENT_X + PANEL_PAD,
            top: ROWS_TOP,
            width: ROWS_WIDTH,
            height: ROWS_HEIGHT,
          }}
        >
          {matches === null &&
            sectionsOf(page).map((section, i) => (
              <div key={section.titleKey ?? `untitled-${i}`} className="options-group">
                {section.titleKey && (
                  <div className="options-section">
                    <span>{t(section.titleKey)}</span>
                  </div>
                )}
                {renderRows(section.rows)}
              </div>
            ))}

          {matches !== null &&
            (matches.length === 0 ? (
              <div className="options-empty">{t('options.search.none')}</div>
            ) : (
              matches.map(match => (
                <div key={match.page.id} className="options-group">
                  <div
                    className="options-section is-link"
                    data-no-drag="true"
                    onClick={() => openPage(match.page)}
                  >
                    <span>
                      {t(categoryOf(match.page).labelKey)} › {t(match.page.labelKey)}
                    </span>
                  </div>
                  {renderRows(match.rows)}
                </div>
              ))
            ))}
        </div>
        <ScrollBar
          target={rowsRef}
          windowId={WINDOW_ID}
          left={CONTENT_X + CONTENT_WIDTH - PANEL_PAD - SCROLL_WIDTH - 2}
          top={ROWS_TOP}
          height={ROWS_HEIGHT}
          contentKey={`${page.id}|${query}`}
        />

        <MuTableFrame
          className="options-panel"
          left={CONTENT_X}
          top={HELP_TOP}
          width={CONTENT_WIDTH}
          height={HELP_HEIGHT}
        />
        <HelpStrip hovered={hovered} page={searching ? null : page} />

        {EXITS.filter(entry => SessionExit.available(entry.exit)).map((entry, i) => (
          <OptionsButton
            key={entry.exit}
            label={t(entry.labelKey)}
            width={EXIT_WIDTH}
            onHover={() =>
              setHovered({ kind: 'exit', labelKey: entry.labelKey, helpKey: entry.helpKey })
            }
            onClick={() => {
              setCapturing(null);
              setConfirming(entry.exit);
            }}
            style={{ left: FOOTER_X + i * (EXIT_WIDTH + EXIT_GAP), top: FOOTER_Y }}
          />
        ))}
        <OptionsButton
          label={t('common.close')}
          width={CLOSE_WIDTH}
          onClick={() => {
            Store.optionsEnabled = false;
          }}
          style={{ left: WIN_WIDTH - FOOTER_X - CLOSE_WIDTH, top: FOOTER_Y }}
        />

        <MuResizeGrip id={WINDOW_ID} width={WIN_WIDTH} />
      </div>

      {confirming && (
        <ConfirmBox
          text={t(CONFIRM_TEXT[confirming])}
          onAnswer={yes => {
            setConfirming(null);
            if (yes) SessionExit.request(confirming);
          }}
        />
      )}

      {confirmingDefaults && (
        <ConfirmBox
          text={t(isKeysPage ? 'options.confirmDefaultKeys' : 'options.confirmDefaults')}
          onAnswer={yes => {
            setConfirmingDefaults(false);
            if (yes) restoreDefaults();
          }}
        />
      )}

      {notice && <NoticeBox text={t(notice)} onClose={() => setNotice(null)} />}
    </div>
  );
});
