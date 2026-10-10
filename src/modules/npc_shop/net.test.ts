import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Merchant } = await import('./state');
const { Economy } = await import('../economy/economy');
const { events } = await import('../events');
const { bloodCastleWindow } = await import('../events/bloodCastle');
const { Session } = await import('@/modules/session');
const { MuWindows } = await import('@/controllers/interface');
const { EventBus } = await import('@/core/eventBus');
const { CloseNpcRequestPacket, TradeCancelPacket } = await import('@versions/shared/packets/ClientToServerPackets');

installNet();

const sent: number[] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b.getUint8(2)));
const walk = () => EventBus.emit('heroWalked', {});

beforeEach(() => {
  runInAction(() => {
    Session.isOffline = false;
  });
  sent.length = 0;
});

// UpdateSendMoveInterface (NewUISystem.cpp:2025), called from SendMove (ZzzInterface.cpp:1876).
describe('a walk', () => {
  it('closes the merchant and the inventory with it', () => {
    Merchant.openNpcShop();
    walk();
    expect(Merchant.npcShop).toBeNull();
    expect(MuWindows.isOpen('inventory')).toBe(false);
    expect(sent).toContain(CloseNpcRequestPacket.Code);
  });

  it('closes the vault and the inventory with it', () => {
    Economy.openVault();
    walk();
    expect(Economy.vaultOpen).toBe(false);
    expect(MuWindows.isOpen('inventory')).toBe(false);
  });

  it('cancels a trade', () => {
    Economy.openTrade({ name: 'Partner', level: 10, guildId: 0 });
    walk();
    expect(sent).toContain(TradeCancelPacket.Code);
  });

  it('closes both personal shop windows', () => {
    runInAction(() => {
      Economy.myShopOpen = true;
      Economy.browsing = { playerId: 1, playerName: 'Seller', shopName: 'Shop', items: [] };
    });
    walk();
    expect(Economy.myShopOpen).toBe(false);
    expect(Economy.browsing).toBeNull();
  });

  it('closes an NPC entry window and tells the server', () => {
    events.openBloodCastle();
    walk();
    expect(bloodCastleWindow().open).toBe(false);
    expect(sent).toContain(CloseNpcRequestPacket.Code);
  });

  it('leaves the chaos machine open', () => {
    Economy.openMix();
    walk();
    expect(Economy.mixOpen).toBe(true);
    Economy.closeMix(false);
  });
});
