import { useEffect, useRef, useState, type RefObject } from 'react';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { LocalStorage } from '../../../../../libs/localStorage';
import {
  emojiPackLabel,
  pushRecentEmoji,
  type ChatEmoji,
} from '../../../../../common/chatEmojis';
import { EMOJI_CATALOG } from '../../../../../emojis';

const RECENT_KEY = 'mu_chat_emoji_recent';
const RECENT_TAB = '';

function loadRecent(): string[] {
  try {
    const stored = JSON.parse(LocalStorage.load(RECENT_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(c => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

/** The emojis this player sent last, most recent first, shared by every character. */
export const RecentEmojis = makeAutoObservable({
  codes: loadRecent(),
  push(code: string) {
    this.codes = pushRecentEmoji(this.codes, code);
    LocalStorage.save(RECENT_KEY, JSON.stringify(this.codes));
  },
  /** Codes of packs that are gone are skipped, not forgotten. */
  get emojis(): ChatEmoji[] {
    return this.codes.flatMap(code => EMOJI_CATALOG.byCode.get(code) ?? []);
  },
});

const PICKER_SIZE = { width: 20, height: 20 };
const TAB_SIZE = { width: 17, height: 17 };

/**
 * The emoji button's panel, above the input box: a tab per pack (and the
 * recently used), a grid, and the hovered emoji's code. A pick is typed into
 * the line at the caret; the panel stays up for another.
 */
export const EmojiPicker = observer(
  ({
    onPick,
    onClose,
    refocus,
    buttonRef,
    bottom,
  }: {
    onPick: (emoji: ChatEmoji) => void;
    onClose: () => void;
    /** Back to the chat field after the grid's scrollbar took the focus. */
    refocus: () => void;
    buttonRef: RefObject<HTMLElement>;
    bottom: number;
  }) => {
    const packs = EMOJI_CATALOG.packs;
    const recent = RecentEmojis.emojis;
    const [tab, setTab] = useState(() => (recent.length ? RECENT_TAB : packs[0]?.id ?? ''));
    const [hover, setHover] = useState<ChatEmoji | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // A press anywhere else closes it; the button toggles it itself.
    useEffect(() => {
      const onDown = (e: PointerEvent) => {
        const target = e.target as Node;
        if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
        onClose();
      };
      document.addEventListener('pointerdown', onDown, true);
      return () => document.removeEventListener('pointerdown', onDown, true);
    }, [onClose, buttonRef]);

    useEffect(() => {
      gridRef.current?.scrollTo({ top: 0 });
    }, [tab]);

    const shown =
      tab === RECENT_TAB ? recent : packs.find(p => p.id === tab)?.emojis ?? [];
    const title =
      tab === RECENT_TAB ? t('chat.emoji.recent') : emojiPackLabel(tab);

    // A press would take the focus out of the chat field. Not on the grid
    // itself: that is its scrollbar, which needs the press to drag.
    const keepFocus = (e: React.MouseEvent) => {
      if (e.target !== gridRef.current) e.preventDefault();
    };

    return (
      <div
        ref={panelRef}
        className="chat-emoji-picker"
        style={{ bottom }}
        onMouseDown={keepFocus}
      >
        <div className="chat-emoji-tabs">
          {recent.length > 0 && (
            <div
              className={`chat-emoji-tab recent${tab === RECENT_TAB ? ' active' : ''}`}
              title={t('chat.emoji.recent')}
              onClick={() => setTab(RECENT_TAB)}
            >
              <span className="chat-emoji-clock" />
            </div>
          )}
          {packs.map(pack => (
            <div
              key={pack.id}
              className={`chat-emoji-tab${tab === pack.id ? ' active' : ''}`}
              title={emojiPackLabel(pack.id)}
              onClick={() => setTab(pack.id)}
            >
              <img src={pack.emojis[0].url} alt="" draggable={false} style={TAB_SIZE} />
            </div>
          ))}
        </div>

        <div ref={gridRef} className="chat-emoji-grid scrollable" onMouseUp={refocus}>
          {shown.map(emoji => (
            <div
              key={emoji.code}
              className="chat-emoji-cell"
              onMouseEnter={() => setHover(emoji)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick(emoji)}
            >
              <img
                src={emoji.url}
                alt={`:${emoji.code}:`}
                loading="lazy"
                draggable={false}
                style={PICKER_SIZE}
              />
            </div>
          ))}
        </div>

        <div className="chat-emoji-footer">
          {hover ? <span className="code">:{hover.code}:</span> : <span className="pack">{title}</span>}
        </div>
      </div>
    );
  }
);
