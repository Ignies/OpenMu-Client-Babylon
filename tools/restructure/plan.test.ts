import { describe, expect, it } from 'vitest';
import { expandMoves, planMoves, specifiers } from './plan';

const tree = (o: Record<string, string | null>) => new Map(Object.entries(o));

describe('specifiers', () => {
  it('finds static, dynamic, type, re-export, vi.mock and worker URL specifiers', () => {
    const text = [
      `import a from './a';`,
      `export * from '../b';`,
      `type T = typeof import('./c').X;`,
      `const d = () => import('./d');`,
      `vi.mock('./e');`,
      `new Worker(new URL('./f.worker.ts', import.meta.url));`,
    ].join('\n');
    expect(specifiers('x/y.ts', text).map(s => s.spec).sort()).toEqual(['../b', './a', './c', './d', './e', './f.worker.ts']);
  });
});

describe('expandMoves', () => {
  it('maps every file under a moved folder', () => {
    const m = expandMoves(['src/a/x.ts', 'src/a/y/z.ts', 'src/b.ts'], [{ from: 'src/a', to: 'src/c/a' }]);
    expect([...m]).toEqual([
      ['src/a/x.ts', 'src/c/a/x.ts'],
      ['src/a/y/z.ts', 'src/c/a/y/z.ts'],
    ]);
  });

  it('refuses to overwrite an existing file', () => {
    expect(() => expandMoves(['src/a.ts', 'src/b.ts'], [{ from: 'src/a.ts', to: 'src/b.ts' }])).toThrow();
  });

  it('lets a file move override its folder move', () => {
    const m = expandMoves(['src/p/index.ts', 'src/p/gen.ts'], [
      { from: 'src/p', to: 'versions/shared/p' },
      { from: 'src/p/index.ts', to: 'src/net/p.ts' },
    ]);
    expect(m.get('src/p/index.ts')).toBe('src/net/p.ts');
    expect(m.get('src/p/gen.ts')).toBe('versions/shared/p/gen.ts');
  });

  it('does not treat a name prefix as a folder', () => {
    expect([...expandMoves(['src/ab.ts', 'src/a.ts'], [{ from: 'src/a.ts', to: 'src/q.ts' }]).keys()]).toEqual(['src/a.ts']);
  });
});

describe('planMoves', () => {
  it('rewrites importers of a moved file and the moved file itself', () => {
    const plan = planMoves(
      tree({
        'src/common/sound.ts': `import { t } from './types';\nexport const s = t;`,
        'src/common/types.ts': `export const t = 1;`,
        'src/ecs/sys.ts': `import { s } from '../common/sound';`,
      }),
      [{ from: 'src/common/sound.ts', to: 'src/controllers/sound/sound.ts' }]
    );
    expect(plan.renames).toEqual([['src/common/sound.ts', 'src/controllers/sound/sound.ts']]);
    expect(plan.writes.get('src/controllers/sound/sound.ts')).toContain(`from '../../common/types'`);
    expect(plan.writes.get('src/ecs/sys.ts')).toBe(`import { s } from '../controllers/sound/sound';`);
    expect(plan.writes.has('src/common/types.ts')).toBe(false);
  });

  it('keeps folder-index imports as folder imports', () => {
    const plan = planMoves(
      tree({ 'src/fx/index.ts': `export {};`, 'src/a.ts': `import '../src/fx';`, 'src/b.ts': `import './fx';` }),
      [{ from: 'src/fx', to: 'src/controllers/fx' }]
    );
    expect(plan.writes.get('src/b.ts')).toBe(`import './controllers/fx';`);
  });

  it('keeps explicit extensions and alias style', () => {
    const plan = planMoves(
      tree({
        'src/w/terrain.worker.ts': `export {};`,
        'src/w/client.ts': `new Worker(new URL('./terrain.worker.ts', import.meta.url));`,
        'src/x.ts': `import '@/w/client';`,
      }),
      [{ from: 'src/w/terrain.worker.ts', to: 'src/t/terrain.worker.ts' }, { from: 'src/w/client.ts', to: 'src/t/client.ts' }]
    );
    expect(plan.writes.get('src/t/client.ts')).toContain(`new URL('./terrain.worker.ts'`);
    expect(plan.writes.get('src/x.ts')).toBe(`import '@/t/client';`);
  });

  it('moves non-code files and rewrites imports to them', () => {
    const plan = planMoves(
      tree({ 'src/ui/inv/style.less': null, 'src/ui/inv/index.tsx': `import './style.less';` }),
      [{ from: 'src/ui/inv', to: 'versions/shared/ui/windows/inventory' }]
    );
    expect(plan.renames.map(r => r[1]).sort()).toEqual(['versions/shared/ui/windows/inventory/index.tsx', 'versions/shared/ui/windows/inventory/style.less']);
    expect(plan.writes.get('versions/shared/ui/windows/inventory/index.tsx')).toBe(`import './style.less';`);
  });

  it('reports relative imports it cannot resolve', () => {
    const plan = planMoves(tree({ 'src/a.ts': `import './missing';` }), []);
    expect(plan.unresolved).toEqual(['src/a.ts: ./missing']);
  });
});
