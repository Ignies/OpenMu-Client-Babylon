import { describe, expect, it } from 'vitest';
import {
  ALL_CHANNELS,
  canRender,
  masterMask,
  ownerOf,
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

  it('gives every channel to the master when nobody took one', () => {
    for (let c = 0; c < 16; c++) expect(ownerOf(solo, c)).toBe(7);
    expect(masterMask(solo)).toBe(ALL_CHANNELS);
  });

  it('routes a taken channel to the member and the rest to the master', () => {
    expect(ownerOf(band, 1)).toBe(8);
    expect(ownerOf(band, 2)).toBe(8);
    expect(ownerOf(band, 3)).toBe(9);
    expect(ownerOf(band, 0)).toBe(7);
    expect(takenChannels(band)).toBe(0b1110);
    expect(masterMask(band)).toBe(ALL_CHANNELS & ~0b1110);
  });

  it('replaces a member who rejoins and drops one who leaves', () => {
    const again = withMember(band, { netId: 8, instrument: 'guitar', channelMask: 0b1 });
    expect(again.members).toHaveLength(2);
    expect(ownerOf(again, 0)).toBe(8);
    expect(ownerOf(again, 1)).toBe(7);
    expect(withoutMember(again, 8).members.map(m => m.netId)).toEqual([9]);
  });

  it('keeps the percussion channel silent until an instrument renders it', () => {
    expect(canRender('guitar', 0)).toBe(true);
    expect(canRender('guitar', 9)).toBe(false);
    expect(canRender('flute', 9)).toBe(false);
  });
});
