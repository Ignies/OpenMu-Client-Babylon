import './style.less';
import { t, type TextKey } from '../../../../../i18n';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Social } from '../../../../../social';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuWindows } from '../../../../components/muWindow/windowState';
import { bottomBarScreenHeight } from '../../../../components/muWindow';
import {
  MuResizeGrip,
  useWindowStackEntry,
} from '../../../../components/muWindow/useWindowChrome';
import { isTypingInField } from '../../../../../ecs/systems/keyboardInputSystem';
import {
  CHAT_FILTERS,
  CHAT_INPUT_MODES,
  CHAT_INPUT_PREFIX,
  CHAT_LINE_STYLE,
  CHATBOX_HEIGHT,
  CHATBOX_WIDTH,
  ChatLineType,
  MAX_CHAT_LENGTH,
  type ChatInputMode,
  type ChatLine,
} from '../../../../../common/chat';
import {
  CHAT_COMPLETION_ROWS,
  matchChatCommands,
  type ChatCommand,
} from '../../../../../common/chatCommands';

/**
 * `CNewUIChatInputBox` + `CNewUIChatLogWindow`, drawn with the original's
 * art and coordinates. The input box (`newui_chat_back`, 281x47) sits on the
 * main frame at the bottom left and only shows while a line is being typed
 * (Enter opens, Enter/Escape close). Its top row is ten 27x26 buttons: the
 * four message types, block-whisper, system log, chat log, frame, and - with
 * the frame on - size and transparency. The log is drawn above the box's
 * position whether or not the box is open.
 */

const CHAT_ID = 'chat-window';
// The chat rides on the main bar (`480 - 51 - 47`); the bar is player-scaled.

// NewUIChatInputBox.h
const BUTTON_WIDTH = 27;
const BUTTON_HEIGHT = 26;
const GROUP_SEPARATING_WIDTH = 6;
const INPUT_TYPE_START_X = 0;
const BLOCK_WHISPER_START_X = CHAT_INPUT_MODES.length * BUTTON_WIDTH + GROUP_SEPARATING_WIDTH;
const SYSTEM_ON_START_X = BLOCK_WHISPER_START_X + BUTTON_WIDTH;
const CHATLOG_ON_START_X = SYSTEM_ON_START_X + BUTTON_WIDTH;
const FRAME_ON_START_X = CHATLOG_ON_START_X + BUTTON_WIDTH + GROUP_SEPARATING_WIDTH;
const FRAME_RESIZE_START_X = FRAME_ON_START_X + BUTTON_WIDTH;
const TRANSPARENCY_START_X = FRAME_RESIZE_START_X + BUTTON_WIDTH;
// `m_pWhsprIDInputBox->SetPosition(x + 5, y + 32)`, `m_pChatInputBox` at +72.
const WHISPER_FIELD: CSSProperties = { left: 5, top: 32, width: 62, height: 13 };
const CHAT_FIELD: CSSProperties = { left: 72, top: 32, width: CHATBOX_WIDTH - 72 - 6, height: 13 };
// `RenderColor(x + 2, y + 28, 61, 17)` in (0.5, 0.2, 0.2, 0.2) when whispering is off.
const WHISPER_OFF_TINT: CSSProperties = { left: 2, top: 28, width: 61, height: 17 };

// NewUIChatLogWindow.h
const FONT_LEADING = 4;
const WND_TOP_BOTTOM_EDGE = 2;
const WND_LEFT_RIGHT_EDGE = 4;
const RESIZING_BTN_HEIGHT = 10;
const SCROLL_BAR_WIDTH = 7;
const SCROLL_TOP_BOTTOM_PART_HEIGHT = 3;
const SCROLL_MIDDLE_PART_HEIGHT = 15;
const SCROLL_BTN_WIDTH = 15;
const SCROLL_BTN_HEIGHT = 30;

