import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { MuProgressBar } = await import('./progressBar');

describe('the loading screen bar', () => {
  it('moves by transform, not by width, so it animates while the main thread is busy', () => {
    const html = renderToStaticMarkup(<MuProgressBar progress={0.25} width={400} height={20} />);
    expect(html).toContain('transform:scaleX(0.25)');
    expect(html).toContain('transform:translateX(-75%)');
    expect(html).toContain('transform:translateX(75%)');
    expect(html).not.toMatch(/width:25%/);
  });

  it('clamps what it is given', () => {
    expect(renderToStaticMarkup(<MuProgressBar progress={3} width={400} height={20} />)).toContain('scaleX(1)');
    expect(renderToStaticMarkup(<MuProgressBar progress={Number.NaN} width={400} height={20} />)).toContain('scaleX(0)');
  });
});
