import './style.less';
import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import type { Item } from '../../../ecs/world';
import { GameOptions } from '../../../common/gameOptions';
import { emojiSegments, type ChatEmoji } from '../../../common/chatEmojis';
import { scanItemLinks } from '../../../common/chatItemLinks';
import { EMOJI_CATALOG } from '../../../emojis';
import { ChatItemLink } from '../chatItemLink';

type Piece = string | ChatEmoji | { link: Item };

/** The line as text, emojis (with the option on) and item links, in order. */
function chatPieces(text: string, emojis: boolean): Piece[] {
  const pieces: Piece[] = [];
  const words = (part: string) => {
    if (part) pieces.push(...(emojis ? emojiSegments(part, EMOJI_CATALOG) : [part]));
  };
  let at = 0;
  for (const hit of scanItemLinks(text)) {
    words(text.slice(at, hit.start));
    pieces.push({ link: hit.item });
    at = hit.end;
  }
  words(text.slice(at));
  return pieces;
}

/**
 * A chat line with its emoji codes drawn as their pictures
 * (common/chatEmojis.ts) and its item links as the items' names
 * (common/chatItemLinks.ts). A line with neither is the plain text.
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
    const pieces = useMemo(() => chatPieces(text, enabled), [text, enabled]);

    if (pieces.length === 1 && typeof pieces[0] === 'string') return <>{pieces[0]}</>;

    // `#root img` is sized 100% by the app stylesheet, so the size is inline.
    const style = { width: size, height: size };
    return (
      <>
        {pieces.map((piece, i) =>
          typeof piece === 'string' ? (
            piece
          ) : 'link' in piece ? (
            <ChatItemLink key={i} item={piece.link} />
          ) : (
            <img
              key={i}
              className="emoji-inline"
              src={piece.url}
              // What a copy of the line puts back.
              alt={`:${piece.code}:`}
              title={onHover ? undefined : `:${piece.code}:`}
              draggable={false}
              style={style}
              onMouseEnter={onHover && (e => onHover(piece, e.currentTarget))}
              onMouseLeave={onHover && (() => onHover(null, null))}
            />
          )
        )}
      </>
    );
  }
);
