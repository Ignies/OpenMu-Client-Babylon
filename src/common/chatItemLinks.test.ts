import { beforeAll, describe, expect, it } from 'vitest';
import { i18n } from '../i18n';
import type { Item } from '../ecs/world';
import {
  ITEM_LINK_LENGTH,
  itemFromLink,
  itemLinkLabel,
  itemLinkToken,
  labelsToWire,
  scanItemLinks,
  stripItemLinks,
  uniqueLinkLabel,
  wireToLabels,
} from './chatItemLinks';
import { ChatLineType, classifyInboundChat } from './chat';
import { matchEmoteWord } from './emotes';
import { emojiSegments, buildEmojiCatalog } from './chatEmojis';

beforeAll(() => i18n.setLanguage('en'));

// Kris +7 with skill, luck, +12 and two excellent options.
const KRIS: Item = {
  group: 0,
  num: 0,
  lvl: 7,
  hasSkill: true,
  luck: true,
  optionLevel: 3,
  isExcellent: true,
  excellentFlags: 0b000101,
  durability: 20,
};

describe('itemLinkToken', () => {
  it('is 18 characters of plain ASCII no chat prefix reads as routing', () => {
    const token = itemLinkToken(KRIS);
    expect(token).toHaveLength(ITEM_LINK_LENGTH);
    expect(/^\{[A-Za-z0-9_-]{16}\}$/.test(token)).toBe(true);
    expect(classifyInboundChat(token)).toMatchObject({ type: ChatLineType.Chat, text: token });
  });

  it('reads back as the same item', () => {
    const back = itemFromLink(itemLinkToken(KRIS).slice(1, -1))!;
    expect(back).toMatchObject({
      group: 0,
      num: 0,
      lvl: 7,
      hasSkill: true,
      luck: true,
      optionLevel: 3,
      isExcellent: true,
      excellentFlags: 0b000101,
      durability: 20,
    });
  });

  it('keeps the 380 option, which only the server bytes carry', () => {
    const raw = Array.from({ length: 12 }, () => 0);
    raw[5] = 0x08;
    const back = itemFromLink(itemLinkToken({ ...KRIS, raw }).slice(1, -1))!;
    expect(back.raw![5] & 0x0f).toBe(0x08);
  });

  it('sends an item built without durability (the cash shop) as a new one', () => {
    const built = itemFromLink(itemLinkToken({ group: 12, num: 0, lvl: 0 }).slice(1, -1))!;
    expect(built.durability).toBeGreaterThan(0);
  });

  it('refuses bytes that are not an item this client knows', () => {
    expect(itemFromLink('____________________'.slice(0, 16))).toBeNull();
    expect(itemFromLink('not base64 at al')).toBeNull();
  });
});

describe('scanItemLinks', () => {
  it('finds each link in a line and leaves braces around other text alone', () => {
    const token = itemLinkToken(KRIS);
    const line = `wts ${token} or {offers}`;
    const hits = scanItemLinks(line);
    expect(hits).toHaveLength(1);
    expect(line.slice(hits[0].start, hits[0].end)).toBe(token);
    expect(hits[0].item.lvl).toBe(7);
  });

  it('is never read as an emoji code', () => {
    const catalog = buildEmojiCatalog({ './a/kris.webp': '/k.webp' });
    const line = `:kris: ${itemLinkToken(KRIS)}`;
    expect(emojiSegments(line, catalog).filter(s => typeof s !== 'string')).toHaveLength(1);
  });
});

describe('stripItemLinks', () => {
  it('keeps the bytes out of the emote words', () => {
    // A token that happens to spell "Hi".
    const line = `look {HiHiHiHiHiHiHiHi}`;
    expect(matchEmoteWord(line)).toBe('greeting');
    expect(stripItemLinks(line)).toBe('look');
  });
});

describe('labels in the chat box', () => {
  it('shows the item name and sends the link', () => {
    const token = itemLinkToken(KRIS);
    const label = itemLinkLabel(KRIS);
    expect(label).toBe('[Excellent Kris +7]');
    const links = new Map([[label, token]]);
    expect(labelsToWire(`wts ${label} 10kk`, links)).toBe(`wts ${token} 10kk`);
    // A label the player broke apart is only text.
    expect(labelsToWire('wts [Excellent Kris +', links)).toBe('wts [Excellent Kris +');
  });

  it('keeps two different items with one name apart', () => {
    const other = itemLinkToken({ ...KRIS, luck: false });
    const token = itemLinkToken(KRIS);
    const links = new Map([['[Excellent Kris +7]', token]]);
    expect(uniqueLinkLabel('[Excellent Kris +7]', token, links)).toBe('[Excellent Kris +7]');
    const second = uniqueLinkLabel('[Excellent Kris +7]', other, links);
    expect(second).toBe('[Excellent Kris +7 #2]');
    links.set(second, other);
    expect(labelsToWire('[Excellent Kris +7] or [Excellent Kris +7 #2]', links)).toBe(
      `${token} or ${other}`
    );
    const back = wireToLabels(`${token} or ${other}`);
    expect(back.text).toBe('[Excellent Kris +7] or [Excellent Kris +7 #2]');
  });

  it('turns a sent line back into names for the history keys', () => {
    const token = itemLinkToken(KRIS);
    const back = wireToLabels(`wts ${token}`);
    expect(back.text).toBe('wts [Excellent Kris +7]');
    expect(back.links.get('[Excellent Kris +7]')).toBe(token);
  });
});
