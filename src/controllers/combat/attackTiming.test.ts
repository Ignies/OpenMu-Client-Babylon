import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../../core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import { attackTimingLayer, blowHeldTicks, releasesOnKey, startAttack } from './attackTiming';

const tick = () => attackTimingLayer.update!(ENUM_WORLD.WD_0LORENCIA, 1 / 25);

describe('attack timing', () => {
  it("remembers how long the hit request waited for the blow, while a kill can answer it", () => {
    attackTimingLayer.reset!();
    let sent = 0;
    // PlaySpeed 1: key 5 five ticks after the swing starts.
    startAttack(PlayerAction.PLAYER_ATTACK_FIST, 1, () => sent++);
    for (let i = 0; i < 5; i++) tick();
    expect(sent).toBe(1);
    expect(blowHeldTicks()).toBeCloseTo(5, 9);
    for (let i = 0; i < 26; i++) tick();
    expect(blowHeldTicks()).toBe(0);
  });

  it('releases casts on the key only for the clips AttackStage watches (PlayerActionState.h:13)', () => {
    expect(releasesOnKey(PlayerAction.PLAYER_SKILL_HAND1, false)).toBe(true);
    expect(releasesOnKey(PlayerAction.PLAYER_RIDE_SKILL, false)).toBe(true);
    expect(releasesOnKey(PlayerAction.PLAYER_SKILL_SLEEP, false)).toBe(false);
    expect(releasesOnKey(PlayerAction.PLAYER_STOP_MALE, false)).toBe(false);
  });
});
