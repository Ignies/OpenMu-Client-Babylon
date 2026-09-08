import './style.less';
import { observer } from 'mobx-react-lite';
import { Social } from '../../../social';
import { GmPanel } from '../../../gmPanel';
import { useEventBus } from '../../../hooks/useEventBus';
import { uiClick } from '../../../libs/sfx';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { MuResizeGrip, useWindowChrome } from '../muWindow/useWindowChrome';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
import { ChatLineType } from '../../../common/chat';
import { GM_GROUPS, type GmCommand, type GmParam } from '../../../common/gmCommands';

/**
 * The game master panel: the server's own administrative commands, as buttons.
 *
 * Every entry sends the `/line` a game master would type
 * (`common/gmCommands.ts` -> `gmPanel.ts` -> `Social.sendChat`). The window
 * grants nothing; the server re-checks `CharacterStatus` on every command it
 * receives, so hiding this from a normal player is presentation, not security.
 *
 * F8 toggles it - a raw `keyPressed` code beside the debug menu's F9, not a
 * `KeyBindings` action, so the player-facing Keys tab stays clean. Game masters
 * only: everyone else renders null and never sees the key. Not F10, which opens
 * the menu bar in Firefox.
 *
 * Drawn with the Options window's stone chrome, the same vocabulary the debug
 * menu uses, so it reads as part of the client.
 */

const WINDOW_ID = 'gm-panel';

const TOGGLE_KEY = 'F8';

const ART_WIDTH = 213;

const WIN_WIDTH = ART_WIDTH * 2;
const WIN_HEIGHT = 500;

const TOP_HEIGHT = 65;
const BOTTOM_HEIGHT = 43;

const CONTENT_TOP = TOP_HEIGHT + 14;
const TAB_HEIGHT = 24;
const TAB_GAP = 4;
const CONTENT_X = 28;
const CONTENT_WIDTH = WIN_WIDTH - CONTENT_X * 2;

const CLOSE_WIDTH = 108;
const CLOSE_HEIGHT = 30;
const CLOSE_Y = WIN_HEIGHT - 47;

const CONTENT_HEIGHT = CLOSE_Y - (CONTENT_TOP + TAB_HEIGHT + 12) - 8;

/** How long after a send the panel keeps showing the server's answers. */
const REPLY_WINDOW_MS = 20_000;

/** The most replies shown at once. */
const MAX_REPLIES = 6;

