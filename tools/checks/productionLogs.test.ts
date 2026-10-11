import { transform } from 'esbuild';
import { describe, expect, it } from 'vitest';
import type { UserConfig, UserConfigFnObject } from 'vite';
import viteConfig from '../../vite.config';
import { strayDebugLogs } from './distLogs';

const configFor = (command: 'build' | 'serve') =>
  (viteConfig as unknown as UserConfigFnObject)({ command, mode: command === 'build' ? 'production' : 'development' }) as UserConfig;

const SAMPLE = `
export function run(x: number) {
  console.log('drop', x);
  console.debug('packet', x);
  console.trace('here');
  console.info('kept');
  console.warn('kept');
  console.error('kept');
  return x;
}
`;

describe('production builds carry no debug logging', () => {
  it('the build minifies console.log, console.debug and console.trace away, and keeps the rest', async () => {
    const esbuild = configFor('build').esbuild;
    expect(esbuild).toBeTruthy();
    const out = await transform(SAMPLE, { ...(esbuild as object), loader: 'ts', minify: true });
    expect(strayDebugLogs(out.code)).toEqual([]);
    expect(out.code).toContain('console.warn(');
    expect(out.code).toContain('console.error(');
    expect(out.code).toContain('console.info(');
  });

  it('the dev server keeps every log', () => {
    expect(configFor('serve').esbuild).toBeUndefined();
  });

  it('the dist check finds a stray log, and not a mere reference to one', () => {
    expect(strayDebugLogs('a();console.log("x");console.debug(1)')).toEqual(['console.log(', 'console.debug(']);
    expect(strayDebugLogs('const l=console.log.bind(console);console.warn(1)')).toEqual([]);
  });
});
