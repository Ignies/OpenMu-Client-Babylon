import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { createHash } from 'node:crypto';
import { EventBus } from '@/core/eventBus';
import '@/app/store';

// Pins every packet's listeners and their order once the app has loaded (the order modules
// install in is the order listeners run for a packet several modules handle). Whitespace is ignored.
const LISTENERS_HASH = 'e95307bfa9ecca3fe8b106387309892ef70e4c81';

describe('packet listeners', () => {
  it('are the same functions in the same order', () => {
    const rows = [...EventBus.all.entries()]
      .map(([event, handlers]) => [String(event), (handlers as unknown[]).map(h => createHash('sha1').update(String(h).replace(/\s+/g, '')).digest('hex').slice(0, 10))] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    const hash = createHash('sha1').update(JSON.stringify(rows)).digest('hex');
    expect(hash).toBe(LISTENERS_HASH);
  });
});
