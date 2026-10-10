import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { Economy } = await import('./economy');
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
// mix is emptied by the server's list (:1750-1754); a refusal leaves the items where they are.
describe('Economy.craftingResult', () => {
  it('keeps the tray when the machine refuses the mix', () => {
    fillTray();
    Economy.craftingResult(E.IncorrectMixItems, null);
    expect(Economy.mixItems[0]).toMatchObject({ group: 12, id: 15 });
    expect(Economy.mixPending).toBe(false);
    expect(Economy.mixResult).toBeNull();
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
