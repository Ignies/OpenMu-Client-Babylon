import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { assetDownload } from '@/controllers/assets/assetDownload';
import { AutoDownload } from '.';

const set = (state: UIState, running: boolean) =>
  runInAction(() => {
    AppState.uiState = state;
    assetDownload.running = running;
  });

afterEach(() => set(UIState.Preloader, false));

describe('the first-run download (AutoDownload)', () => {
  it('draws nothing on the worlds page or while nothing downloads', () => {
    set(UIState.Preloader, true);
    expect(renderToStaticMarkup(<AutoDownload />)).toBe('');
    set(UIState.Login, false);
    expect(renderToStaticMarkup(<AutoDownload />)).toBe('');
  });

  it('covers the login with the screen while the essentials download', () => {
    set(UIState.Login, true);
    const html = renderToStaticMarkup(<AutoDownload />);
    expect(html).toContain('auto-download-screen');
    expect(html).toContain('Preparing your adventure');
    expect(html).toContain('Enter anyway');
  });
});
