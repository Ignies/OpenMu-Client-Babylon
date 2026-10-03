import { describe, expect, it } from 'vitest';
import { PlayerAction } from '@versions/shared/objects/enum';
import { registerSkillRules } from './skillRules';
import {
  castQuietOn,
  castSwing,
  castsAsSpell,
  othersSeeClip,
  poseClip,
  skillClip,
  swordCountRule,
} from './skillClips';
import { clipHoldsFacing, skillStepIn } from './skillMovement';
import { needsAreaHit } from './areaHit';
import { skillKill } from './skillKills';
import { SHOCK_IMMUNE_CLIPS } from './recipes';
import type { SkillDefinition } from '@versions/shared/skills/skillsDatabase';

// A skill number no real skill uses, so the tables start empty for it.
const ID = 9001;
const A = PlayerAction;

describe('registerSkillRules', () => {
  const layers: unknown[] = [];
  const kill = { knock: true };
  registerSkillRules(
    ID,
    {
      clip: () => A.PLAYER_SKILL_RIDER_FLY,
      poseClip: pose => (pose.swordCount % 2 ? A.PLAYER_ATTACK_TWO_HAND_SWORD3 : null),
      swing: 'highBow',
      swordCount: false,
      castsAsSpell: true,
      othersSee: { [A.PLAYER_ATTACK_RIDE_ATTACK_FLASH]: A.PLAYER_SKILL_FLASH },
      quietOn: ['horse'],
      noFlinch: [A.PLAYER_SKILL_DRAGONLORE],
      holdsFacing: [A.PLAYER_SKILL_GIANTSWING],
      stepIn: 'midClip',
      explicitHits: true,
      kill,
      combat: { layer: { name: 'test' } },
    },
    layer => layers.push(layer)
  );

  it('fills every combat table the readers use', () => {
    const pose = { hands: undefined, baseClass: 0, swordCount: 1 };
    expect(skillClip(ID)).toBe(A.PLAYER_SKILL_RIDER_FLY);
    expect(poseClip(ID, pose)).toBe(A.PLAYER_ATTACK_TWO_HAND_SWORD3);
    expect(poseClip(ID, { ...pose, swordCount: 2 })).toBeNull();
    expect(castSwing(ID)).toBe('highBow');
    expect(swordCountRule(ID)).toBe(false);
    expect(castsAsSpell(ID)).toBe(true);
    expect(othersSeeClip(ID, A.PLAYER_ATTACK_RIDE_ATTACK_FLASH)).toBe(A.PLAYER_SKILL_FLASH);
    expect(othersSeeClip(ID, A.PLAYER_SKILL_FLASH)).toBe(A.PLAYER_SKILL_FLASH);
    expect(castQuietOn(ID, 'horse')).toBe(true);
    expect(castQuietOn(ID, 'fenrir')).toBe(false);
    expect(castQuietOn(ID, null)).toBe(false);
    expect(SHOCK_IMMUNE_CLIPS.has(A.PLAYER_SKILL_DRAGONLORE)).toBe(true);
    expect(clipHoldsFacing(A.PLAYER_SKILL_GIANTSWING)).toBe(true);
    expect(skillStepIn(ID)).toBe('midClip');
    expect(needsAreaHit({ num: ID, type: 'AreaSkillAutomaticHits' } as SkillDefinition)).toBe(true);
    expect(skillKill(ID)).toBe(kill);
    expect(layers).toHaveLength(1);
  });

  it('leaves a skill with no rules to the generic paths', () => {
    expect(skillClip(ID + 1)).toBeNull();
    expect(poseClip(ID + 1, { hands: undefined, baseClass: 0, swordCount: 1 })).toBeNull();
    expect(castSwing(ID + 1)).toBeNull();
    expect(swordCountRule(ID + 1)).toBeUndefined();
    expect(castsAsSpell(ID + 1)).toBe(false);
    expect(castQuietOn(ID + 1, 'horse')).toBe(false);
    expect(skillKill(ID + 1)).toBeUndefined();
  });
});
