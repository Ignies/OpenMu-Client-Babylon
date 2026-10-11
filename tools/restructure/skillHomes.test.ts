import { readdirSync, readFileSync, statSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { skillHome } from './skillHomes';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap(e => (statSync(`${d}/${e}`).isDirectory() ? walk(`${d}/${e}`) : [`${d}/${e}`]));

describe('skillHome', () => {
  it('names the file every skill already sits in (checkHomes.ts)', () => {
    const misplaced: string[] = [];
    for (const f of walk('versions/shared/skills').filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const m = readFileSync(f, 'utf8').match(/defineSkill\(\{\s*id: (\d+)/);
      if (m && skillHome(Number(m[1])).file !== f) misplaced.push(`${f} -> ${skillHome(Number(m[1])).file}`);
    }
    expect(misplaced).toEqual([]);
  });
});
