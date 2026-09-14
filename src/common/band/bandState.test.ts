import { describe, expect, it } from 'vitest';
import {
  ALL_CHANNELS,
  canRender,
  masterMask,
  ownersOf,
  takenChannels,
  withMember,
  withoutMember,
  type BandState,
} from './bandState';

describe('band state', () => {
  const solo: BandState = { masterId: 7, members: [] };
  const band = withMember(withMember(solo, { netId: 8, instrument: 'flute', channelMask: 0b0110 }), {
    netId: 9,
    instrument: 'ocarina',
    channelMask: 0b1000,
  });

  it('has the master alone on every channel when nobody joined', () => {
    for (let c = 0; c < 16; c++) expect(ownersOf(solo, c)).toEqual([7]);
    expect(masterMask(solo)).toBe(ALL_CHANNELS);
  });

  it('doubles a channel on every member holding it, the master always first', () => {
    expect(ownersOf(band, 0)).toEqual([7]);
    expect(ownersOf(band, 1)).toEqual([7, 8]);
    expect(ownersOf(band, 2)).toEqual([7, 8]);
    expect(ownersOf(band, 3)).toEqual([7, 9]);
    expect(takenChannels(band)).toBe(0b1110);
    // A band takes nothing from the master.
    expect(masterMask(band)).toBe(ALL_CHANNELS);
  });

  it('replaces a member who rejoins and drops one who leaves', () => {
    const again = withMember(band, { netId: 8, instrument: 'guitar', channelMask: 0b1 });
    expect(again.members).toHaveLength(2);
    expect(ownersOf(again, 0)).toEqual([7, 8]);
    expect(ownersOf(again, 1)).toEqual([7]);
    expect(withoutMember(again, 8).members.map(m => m.netId)).toEqual([9]);
  });

  it('keeps the percussion channel silent until an instrument renders it', () => {
    expect(canRender('guitar', 0)).toBe(true);
    expect(canRender('guitar', 9)).toBe(false);
    expect(canRender('flute', 9)).toBe(false);
  });
});