const BACK_SPRITE = 'newui_chat_back.OZJ';
const MODE_ON_SPRITE: Record<ChatInputMode, string> = {
  normal: 'newui_chat_normal_on.OZJ',
  party: 'newui_chat_party_on.OZJ',
  guild: 'newui_chat_guild_on.OZJ',
  gens: 'newui_chat_gens_on.OZJ',
};
const WHISPER_ON_SPRITE = 'newui_chat_whisper_on.OZJ';
const SYSTEM_ON_SPRITE = 'newui_chat_system_on.OZJ';
const CHATLOG_ON_SPRITE = 'newui_chat_chat_on.OZJ';
const FRAME_ON_SPRITE = 'newui_chat_frame_on.OZJ';
const SIZE_SPRITE = 'newui_chat_btn_size.OZJ';
const ALPHA_SPRITE = 'newui_chat_btn_alpha.OZJ';
const DRAG_SPRITE = 'newui_Scrollbar_stretch.OZJ';
const SCROLL_TOP_SPRITE = 'newui_scrollbar_up.OZT';
const SCROLL_MIDDLE_SPRITE = 'newui_scrollbar_m.OZT';
const SCROLL_BOTTOM_SPRITE = 'newui_scrollbar_down.OZT';
const SCROLL_BTN_SPRITE = 'newui_scroll_on.OZT';

/** GlobalText 1681-1683, 3321, 1684, 1685, 750, 1686, 751, 752. */
const TOOLTIP_KEYS: Record<string, TextKey> = {
  normal: 'chat.normal',
  party: 'chat.party',
  guild: 'chat.guild',
  gens: 'chat.gens',
  whisper: 'chat.blockWhisper',
  system: 'chat.system',
  chatlog: 'chat.log',
  frame: 'chat.frame',
  size: 'chat.size',
  alpha: 'chat.alpha',
};

/** Roughly half a tooltip's text width; the original measures the font. */
const TOOLTIP_HALF_WIDTH = 30;

const OPEN_KEYS = new Set(['Enter', 'NumpadEnter']);

/** The filter tabs (`newui_Bt_Chat_*`, 27x26 x 2 frames) ride above the frame's drag strip. */
const FILTER_TAB_Y = -(RESIZING_BTN_HEIGHT + BUTTON_HEIGHT);

/** `m_bPointedMessage`: the line under the cursor, ready for a right-click whisper. */
const POINTED_LINE_STYLE: CSSProperties = {
  color: 'rgb(255,128,255)',
  backgroundColor: 'rgba(30,30,30,0.7)',
};
/** `RenderMessages`: a chat line's bg alpha is 150 plain, 100 with the frame. */
const CHAT_LINE_BG_PLAIN = `rgba(0,0,0,${150 / 255})`;
const CHAT_LINE_BG_FRAMED = `rgba(0,0,0,${100 / 255})`;

/** One style object per (type, framed), built once: the log re-renders per line. */
const LINE_STYLES = new Map<string, CSSProperties>();

/** One row of the `/` completion list: name, usage, help. */
const CompletionRow = ({
  command,
  selected,
  onPick,
}: {
  command: ChatCommand;
  selected: boolean;
  onPick: () => void;
}) => (
  <div
    className={`chat-completion-row${selected ? ' selected' : ''}`}
    onMouseDown={e => {
      // Keep the focus in the field.
      e.preventDefault();
      onPick();
    }}
  >
    <span className="chat-completion-name">{command.name}</span>
    {command.usage && <span className="chat-completion-usage">{command.usage}</span>}
    <span className="chat-completion-help">{t(command.helpKey)}</span>
  </div>
);

