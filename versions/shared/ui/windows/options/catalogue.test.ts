import { describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { CATEGORIES } = await import('./catalogue');
const { blockerOf } = await import('./gating');

const rows = CATEGORIES.flatMap(c => c.pages.flatMap(p => p.sections.flatMap(s => s.rows)));

// `/re on|off|auto` (ours) and this row are the same setting.
describe('the party invitations row', () => {
  it('picks ask (the classic prompt), decline or accept', () => {
    const row = rows.find(r => 'key' in r && r.key === 'partyInviteReply');
    if (!row || row.kind !== 'choice') throw new Error('no partyInviteReply choice row');
    expect(row.max).toBe(2);
    expect([0, 1, 2].map(row.display)).toEqual([
      t('options.partyInviteReply.ask'),
      t('options.partyInviteReply.decline'),
      t('options.partyInviteReply.accept'),
    ]);
  });
});

// Gameplay automation is the world's to allow (`server.json`): greyed and inert on the original.
describe('the automation rows', () => {
  it('do nothing where the server does not allow them', () => {
    for (const key of ['autoManaPotion', 'autoQuiver']) {
      const row = rows.find(r => 'key' in r && r.key === key);
      if (!row || row.kind !== 'toggle') throw new Error(`no ${key} toggle row`);
      expect(blockerOf(row.needs)?.text, key).toBe('options.needs.server');
    }
  });
});

// Ours: the Skill effects selector is the `enhancedSkillEffects` improvement shown as a choice by Item effects.
describe('the skill effects row', () => {
  it('sits next to Item effects as Original / Enhanced', async () => {
    const section = CATEGORIES.flatMap(c => c.pages.flatMap(p => p.sections)).find(s => s.titleKey === 'options.section.effects');
    const at = section?.rows.findIndex(r => r.kind === 'improvement' && r.id === 'enhancedSkillEffects') ?? -1;
    const row = section?.rows[at];
    if (!section || !row || row.kind !== 'improvement' || !row.choice) throw new Error('no skill effects choice row');
    expect(section.rows.slice(at - 2, at).map(r => ('key' in r ? r.key : r.kind))).toEqual(['itemEffects', 'effectLevel']);
    expect(row.choice.map(key => t(key))).toEqual(['Original', 'Enhanced']);
    const { optionKeyOf } = await import('./catalogue');
    // The World page's Restore defaults leaves the Fidelity choice alone.
    expect(optionKeyOf(row)).toBeNull();
  });

  it('writes the same override the Fidelity page check reads', async () => {
    const { setImprovement } = await import('./fidelity');
    const { GameOptions, setGameOption } = await import('@/controllers/settings');
    const { improvementOn, isOn } = await import('@/controllers/fidelity');
    await import('@versions/shared/improvements/all');
    const check = () => improvementOn('enhancedSkillEffects', GameOptions.fidelity, GameOptions.fidelityOverrides);
    try {
      expect([check(), isOn('enhancedSkillEffects')]).toEqual([true, true]);
      setImprovement('enhancedSkillEffects', false);
      expect([check(), isOn('enhancedSkillEffects')]).toEqual([false, false]);
    } finally {
      setGameOption('fidelityOverrides', {});
    }
  });
});
