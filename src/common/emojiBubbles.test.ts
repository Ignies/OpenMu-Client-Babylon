import { describe, expect, it } from 'vitest';
import {
  EMOJI_BUBBLES,
  RESERVED_CHAT_PREFIXES,
  emojiBubbleToken,
  matchEmojiBubbleWord,
} from './emojiBubbles';
import { ChatLineType, classifyInboundChat } from './chat';

describe('emoji bubble tokens', () => {
  // A token opening with one of these is routed by the server (party, guild,
  // alliance, gens, global notification, command) instead of reaching the
  // players around the sender, so the bubble would show for the sender alone.
  it('never open with a prefix the server reads as routing', () => {
    for (const bubble of EMOJI_BUBBLES) {
      for (const word of bubble.words) {
        for (const prefix of RESERVED_CHAT_PREFIXES) {
          expect(
            word.startsWith(prefix),
            `${bubble.id} token ${JSON.stringify(word)} opens with ${prefix}`
          ).toBe(false);
        }
      }
    }
  });

  it('are unique across the table', () => {
    const words = EMOJI_BUBBLES.flatMap(b => b.words.map(w => w.toLowerCase()));
    expect(new Set(words).size).toBe(words.length);
  });

  it('are ASCII, since packet strings are one byte per character', () => {
    for (const bubble of EMOJI_BUBBLES) {
      for (const word of bubble.words) {
        expect(/^[\x20-\x7e]+$/.test(word), `${bubble.id}: ${word}`).toBe(true);
      }
    }
  });

  it('survive the round trip the wheel puts them through', () => {
    for (const bubble of EMOJI_BUBBLES) {
      const line = classifyInboundChat(emojiBubbleToken(bubble.id));
      expect(line.type).toBe(ChatLineType.Chat);
      expect(matchEmojiBubbleWord(line.text)).toBe(bubble.id);
    }
  });
});