function lineStyle(line: ChatLine, framed: boolean, pointed: boolean): CSSProperties {
  if (pointed) return POINTED_LINE_STYLE;
  const key = `${line.type}:${framed ? 1 : 0}`;
  let style = LINE_STYLES.get(key);
  if (!style) {
    const base = CHAT_LINE_STYLE[line.type];
    const chatLike = line.type === ChatLineType.Chat || line.type === ChatLineType.All;
    style = {
      color: base.color,
      backgroundColor: chatLike ? (framed ? CHAT_LINE_BG_FRAMED : CHAT_LINE_BG_PLAIN) : base.bg,
      fontWeight: line.type === ChatLineType.GM ? 'bold' : undefined,
    };
    LINE_STYLES.set(key, style);
  }
  return style;
}

/** The filter tabs, drawn while the frame is on (the original's log window has them on its frame). */
const FilterTabs = observer(() => {
  const current = Social.chatFilter;
  return (
    <div className="chat-filter-tabs" style={{ top: FILTER_TAB_Y, left: 0, height: BUTTON_HEIGHT }}>
      {CHAT_FILTERS.map((filter, i) =>
        filter.sprite ? (
          <MuButton
            key={filter.key}
            file={filter.sprite}
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            frames={{ up: 0, check: 1, down: 1 }}
            checked={current === filter.key}
            onClick={() => Social.setChatFilter(filter.key)}
            style={{ position: 'absolute', left: i * BUTTON_WIDTH, top: 0 }}
          />
        ) : (
          <div
            key={filter.key}
            className={`chat-filter-all${current === filter.key ? ' active' : ''}`}
            style={{ left: i * BUTTON_WIDTH, width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
            onClick={uiClick(() => Social.setChatFilter(filter.key))}
          >
            {t(filter.labelKey)}
          </div>
        )
      )}
    </div>
  );
});

const ChatLog = observer(() => {
  const framed = Social.chatLogFramed;
  const showing = Social.chatLogLines;
  const lines = Social.visibleChatLines;
  // `m_iCurrentRenderEndLine`: null follows the newest line. Pinned by the
  // line's id, not its index, so a new line (or a dropped oldest one) does
  // not shift the view the reader scrolled to.
  const [endId, setEndId] = useState<number | null>(null);
  const [pointed, setPointed] = useState(-1);
  const dragRef = useRef<{ startY: number; startEnd: number } | null>(null);

  const last = lines.length - 1;
  const pinned = endId === null ? -1 : lines.findIndex(l => l.id === endId);
  const end = pinned < 0 ? last : pinned;
  const setEndLine = (index: number) => setEndId(index >= last ? null : lines[index].id);
  const start = Math.max(0, end - showing + 1);
  const visible = lines.slice(start, end + 1);

  const height =
    SCROLL_MIDDLE_PART_HEIGHT * showing +
    SCROLL_TOP_BOTTOM_PART_HEIGHT * 2 +
    WND_TOP_BOTTOM_EDGE * 2;
  const width = CHATBOX_WIDTH;

  // Lines are drawn from the bottom up when fewer than `showing` exist.
  const firstLineY =
    SCROLL_TOP_BOTTOM_PART_HEIGHT +
    FONT_LEADING +
    SCROLL_MIDDLE_PART_HEIGHT * (showing - visible.length);

  useEffect(() => {
    if (!framed) setEndId(null);
  }, [framed]);

  if (!Social.chatLogVisible) return null;

  const scrollBy = (delta: number) => {
    if (!framed || lines.length <= showing) return;
    setEndLine(Math.min(last, Math.max(showing - 1, end + delta)));
  };

  // `UpdateScrollPos`: thumb position follows the end line.
  const scrollable = lines.length > showing;
  const rate = scrollable ? (end - (showing - 1)) / (lines.length - showing) : 1;
  const trackTop = WND_TOP_BOTTOM_EDGE;
  const trackHeight = height - SCROLL_BTN_HEIGHT - WND_TOP_BOTTOM_EDGE * 2;
  const thumbX = width - SCROLL_BAR_WIDTH - WND_LEFT_RIGHT_EDGE - 4;
  const thumbY = trackTop + trackHeight * rate;

  const onThumbDown = (e: React.PointerEvent) => {
    if (!scrollable) return;
    e.stopPropagation();
    dragRef.current = { startY: e.clientY, startEnd: end };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onThumbMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = MuWindows.scaleOf(CHAT_ID) || 1;
    const perLine = trackHeight / (lines.length - showing);
    const delta = Math.round((e.clientY - drag.startY) / scale / perLine);
    setEndLine(Math.min(last, Math.max(showing - 1, drag.startEnd + delta)));
  };
  const onThumbUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      className={`chat-log${framed ? ' framed' : ''}`}
      style={{
        width,
        height,
        bottom: CHATBOX_HEIGHT,
        backgroundColor: framed ? `rgba(0,0,0,${Social.chatLogAlpha})` : undefined,
      }}
      onWheel={e => {
        if (!framed) return;
        e.stopPropagation();
        scrollBy(e.deltaY > 0 ? 1 : -1);
      }}
      onMouseLeave={() => setPointed(-1)}
    >
      {framed && (
        <>
          <FilterTabs />
          <MuSpriteFrame
            file={DRAG_SPRITE}
            width={width}
            height={RESIZING_BTN_HEIGHT}
            className="chat-log-drag"
            style={{ top: -RESIZING_BTN_HEIGHT }}
          />
        </>
      )}

      {visible.map((line, s) => {
        const index = start + s;
        return (
          <div
            key={line.id}
            className="chat-line"
            style={{
              left: WND_LEFT_RIGHT_EDGE,
              top: firstLineY + SCROLL_MIDDLE_PART_HEIGHT * s,
              maxWidth: width - WND_LEFT_RIGHT_EDGE * 2 - (framed ? SCROLL_BAR_WIDTH + 4 : 0),
              ...lineStyle(line, framed, pointed === index && !!line.sender),
            }}
            onMouseEnter={() => setPointed(index)}
            onContextMenu={e => {
              // `m_bPointedMessage` + right click → `SetWhsprID`.
              e.preventDefault();
              if (!line.sender) return;
              Social.setWhisperTarget(line.sender);
              Social.openChatInput();
            }}
          >
            {line.sender ? `${line.sender} : ${line.text}` : line.text}
          </div>
        );
      })}

      {framed && (
        <>
          <MuSpriteFrame
            file={SCROLL_TOP_SPRITE}
            width={SCROLL_BAR_WIDTH}
            height={WND_TOP_BOTTOM_EDGE}
            className="chat-log-part"
            style={{
              left: width - SCROLL_BAR_WIDTH - WND_LEFT_RIGHT_EDGE,
              top: WND_TOP_BOTTOM_EDGE,
            }}
          />
          {Array.from({ length: showing }, (_, i) => (
            <MuSpriteFrame
              key={i}
              file={SCROLL_MIDDLE_SPRITE}
              width={SCROLL_BAR_WIDTH}
              height={SCROLL_MIDDLE_PART_HEIGHT}
              className="chat-log-part"
              style={{
                left: width - SCROLL_BAR_WIDTH - WND_LEFT_RIGHT_EDGE,
                top:
                  WND_TOP_BOTTOM_EDGE +
                  i * SCROLL_MIDDLE_PART_HEIGHT +
                  SCROLL_TOP_BOTTOM_PART_HEIGHT,
              }}
            />
          ))}
          <MuSpriteFrame
            file={SCROLL_BOTTOM_SPRITE}
            width={SCROLL_BAR_WIDTH}
            height={SCROLL_TOP_BOTTOM_PART_HEIGHT}
            className="chat-log-part"
            style={{
              left: width - SCROLL_BAR_WIDTH - WND_LEFT_RIGHT_EDGE,
              top: height - WND_TOP_BOTTOM_EDGE - SCROLL_TOP_BOTTOM_PART_HEIGHT,
            }}
          />
          <MuSpriteFrame
            file={SCROLL_BTN_SPRITE}
            width={SCROLL_BTN_WIDTH}
            height={SCROLL_BTN_HEIGHT}
            className={`chat-log-thumb${scrollable ? '' : ' idle'}`}
            style={{ left: thumbX, top: thumbY }}
            onClick={undefined}
          >
            <div
              className="chat-log-thumb-hit"
              onPointerDown={onThumbDown}
              onPointerMove={onThumbMove}
              onPointerUp={onThumbUp}
            />
          </MuSpriteFrame>
        </>
      )}
    </div>
  );
});

/** One 27x26 cell of the top strip: an "on" overlay when active, a tooltip on hover. */
const StripButton = ({
  x,
  on,
  sprite,
  tip,
  onClick,
  setTip,
}: {
  x: number;
  on: boolean;
  sprite: string;
  tip: string;
  onClick: () => void;
  setTip: (tip: { text: string; x: number } | null) => void;
}) => (
  <div
    className="chat-strip-button"
    style={{ left: x, top: 0, width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
    onMouseEnter={() => setTip({ text: tip, x: x + 10 })}
    onMouseLeave={() => setTip(null)}
    onClick={uiClick(onClick)}
  >
    {on && <MuSpriteFrame file={sprite} width={BUTTON_WIDTH} height={BUTTON_HEIGHT} />}
  </div>
);

const ChatInput = observer(() => {
  const inputRef = useRef<HTMLInputElement>(null);
  const whisperRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tip, setTip] = useState<{ text: string; x: number } | null>(null);
  const [completionIndex, setCompletionIndex] = useState(0);
  const open = Social.chatInputOpen;

  // The `/` help: every command the typed word could become, GM ones only
  // for a GM. A whisper line is never a command, so no list while whispering.
  const isGm = !!Store.world?.playerEntity?.isGm;
  const completions =
    text.startsWith('/') && !(Social.whisperEnabled && Social.whisperTarget.trim())
      ? matchChatCommands(text, isGm).slice(0, CHAT_COMPLETION_ROWS)
      : [];
  const selectedCompletion = completions[Math.min(completionIndex, completions.length - 1)];

  /** Tab / click: put the command name (and a space when it takes arguments) in the field. */
  const complete = (command: ChatCommand) => {
    setText(command.usage || command.name === '/post' ? `${command.name} ` : command.name);
    setCompletionIndex(0);
  };

  useEffect(() => {
    if (!open) return;
    setText('');
    setHistoryIndex(-1);
    setTip(null);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const mode = Social.chatInputMode;
  const whispering = Social.whisperEnabled;
  const framed = Social.chatLogFramed;

  const submit = () => {
    if (!text.trim()) {
      Social.closeChatInput();
      return;
    }
    // Rate-limited or refused: the line stays in the field for a retry
    // instead of vanishing with the box.
    if (!Social.sendChat(text)) {
      playUiSound('error');
      return;
    }
    Social.closeChatInput();
  };

  const setMode = (next: ChatInputMode) =>
    runInAction(() => {
      Social.chatInputMode = next;
    });
  const setWhisperTarget = (value: string) =>
    runInAction(() => {
      Social.whisperTarget = value;
    });

  const recall = (direction: 1 | -1) => {
    const history = Social.chatHistory;
    if (!history.length) return;
    let next = historyIndex < 0 ? history.length : historyIndex;
    next = (next + direction + history.length) % history.length;
    setHistoryIndex(next);
    setText(history[next]);
  };

  return (
    <MuSpriteFrame
      file={BACK_SPRITE}
      width={CHATBOX_WIDTH}
      height={CHATBOX_HEIGHT}
      className="chat-input"
    >
      {/* RenderButtons */}
      {CHAT_INPUT_MODES.map((m, i) => (
        <StripButton
          key={m}
          x={INPUT_TYPE_START_X + i * BUTTON_WIDTH}
          on={mode === m}
          sprite={MODE_ON_SPRITE[m]}
          tip={t(TOOLTIP_KEYS[m])}
          onClick={() => setMode(m)}
          setTip={setTip}
        />
      ))}
      <StripButton
        x={BLOCK_WHISPER_START_X}
        on={Social.blockWhisper}
        sprite={WHISPER_ON_SPRITE}
        tip={t(TOOLTIP_KEYS.whisper)}
        onClick={() => Social.toggle('blockWhisper')}
        setTip={setTip}
      />
      <StripButton
        x={SYSTEM_ON_START_X}
        on={Social.showSystemMessages}
        sprite={SYSTEM_ON_SPRITE}
        tip={t(TOOLTIP_KEYS.system)}
        onClick={() => Social.toggle('showSystemMessages')}
        setTip={setTip}
      />
      <StripButton
        x={CHATLOG_ON_START_X}
        on={Social.chatLogVisible}
        sprite={CHATLOG_ON_SPRITE}
        tip={t(TOOLTIP_KEYS.chatlog)}
        onClick={() => Social.toggle('chatLogVisible')}
        setTip={setTip}
      />
      <StripButton
        x={FRAME_ON_START_X}
        on={framed}
        sprite={FRAME_ON_SPRITE}
        tip={t(TOOLTIP_KEYS.frame)}
        onClick={() => Social.toggle('chatLogFramed')}
        setTip={setTip}
      />
      {framed && (
        <>
          <div
            className="chat-strip-button"
            style={{ left: FRAME_RESIZE_START_X, top: 0 }}
            onMouseEnter={() =>
              setTip({ text: t(TOOLTIP_KEYS.size), x: FRAME_RESIZE_START_X + 10 })
            }
            onMouseLeave={() => setTip(null)}
          >
            <MuButton
              file={SIZE_SPRITE}
              width={BUTTON_WIDTH}
              height={BUTTON_HEIGHT}
              frames={{ up: 0, down: 1 }}
              onClick={() => Social.cycleChatLogSize()}
            />
          </div>
          <div
            className="chat-strip-button"
            style={{ left: TRANSPARENCY_START_X, top: 0 }}
            onMouseEnter={() =>
              setTip({ text: t(TOOLTIP_KEYS.alpha), x: TRANSPARENCY_START_X + 10 })
            }
            onMouseLeave={() => setTip(null)}
          >
            <MuButton
              file={ALPHA_SPRITE}
              width={BUTTON_WIDTH}
              height={BUTTON_HEIGHT}
              frames={{ up: 0, down: 1 }}
              onClick={() => Social.cycleChatLogAlpha()}
            />
          </div>
        </>
      )}

      {/* RenderTooltip: white on black(180), centred over the button and
          clamped to the screen edge (`if (x < 0) x = 0`). */}
      {tip && (
        <div className="chat-tooltip" style={{ left: Math.max(0, tip.x - TOOLTIP_HALF_WIDTH) }}>
          {tip.text}
        </div>
      )}

      {/* m_pWhsprIDInputBox: hidden by F3 (`m_bWhisperSend`), then a red tint. */}
      {whispering ? (
        <input
          ref={whisperRef}
          className="chat-field chat-whisper-field"
          style={WHISPER_FIELD}
          maxLength={10}
          spellCheck={false}
          autoComplete="off"
          value={Social.whisperTarget}
          onChange={e => setWhisperTarget(e.target.value)}
          onKeyDown={e => {
            // Mid-composition (CJK IME): Enter / Escape commit or cancel the
            // syllable, not the field.
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              inputRef.current?.focus();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              Social.closeChatInput();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              const history = Social.whisperHistory;
              if (!history.length) return;
              e.preventDefault();
              const i = history.indexOf(Social.whisperTarget);
              const next =
                (i + (e.key === 'ArrowUp' ? -1 : 1) + history.length) % history.length;
              setWhisperTarget(history[next]);
            } else if (e.key === 'F3') {
              e.preventDefault();
              Social.toggle('whisperEnabled');
              inputRef.current?.focus();
            }
          }}
        />
      ) : (
        <div
          className="chat-whisper-off"
          style={WHISPER_OFF_TINT}
          title={t('chat.whisperOff')}
          onClick={() => {
            Social.toggle('whisperEnabled');
            requestAnimationFrame(() => whisperRef.current?.focus());
          }}
        />
      )}

      {/* m_pChatInputBox */}
      <input
        ref={inputRef}
        className="chat-field chat-text-field"
        style={CHAT_FIELD}
        maxLength={MAX_CHAT_LENGTH}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={e => {
          setText(e.target.value);
          setCompletionIndex(0);
        }}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            Social.closeChatInput();
          } else if (completions.length > 1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            // With a list up the arrows walk it instead of the history.
            e.preventDefault();
            const step = e.key === 'ArrowUp' ? -1 : 1;
            setCompletionIndex(i => (i + step + completions.length) % completions.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            recall(-1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            recall(1);
          } else if (e.key === 'F3') {
            e.preventDefault();
            Social.toggle('whisperEnabled');
          } else if (e.key === 'Tab' && selectedCompletion) {
            e.preventDefault();
            complete(selectedCompletion);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            const i = CHAT_INPUT_MODES.indexOf(mode);
            setMode(CHAT_INPUT_MODES[(i + 1) % CHAT_INPUT_MODES.length]);
          }
        }}
      />
      {/* The `/` command help: the matching commands over the box, newest
          first row selected; Tab or a click completes. */}
      {completions.length > 0 && (
        <div
          className="chat-completion"
          style={{ left: CHAT_FIELD.left, bottom: CHATBOX_HEIGHT - (CHAT_FIELD.top as number) + 2 }}
        >
          {completions.map(c => (
            <CompletionRow
              key={c.name}
              command={c}
              selected={c === selectedCompletion}
              onPick={() => complete(c)}
            />
          ))}
        </div>
      )}

      {/* The field is empty and unfocused only for a frame; the prefix hint
          shows what the mode will prepend. */}
      {!text && CHAT_INPUT_PREFIX[mode] && (
        <div className="chat-prefix-hint" style={{ left: CHAT_FIELD.left, top: CHAT_FIELD.top }}>
          {CHAT_INPUT_PREFIX[mode]}
        </div>
      )}
    </MuSpriteFrame>
  );
});

/** Stack membership: raised by a click, never closed by Escape (the input closes itself). */
const NOTHING_TO_CLOSE = () => false;

export const ChatWindow = observer(() => {
  const scale = MuWindows.scaleOf(CHAT_ID);

  useWindowStackEntry(CHAT_ID, true, NOTHING_TO_CLOSE);

  // The keyboard system already drops keys typed into a field and any key
  // while a message box is up (`isComposing` too), so this only fires for a
  // bare Enter.
  useEventBus('keyPressed', key => {
    if (!OPEN_KEYS.has(key)) return;
    if (isTypingInField()) return;
    if (!Store.world?.playerEntity) return;
    if (Store.msgWin) return;
    Social.openChatInput();
  });

  return (
    <div
      className="chat-window"
      style={{
        bottom: bottomBarScreenHeight(),
        width: CHATBOX_WIDTH,
        height: CHATBOX_HEIGHT,
        zIndex: MuWindows.zIndexOf(CHAT_ID),
        transform: `scale(${scale})`,
        transformOrigin: '0 100%',
      }}
      onPointerDown={e => {
        e.stopPropagation();
        MuWindows.raise(CHAT_ID);
      }}
    >
      <ChatLog />
      <ChatInput />
      <MuResizeGrip id={CHAT_ID} width={CHATBOX_WIDTH} />
    </div>
  );
});
