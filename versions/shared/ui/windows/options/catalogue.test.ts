import { describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { CATEGORIES } = await import('./catalogue');

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
