import './style.less';
import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { GameOptions } from '../../../common/gameOptions';
import { emojiSegments, type ChatEmoji } from '../../../common/chatEmojis';
import { EMOJI_CATALOG } from '../../../emojis';

/**
 * A chat line with its emoji codes drawn as their pictures
 * (common/chatEmojis.ts). With the option off, or no code in the line, it is
 * the plain text.
 */
export const EmojiText = observer(
  ({
    text,
    size,
    onHover,
  }: {
    text: string;
    size: number;
    /** Called with the picture under the pointer, and null when it leaves. */
    onHover?: (emoji: ChatEmoji | null, img: HTMLImageElement | null) => void;
  }) => {
    const enabled = GameOptions.chatEmojis;
    const segments = useMemo(
      () => (enabled ? emojiSegments(text, EMOJI_CATALOG) : [text]),
      [text, enabled]
    );

    if (segments.length === 1 && typeof segments[0] === 'string') return <>{segments[0]}</>;

    // `#root img` is sized 100% by the app stylesheet, so the size is inline.
    const style = { width: size, height: size };
    return (
      <>
        {segments.map((segment, i) =>
          typeof segment === 'string' ? (
            segment
          ) : (
            <img
              key={i}
              className="emoji-inline"
              src={segment.url}
              // What a copy of the line puts back.
              alt={`:${segment.code}:`}
              title={onHover ? undefined : `:${segment.code}:`}
              draggable={false}
              style={style}
              onMouseEnter={onHover && (e => onHover(segment, e.currentTarget))}
              onMouseLeave={onHover && (() => onHover(null, null))}
            />
          )
        )}
      </>
    );
  }
);
