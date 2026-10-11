import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { Economy, MIX_TYPE } = await import('./economy');
const { ItemCraftingResultCraftingResultEnum: E } = await import('@versions/shared/packets/ServerToClientPackets');
const { loadMixRecipes } = await import('@/controllers/assets');
const { MsgBox } = await import('@/controllers/interface/msgWin');
const { Session } = await import('@/modules/session');
const { Hero } = await import('@/modules/hero');
const { Social } = await import('@/modules/social/social');
const { t } = await import('@/i18n');

const MIX = 'Data/Local/mix.bmd';

const jewel = { group: 12, id: 15 } as unknown as Item;
const fillTray = () =>
  runInAction(() => {
    Economy.mixOpen = true;
    Economy.mixPending = true;
    Economy.mixItems[0] = jewel;
  });

// ReceiveMixExtended (WSclient.cpp:6796-6831): only a success replaces the tray, and a failed
// mix is emptied by the server's list (:1750-1754); a refusal leaves the items where they are and
// finishes the mix (MIX_FINISHED) unless it was the zen (MIX_READY).
describe('Economy.craftingResult', () => {
  it('keeps the tray but locks the window when the machine refuses the mix', () => {
    for (const refusal of [E.TooManyItems, E.CharacterLevelTooLow, E.LackingMixItems, E.IncorrectMixItems, E.InvalidItemLevel, E.CharacterClassTooLow, E.IncorrectBloodCastleItems]) {
      fillTray();
      Economy.craftingResult(refusal, null);
      expect(Economy.mixItems[0]).toMatchObject({ group: 12, id: 15 });
      expect(Economy.mixPending).toBe(false);
      expect(Economy.mixResult, String(refusal)).toBe('refused');
      expect(Economy.mixAccepts(jewel)).toBe(false);
    }
  });

  it('leaves the window ready when the zen was short', () => {
    for (const refusal of [E.NotEnoughMoney, E.NotEnoughMoneyForBloodCastle]) {
      fillTray();
      Economy.craftingResult(refusal, null);
      expect(Economy.mixResult).toBeNull();
    }
  });

  it('empties the tray on a failed mix', () => {
    fillTray();
    Economy.craftingResult(E.Failed, null);
    expect(Economy.mixItems.some(Boolean)).toBe(false);
    expect(Economy.mixResult).toBe('failed');
  });

  it('puts the result in the tray on a success', () => {
    fillTray();
    const wings = { group: 12, id: 0 } as unknown as Item;
    Economy.craftingResult(E.Success, wings);
    expect(Economy.mixItems.filter(Boolean)).toMatchObject([{ group: 12, id: 0 }]);
    expect(Economy.mixResult).toBe('success');
  });
});

// CNewUIMixInventory::Mix (NewUIMixInventory.cpp:802-840): the recipe Mix.bmd matches is confirmed
// and its m_iMixID goes out; no matching recipe stays on this side.
describe.skipIf(!existsSync(MIX))('the mix button', () => {
  loadMixRecipes(new Uint8Array(readFileSync(MIX)));
  const sent: DataView[] = [];
  vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b));
  const confirm = vi.spyOn(MsgBox, 'popUpMsgWin').mockImplementation((_code, _arg, onOk) => onOk?.(''));
  const refuse = vi.spyOn(Social, 'errorMessage').mockImplementation(() => undefined);
  const tray = (...items: Item[]) =>
    runInAction(() => {
      Session.isOffline = false;
      Hero.money = 10_000_000;
      Hero.level = 400;
      Economy.mixOpen = true;
      Economy.mixPending = false;
      Economy.mixResult = null;
      Economy.mixItems = Economy.mixItems.map((_, i) => items[i] ?? null);
      sent.length = 0;
    });

  it('confirms the fruit recipe and sends its mix id', () => {
    tray({ group: 14, num: 22, durability: 1 }, { group: 12, num: 15, durability: 1 });
    Economy.mix();
    expect(confirm).toHaveBeenCalled();
    expect(sent.map(b => b.getUint8(3))).toEqual([6]);
    expect(Economy.mixPending).toBe(true);
  });

  it('sends nothing when no recipe matches', () => {
    tray({ group: 12, num: 15, durability: 1 });
    Economy.mix();
    expect(sent).toEqual([]);
    expect(refuse).toHaveBeenLastCalledWith(t('chaos.lackItems'));
  });
});

// GetMixStorageType (MixMgr.cpp:1153-1186): each tray moves items under its own storage byte, which
// OpenMU's MoveItemAction checks against the open NPC (Storages.SeedCrafting = 11 ... SeedUnmountCrafting = 14).
describe('the tray storage byte', () => {
  it('follows the mix type', () => {
    const storage = (type: number) => {
      runInAction(() => (Economy.mixInventoryType = type));
      return Economy.mixWireStorage;
    };
    expect([0, 1, 2, 8, 10, 11, 12, 13].map(storage)).toEqual([3, 3, 3, 9, 11, 12, 13, 14]);
  });
});

