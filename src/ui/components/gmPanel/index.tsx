import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import { Social } from '../../../social';
import { GM_SECTIONS, GmPanel, type GmSection } from '../../../gmPanel';
import { worldView, type WorldView } from '../../../gmWorld';
import { AdminFeed } from '../../../admin/feed';
import { useEventBus } from '../../../hooks/useEventBus';
import { uiClick } from '../../../libs/sfx';
import { MuWindows } from '../muWindow/windowState';
import { ChatLineType } from '../../../common/chat';
import { mapName } from '../../../common/gmMaps';
import { MuFrame } from '../muFrame';
import { TabIcon } from './icons';
import { LiveTab } from './tabs/live';
import { MapTab } from './tabs/map';
import { LogsTab } from './tabs/logs';
import { SkinsTab } from './tabs/skins';
import { SpawnTab } from './tabs/spawn';
import { CharacterTab } from './tabs/character';
import { ModerationTab } from './tabs/moderation';
import { EventsTab } from './tabs/events';
import { MacrosTab } from './tabs/macros';
import { GmLibrary, type Favourite, type MacroVars } from '../../../admin/gmLibrary';
import { ConsoleTab } from './tabs/console';

/**
 * The game master panel (documentation/admin_console/ARCHITECTURE.md): one
 * window, a sidebar of tabs, and the server as the proxy's tracker sees it.
 *
 * Everything it sends is a `/line` a game master could type
 * (`common/gmCommands.ts` -> `gmPanel.ts` -> `Social.sendChat`). The panel
 * grants nothing; the server re-checks `CharacterStatus` on every command it
 * receives, so hiding this from a normal player is presentation, not security.
 * What it *shows* of other players comes from the proxy's stream
 * (`admin/feed.ts`), which the proxy only opens for a socket whose character
 * the server flagged as a game master.
 *
 * Drawn like the world select's card, in the Babylon site's design system
 * inside MU's Option window frame: the original's window art is fixed-size,
 * and this is an instrument with tables, a map and a log. It still joins
 * `MuWindows`, so Escape closes it before the windows underneath and the
 * z-order stays honest. F8 toggles it, and there is a plate for the people
 * who do not know that. Game masters only: everybody else renders null.
 */

const WINDOW_ID = 'gm-panel';

const TOGGLE_KEY = 'F8';

/**
 * How often the game master's own position is re-read while the panel is
 * open. `transform.pos` is written every frame and is not observable, so it
 * is polled - only while open, and only this one dot.
 */
const POLL_MS = 250;

/** How long after a send the footer keeps showing the server's answers. */
const REPLY_WINDOW_MS = 20_000;

const MAX_REPLIES = 4;

/**
 * The server's answers. A command replies with a blue message
 * (`ShowBlueMessageAsync` -> `ServerMessage` type 1), which already lands in
 * the chat log as a system line, so those are read back from there rather than
 * counted twice. A refused command replies with nothing at all, which is why
 * what was sent is listed beside them.
 */
