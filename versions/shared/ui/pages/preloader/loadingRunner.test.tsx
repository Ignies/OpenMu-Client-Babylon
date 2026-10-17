import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { LoadingRunner } = await import('./loadingRunner');

describe('the preloader runner bar', () => {
  it('moves the fill and the runner by transform, not by width or left', () => {
    const html = renderToStaticMarkup(<LoadingRunner progress={0.4} done={false} label="" />);
    expect(html).toContain('transform:scaleX(0.4)');
    expect(html).toContain('transform:translateX(40%)');
    expect(html).not.toMatch(/(width|left):40%/);
  });
});