// CSeedMasterMenuMsgBox / CSeedInvestigatorMenuMsgBox (NewUICustomMessageBox.cpp:6292-6600).
describe('the seed NPC menus', () => {
  const sent: number[] = [];
  beforeEach(() => void vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b.getUint8(2))));

  it('open the tray as the mix type picked', () => {
    Economy.openSeedMenu('master');
    expect(Economy.seedMenu).toBe('master');
    Economy.chooseSeedMix(MIX_TYPE.seedSphere);
    expect(Economy.seedMenu).toBeNull();
    expect(Economy.mixOpen).toBe(true);
    expect(Economy.mixInventoryType).toBe(MIX_TYPE.seedSphere);
    expect(Economy.mixWireStorage).toBe(12);
    Economy.closeMix(false);
  });

  it('Close tells the server the crafting dialog is closed', () => {
    runInAction(() => (Session.isOffline = false));
    sent.length = 0;
    Economy.openSeedMenu('researcher');
    Economy.closeSeedMenu();
    expect(Economy.seedMenu).toBeNull();
    expect(sent).toEqual([0x87]);
  });
});

// CNewUIMixInventory::Mix (NewUIMixInventory.cpp:843-890): the socket the seed sphere goes in, or comes
// out of, is picked from the list and sent as the mix sub type (OpenMU MountSeedSphereCrafting: socketSlot).
describe.skipIf(!existsSync(MIX))('the seed researcher tray', () => {
  loadMixRecipes(new Uint8Array(readFileSync(MIX)));
  const sent: DataView[] = [];
  let refuse = vi.fn();
  beforeEach(() => {
    refuse = vi.fn();
    vi.spyOn(Social, 'errorMessage').mockImplementation(refuse);
    vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b));
    vi.spyOn(MsgBox, 'popUpMsgWin').mockImplementation((_code, _arg, onOk) => onOk?.(''));
  });
  /** A socket sword (0/26) with these socket bytes; 0xFE is empty, `seed + (level - 1) * 50` a sphere. */
  const sword = (...sockets: number[]): Item => ({ group: 0, num: 26, lvl: 0, durability: 50, socketCount: sockets.length, sockets });
  const FIRE_SPHERE_1: Item = { group: 12, num: 100, lvl: 0, durability: 1 };
  const chaos: Item = { group: 12, num: 15, durability: 1 };
  const creation: Item = { group: 14, num: 22, durability: 1 };
  const open = (type: number, ...items: Item[]) =>
    runInAction(() => {
      Session.isOffline = false;
      Hero.money = 10_000_000;
      Hero.level = 400;
      Economy.openSeedMenu('researcher');
      Economy.chooseSeedMix(type);
      Economy.mixItems = Economy.mixItems.map((_, i) => items[i] ?? null);
      sent.length = 0;
    });
  const mixSent = () => sent.map(b => [b.getUint8(2), b.getUint8(3), b.getUint8(4)]);

  it('wants a socket picked first, then mounts the sphere in it', () => {
    open(MIX_TYPE.attachSocket, sword(0xfe, 0xfe, 0xfe), FIRE_SPHERE_1, chaos, creation);
    Economy.mix();
    expect(refuse).toHaveBeenLastCalledWith(t('chaos.selectSocket'));
    expect(sent).toEqual([]);

    Economy.selectMixSocket(1);
    Economy.mix();
    expect(mixSent()).toEqual([[0x86, 44, 1]]);
    Economy.closeMix(false);
  });

  it('refuses a socket already holding a sphere, and a second sphere of the same kind', () => {
    open(MIX_TYPE.attachSocket, sword(0xfe, 10, 0xfe), FIRE_SPHERE_1, chaos, creation);
    Economy.selectMixSocket(1);
    Economy.mix();
    expect(refuse).toHaveBeenLastCalledWith(t('chaos.socketApplied'));

    open(MIX_TYPE.attachSocket, sword(0xfe, 0, 0xfe), FIRE_SPHERE_1, chaos, creation);
    Economy.selectMixSocket(0);
    Economy.mix();
    expect(refuse).toHaveBeenLastCalledWith(t('chaos.sameSphere'));
    expect(sent).toEqual([]);
    Economy.closeMix(false);
  });

  it('destroys only a sphere that is there', () => {
    open(MIX_TYPE.detachSocket, sword(0xfe, 60));
    Economy.selectMixSocket(0);
    Economy.mix();
    expect(refuse).toHaveBeenLastCalledWith(t('chaos.noDestructible'));

    Economy.selectMixSocket(1);
    Economy.mix();
    expect(mixSent()).toEqual([[0x86, 45, 1]]);
    Economy.closeMix(false);
  });
});
