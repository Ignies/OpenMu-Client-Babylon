import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { createHash } from 'node:crypto';
import { EventBus } from '@/core/eventBus';
import '@/app/logic';

// Pins every packet's listeners and their order once the app has loaded (the order modules
// install in is the order listeners run for a packet several modules handle). Whitespace and
// vitest's numbered import aliases are ignored, so moving an import does not change the hash.
const LISTENERS_HASH = '6fe5ae99f8e0839b595cc9b38e2be114f497fd8d';

const source = (handler: unknown) =>
  String(handler)
    .replace(/\(0,\s*__vite_ssr_import_\d+__\.(\w+)\)/g, '$1')
    .replace(/__vite_ssr_import_\d+__\./g, '')
    .replace(/__vite_ssr_dynamic_import__/g, 'import')
    .replace(/\s+/g, '');

describe('packet listeners', () => {
  it('are the same functions in the same order', () => {
    const rows = [...EventBus.all.entries()]
      .map(([event, handlers]) => [String(event), (handlers as unknown[]).map(h => createHash('sha1').update(source(h)).digest('hex').slice(0, 10))] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    const hash = createHash('sha1').update(JSON.stringify(rows)).digest('hex');
    expect(hash).toBe(LISTENERS_HASH);
  });
});
