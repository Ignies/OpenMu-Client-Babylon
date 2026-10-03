import { describe, expect, it } from 'vitest';
import { PlayerAction } from '@versions/shared/objects/enum';
import { magicSpeedFactor, playerFrameSpeedScale, playerPlaySpeed } from './playSpeed';

describe('Dark Lord clip speeds', () => {
  it('holds the party teleport pose at a tenth after key 5.5', () => {
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_ATTACK_TELEPORT, 5, true)).toBe(1);
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_ATTACK_TELEPORT, 6, true)).toBe(0.1);
  });

  it('slows the Electric Spike charge on keys 1-3 for a Dark Lord only', () => {
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_SKILL_FLASH, 2, true)).toBe(0.5);
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_SKILL_FLASH, 2, false)).toBe(1);
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_SKILL_FLASH, 4, true)).toBe(1);
  });

  it('runs Earthshake and the ride clips at the original rates', () => {
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_DARKHORSE)).toBe(0.3);
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_RIDE_TELEPORT)).toBe(0.3);
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH)).toBe(0.4);
  });

  it('runs the command, strike and buff clips at the original rates', () => {
    expect(playerPlaySpeed(PlayerAction.PLAYER_SKILL_VITALITY)).toBe(0.34);
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_STRIKE)).toBe(0.25);
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_RIDE_STRIKE)).toBe(0.2);
    expect(playerPlaySpeed(PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_MAGIC)).toBe(0.3);
  });

  it('halves the command clip after key 6 for any class', () => {
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_SKILL_VITALITY, 6, false)).toBe(1);
    expect(playerFrameSpeedScale(PlayerAction.PLAYER_SKILL_VITALITY, 6.5, false)).toBe(0.5);
  });
});

describe('SetAttackSpeed stat factors', () => {
  it('steps MagicSpeed2 on the original ranges (ZzzCharacter.cpp:849-908)', () => {
    const cases: [number, number][] = [
      [0, 0],
      [300, 0.6],
      [470, 470 * 0.00247],
      [500, 1],
      [620, 620 * 0.0019],
      [650, 650 * 0.0018],
      [680, 680 * 0.0017],
      [900, 900 * 0.00163],
      [1100, 1100 * 0.00155],
      [1200, 2.4],
      [1400, 1400 * 0.00175],
      [1510, 1510 * 0.0015],
      [1600, 1600 * 0.00145],
      [1900, 1900 * 0.0013],
      [2100, 2100 * 0.00125],
      [2200, 2200 * 0.00115],
      [2500, 5],
      [3011, 3011 * 0.0009],
      [3012, 3012 * 0.00081],
    ];
    for (const [ms, factor] of cases) expect(magicSpeedFactor(ms)).toBeCloseTo(factor, 9);
  });
});
