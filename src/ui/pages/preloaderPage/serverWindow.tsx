import { uiClick } from '../../../libs/sfx';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuButton } from '../../components/muButton';
import { MuText } from '../../components/muText';
import { TEXT_COLOR } from '../serversPage/layout';
import { t, type TextKey } from '../../../i18n';
import {
  displayAddress,
  matchesSearch,
  playableHere,
  ServerConfig,
} from '../../../common/serverConfig';
import { ServerList } from '../../../common/serverList';
import { versionTags } from '../../../version';
import { SetupFrame } from './frame';
import { AccountTab } from './accountTab';
import { InfoTab } from './infoTab';
import { SetupTab } from './setupTab';
import { useWorldRows, WorldsTab } from './worldsTab';
import {
  BTN_HEIGHT,
  BTN_WIDTH,
  CONTENT_X,
  SETUP_TITLE_Y,
  SETUP_WIN_WIDTH,
  SPRITE,
  SUBTAB_HEIGHT,
  SUBTAB_STRIP_Y,
  TAB_HEIGHT,
  TAB_STRIP_WIDTH,
  TAB_STRIP_X,
  TAB_STRIP_Y,
  WORLD_BACK_X,
  WORLD_COLS,
  WORLD_PLAY_X,
  accountMetrics,
  infoMetrics,
  setupMetrics,
  windowRows,
  worldHeight,
  worldRowsFor,
} from './layout';

/**
 * The server window: one frame, two strips of tabs, and the two buttons they
 * all share.
 *
 * The top strip splits the window the way the player thinks about it. Worlds
 * are places to go; Setup is the addresses this client dials, which most
 * players never open. Under Worlds, the second strip: the grid, what the chosen
 * world says about itself, and the accounts kept for it - three views of one
 * choice, where the grid alone used to be a window that had to close itself to
 * show anything else.
 *
 * The window is sized to the tallest of its tabs rather than to each in turn,
 * so a strip never moves under the cursor that just clicked it.
 *
 * The filters live here rather than in the worlds tab because the selection
 * outlives the tab: search for a world, read its details, come back, and the
 * search is still what it was.
 */

/** The top strip: somewhere to go, or the addresses this client dials. */
type Section = 'worlds' | 'setup';

/** The second strip, under Worlds. */
type WorldsTabKey = 'list' | 'info' | 'account';

const SECTIONS: { key: Section; label: TextKey }[] = [
  { key: 'worlds', label: 'worlds.tabWorlds' },
  { key: 'setup', label: 'worlds.tabSetup' },
];

const WORLD_TABS: { key: WorldsTabKey; label: TextKey }[] = [
  { key: 'list', label: 'worlds.tabList' },
  { key: 'info', label: 'worlds.tabInfo' },
  { key: 'account', label: 'worlds.tabAccount' },
];

/** The filter's "no filter" row, kept out of the language codes it sits with. */
const ALL = '';

