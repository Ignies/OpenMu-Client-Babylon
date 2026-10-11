import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { gameVersion } from '@/version';
import type { ItemHotkeys } from '@/version/contract';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { BottomBar } = await import('.');

const features = gameVersion.features as { itemHotkeys: ItemHotkeys };
const itemHotkeys = features.itemHotkeys;

const beltSlots = () => renderToStaticMarkup(<BottomBar />).split('consumable-item').length - 1;

describe('the bottom bar belt', () => {
  afterEach(() => {
    features.itemHotkeys = itemHotkeys;
  });

  it('draws the four Q/W/E/R slots on Season 6', () => {
    expect(beltSlots()).toBe(4);
  });

  it('draws only the slots the version has', () => {
    // 0.97d: Q, W and E.
    features.itemHotkeys = { slots: 3, bindable: false };
    expect(beltSlots()).toBe(3);
  });

  it('draws no belt for a version without one', () => {
    features.itemHotkeys = { slots: 0, bindable: false };
    expect(beltSlots()).toBe(0);
  });
});
