import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { gameVersion } from '@/version';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { BottomBar } = await import('.');

const features = gameVersion.features as { itemHotkeys: boolean };
const itemHotkeys = features.itemHotkeys;

const beltSlots = () => renderToStaticMarkup(<BottomBar />).split('consumable-item').length - 1;

describe('the bottom bar belt', () => {
  afterEach(() => {
    features.itemHotkeys = itemHotkeys;
  });

  it('draws the four Q/W/E/R slots for a version with item hot keys', () => {
    features.itemHotkeys = true;
    expect(beltSlots()).toBe(4);
  });

  it('draws no belt for a version without them', () => {
    features.itemHotkeys = false;
    expect(beltSlots()).toBe(0);
  });
});
