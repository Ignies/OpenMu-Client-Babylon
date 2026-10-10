import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { HeroSkills } = await import('./state');
const { isHotbarSkill } = await import('./skillCasting');
const { Session } = await import('../session');

describe('active master skills on the bar', () => {
  it('keeps only the passive tree entries and the siege commands off it (NewUIMainFrameWindow.cpp:2060)', () => {
    expect(isHotbarSkill(330)).toBe(true); // Twisting Slash Strengthener
    expect(isHotbarSkill(344)).toBe(true); // Blood Storm
    expect(isHotbarSkill(334)).toBe(false); // Maximum Life Increase, a passive
    expect(isHotbarSkill(68)).toBe(false);
    expect(isHotbarSkill(41)).toBe(true);
  });

  it('hands the replaced skill key and selection to the skill that replaces it', () => {
    const sent = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    HeroSkills.setSkillList([
      { index: 0, number: 19, level: 0 },
      { index: 1, number: 41, level: 0 },
    ]);
    HeroSkills.assignSkillHotkey(3, 41);
    HeroSkills.selectSkill(41);
    sent.mockClear();

    // OpenMU: SkillAdded for the Strengthener, then SkillRemoved for Twisting Slash.
    HeroSkills.addSkill({ index: 2, number: 330, level: 0 });
    HeroSkills.removeSkill(41);

    expect(HeroSkills.skillHotkeys[3]).toBe(330);
    expect(HeroSkills.skillHotkeys.filter(n => n === 330)).toHaveLength(1);
    expect(HeroSkills.savedSkillHotkeys[3]).toBe(330);
    expect(HeroSkills.currentSkill).toBe(330);
    expect(sent).toHaveBeenCalledOnce();
    sent.mockRestore();
  });
});
