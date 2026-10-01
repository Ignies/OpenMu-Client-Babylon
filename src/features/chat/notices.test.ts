import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
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
