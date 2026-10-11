import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { Notices } from './notices';

// Notices measure text on a canvas; under node there is none, so it falls back to a width estimate.
const g = globalThis as Record<string, unknown>;

describe('guild notice', () => {
  beforeEach(() => {
    g.document = { createElement: () => ({ getContext: () => null }) };
    Notices.clear();
  });
  afterEach(() => {
    Notices.clear();
    delete g.document;
  });

  it('shows the translated prefix around the text, not the text key', () => {
    Notices.createGuildNotice('Meet at Lorencia');
    const text = Notices.lines.map(l => l.text).join(' ');
    expect(text).not.toContain('guild.notice.prefix');
    expect(text).toContain('Meet at Lorencia');
    expect(text).toContain(t('guild.notice.prefix').replace('%s', '').trim());
  });
});

describe('a notice with a link', () => {
  const long = 'Vote for the server every day and get a reward at <a href="https://vote.example.com/mu">our page</a>';

  beforeEach(() => {
    g.document = { createElement: () => ({ getContext: () => null }) };
    Notices.clear();
  });
  afterEach(() => {
    Notices.clear();
    setFidelityChoice(FIDELITY_DEFAULT, {});
    delete g.document;
  });

  // noticeLinks: cut in two, the line could split the link.
  it('stays whole with the noticeLinks improvement', () => {
    Notices.create(long);
    expect(Notices.lines.map(l => l.text)).toEqual([long]);
  });

  it('is cut like any other long line on Classic (CutText)', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    Notices.create(long);
    expect(Notices.lines).toHaveLength(2);
  });
});
