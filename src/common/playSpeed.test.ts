import { describe, expect, it } from 'vitest';
import { PlayerAction } from './objects/enum';
import { playerFrameSpeedScale, playerPlaySpeed } from './playSpeed';

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
});
