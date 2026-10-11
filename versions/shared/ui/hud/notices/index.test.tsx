import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { Notices } = await import('.');
const { Notices: NoticeStore } = await import('@/modules/chat/notices');

const NOTICE = 'Join our <a href="https://discord.gg/mu">Discord</a>';

/** A notice in; it measures its width on a canvas, which node has none of. */
function notice(text: string): void {
  const g = globalThis as Record<string, unknown>;
  g.document = { createElement: () => ({ getContext: () => null }) };
  NoticeStore.create(text);
  delete g.document;
}

describe('the notice banner', () => {
  afterEach(() => {
    NoticeStore.clear();
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  // noticeLinks: one text run per line, its link a span of its own.
  it('draws a notice link as an underlined link', () => {
    notice(NOTICE);
    const html = renderToStaticMarkup(<Notices />);
    expect(html).toContain('class="notice-link"');
    expect(html).toContain('>Discord</span>');
    expect(html).not.toContain('&lt;a href');
    expect(html.split('class="mu-text').length - 1).toBe(1);
  });

  it('draws the markup as plain text on Classic, as the original', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    notice(NOTICE);
    const html = renderToStaticMarkup(<Notices />);
    expect(html).not.toContain('notice-link');
    expect(html).toContain('href=&quot;https://discord.gg/mu&quot;&gt;Discord&lt;/a&gt;');
  });
});
