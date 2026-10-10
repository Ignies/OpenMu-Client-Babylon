import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { TradeWindow } = await import('.');
const { Economy } = await import('@/modules/economy/economy');

// CNewUITrade updates and draws the partner's grid like any other (NewUITrade.cpp:121, :191), so
// its items show their tooltip; only a click on them does nothing.
describe('TradeWindow', () => {
  it('leaves the partner grid live under the pointer', () => {
    runInAction(() => {
      Economy.tradeOpen = true;
    });
    const html = renderToStaticMarkup(<TradeWindow />);
    expect(html).toContain('mu-item-grid');
    expect(html).not.toContain('busy');
  });
});
