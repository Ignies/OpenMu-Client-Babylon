import './style.less';
import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Social } from '../../../social';
import { GmPanel } from '../../../gmPanel';
import { useEventBus } from '../../../hooks/useEventBus';
import { uiClick } from '../../../libs/sfx';
import { MuWindows } from '../muWindow/windowState';
import { ChatLineType } from '../../../common/chat';
import { GM_GROUPS, type GmCommand, type GmParam } from '../../../common/gmCommands';

/**
 * The game master panel: the server's own administrative commands, as a form.
 *
 * Every entry sends the `/line` a game master would type
 * (`common/gmCommands.ts` -> `gmPanel.ts` -> `Social.sendChat`). The window
 * grants nothing; the server re-checks `CharacterStatus` on every command it
 * receives, so hiding this from a normal player is presentation, not security.
 *
 * **Deliberately not the original's window chrome.** Every other window here
 * wears `op1_stone` and the sprite frames, which are fixed-size art: they pin a
 * window to whatever the sprites measure and are scaled bodily up and down.
 * That is right for the game's own windows and wrong for this one, which is a
 * tool with a list, a form and a log in it, holds far more text than any MU
 * window was drawn for, and has to be usable on a phone. So it is a drawer that
 * lays itself out: it docks to the right on a wide screen and leaves the world
 * visible, and takes the screen on a narrow one.
 *
 * It still joins `MuWindows` - not for the chrome, only so Escape closes this
 * before anything underneath and the z-order stays honest.
 *
 * F8 toggles it, and there is a plate for the people who do not know that. Not
 * F10, which opens the menu bar in Firefox. Game masters only: everyone else
 * renders null and never sees either.
 */

const WINDOW_ID = 'gm-panel';

const TOGGLE_KEY = 'F8';

/** How long after a send the panel keeps showing the server's answers. */
const REPLY_WINDOW_MS = 20_000;

/** The most replies shown at once. */
const MAX_REPLIES = 6;

