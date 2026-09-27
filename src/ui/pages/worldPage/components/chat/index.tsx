import './style.less';
import { t, type TextKey } from '../../../../../i18n';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
import { useUiViewport } from '../../../../components/uiStage';
import { useIsMobile } from '../../../../../common/mobile';
import {
  MuResizeGrip,
  useWindowStackEntry,
} from '../../../../components/muWindow/useWindowChrome';
import { isTypingInField } from '../../../../../ecs/systems/keyboardInputSystem';
import { GameOptions } from '../../../../../common/gameOptions';
import { isKey } from '../../../../../common/keyBindings';
import { EmojiText } from '../../../../components/emojiText';
import { EMOJI_CATALOG } from '../../../../../emojis';
import { EmojiPicker, RecentEmojis } from './emojiPicker';
import { installItemLinkGesture } from './itemLinkGesture';
import {
  labelsToWire,
  uniqueLinkLabel,
  wireToLabels,
} from '../../../../../common/chatItemLinks';
import {
  chatEmojiSize,
  emojiPackLabel,
  emojiQueryAt,
  matchEmojiCodes,
  spliceChatText,
  type ChatEmoji,
} from '../../../../../common/chatEmojis';
import {
  chatEndIndex,
  chatInputBudget,
  CHAT_LINE_HEIGHT,
  chatPkClass,
  CHAT_FILTERS,
  CHAT_INPUT_MODES,
  CHAT_INPUT_PREFIX,
  CHAT_LINE_STYLE,
  CHATBOX_HEIGHT,
  CHATBOX_WIDTH,
  chatTimestamp,
  chatWheelRows,
  ChatLineType,
  joinCopiedRows,
  layoutChatRows,
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
// The emoji button takes the end of the text slot (x 68..278 in the art).
// Left of the window's resize grip, which owns the 12 px corner.
const EMOJI_BUTTON = { left: 250, top: 29, width: 16, height: 16 };
const EMOJI_FACE = { width: 14, height: 14 };
const CHAT_FIELD_BESIDE_EMOJIS: CSSProperties = { ...CHAT_FIELD, width: EMOJI_BUTTON.left - 72 - 2 };
const COMPLETION_EMOJI = { width: 14, height: 14 };
const ALL_EMOJIS = [...EMOJI_CATALOG.byCode.values()];
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

/** The picture over a hovered log emoji; the row itself is too small to read it. */
const PREVIEW_SIZE = 48;

/** A row as copied: an emoji is its code, a carried row's hidden clock is left out. */
function copiedText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node instanceof HTMLImageElement) return node.alt;
  if (node instanceof HTMLElement && node.dataset.copy === 'skip') return '';
  let out = '';
  node.childNodes.forEach(child => {
    out += copiedText(child);
  });
  return out;
}

/** The selected part of every log row the selection touches, top to bottom. */
function selectedRows(log: HTMLElement, range: Range): Parameters<typeof joinCopiedRows>[0] {
  const rows: { messageId: number; text: string; spaced: boolean }[] = [];
  log.querySelectorAll<HTMLElement>('.chat-line').forEach(row => {
    if (!range.intersectsNode(row)) return;
    const part = document.createRange();
    part.selectNodeContents(row);
    if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) {
      part.setStart(range.startContainer, range.startOffset);
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) {
      part.setEnd(range.endContainer, range.endOffset);
    }
    rows.push({
      messageId: Number(row.dataset.message),
      text: copiedText(part.cloneContents()),
      spaced: row.dataset.spaced !== undefined,
    });
  });
  return rows;
}

