import { afterEach, describe, expect, it } from 'vitest';
import { GameOptions, setGameOption } from '../common/gameOptions';
import { BUS_VOLUME_MAX, busGain, busSilent, masterGain, trackGains } from './buses';

/**
 * The point of the defaults is that nothing changed: every category starts at
 * the top, where its gain is 1 and the master alone decides, exactly as the
 * one slider did before the mixer existed.
 */

type VolumeOption =
  | 'volume'
  | 'musicVolume'
  | 'effectsVolume'
  | 'monsterVolume'
  | 'ambientVolume';

const saved = new Map<VolumeOption, number>();

const set = (key: VolumeOption, value: number) => {
  if (!saved.has(key)) saved.set(key, GameOptions[key]);
  setGameOption(key, value);
};

afterEach(() => {
  for (const [key, value] of saved) setGameOption(key, value);
  saved.clear();
});

describe('sound buses', () => {
  it('is transparent at the defaults', () => {
    expect(busGain('music')).toBe(1);
    expect(busGain('effects')).toBe(1);
    expect(busGain('combat')).toBe(1);
    expect(busGain('monsters')).toBe(1);
    expect(busGain('ambient')).toBe(1);
    expect(busGain('steps')).toBe(1);
    expect(busGain('drops')).toBe(1);
    expect(busGain('ui')).toBe(1);
  });

  it('gives the unnamed bus a gain of 1 whatever the sliders say', () => {
    set('effectsVolume', 0);
    expect(busGain('world')).toBe(1);
  });

  it('reads the original slider curve for the master', () => {
    set('volume', 5);
    expect(masterGain()).toBe(0.5);
    set('volume', 0);
    expect(masterGain()).toBe(0);
  });

  it('folds the master into both track gains', () => {
    set('volume', 5);
    set('musicVolume', BUS_VOLUME_MAX / 2);

    expect(trackGains()).toEqual({ music: 0.25, effects: 0.5 });
  });

  it('silences one category without touching the others', () => {
    set('monsterVolume', 0);

    expect(busSilent('monsters')).toBe(true);
    expect(busSilent('combat')).toBe(false);
    expect(busSilent('ambient')).toBe(false);
    expect(trackGains().effects).toBe(masterGain());
  });
});
