import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import { Social } from '../../../social';
import { GM_SECTIONS, GmPanel } from '../../../gmPanel';
import { worldView, type WorldView } from '../../../gmWorld';
import { useEventBus } from '../../../hooks/useEventBus';
import { uiClick } from '../../../libs/sfx';
import { MuWindows } from '../muWindow/windowState';
import { ChatLineType } from '../../../common/chat';
import {
  CharacterSection,
  ConsoleSection,
  EventsSection,
  ModerationSection,
  NearbySection,
  OverviewSection,
  SpawnSection,
  TravelSection,
} from './sections';

/**
 * The game master panel: the server's own administrative tools, arranged for
 * the jobs a game master actually does.
 *
 * Everything it sends is a `/line` a game master could type
 * (`common/gmCommands.ts` -> `gmPanel.ts` -> `Social.sendChat`). The panel
 * grants nothing; the server re-checks `CharacterStatus` on every command it
 * receives, so hiding this from a normal player is presentation, not security.
 *
 * **Not the original's window chrome**, on purpose. That art is fixed-size: it
 * pins a window to whatever the sprites measure and scales it bodily. This one
 * is an instrument - eight screens, a live radar, tables - so it lays itself
 * out instead: docked right on a monitor, so the world stays visible while you
 * work, and taking the screen on a phone.
 *
 * It still joins `MuWindows`, only so Escape closes it before the windows
 * underneath and the z-order stays honest.
 *
 * F8 toggles it, and there is a plate for the people who do not know that. Not
 * F10, which opens the menu bar in Firefox. Game masters only: everybody else
 * renders null and never sees either.
 */

const WINDOW_ID = 'gm-panel';

const TOGGLE_KEY = 'F8';

/**
 * How often the world is re-read while the panel is open.
 *
 * `transform.pos` is written every frame by the movement system, so it is not
 * observable and must be polled. Four times a second is fast enough that a
 * walking player's dot keeps up and slow enough to cost nothing - the same
 * bargain the debug menu makes with its live rows, a little quicker because
 * this one draws positions rather than counters.
 */
const POLL_MS = 250;

/** How long after a send the panel keeps showing the server's answers. */
const REPLY_WINDOW_MS = 20_000;

/** The most replies shown at once. */
const MAX_REPLIES = 6;

/**
 * The server's answers. A command replies with a blue message
 * (`ShowBlueMessageAsync` -> `ServerMessage` type 1), which already lands in
 * the chat log as a system line, so those are read back from there rather than
 * counted twice. A refused command replies with nothing at all, which is why
 * what was sent is listed beside them.
 */
const Transcript = observer(() => {
  if (GmPanel.sent.length === 0) return null;

  const since = GmPanel.sent[GmPanel.sent.length - 1]?.at ?? 0;
  const cutoff = Math.max(since, Date.now() - REPLY_WINDOW_MS);

  const replies = Social.chatLines
    .filter(line => line.type === ChatLineType.System && line.at >= cutoff)
    .slice(-MAX_REPLIES);

  return (
    <section className="gm-transcript">
      <h4>{t('gm.transcript.sent')}</h4>
      <ul>
        {GmPanel.sent.slice(-MAX_REPLIES).map(entry => (
          <li key={entry.id}>
            <code>{entry.line}</code>
          </li>
        ))}
      </ul>

      {replies.length > 0 ? (
        <>
          <h4>{t('gm.transcript.serverSaid')}</h4>
          <ul className="gm-replies">
            {replies.map(line => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
});

/**
 * The way in. A function key alone is undiscoverable - a game master logging in
 * would have to be told the panel exists - so there is a plate as well, in the
 * top right where nothing else lives.
 *
 * Not on the main frame's button row: those five are the original's
 * `newui_menu_Bt01..05` art, and a sixth would need a sprite that does not
 * exist and would move the ones that do. This only ever draws for a game
 * master, so the bar a player sees is untouched.
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

const Section = observer(({ view }: { view: WorldView }) => {
  switch (GmPanel.section) {
    case 'overview':
      return <OverviewSection view={view} />;
    case 'nearby':
      return <NearbySection view={view} />;
    case 'travel':
      return <TravelSection view={view} />;
    case 'character':
      return <CharacterSection />;
    case 'spawn':
      return <SpawnSection view={view} />;
    case 'moderation':
      return <ModerationSection />;
    case 'events':
      return <EventsSection view={view} />;
    case 'console':
      return <ConsoleSection />;
  }
});

export const GmPanelWindow = observer(() => {
  const open = GmPanel.available && GmPanel.open;
  const [view, setView] = useState<WorldView>(() => worldView());

  useEventBus('keyPressed', key => {
    if (!GmPanel.available) return;
    if (key === TOGGLE_KEY) GmPanel.toggle();
  });

  // Joins the window stack while open: Escape closes this before the windows
  // underneath, and `zIndexOf` keeps it ordered with them. None of the
  // placement or scaling is used - the drawer lays itself out.
  useEffect(() => {
    if (!open) return;

    MuWindows.register(WINDOW_ID, undefined, () => {
      GmPanel.close();
      return true;
    });
    MuWindows.raise(WINDOW_ID);

    return () => MuWindows.unregister(WINDOW_ID);
  }, [open]);

  // The world is re-read only while the panel is open, and stops the moment it
  // closes: a closed panel must not cost a walking player anything.
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
      <aside
        className="gm-drawer"
        style={{ zIndex: MuWindows.zIndexOf(WINDOW_ID) }}
        aria-label={t('gm.title')}
        onPointerDown={() => MuWindows.raise(WINDOW_ID)}
      >
        <header className="gm-drawer-head">
          <h2>{t('gm.title')}</h2>
          {view.hero ? (
            <span className="gm-drawer-where gm-mono">
              {view.hero.x}, {view.hero.y}
            </span>
          ) : null}
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

        <nav className="gm-rail" aria-label={t('gm.sections')}>
          {GM_SECTIONS.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={`gm-rail-btn${entry.id === section.id ? ' is-active' : ''}`}
              title={t(entry.hintKey)}
              onClick={uiClick(() => GmPanel.setSection(entry.id))}
            >
              {t(entry.titleKey)}
            </button>
          ))}
        </nav>

        <div className="gm-body">
          <p className="gm-section-hint">{t(section.hintKey)}</p>

          <Section view={view} />

          {GmPanel.error ? <p className="gm-error">{GmPanel.error}</p> : null}

          <Transcript />
        </div>

        <footer className="gm-drawer-foot">
          <span>
            {GmPanel.target
              ? t('gm.targetIs', { name: GmPanel.target })
              : t('gm.noTarget')}
          </span>
          <span>{t('gm.keyToClose', { key: TOGGLE_KEY })}</span>
        </footer>
      </aside>
    </>
  );
});
