import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { CREDITS_FILES, creditsProblems } from './credits';

const real = Object.fromEntries(CREDITS_FILES.map(f => [f, readFileSync(f, 'utf8')]));
const reader = (files: Record<string, string | null>) => (path: string) => files[path] ?? null;

describe('the credits check', () => {
  it('passes on the tree as it is', () => {
    expect(creditsProblems(reader(real))).toEqual([]);
  });

  it.each(CREDITS_FILES)('fails when %s is gone', file => {
    expect(creditsProblems(reader({ ...real, [file]: null }))).toContain(`${file} is missing`);
  });

  it('fails when a notice is taken out', () => {
    const window = 'versions/shared/ui/windows/project_credits/index.tsx';
    const bare = real[window].replace(/CREDITS NOTICE/g, 'notice');
    expect(creditsProblems(reader({ ...real, [window]: bare })).join('\n')).toContain(window);
  });

  it('fails when Ctrl+F8 no longer opens it', () => {
    const hotkey = 'versions/shared/ui/windows/project_credits/hotkey.ts';
    const moved = real[hotkey].replace("e.code === 'F8'", "e.code === 'F9'");
    expect(creditsProblems(reader({ ...real, [hotkey]: moved })).join('\n')).toContain('Ctrl+F8');
  });

  it('fails when the loader stops reading GitHub', () => {
    const loader = 'src/modules/credits/contributors.ts';
    const local = real[loader].replace('https://api.github.com/repos/Ignies/OpenMu-Client-Babylon', 'http://localhost');
    expect(creditsProblems(reader({ ...real, [loader]: local })).join('\n')).toContain(loader);
  });

  it('fails when the additional condition leaves LICENSE', () => {
    const plain = real.LICENSE.split('Additional condition')[0];
    expect(creditsProblems(reader({ ...real, LICENSE: plain })).join('\n')).toContain('LICENSE');
  });
});