export const ServerWindow = observer(
  ({ onPlay, onClose }: { onPlay: () => void; onClose: () => void }) => {
    const [section, setSection] = useState<Section>('worlds');
    const [tab, setTab] = useState<WorldsTabKey>('list');
    const [page, setPage] = useState(0);
    const [language, setLanguage] = useState(ALL);
    const [search, setSearch] = useState('');
    const rows = useWorldRows(worldRowsFor);
    const pageSize = WORLD_COLS * rows;

    const all = ServerConfig.all;
    const selected = ServerConfig.active;

    // A saved world carries no language, so it belongs to no tag but `All` -
    // where it is always the first thing in the grid anyway.
    const worlds = useMemo(
      () =>
        all.filter(
          w =>
            (language === ALL || w.language?.toLowerCase() === language) &&
            matchesSearch(w, search)
        ),
      [all, language, search]
    );

    const pages = Math.max(1, Math.ceil(worlds.length / pageSize));
    const current = Math.min(page, pages - 1);

    // Memoised so the page is one object for as long as it is the same page:
    // the probe effect keys off it, and a fresh slice every render would
    // re-dial the grid on every hover.
    const visible = useMemo(
      () => worlds.slice(current * pageSize, current * pageSize + pageSize),
      [worlds, current, pageSize]
    );

    // One height for every tab, so the strip stays where it was clicked. The
    // grid asks for what its rows need and the fixed tabs for what their
    // content needs; the window takes whichever is more.
    const height = Math.max(
      worldHeight(Math.min(rows, Math.ceil(worlds.length / WORLD_COLS)) || 1),
      infoMetrics().height,
      accountMetrics().height,
      setupMetrics().height
    );
    const { descY, addressY, buttonsY } = windowRows(height);

    /** The grid is showing: the paging, the count and the blurb are all its. */
    const onList = section === 'worlds' && tab === 'list';

    const playable = playableHere(selected);

    /**
     * Entering is refused for a world built against another client rather than
     * merely discouraged: this build carries one version's packets, so the
     * connect would succeed and then come apart mid-handshake, which reads as
     * a broken client rather than the wrong one.
     */
    const enter = (id = selected.id) => {
      // Nothing to enter: `active` is the placeholder, and connecting with it
      // would dial the build defaults at a world nobody published.
      if (ServerConfig.isEmpty) return;

      const world = ServerConfig.all.find(w => w.id === id);

      if (world && !playableHere(world)) return;

      ServerConfig.select(id);
      ServerConfig.markPlayed(id);
      onPlay();
    };

    /**
     * The grid, from the keyboard: the arrows walk the whole filtered list, not
     * the page, so running off the last card of one page lands on the first of
     * the next and the page follows the selection rather than the other way
     * round.
     *
     * A field has the keys first, and keeps them. Arrows move a caret, so a
     * search box that lost them to the grid behind it would be a box nobody
     * could edit - and Enter in a server address or a password is not a request
     * to connect, which is what it used to do here. Escape leaves the field
     * first and closes the window on the second press.
     */
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const typing =
          target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        // The one field Enter belongs to: searching for a world and pressing
        // Enter means entering the one the search settled on.
        const searching = !!target?.classList.contains('world-search');

        const step: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -WORLD_COLS,
          ArrowDown: WORLD_COLS,
          PageUp: -pageSize,
          PageDown: pageSize,
        };

        if (e.key === 'Escape') {
          if (typing) {
            target?.blur();
          } else {
            onClose();
          }
        } else if (e.key === 'Enter' && (!typing || searching)) {
          enter();
        } else if (
          !typing &&
          section === 'worlds' &&
          tab === 'list' &&
          e.key in step &&
          worlds.length
        ) {
          const at = worlds.findIndex(w => w.id === selected.id);
          const next = Math.max(
            0,
            Math.min(worlds.length - 1, (at < 0 ? 0 : at) + step[e.key])
          );

          ServerConfig.select(worlds[next].id);
          setPage(Math.floor(next / pageSize));
        } else {
          return;
        }

        e.preventDefault();
      };

      window.addEventListener('keydown', onKey);

      return () => window.removeEventListener('keydown', onKey);
    });

    // One line under the tab: what this world says about itself, or why the
    // grid is thin - a search that matched nothing and a list that could not be
    // read are both worth saying out loud here, where the player is looking for
    // somewhere to play, and with the reason attached.
    const blurb = !worlds.length
      ? search
        ? t('worlds.noMatch', { text: search.trim() })
        : t('worlds.empty')
      : !playable
        ? t('worlds.needsClient', {
            world: selected.version ?? '',
            client: versionTags().join(', '),
          })
        : selected.description ||
          (ServerList.state === 'loading'
            ? t('common.loading')
            : t('worlds.hint'));

    const listError =
      ServerList.state === 'error'
        ? `${t('server.listOffline')}${ServerList.error ? ` (${ServerList.error})` : ''}`
        : '';

    return (
      <div
        className="setup-win world-win"
        style={{ width: SETUP_WIN_WIDTH, height }}
      >
        <SetupFrame height={height} />

        <div className="setup-title" style={{ top: SETUP_TITLE_Y }}>
          {t('worlds.title')}
          {onList && pages > 1 && ` ${current + 1}/${pages}`}
        </div>

        {/* The top strip, over the seam in the frame's own top band. */}
        <div
          className="setup-tabs setup-tabs-top"
          style={{
            top: TAB_STRIP_Y,
            left: TAB_STRIP_X,
            width: TAB_STRIP_WIDTH,
            height: TAB_HEIGHT,
          }}
        >
          {SECTIONS.map(entry => (
            <span
              key={entry.key}
              className={`setup-tab${section === entry.key ? ' setup-tab-on' : ''}`}
              onClick={uiClick(() => setSection(entry.key))}
            >
              {t(entry.label)}
            </span>
          ))}
        </div>

        {section === 'worlds' && (
          <div
            className="setup-tabs"
            style={{
              top: SUBTAB_STRIP_Y,
              left: CONTENT_X,
              right: CONTENT_X,
              height: SUBTAB_HEIGHT,
            }}
          >
            {WORLD_TABS.map(entry => (
              <span
                key={entry.key}
                className={`setup-tab${tab === entry.key ? ' setup-tab-on' : ''}`}
                onClick={uiClick(() => setTab(entry.key))}
              >
                {t(entry.label)}
              </span>
            ))}
          </div>
        )}

        {section === 'setup' ? (
          <SetupTab />
        ) : tab === 'list' ? (
          <WorldsTab
            worlds={worlds}
            visible={visible}
            total={all.length}
            search={search}
            onSearch={text => {
              setSearch(text);
              setPage(0);
            }}
            language={language}
            onLanguage={tag => {
              setLanguage(tag);
              setPage(0);
            }}
            pages={pages}
            page={current}
            onPage={setPage}
            arrowsY={buttonsY}
            onEnter={enter}
          />
        ) : tab === 'info' ? (
          <InfoTab world={selected} />
        ) : (
          <AccountTab world={selected} />
        )}

        {onList && (
          <MuText
            className="setup-line"
            color={
              listError || !playable ? TEXT_COLOR.yellow : TEXT_COLOR.brightGray
            }
            style={{ top: descY }}
            text={listError || blurb}
          />
        )}
        {!ServerConfig.isEmpty && (
          <MuText
            face="fix"
            className="setup-line"
            color={TEXT_COLOR.brightYellow}
            style={{ top: addressY }}
            text={`${selected.name.trim() || t('server.unnamed')} - ${displayAddress(selected)}`}
          />
        )}

        <MuButton
          file={SPRITE.button}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('worlds.enter')}
          disabled={!playable || ServerConfig.isEmpty}
          onClick={() => enter()}
          style={{ position: 'absolute', left: WORLD_PLAY_X, top: buttonsY }}
          labelStyle={{ fontSize: 11 }}
        />
        <MuButton
          file={SPRITE.button}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('common.close')}
          onClick={onClose}
          style={{ position: 'absolute', left: WORLD_BACK_X, top: buttonsY }}
          labelStyle={{ fontSize: 11 }}
        />
      </div>
    );
  }
);
