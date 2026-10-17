import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { WARM_DELAY_MS, WARM_MAPS, townPrefetch } from './townPrefetch';

afterEach(() => vi.useRealTimers());

describe('the town terrain prefetch', () => {
  it('fetches the other warm maps once, a little after the first map in the world', () => {
    vi.useFakeTimers();
    const prefetch = vi.fn();
    let inWorld = false;
    const onWarp = townPrefetch(() => inWorld, () => ENUM_WORLD.WD_0LORENCIA, prefetch);

    onWarp(); // the character screen: not yet
    vi.advanceTimersByTime(WARM_DELAY_MS);
    expect(prefetch).not.toHaveBeenCalled();

    inWorld = true;
    onWarp();
    onWarp();
    vi.advanceTimersByTime(WARM_DELAY_MS - 1);
    expect(prefetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(prefetch.mock.calls.map(c => c[0])).toEqual(WARM_MAPS.filter(m => m !== ENUM_WORLD.WD_0LORENCIA));
  });
});
