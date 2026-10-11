import { describe, expect, it, vi } from 'vitest';
import { autorun } from 'mobx';
import { liveItemIcon, liveItemIconKey, setLiveItemIcons } from '.';

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('the live item icon slot', () => {
  it('asks nothing and answers null while the app has not filled it', () => {
    setLiveItemIcons(null);
    expect(liveItemIcon({ group: 14, num: 15, lvl: 0 })).toBeNull();
  });

  it('asks the source once per look and hands its URL to an observer when it lands', async () => {
    const source = vi.fn(async (item: { group: number; num: number; lvl?: number }) => `blob:${item.group}_${item.num}_${item.lvl}`);
    setLiveItemIcons(source);
    const seen: (string | null)[] = [];
    const stop = autorun(() => seen.push(liveItemIcon({ group: 12, num: 26, lvl: 0 })));
    liveItemIcon({ group: 12, num: 26, lvl: 0 });
    expect(source).toHaveBeenCalledTimes(1);
    await settle();
    expect(seen).toEqual([null, 'blob:12_26_0']);
    // Another level is another look: its tint and, for a few items, its model.
    liveItemIcon({ group: 12, num: 26, lvl: 7 });
    expect(source).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keys by everything the picture depends on, and nothing else', () => {
    expect(liveItemIconKey({ group: 7, num: 53, lvl: 9, isExcellent: true, durability: 3 } as never)).toBe('7_53_9_e');
    expect(liveItemIconKey({ group: 7, num: 53, isAncient: true })).toBe('7_53_0_a');
  });

  it('answers null when the source fails, without asking again', async () => {
    const source = vi.fn(async () => {
      throw new Error('no model');
    });
    setLiveItemIcons(source);
    liveItemIcon({ group: 13, num: 95, lvl: 0 });
    await settle();
    expect(liveItemIcon({ group: 13, num: 95, lvl: 0 })).toBeNull();
    expect(source).toHaveBeenCalledTimes(1);
  });
});
