import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { packetDefinitionsOfCode } = await import('./createSocket');

describe('personal shop list: 0x05 answers a request, 0x13 is the refresh after a sale', () => {
  const subCodes = (name: string) =>
    packetDefinitionsOfCode(0x3f)
      .filter(p => p.Name === name)
      .map(p => (p as { SubCode?: number }).SubCode);

  it('registers the refresh sub-code under the same packet name as the first list', () => {
    expect(subCodes('PlayerShopItemList')).toEqual(expect.arrayContaining([0x05, 0x13]));
  });

  it('leaves the other 0x3F packets alone', () => {
    expect(subCodes('PlayerShopBuyResult')).toEqual([0x06]);
    expect(subCodes('ClosePlayerShopDialog')).toEqual([0x12]);
  });
});
