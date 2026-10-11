import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Read, not run: running the modules needs the whole app (see src/app/listenerOrder.golden.test.ts).
const DIR = 'src/modules';
const list = readFileSync(join(DIR, 'modules.ts'), 'utf8');
const listed = [...list.matchAll(/from '\.\/(\w+)\/module'/g)].map(m => m[1]);

describe('the module list', () => {
  it('lists every module folder that has a module.ts, once', () => {
    const folders = readdirSync(DIR).filter(d => existsSync(join(DIR, d, 'module.ts'))).sort();
    expect([...listed].sort()).toEqual(folders);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('names each module after its folder', () => {
    for (const id of listed) expect(readFileSync(join(DIR, id, 'module.ts'), 'utf8')).toContain(`id: '${id}',`);
  });
});
