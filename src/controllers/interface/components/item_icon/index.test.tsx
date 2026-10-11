import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { ItemIcon } = await import('.');

const BLADE = { group: 0, num: 5, lvl: 0 };

// RenderItem3D turns the item under the cursor (`Select`, ZzzInventory.cpp:8856-8859), pack icon or not.
describe('the item icon', () => {
  it('holds a canvas for the turning picture while hovered, over the still one until it draws', () => {
    const html = renderToStaticMarkup(<ItemIcon item={BLADE} spin />);
    expect(html).toContain('<canvas');
    expect(html).toContain('<img');
  });

  it('is the still picture alone otherwise', () => {
    expect(renderToStaticMarkup(<ItemIcon item={BLADE} />)).not.toContain('<canvas');
  });
});
