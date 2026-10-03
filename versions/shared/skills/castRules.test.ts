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
});

const IDS = Array.from({ length: 701 }, (_, i) => i);
const MOUNTS = ['uniria', 'dinorant', 'horse', 'fenrir'] as const;

// ReceiveMagicFinish (WSclient.cpp:3878-3987): skill -> the eBuffState it drops. Its `Value` is a BYTE
// (WSclient.h:220), so the master cases (>= 256) never match and are left out.
const MAGIC_FINISH: Record<number, number> = {
  1: 55, 7: 56, 16: 4, 27: 2, 28: 1, 38: 55, 39: 56, 48: 8, 51: 57, 53: 7, 55: 58, 64: 5,
  67: 61, 69: 9, 70: 18, 75: 19, 201: 2, 202: 4, 217: 71, 218: 81, 232: 86, 233: 82,
};

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

  it('only skills ReceiveMagicFinish handles name a cancel effect', () => {
    const extra = Object.keys(SKILL_EFFECTS).map(Number).filter(id => !(id in MAGIC_FINISH));
    expect(extra).toEqual([]);
  });

  it('each cancel effect is the buff ReceiveMagicFinish drops for that skill', () => {
    const wrong = Object.entries(SKILL_EFFECTS).filter(([id, effect]) => MAGIC_FINISH[+id] !== effect);
    expect(wrong).toEqual([]);
  });

  it('every skill ReceiveMagicFinish handles names its cancel effect', () => {
    const missing = Object.keys(MAGIC_FINISH).map(Number).filter(id => SKILL_EFFECTS[id] === undefined);
    expect(missing).toEqual([]);
  });
});
