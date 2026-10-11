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
