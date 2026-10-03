import { describe, expect, it, vi } from 'vitest';
// Loads and registers every skill (the entry the goldens use: it keeps the import cycle in order).
import './skillVisuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import { combat } from '@/controllers/combat';
import { hasWarriorGlint } from '@/controllers/skills';
import { SKILL_EFFECTS } from '@/modules/skills/recipes';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
  // Data/ is not there under Node: a fetch never answers, so no texture or name loader rejects later.
  g.fetch = () => new Promise(() => {});
});

const IDS = Array.from({ length: 701 }, (_, i) => i);
const MOUNTS = ['uniria', 'dinorant', 'horse', 'fenrir'] as const;

// The skill-only cast rules the skill files declare, read back through the combat facade.
describe('skill cast rules', () => {
  it('only Defense is dropped on a mount: a Dark Horse rider (WSclient.cpp:3577-3582)', () => {
    const quiet = IDS.flatMap(id => MOUNTS.filter(m => combat.castQuietOn(id, m)).map(m => `${id}:${m}`));
    expect(quiet).toEqual(['18:horse']);
  });

  it('others see Electric Spike and its strengthener from a horse as the ground flash', () => {
    const seen = IDS.filter(id => combat.othersSeeClip(id, PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH) !== PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH);
    expect(seen).toEqual([65, 519]);
    expect(combat.othersSeeClip(65, PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH)).toBe(PlayerAction.PLAYER_SKILL_FLASH);
    expect(combat.othersSeeClip(65, PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH)).toBe(PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH);
  });

  it('Nova and Combo kills knock the body back; only Nova glows', () => {
    expect(IDS.filter(id => combat.skillKill(id)?.knock)).toEqual([40, 59]);
    expect(IDS.filter(id => combat.skillKill(id)?.dying)).toEqual([40]);
  });

  it('the warrior glint: the UseSkillWarrior casts, and Impale only from a mount (SkillCast.cpp:130)', () => {
    const glint = IDS.filter(id => hasWarriorGlint(id, false));
    expect(glint).toEqual([19, 20, 21, 22, 23, 41, 43, 44, 49, 55, 57, 326, 327, 328, 329, 330, 332, 336, 339, 342, 479, 481, 490]);
    expect(IDS.filter(id => hasWarriorGlint(id, true) && !glint.includes(id))).toEqual([47]);
  });

  it("Nova's file names the hold's two skill numbers", () => {
    expect(combat.novaSkill).toBe(40);
    expect(combat.novaBeginSkill).toBe(58);
  });

  it('no skill forces the 0xDB follow-up in this data copy', () => {
    expect(IDS.filter(id => combat.needsAreaHit({ num: id, type: 'AreaSkillAutomaticHits' } as never))).toEqual([]);
  });

  it('every skill that names a cancel effect is one the old table listed', () => {
    expect(Object.keys(SKILL_EFFECTS).map(Number).sort((a, b) => a - b)).toEqual([16, 18, 27, 28, 30, 35, 43, 232, 233, 234]);
  });
});
