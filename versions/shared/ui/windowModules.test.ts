import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { readFileSync, readdirSync } from 'node:fs';
import { MODULES } from '@/modules/modules';

// Read off the window.ts files: importing them would pull in every window's React tree.
const dir = 'versions/shared/ui';
const windowFiles = (readdirSync(dir, { recursive: true }) as string[])
  .map(f => f.split('\\').join('/'))
  .filter(f => f.endsWith('/window.ts'));

describe('a window that names its module', () => {
  it('names an optional module that exists', () => {
    const optional = new Set(MODULES.filter(m => !m.core).map(m => m.id));
    const named = windowFiles.flatMap(f => {
      const m = /module: '([a-z_]+)'/.exec(readFileSync(`${dir}/${f}`, 'utf8'));
      return m ? [[f, m[1]] as const] : [];
    });

    expect(named.length).toBeGreaterThan(0);
    for (const [file, id] of named) expect(optional.has(id), `${file}: ${id}`).toBe(true);
  });
});
