import { describe, expect, it } from 'vitest';
import { applyWeaponAttachments, applyWeaponPoses, BACK_BONE, RIGHT_HAND_BONE } from './weaponAttachment';
import type { PlayerObject } from './playerObject';
import { CharacterClassNumber } from '../../core/types';
import { PlayerAction } from '@versions/shared/objects/enum';

/** The bone each weapon slot is linked to and the pose it runs. */
function attach(leftHand: { group: number; num: number } | null, rightHand: typeof leftHand, bindBack: boolean) {
  const part = () => ({ bone: 0, pose: undefined as unknown, setBoneLink(b: number) { this.bone = b; }, setPartPose(p: unknown) { this.pose = p; } });
  const player = { Weapon1: part(), Weapon2: part(), PhoenixWing1: part(), PhoenixWing2: part() };
  const hands = { leftHand, rightHand, charClass: CharacterClassNumber.RageFighter };
  applyWeaponAttachments(player as unknown as PlayerObject, hands, bindBack);
  applyWeaponPoses(player as unknown as PlayerObject, hands, bindBack, PlayerAction.PLAYER_STOP_MALE, 1);
  return player;
}

const SACRED_GLOVE = { group: 0, num: 32 };
const PHOENIX_SOUL_STAR = { group: 0, num: 35 };

describe('a Rage Fighter glove weapon', () => {
  it('links to no bone in either hand: it is drawn on the body skeleton (RenderSwordformGloves, MonkSystem.cpp:248-252)', () => {
    const { Weapon1, Weapon2 } = attach(SACRED_GLOVE, PHOENIX_SOUL_STAR, false);
    expect([Weapon1.bone, Weapon2.bone]).toEqual([-1, -1]);
  });

  it('never goes on the back in town: the back pass draws it on the body too (ZzzCharacter.cpp:15349-15350)', () => {
    const { Weapon1, Weapon2 } = attach(SACRED_GLOVE, SACRED_GLOVE, true);
    expect([Weapon1.bone, Weapon2.bone]).toEqual([-1, -1]);
  });

  it('runs no clip of its own: the body poses it', () => {
    const { Weapon1, Weapon2 } = attach(SACRED_GLOVE, PHOENIX_SOUL_STAR, true);
    expect([Weapon1.pose, Weapon2.pose]).toEqual([null, null]);
  });

  it('leaves a common weapon in the hand and on the back', () => {
    expect(attach({ group: 0, num: 1 }, null, false).Weapon1.bone).toBe(RIGHT_HAND_BONE);
    expect(attach({ group: 0, num: 1 }, null, true).Weapon1.bone).toBe(BACK_BONE);
  });
});