const ParamField = observer(
  ({ command, param }: { command: GmCommand; param: GmParam }) => {
    const value = GmPanel.valueFor(command, param.name);

    return (
      <div className="gm-field">
        <span className="gm-field-label">
          {param.label}
          {param.required ? <span className="gm-required"> *</span> : null}
        </span>
        {param.validValues ? (
          <div className="gm-chips">
            {param.validValues.map(option => (
              <div
                key={option}
                className={`gm-chip${value === option ? ' is-active' : ''}`}
                onClick={uiClick(() =>
                  GmPanel.setValue(command, param.name, value === option ? '' : option)
                )}
              >
                {option}
              </div>
            ))}
          </div>
        ) : (
          <input
            className="gm-input"
            type="text"
            value={value}
            placeholder={param.hint ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={e => GmPanel.setValue(command, param.name, e.target.value)}
          />
        )}
      </div>
    );
  }
);

const CommandForm = observer(({ command }: { command: GmCommand }) => {
  const armed = GmPanel.confirming?.command === command.command;

  return (
    <div className="gm-form">
      <span className="gm-help">{command.help}</span>

      {(command.params ?? []).map(param => (
        <ParamField key={param.name} command={command} param={param} />
      ))}

      <div className="gm-preview">{GmPanel.preview(command)}</div>

      {GmPanel.error ? <span className="gm-error">{GmPanel.error}</span> : null}

      {armed ? (
        <span className="gm-error">This cannot be undone. Press again to send.</span>
      ) : null}

      <div className="gm-chips">
        <div
          className={`gm-chip gm-run${armed ? ' is-armed' : ''}`}
          onClick={uiClick(() => GmPanel.run(command))}
        >
          {armed ? 'Confirm' : 'Run'}
        </div>
        <div className="gm-chip" onClick={uiClick(() => GmPanel.closeForm())}>
          Cancel
        </div>
      </div>
    </div>
  );
});

/**
 * The server's answers. A command replies with a blue message
 * (`ShowBlueMessageAsync` -> `ServerMessage` type 1), which already lands in the
 * chat log as a system line, so those are read back from there rather than
 * counted twice. A refused command replies with nothing at all, which is why
 * what was sent is listed beside them.
 */
const Transcript = observer(() => {
  const since = GmPanel.sent[GmPanel.sent.length - 1]?.at ?? 0;
  const cutoff = Math.max(since, Date.now() - REPLY_WINDOW_MS);

  const replies = Social.chatLines
    .filter(line => line.type === ChatLineType.System && line.at >= cutoff)
    .slice(-MAX_REPLIES);

  if (GmPanel.sent.length === 0) return null;

  return (
    <div className="gm-transcript">
      <span className="gm-section">Sent</span>
      {GmPanel.sent
        .slice(-MAX_REPLIES)
        .map(entry => (
          <div key={entry.id} className="gm-transcript-row">
            {entry.line}
          </div>
        ))}
      {replies.length > 0 ? (
        <>
          <span className="gm-section">Server said</span>
          {replies.map(line => (
            <div key={line.id} className="gm-transcript-row is-reply">
              {line.text}
            </div>
          ))}
        </>
      ) : null}
    </div>
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
    <div
      className={`gm-tab-plate${GmPanel.open ? ' is-active' : ''}`}
      title={`Game master panel (${TOGGLE_KEY})`}
      onClick={uiClick(() => GmPanel.toggle())}
    >
      GM
    </div>
  );
});

export const GmPanelWindow = observer(() => {
  useEventBus('keyPressed', key => {
    if (!GmPanel.available) return;
    if (key === TOGGLE_KEY) GmPanel.toggle();
  });

  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    onClose: () => GmPanel.close(),
  });

  if (!GmPanel.available) return null;
  if (!GmPanel.open) return <GmTab />;

  const group = GM_GROUPS.find(g => g.id === GmPanel.activeGroupId) ?? GM_GROUPS[0];

  const tabWidth = Math.min(
    110,
    Math.floor((CONTENT_WIDTH - (GM_GROUPS.length - 1) * TAB_GAP) / GM_GROUPS.length)
  );
  const stripWidth = GM_GROUPS.length * tabWidth + (GM_GROUPS.length - 1) * TAB_GAP;

  return (
    <div className="gm-panel-page">
      <GmTab />
      <div
        ref={chrome.ref as React.Ref<HTMLDivElement>}
        className="gm-panel"
        style={{
          ...chrome.style,
          position: chrome.anchored ? 'relative' : 'absolute',
          transformOrigin: chrome.anchored ? 'center' : '0 0',
        }}
      >
        <MuSpriteFrame
          file="op1_stone.OZJ"
          width={WIN_WIDTH - 6}
          height={WIN_HEIGHT - 6}
          style={{ position: 'absolute', left: 3, top: 3, backgroundRepeat: 'repeat' }}
        />
        <MuSpriteFrame
          file="op1_back3.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            left: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        <MuSpriteFrame
          file="op1_back4.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            right: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`top-${mirrored}`}
            file="op2_back1.OZT"
            width={ART_WIDTH}
            height={TOP_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              top: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`bottom-${mirrored}`}
            file="op1_back2.OZT"
            width={ART_WIDTH}
            height={BOTTOM_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              bottom: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}

        <div
          className="gm-title"
          style={{ top: 10, cursor: 'move' }}
          onPointerDown={chrome.onPointerDown}
        >
          Game Master
        </div>

        {GM_GROUPS.map((entry, i) => {
          const x =
            Math.floor((WIN_WIDTH - stripWidth) / 2) + i * (tabWidth + TAB_GAP);

          return (
            <div
              key={entry.id}
              className={`gm-tab${entry.id === group.id ? ' is-active' : ''}`}
              style={{ left: x, top: CONTENT_TOP, width: tabWidth, height: TAB_HEIGHT }}
              onClick={uiClick(() => GmPanel.setGroup(entry.id))}
            >
              {entry.title}
            </div>
          );
        })}

        <div
          className="gm-content"
          style={{
            left: CONTENT_X,
            top: CONTENT_TOP + TAB_HEIGHT + 12,
            width: CONTENT_WIDTH,
            height: CONTENT_HEIGHT,
          }}
        >
          <div className="gm-commands">
            {group.commands.map(command => (
              <div
                key={command.command}
                className={`gm-command${
                  GmPanel.selected?.command === command.command ? ' is-active' : ''
                }${command.confirm ? ' is-heavy' : ''}`}
                onClick={uiClick(() => GmPanel.select(command))}
                title={command.help}
              >
                <span className="gm-command-label">{command.label}</span>
                <span className="gm-command-slash">{command.command}</span>
              </div>
            ))}
          </div>

          {GmPanel.selected ? <CommandForm command={GmPanel.selected} /> : null}

          <Transcript />
        </div>

        <MuButton
          file="op1_b_all.OZT"
          width={CLOSE_WIDTH}
          height={CLOSE_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label="Close"
          onClick={() => GmPanel.close()}
          style={{
            position: 'absolute',
            left: Math.floor((WIN_WIDTH - CLOSE_WIDTH) / 2),
            top: CLOSE_Y,
          }}
          labelStyle={{ fontSize: 11, textShadow: '1px 1px 0 rgba(0,0,0,.85)' }}
        />

        <MuResizeGrip id={WINDOW_ID} width={WIN_WIDTH} />
      </div>
    </div>
  );
});
