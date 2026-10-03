import { describe, expect, it } from 'vitest';
import { defineModule, installModules } from './module';

function recorder() {
  const installed: string[] = [];
  const mod = (id: string, extra: { core?: boolean; requires?: string[] } = {}) =>
    defineModule({ id, ...extra, install: () => installed.push(id) });
  return { installed, mod };
}

describe('installModules', () => {
  it('installs every module in list order by default', () => {
    const { installed, mod } = recorder();
    expect(installModules([mod('a'), mod('b'), mod('c')])).toEqual(['a', 'b', 'c']);
    expect(installed).toEqual(['a', 'b', 'c']);
  });

  it('skips a disabled module but never a core one', () => {
    const { installed, mod } = recorder();
    installModules([mod('a', { core: true }), mod('b')], () => false);
    expect(installed).toEqual(['a']);
  });

  it('skips a module whose requirement is off', () => {
    const { installed, mod } = recorder();
    installModules([mod('guild'), mod('guild_war', { requires: ['guild'] })], id => id !== 'guild');
    expect(installed).toEqual([]);
  });
});