const ChatLog = observer(() => {
  const framed = Social.chatLogFramed;
  const showing = Social.chatLogLines;
  const lines = Social.visibleChatLines;
  // `m_iPointedMessageIndex`, by message rather than by row: a message that
  // wrapped highlights whole and answers a right click on either of its rows.
  const [pointed, setPointed] = useState(-1);
  const [preview, setPreview] = useState<{ emoji: ChatEmoji; x: number; y: number } | null>(
    null
  );
  const dragRef = useRef<{ startY: number; startEnd: number } | null>(null);
  const wheelCarry = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  // `m_iCurrentRenderEndLine` lives on `Social.chatLogEndId` so the input box
  // can page the log too.
  const last = lines.length - 1;
  const end = chatEndIndex(lines, Social.chatLogEndId);
  const below = last - end;

  // A row holding an emoji is as tall as the option draws it; the log keeps
  // its height and shows fewer rows.
  const emojiSize = chatEmojiSize(GameOptions.chatEmojiSize);
  const rowHeight = (line: ChatLine) => Social.chatRowHeight(line);
  const layout = layoutChatRows(i => rowHeight(lines[i]), end, Social.chatLogBudget);
  const visible = end < 0 ? [] : lines.slice(layout.start, end + 1);
  const floor = Social.chatLogFloor(lines);

  const height =
    SCROLL_MIDDLE_PART_HEIGHT * showing +
    SCROLL_TOP_BOTTOM_PART_HEIGHT * 2 +
    WND_TOP_BOTTOM_EDGE * 2;
  const width = CHATBOX_WIDTH;

  // Lines are drawn from the bottom up when fewer than `showing` exist.
  const firstLineY = SCROLL_TOP_BOTTOM_PART_HEIGHT + FONT_LEADING;

  // Copying log text: codes for the pictures, and a message the log wrapped
  // as one line. The event goes to the page, not to the log.
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const log = logRef.current;
      const selection = window.getSelection();
      if (!log || !selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!log.contains(range.commonAncestorContainer)) return;
      const text = joinCopiedRows(selectedRows(log, range));
      if (!text || !e.clipboardData) return;
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    };
    // A selection holds the view still, or the next line would scroll the
    // rows it covers away. On the page: the drag can end off the log.
    const onUp = () => {
      const log = logRef.current;
      const selection = window.getSelection();
      if (!log || !selection || selection.isCollapsed || !selection.rangeCount) return;
      if (selection.getRangeAt(0).intersectsNode(log)) Social.holdChatLog();
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // The hovered emoji's row may have scrolled away under the pointer.
  useEffect(() => setPreview(null), [layout.start, end]);

  if (!Social.chatLogVisible) return null;

  const scrollable = floor < last;

  // The original scrolls framed or not (NewUIChatLogWindow.cpp:679).
  const onWheel = (e: React.WheelEvent) => {
    // Ctrl+wheel is the browser's zoom, which boot.tsx cancels.
    if (e.ctrlKey || !scrollable) return;
    const step = chatWheelRows(e.deltaY, e.deltaMode, wheelCarry.current, showing);
    wheelCarry.current = step.carry;
    if (step.rows) {
      setPreview(null);
      Social.scrollChatLog(step.rows);
    }
  };

  const onEmojiHover = (emoji: ChatEmoji | null, img: HTMLImageElement | null) => {
    const log = logRef.current;
    if (!emoji || !img || !log) {
      setPreview(null);
      return;
    }
    const box = log.getBoundingClientRect();
    const scale = box.width / log.offsetWidth || 1;
    const rect = img.getBoundingClientRect();
    setPreview({
      emoji,
      x: (rect.left + rect.width / 2 - box.left) / scale,
      y: (rect.top - box.top) / scale,
    });
  };

  // `UpdateScrollPos`: thumb position follows the end line.
  const rate = scrollable ? (end - floor) / (last - floor) : 1;
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
    const perLine = trackHeight / (last - floor);
    const delta = Math.round((e.clientY - drag.startY) / scale / perLine);
    Social.scrollChatLogTo(drag.startEnd + delta);
  };
  const onThumbUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={logRef}
      className={`chat-log${framed ? ' framed' : ''}`}
      style={{
        width,
        height,
        bottom: CHATBOX_HEIGHT,
        backgroundColor: framed ? `rgba(0,0,0,${Social.chatLogAlpha})` : undefined,
      }}
      onWheel={onWheel}
      onMouseLeave={() => {
        setPointed(-1);
        setPreview(null);
      }}
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
        const height = rowHeight(line);
        return (
          <div
            key={line.id}
            className="chat-line"
            data-message={line.messageId}
            data-spaced={line.spaced ? '' : undefined}
            style={{
              left: WND_LEFT_RIGHT_EDGE,
              top: firstLineY + layout.tops[s],
              ...(height !== CHAT_LINE_HEIGHT && { height, lineHeight: `${height}px` }),
              maxWidth: width - WND_LEFT_RIGHT_EDGE * 2 - (framed ? SCROLL_BAR_WIDTH + 4 : 0),
              ...lineStyle(line, framed, pointed === line.messageId && !!line.sender),
            }}
            onMouseEnter={() => setPointed(line.messageId)}
            onContextMenu={e => {
              // `m_bPointedMessage` + right click → `SetWhsprID`.
              e.preventDefault();
              if (!line.sender) return;
              Social.setWhisperTarget(line.sender);
              Social.openChatInput();
            }}
          >
            {GameOptions.chatTimestamps && (
              <span
                className="chat-line-time"
                // A carried row keeps the column so the text stays in line,
                // without printing the same minute twice.
                style={line.continued ? { visibility: 'hidden' } : undefined}
                data-copy={line.continued ? 'skip' : undefined}
              >
                {chatTimestamp(line.at)}{' '}
              </span>
            )}
            {line.sender && !line.continued ? (
              <>
                {line.senderGuild ? (
                  <span className="chat-line-guild">{`[${line.senderGuild}] `}</span>
                ) : null}
                <span
                  className={`chat-line-name ${chatPkClass(line.senderPk)}${
                    line.senderGm ? ' is-gm' : ''
                  }`}
                >
                  {line.sender}
                </span>
                {' : '}
                <EmojiText text={line.text} size={emojiSize} onHover={onEmojiHover} />
              </>
            ) : line.sender ? (
              <EmojiText text={line.text} size={emojiSize} onHover={onEmojiHover} />
            ) : (
              line.text
            )}
          </div>
        );
      })}

      {preview && (
        <div
          className="chat-emoji-preview"
          style={{
            left: Math.min(width - PREVIEW_SIZE / 2 - 4, Math.max(PREVIEW_SIZE / 2 + 4, preview.x)),
            top: preview.y - 4,
          }}
        >
          <img
            src={preview.emoji.url}
            alt=""
            draggable={false}
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          />
          <span>:{preview.emoji.code}:</span>
        </div>
      )}

      {/* Scrolled back: how many rows are below, and the way back down. */}
      {below > 0 && (
        <div
          className="chat-log-latest"
          style={{
            right: framed ? SCROLL_BAR_WIDTH + WND_LEFT_RIGHT_EDGE + 6 : WND_LEFT_RIGHT_EDGE,
            bottom: WND_TOP_BOTTOM_EDGE,
          }}
          title={t('chat.latest')}
          onClick={uiClick(() => Social.followChatLog())}
        >
          ▼ {below}
        </div>
      )}

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
  const emojiButtonRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  // Where the caret is, for the `:` list; `pendingCaret` is put back after a pick.
  const [caret, setCaret] = useState(0);
  const pendingCaret = useRef<number | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tip, setTip] = useState<{ text: string; x: number } | null>(null);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The `:` list Escape put away, by where its code starts.
  const [hiddenQuery, setHiddenQuery] = useState(-1);
  const [face, setFace] = useState(0);
  // Item links in the box, by the label it shows them as; sent as the link.
  const links = useRef(new Map<string, string>());
  const open = Social.chatInputOpen;
  const pendingInsert = Social.pendingChatInsert;

  const whisperLine = Social.whisperEnabled && !!Social.whisperTarget.trim();
  const emojis = GameOptions.chatEmojis && ALL_EMOJIS.length > 0;

  // The `:` list: the codes the word at the caret could become.
  const emojiQuery = emojis ? emojiQueryAt(text, caret) : null;
  const emojiMatches =
    emojiQuery && emojiQuery.start !== hiddenQuery
      ? matchEmojiCodes(emojiQuery.query, EMOJI_CATALOG, CHAT_COMPLETION_ROWS)
      : [];

  // The `/` help: every command the typed word could become, GM ones only
  // for a GM. A whisper line is never a command, so no list while whispering.
  const isGm = Store.playerData.isGameMaster;
  const completions =
    !emojiMatches.length && text.startsWith('/') && !whisperLine
      ? matchChatCommands(text, isGm).slice(0, CHAT_COMPLETION_ROWS)
      : [];
  const listLength = emojiMatches.length || completions.length;
  const selectedIndex = Math.min(completionIndex, listLength - 1);
  const selectedCompletion = completions[selectedIndex];
  const selectedEmoji = emojiMatches[selectedIndex];

  const mode = Social.chatInputMode;
  // What `sendChat` will put in front of the line, which the line leaves room for.
  const budget = chatInputBudget(
    whisperLine || text.startsWith('/') ? '' : CHAT_INPUT_PREFIX[mode]
  );

  /** The line as it will be sent: link labels back to the links. */
  const wireOf = (line: string) => labelsToWire(line, links.current);

  /** `insert` in place of `text[from, to)`, refused when the line as sent would not fit. */
  const placeText = (from: number, to: number, insert: string): boolean => {
    const next = spliceChatText(text, from, to, insert, budget, line => wireOf(line).length);
    if (!next) {
      playUiSound('error');
      return false;
    }
    setText(next.text);
    pendingCaret.current = next.caret;
    setCompletionIndex(0);
    return true;
  };

  /** Tab / click: put the command name (and a space when it takes arguments) in the field. */
  const complete = (command: ChatCommand) => {
    setText(command.usage || command.name === '/post' ? `${command.name} ` : command.name);
    setCompletionIndex(0);
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);

  useEffect(() => {
    if (!open) return;
    // Opened by Alt+click on an item: the box starts with its link.
    const insert = Social.takeChatInsert();
    links.current = new Map(insert ? [[insert.label, insert.token]] : []);
    setText(insert?.label ?? '');
    setCaret(insert?.label.length ?? 0);
    setHistoryIndex(-1);
    setTip(null);
    setPickerOpen(false);
    setHiddenQuery(-1);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Alt+click on an item while the box is up: its link at the caret.
  useEffect(() => {
    if (!open || !pendingInsert) return;
    const insert = Social.takeChatInsert();
    if (!insert) return;
    const label = uniqueLinkLabel(insert.label, insert.token, links.current);
    const field = inputRef.current;
    const from = field?.selectionStart ?? text.length;
    const gap = from > 0 && text[from - 1] !== ' ' ? ' ' : '';
    // Known before the check, so the line is measured as it would be sent;
    // dropped again when it does not fit.
    const known = links.current.has(label);
    links.current.set(label, insert.token);
    if (!placeText(from, field?.selectionEnd ?? from, gap + label) && !known) {
      links.current.delete(label);
    }
    // The window's own press may have taken the focus.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingInsert]);

  useLayoutEffect(() => {
    const at = pendingCaret.current;
    const field = inputRef.current;
    if (at === null || !field) return;
    pendingCaret.current = null;
    field.focus();
    field.setSelectionRange(at, at);
    setCaret(at);
  });

  // Enter while the box is up but a click in the log took the focus: back
  // into the field rather than nothing.
  useEventBus('keyPressed', key => {
    if (Social.chatInputOpen && OPEN_KEYS.has(key) && !isTypingInField()) {
      inputRef.current?.focus();
    }
  });

  if (!open) return null;

  const whispering = Social.whisperEnabled;
  const framed = Social.chatLogFramed;

  const submit = () => {
    if (!text.trim()) {
      Social.closeChatInput();
      return;
    }
    // Too long since a mode switch or a recall: sending would cut the end,
    // maybe half a link or an emoji code. It stays in the box to shorten.
    const wire = wireOf(text);
    if (wire.length > budget) {
      playUiSound('error');
      return;
    }
    // Rate-limited or refused: the line stays in the field for a retry
    // instead of vanishing with the box.
    if (!Social.sendChat(wire)) {
      playUiSound('error');
      return;
    }
    Social.followChatLog();
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
    // History keeps the line as sent; its links show as names again.
    const recalled = wireToLabels(history[next]);
    links.current = recalled.links;
    setText(recalled.text);
  };

  const placeEmoji = (from: number, to: number, emoji: ChatEmoji) => {
    if (placeText(from, to, `:${emoji.code}:`)) RecentEmojis.push(emoji.code);
  };

  const pickEmoji = (emoji: ChatEmoji) => {
    const field = inputRef.current;
    const from = field?.selectionStart ?? text.length;
    placeEmoji(from, field?.selectionEnd ?? from, emoji);
  };

  const completeEmoji = (emoji: ChatEmoji) => {
    if (emojiQuery) placeEmoji(emojiQuery.start, caret, emoji);
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
        style={emojis ? CHAT_FIELD_BESIDE_EMOJIS : CHAT_FIELD}
        // The box holds link names, the line sends the links.
        maxLength={Math.max(text.length, budget - (wireOf(text).length - text.length))}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={e => {
          const caretNow = e.target.selectionStart ?? e.target.value.length;
          setText(e.target.value);
          setCaret(caretNow);
          setCompletionIndex(0);
          // A list put away with Escape stays away only for the code it was on.
          if (emojiQueryAt(e.target.value, caretNow)?.start !== hiddenQuery) setHiddenQuery(-1);
        }}
        onSelect={e => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            // With the `:` list up, Enter takes the code: half a code is never meant to be sent.
            if (selectedEmoji) completeEmoji(selectedEmoji);
            else submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (pickerOpen) setPickerOpen(false);
            else if (emojiQuery && emojiMatches.length) setHiddenQuery(emojiQuery.start);
            else Social.closeChatInput();
          } else if (listLength > 1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            // With a list up the arrows walk it instead of the history.
            e.preventDefault();
            const step = e.key === 'ArrowUp' ? -1 : 1;
            setCompletionIndex(i => (Math.min(i, listLength - 1) + step + listLength) % listLength);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            recall(-1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            recall(1);
          } else if (e.key === 'PageUp' || e.key === 'PageDown') {
            // `m_bShowFrame` + PageUp / PageDown pages the log (NewUIChatInputBox.cpp:455), framed or not here.
            e.preventDefault();
            Social.pageChatLog(e.key === 'PageUp' ? -1 : 1);
          } else if (e.key === 'F3') {
            e.preventDefault();
            Social.toggle('whisperEnabled');
          } else if (e.key === 'Tab' && selectedEmoji) {
            e.preventDefault();
            completeEmoji(selectedEmoji);
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

      {/* The emoji button, at the end of the text slot; a new face each hover. */}
      {emojis && (
        <div
          ref={emojiButtonRef}
          className={`chat-emoji-button${pickerOpen ? ' open' : ''}`}
          style={EMOJI_BUTTON}
          onMouseDown={e => e.preventDefault()}
          onMouseEnter={() => {
            setFace(f => (f + 1 + Math.floor(Math.random() * (ALL_EMOJIS.length - 1))) % ALL_EMOJIS.length);
            setTip({ text: t('chat.emoji.button'), x: EMOJI_BUTTON.left });
          }}
          onMouseLeave={() => setTip(null)}
          onClick={uiClick(() => setPickerOpen(o => !o))}
        >
          <img
            src={ALL_EMOJIS[face % ALL_EMOJIS.length].url}
            alt=""
            draggable={false}
            style={EMOJI_FACE}
          />
        </div>
      )}
      {/* Out of the way while the `:` list is up: the list is what Enter takes. */}
      {emojis && pickerOpen && !emojiMatches.length && (
        <EmojiPicker
          onPick={pickEmoji}
          onClose={closePicker}
          refocus={() => inputRef.current?.focus()}
          buttonRef={emojiButtonRef}
          bottom={CHATBOX_HEIGHT + 2}
        />
      )}

      {/* The `:` list: the matching emojis over the box; Tab, Enter or a click takes one. */}
      {emojiMatches.length > 0 && (
        <div
          className="chat-completion"
          style={{ left: CHAT_FIELD.left, bottom: CHATBOX_HEIGHT - (CHAT_FIELD.top as number) + 2 }}
        >
          {emojiMatches.map((emoji, i) => (
            <div
              key={emoji.code}
              className={`chat-completion-row${i === selectedIndex ? ' selected' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                completeEmoji(emoji);
              }}
            >
              <img
                className="chat-completion-emoji"
                src={emoji.url}
                alt=""
                draggable={false}
                style={COMPLETION_EMOJI}
              />
              <span className="chat-completion-name">:{emoji.code}:</span>
              <span className="chat-completion-help">{emojiPackLabel(emoji.pack)}</span>
            </div>
          ))}
        </div>
      )}

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
  const mobile = useIsMobile();
  const viewport = useUiViewport();
  // 281 px at the default 1.5 is 422 - wider than a phone, so the log hangs
  // off the right edge. Capped for the draw only; the placement the player
  // saved is untouched, so the same character on a desktop is unaffected.
  const scale = mobile
    ? Math.min(MuWindows.scaleOf(CHAT_ID), viewport.width / CHATBOX_WIDTH)
    : MuWindows.scaleOf(CHAT_ID);

  useWindowStackEntry(CHAT_ID, true, NOTHING_TO_CLOSE);

  useEffect(() => installItemLinkGesture(), []);

  // The keyboard system already drops keys typed into a field and any key
  // while a message box is up (`isComposing` too), so this only fires for a
  // bare Enter.
  useEventBus('keyPressed', key => {
    if (isTypingInField()) return;
    if (!Store.world?.playerEntity) return;
    if (Store.msgWin) return;

    // The reply key: the box opens already addressed to whoever whispered
    // last, which is otherwise a right click on their line in the log.
    if (isKey('replyWhisper', key)) {
      const name = Social.lastWhisperFrom;
      if (!name) return;
      Social.setWhisperTarget(name);
      Social.openChatInput();
      return;
    }

    if (!OPEN_KEYS.has(key)) return;
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
