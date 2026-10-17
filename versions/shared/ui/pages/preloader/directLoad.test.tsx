import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.stubGlobal('location', { search: '?direct', hostname: 'localhost', href: 'http://localhost/?direct' });
const { DirectLoadPage, directLoadPlan } = await import('./directLoad');
const { assetDownload } = await import('@/controllers/assets/assetDownload');

afterEach(() =>
  runInAction(() => {
    assetDownload.progress = 0;
  })
);

describe('the ?direct page (DirectLoadPage)', () => {
  it('shows only the loading bar while it works', () => {
    runInAction(() => {
      assetDownload.progress = 0.42;
    });
    const html = renderToStaticMarkup(<DirectLoadPage fallback={<i>worlds</i>} />);
    expect(html).toContain('42%');
    expect(html).not.toContain('worlds');
  });

  it('downloads everything only where the world ships lighter assets and the player reads them', async () => {
    const preload = vi.fn(async () => 'done' as const);
    expect(await directLoadPlan(async () => false, preload)).toBe('original');
    expect(preload).not.toHaveBeenCalled();
    expect(await directLoadPlan(async () => true, preload)).toBe('done');
    expect(await directLoadPlan(async () => true, async () => 'failed' as const)).toBe('failed');
  });
});
