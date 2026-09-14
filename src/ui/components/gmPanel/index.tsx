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
import { TabIcon } from './icons';
import { LiveTab } from './tabs/live';
import { MapTab } from './tabs/map';
import { LogsTab } from './tabs/logs';
import { SkinsTab } from './tabs/skins';
import { SpawnTab } from './tabs/spawn';
import { CharacterTab } from './tabs/character';
import { ModerationTab } from './tabs/moderation';
import { EventsTab } from './tabs/events';
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
 * Not the original's window chrome, on purpose: that art is fixed-size, and
 * this is an instrument with tables, a map and a log. It still joins
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
              <li key={entry.id}>
                <code>{entry.line}</code>
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
      <TabIcon id={id} />
      <span className="gm-side-label">{t(entry.titleKey)}</span>
      {badge !== null && badge > 0 ? <span className="gm-side-badge">{badge}</span> : null}
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
      <div
        className="gm-window"
        style={{ zIndex: MuWindows.zIndexOf(WINDOW_ID) }}
        aria-label={t('gm.title')}
        onPointerDown={() => MuWindows.raise(WINDOW_ID)}
      >
        <aside className="gm-side">
          <div className="gm-brand">
            <span className="gm-brand-mark">GM</span>
            <span className="gm-brand-text">
              <b>{t('gm.title')}</b>
              <FeedStatus />
            </span>
          </div>

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

          <div className="gm-side-foot">
            {view.hero ? (
              <span className="gm-side-where">
                <b>{mapName(view.hero.map)}</b>
                <span className="gm-mono">
                  {view.hero.x}, {view.hero.y}
                </span>
              </span>
            ) : (
              <span className="gm-side-where">{t('gm.notInWorld')}</span>
            )}
            <span className="gm-side-key">{t('gm.keyToClose', { key: TOGGLE_KEY })}</span>
          </div>
        </aside>

        <div className="gm-main">
          <header className="gm-top">
            <div className="gm-top-title">
              <h2>{t(section.titleKey)}</h2>
              <p>{t(section.hintKey)}</p>
            </div>

            <input
              className="gm-search gm-top-search"
              type="search"
              value={GmPanel.search}
              placeholder={t('gm.live.searchPlayers')}
              spellCheck={false}
              autoComplete="off"
              onChange={e => GmPanel.setSearch(e.target.value)}
            />

            <span className={`gm-target-chip${GmPanel.target ? ' is-set' : ''}`}>
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

          <section className={`gm-content gm-content-${section.id}`}>
            <Tab view={view} />
          </section>

          <Transcript />
        </div>
      </div>
    </>
  );
});