const ParamField = observer(
  ({ command, param }: { command: GmCommand; param: GmParam }) => {
    const value = GmPanel.valueFor(command, param.name);

    return (
      <label className="gm-field">
        <span className="gm-field-label">
          {param.label}
          {param.required ? <b className="gm-required">*</b> : null}
        </span>

        {param.validValues ? (
          <div className="gm-choice">
            {param.validValues.map(option => (
              <button
                key={option}
                type="button"
                className={`gm-choice-option${value === option ? ' is-active' : ''}`}
                onClick={uiClick(() =>
                  GmPanel.setValue(command, param.name, value === option ? '' : option)
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            className="gm-input"
            type="text"
            // Not type="number": it would refuse the character names and maps
            // these same fields hold, and spinners on a level make no sense.
            // `inputMode` is only which keyboard a phone offers.
            inputMode={param.type === 'number' ? 'numeric' : 'text'}
            value={value}
            placeholder={param.hint ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={e => GmPanel.setValue(command, param.name, e.target.value)}
            onKeyDown={e => {
              // Enter runs it, the way every other form works. Stopped from
              // bubbling so the chat box does not also open behind it.
              if (e.key !== 'Enter') return;
              e.preventDefault();
              e.stopPropagation();
              GmPanel.run(command);
            }}
          />
        )}
      </label>
    );
  }
);

const CommandForm = observer(({ command }: { command: GmCommand }) => {
  const armed = GmPanel.confirming?.command === command.command;

  return (
    <section className="gm-form">
      <header className="gm-form-head">
        <h3>{command.label}</h3>
        <code>{command.command}</code>
      </header>

      <p className="gm-help">{command.help}</p>

      {(command.params ?? []).map(param => (
        <ParamField key={param.name} command={command} param={param} />
      ))}

      <output className="gm-preview">{GmPanel.preview(command)}</output>

      {GmPanel.error ? <p className="gm-error">{GmPanel.error}</p> : null}
      {armed ? (
        <p className="gm-warn">This cannot be undone. Press Confirm to send it.</p>
      ) : null}

      <div className="gm-form-actions">
        <button
          type="button"
          className={`gm-btn gm-btn-run${armed ? ' is-armed' : ''}`}
          onClick={uiClick(() => GmPanel.run(command))}
        >
          {armed ? 'Confirm' : 'Run'}
        </button>
        <button
          type="button"
          className="gm-btn"
          onClick={uiClick(() => GmPanel.closeForm())}
        >
          Cancel
        </button>
      </div>
    </section>
  );
});

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
      <h4>Sent</h4>
      <ul>
        {GmPanel.sent.slice(-MAX_REPLIES).map(entry => (
          <li key={entry.id}>
            <code>{entry.line}</code>
          </li>
        ))}
      </ul>

      {replies.length > 0 ? (
        <>
          <h4>Server said</h4>
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
 * exist and would move the ones that do. This one only ever draws for a game
 * master, so the bar a player sees is untouched.
 */
const GmTab = observer(() => {
  if (!GmPanel.available) return null;

  return (
    <button
      type="button"
      className={`gm-tab-plate${GmPanel.open ? ' is-active' : ''}`}
      title={`Game master panel (${TOGGLE_KEY})`}
      onClick={uiClick(() => GmPanel.toggle())}
    >
      GM
    </button>
  );
});

export const GmPanelWindow = observer(() => {
  const searchRef = useRef<HTMLInputElement>(null);
  const open = GmPanel.available && GmPanel.open;

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
    searchRef.current?.focus({ preventScroll: true });

    return () => MuWindows.unregister(WINDOW_ID);
  }, [open]);

  if (!GmPanel.available) return null;
  if (!open) return <GmTab />;

  const commands = GmPanel.visible;
  const searching = GmPanel.query.trim().length > 0;

  return (
    <>
      <GmTab />
      <aside
        className="gm-drawer"
        style={{ zIndex: MuWindows.zIndexOf(WINDOW_ID) }}
        aria-label="Game master panel"
        onPointerDown={() => MuWindows.raise(WINDOW_ID)}
      >
        <header className="gm-drawer-head">
          <h2>Game Master</h2>
          <button
            type="button"
            className="gm-close"
            title="Close (Esc)"
            aria-label="Close"
            onClick={uiClick(() => GmPanel.close())}
          >
            ×
          </button>
        </header>

        <input
          ref={searchRef}
          className="gm-search"
          type="search"
          value={GmPanel.query}
          placeholder="Search every command…"
          spellCheck={false}
          autoComplete="off"
          onChange={e => GmPanel.setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape' && GmPanel.query) {
              e.stopPropagation();
              GmPanel.setQuery('');
            }
          }}
        />

        {searching ? null : (
          <nav className="gm-tabs">
            {GM_GROUPS.map(group => (
              <button
                key={group.id}
                type="button"
                className={`gm-tab${group.id === GmPanel.activeGroupId ? ' is-active' : ''}`}
                onClick={uiClick(() => GmPanel.setGroup(group.id))}
              >
                {group.title}
              </button>
            ))}
          </nav>
        )}

        <div className="gm-body">
          {commands.length === 0 ? (
            <p className="gm-empty">No command matches that.</p>
          ) : (
            <div className="gm-commands">
              {commands.map(command => (
                <button
                  key={command.command}
                  type="button"
                  className={`gm-command${
                    GmPanel.selected?.command === command.command ? ' is-active' : ''
                  }${command.confirm ? ' is-heavy' : ''}`}
                  onClick={uiClick(() => GmPanel.select(command))}
                  title={command.help}
                >
                  <span className="gm-command-label">{command.label}</span>
                  <code className="gm-command-slash">{command.command}</code>
                </button>
              ))}
            </div>
          )}

          {GmPanel.selected ? <CommandForm command={GmPanel.selected} /> : null}

          <Transcript />
        </div>

        <footer className="gm-drawer-foot">
          <span>
            {commands.length} command{commands.length === 1 ? '' : 's'}
          </span>
          <span>{TOGGLE_KEY} to close</span>
        </footer>
      </aside>
    </>
  );
});
