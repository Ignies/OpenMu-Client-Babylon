import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { skills } = await import('.');
const { Hero } = await import('@/modules/hero');
const { Session } = await import('../session');
const { MagicEffectCancelRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

// CNewUIBuffWindow::UpdateMouseEvent (NewUIBuffWindow.cpp:240-253) and the two cancel boxes (NewUICommonMessageBox.cpp:1503-1580).
describe('cancelling a buff from the bar', () => {
  it('offers only Infinity Arrow and Expansion of Wizardry, by their base skill', () => {
    expect(skills.buffCancelSkill(6)).toBe(77);
    expect(skills.buffCancelSkill(82)).toBe(233);
    expect(skills.buffCancelSkill(1)).toBeNull();
    expect(skills.buffCancelSkill(143)).toBeNull();
  });

  it('sends MagicEffectCancelRequest with the skill and the hero', () => {
    const sent = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    runInAction(() => (Hero.playerId = 0x1234));
    skills.cancelBuff(77);
    const p = new MagicEffectCancelRequestPacket(sent.mock.calls[0][0]);
    expect(p.buffer.getUint8(2)).toBe(MagicEffectCancelRequestPacket.Code);
    expect(p.SkillId).toBe(77);
    expect(p.PlayerId).toBe(0x1234);
    sent.mockRestore();
  });
});
