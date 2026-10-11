import { describe, expect, it } from 'vitest';
import { hasNoticeLinks, parseNoticeLinks } from './noticeLinks';

// The noticeLinks improvement (ours): a notice's web addresses are links; nothing else is markup.
describe('parseNoticeLinks', () => {
  it('reads an anchor as its label and address', () => {
    expect(parseNoticeLinks('Join our <a href="https://discord.gg/mu">Discord</a>!')).toEqual([
      { text: 'Join our ' },
      { text: 'Discord', href: 'https://discord.gg/mu' },
      { text: '!' },
    ]);
  });

  it('links a bare web address too', () => {
    expect(parseNoticeLinks('See https://mu.example.com now')).toEqual([
      { text: 'See ' },
      { text: 'https://mu.example.com', href: 'https://mu.example.com/' },
      { text: ' now' },
    ]);
  });

  it('links only http(s) and shows any other markup as the text it is', () => {
    const evil = '<a href="javascript:alert(1)">x</a> <b>hi</b>';
    expect(hasNoticeLinks(evil)).toBe(false);
    expect(parseNoticeLinks(evil)).toEqual([{ text: evil }]);
    expect(hasNoticeLinks('no links here')).toBe(false);
  });
});
