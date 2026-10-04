import { describe, expect, it } from 'vitest';
import { defineModule, installModules, moduleOn, setServerModulesOff } from './module';

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

describe('moduleOn', () => {
  it('follows the server for an optional module, never for a core one', () => {
    const { mod } = recorder();
    installModules([mod('on_core', { core: true }), mod('on_optional')]);
    expect(moduleOn('on_optional')).toBe(true);
    setServerModulesOff(['on_optional', 'on_core']);
    expect(moduleOn('on_optional')).toBe(false);
    expect(moduleOn('on_core')).toBe(true);
    setServerModulesOff([]);
    expect(moduleOn('on_optional')).toBe(true);
  });

  it('turns a module off with one it requires', () => {
    const { mod } = recorder();
    installModules([mod('on_economy'), mod('on_trade', { requires: ['on_economy'] })]);
    setServerModulesOff(['on_economy']);
    expect(moduleOn('on_trade')).toBe(false);
    setServerModulesOff([]);
  });

  it('is off for a module that was not installed, or does not exist', () => {
    const { mod } = recorder();
    installModules([mod('on_skipped')], () => false);
    expect(moduleOn('on_skipped')).toBe(false);
    expect(moduleOn('on_unknown')).toBe(false);
  });
});