const Transcript = observer(() => {
  const pinned = (line: string) => GmLibrary.isFavourite({ kind: 'line', line });

  if (GmPanel.sent.length === 0 && !GmPanel.error) return null;

  const since = GmPanel.sent[GmPanel.sent.length - 1]?.at ?? 0;
  const cutoff = Math.max(since, Date.now() - REPLY_WINDOW_MS);

  const replies = Social.chatLines
    .filter(line => line.type === ChatLineType.System && line.at >= cutoff)
    .slice(-MAX_REPLIES);

  return (
    <footer className="gm-foot">
      {GmPanel.error ? <p className="gm-error">{GmPanel.error}</p> : null}
      {GmPanel.sent.length > 0 ? (
        <div className="gm-foot-row">
          <span className="gm-foot-label">{t('gm.transcript.sent')}</span>
          <ul className="gm-foot-lines">
            {GmPanel.sent.slice(-3).map(entry => (
              <li key={entry.id} className="gm-sent">
                <button
                  type="button"
                  className="gm-sent-line"
                  title={t('gm.recent.edit')}
                  onClick={uiClick(() => GmPanel.loadLine(entry.line))}
                >
                  <code>{entry.line}</code>
                </button>
                <button
                  type="button"
                  className="gm-sent-tool"
                  title={t('gm.recent.again')}
                  aria-label={t('gm.recent.again')}
                  onClick={uiClick(() => GmPanel.sendRaw(entry.line))}
                >
                  ↻
                </button>
                <button
                  type="button"
                  className={`gm-sent-tool${pinned(entry.line) ? ' is-on' : ''}`}
                  title={pinned(entry.line) ? t('gm.fav.unpin') : t('gm.fav.pin')}
                  aria-label={pinned(entry.line) ? t('gm.fav.unpin') : t('gm.fav.pin')}
                  onClick={uiClick(() => GmLibrary.toggleFavourite({ kind: 'line', line: entry.line }))}
                >
                  {pinned(entry.line) ? '★' : '☆'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {replies.length > 0 ? (
        <div className="gm-foot-row">
          <span className="gm-foot-label">{t('gm.transcript.serverSaid')}</span>
          <ul className="gm-foot-lines gm-replies">
            {replies.map(line => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </footer>
  );
});

/**
 * The pinned lines and macros, one press each, under the header on every
 * tab - and the macro running, with its Stop. Placeholders fill in where the
 * game master stands.
 */
const Favourites = observer(({ view }: { view: WorldView }) => {
  const run = GmPanel.macroRun;
  if (GmLibrary.favourites.length === 0 && !run) return null;

  const hero = view.hero;
  const vars: MacroVars | null = hero
    ? { x: hero.x, y: hero.y, map: hero.map, me: hero.name, target: GmPanel.target }
    : null;

  const press = (favourite: Favourite) => {
    if (!vars) return;
    if (favourite.kind === 'line') {
      GmPanel.runLine(favourite.line, vars);
      return;
    }
    const macro = GmLibrary.macro(favourite.id);
    if (macro) GmPanel.runMacro(macro, vars);
  };

  return (
    <div className="gm-favs">
      {run ? (
        <span className="gm-favs-run">
          <i className="gm-favs-dot" />
          {t('gm.macros.running', { name: run.name, step: run.step, total: run.total })}
          <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.stopMacro())}>
            {t('gm.macros.stop')}
          </button>
        </span>
      ) : null}
      {GmLibrary.favourites.map(favourite => {
        const macro = favourite.kind === 'macro' ? GmLibrary.macro(favourite.id) : null;
        const label = favourite.kind === 'line' ? favourite.line : `▸ ${macro?.name ?? ''}`;
        return (
          <span key={favourite.kind === 'line' ? `l${favourite.line}` : `m${favourite.id}`} className="gm-fav">
            <button
              type="button"
              className={`gm-fav-run${favourite.kind === 'line' ? ' gm-mono' : ''}`}
              disabled={!vars}
              title={label}
              onClick={uiClick(() => press(favourite))}
            >
              {label}
            </button>
            <button
              type="button"
              className="gm-fav-x"
              aria-label={t('gm.fav.unpin')}
              title={t('gm.fav.unpin')}
              onClick={uiClick(() => GmLibrary.toggleFavourite(favourite))}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
});

/**
 * The way in. A function key alone is undiscoverable - a game master logging in
 * would have to be told the panel exists - so there is a plate as well, in the
 * top right where nothing else lives.
 */
const GmTab = observer(() => {
  if (!GmPanel.available) return null;

  return (
    <button
      type="button"
      className={`gm-tab-plate${GmPanel.open ? ' is-active' : ''}`}
      title={t('gm.tabHint', { key: TOGGLE_KEY })}
      onClick={uiClick(() => GmPanel.toggle())}
    >
      {t('gm.tabPlate')}
    </button>
  );
});

const FeedStatus = observer(() => {
  const status = AdminFeed.status;
  let text: string;
  switch (status) {
    case 'open':
      text = t('gm.feed.live');
      break;
    case 'connecting':
      text = t('gm.feed.connecting');
      break;
    case 'refused':
      text =
        AdminFeed.reason === 'not-gm'
          ? t('gm.feed.refusedGm')
          : AdminFeed.reason === 'origin'
            ? t('gm.feed.refusedOrigin')
            : t('gm.feed.refusedSession');
      break;
    case 'closed':
      text = t('gm.feed.closed');
      break;
    case 'error':
      text = t('gm.feed.offline');
      break;
    default:
      text = '';
  }

  return (
    <span className={`gm-feed gm-feed-${status}`} title={text}>
      <i className="gm-feed-dot" />
      {text}
    </span>
  );
});

const Tab = observer(({ view }: { view: WorldView }) => {
  switch (GmPanel.section) {
    case 'live':
      return <LiveTab view={view} />;
    case 'map':
      return <MapTab view={view} />;
    case 'logs':
      return <LogsTab />;
    case 'skins':
      return <SkinsTab />;
    case 'spawn':
      return <SpawnTab view={view} />;
    case 'character':
      return <CharacterTab />;
    case 'moderation':
      return <ModerationTab />;
    case 'events':
      return <EventsTab view={view} />;
    case 'macros':
      return <MacrosTab view={view} />;
    case 'console':
      return <ConsoleTab />;
  }
});

const SideButton = observer(({ id, active, onPick }: { id: GmSection; active: boolean; onPick: () => void }) => {
  const entry = GM_SECTIONS.find(s => s.id === id) ?? GM_SECTIONS[0];
  const badge = id === 'live' && AdminFeed.status === 'open' ? AdminFeed.inWorldCount : null;

  return (
    <button
      type="button"
      className={`gm-side-btn${active ? ' is-active' : ''}`}
      title={t(entry.hintKey)}
      onClick={uiClick(onPick)}
    >
      <span className="gm-side-row">
        <TabIcon id={id} />
        <span className="gm-side-label">{t(entry.titleKey)}</span>
        {badge !== null && badge > 0 ? <span className="gm-side-badge">{badge}</span> : null}
      </span>
      {/* The open tab unfolds its one line in place, as the world select's do. */}
      <span className="gm-side-desc">
        <span>{t(entry.hintKey)}</span>
      </span>
    </button>
  );
});

export const GmPanelWindow = observer(() => {
  const open = GmPanel.available && GmPanel.open;
  const [view, setView] = useState<WorldView>(() => worldView());

  useEventBus('keyPressed', key => {
    if (!GmPanel.available) return;
    if (key === TOGGLE_KEY) GmPanel.toggle();
  });

  // Joins the window stack while open: Escape closes this before the windows
  // underneath, and `zIndexOf` keeps it ordered with them.
  useEffect(() => {
    if (!open) return;

    MuWindows.register(WINDOW_ID, undefined, () => {
      GmPanel.close();
      return true;
    });
    MuWindows.raise(WINDOW_ID);

    return () => MuWindows.unregister(WINDOW_ID);
  }, [open]);

  // The stream is open exactly as long as the panel is.
  useEffect(() => {
    if (!open) return;
    AdminFeed.start();
    return () => AdminFeed.stop();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setView(worldView());
    const timer = setInterval(() => setView(worldView()), POLL_MS);
    return () => clearInterval(timer);
  }, [open]);

  if (!GmPanel.available) return null;
  if (!open) return <GmTab />;

  const section = GM_SECTIONS.find(s => s.id === GmPanel.section) ?? GM_SECTIONS[0];

  return (
    <>
      <GmTab />
      {/* `scrollable`: the page swallows the wheel everywhere else (boot.tsx),
          and every list in here scrolls with it. */}
      <div
        className="gm-window scrollable"
        style={{ zIndex: MuWindows.zIndexOf(WINDOW_ID) }}
        aria-label={t('gm.title')}
        onPointerDown={() => MuWindows.raise(WINDOW_ID)}
      >
        <MuFrame />

        <aside className="gm-side">
          <span className="gm-marker gm-mono">
            {view.hero
              ? `${mapName(view.hero.map)}  ${view.hero.x}, ${view.hero.y}`
              : t('gm.notInWorld')}
          </span>
          <h2 className="gm-headline">{t('gm.title')}</h2>
          <FeedStatus />

          <nav className="gm-side-nav" aria-label={t('gm.sections')}>
            {GM_SECTIONS.map(entry => (
              <SideButton
                key={entry.id}
                id={entry.id}
                active={entry.id === section.id}
                onPick={() => GmPanel.setSection(entry.id)}
              />
            ))}
          </nav>

          <span className="gm-side-key gm-mono">
            {t('gm.keyToClose', { key: TOGGLE_KEY })}
          </span>
        </aside>

        <div className="gm-main">
          <header className="gm-top">
            <span className="gm-top-title">
              <span className="gm-top-where">GM</span>
              <span className="gm-top-sep">/</span>
              <b>{t(section.titleKey)}</b>
            </span>

            <input
              className="gm-search gm-top-search"
              type="search"
              value={GmPanel.search}
              placeholder={t('gm.live.searchPlayers')}
              spellCheck={false}
              autoComplete="off"
              onChange={e => GmPanel.setSearch(e.target.value)}
            />

            <span
              className={`gm-target-chip${GmPanel.target ? ' is-set' : ''}`}
            >
              {GmPanel.target ? (
                <>
                  {t('gm.targetIs', { name: GmPanel.target })}
                  <button
                    type="button"
                    className="gm-chip-x"
                    aria-label={t('gm.clear')}
                    onClick={uiClick(() => GmPanel.setTarget(''))}
                  >
                    ×
                  </button>
                </>
              ) : (
                t('gm.noTarget')
              )}
            </span>

            <button
              type="button"
              className="gm-close"
              title={t('gm.closeHint')}
              aria-label={t('common.close')}
              onClick={uiClick(() => GmPanel.close())}
            >
              ×
            </button>
          </header>

          <Favourites view={view} />

          <section className={`gm-content gm-content-${section.id}`}>
            <Tab view={view} />
          </section>

          <Transcript />
        </div>
      </div>
    </>
  );
});
