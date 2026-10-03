import { afterEach, describe, expect, it, vi } from 'vitest';
// Loads and registers every skill (the entry the goldens use: it keeps the import cycle in order).
import '../skillVisuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import { skillClip } from '@/controllers/combat/skillClips';
import { clipCastSound, hasClipSound } from '@/controllers/sound/combat';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// SkillCast.cpp:915-931: the three party buffs toss a coin once, and the clip and the
// sound come from the same toss (ATT_UP with Buff_1, HP_UP with Buff_2).
describe('rage fighter party buff sound', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const skill of [266, 267, 268]) {
    it(`pairs skill ${skill}'s sound with the clip the toss picked`, () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const first = skillClip(skill)!;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      const second = skillClip(skill)!;
      expect(first).toBe(PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES);
      expect(second).toBe(PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES);
      expect(hasClipSound(skill)).toBe(true);
      expect(clipCastSound(skill, first)).toBe('Sound/Ragefighter/Rage_Buff_1');
      expect(clipCastSound(skill, second)).toBe('Sound/Ragefighter/Rage_Buff_2');
    });
  }

  it('has no opinion on other skills', () => {
    expect(hasClipSound(41)).toBe(false);
    expect(clipCastSound(41, PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES)).toBeNull();
  });
});
