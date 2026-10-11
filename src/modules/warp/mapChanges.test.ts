import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';
import { ENUM_WORLD } from '@/core/types';
import { onMapChanged } from './mapChanges';

describe('onMapChanged', () => {
  it('calls back with the map once it is up, until unsubscribed', () => {
    const seen: number[] = [];
    const off = onMapChanged(map => seen.push(map));
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_3NORIA });
    off();
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_2DEVIAS });
    expect(seen).toEqual([ENUM_WORLD.WD_3NORIA]);
  });
});
