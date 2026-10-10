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
