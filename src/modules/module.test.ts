import { describe, expect, it, vi } from 'vitest';
import { defineModule, installModules, moduleOn, refusedModules, setServerModulesOff } from './module';
import type { InProcessApi } from './_api/host';

function recorder() {
  const installed: string[] = [];
  const mod = (id: string, extra: { core?: boolean; requires?: string[]; api?: string } = {}) =>
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

  it('hands each install its module\'s API when the app gives one', () => {
    const got: [string, unknown][] = [];
    const apiFor = (id: string) => ({ id }) as unknown as InProcessApi;
    const mod = (id: string) => defineModule({ id, install: api => got.push([id, api]) });
    installModules([mod('api_a'), mod('api_b')], undefined, apiFor);
    expect(got).toEqual([['api_a', { id: 'api_a' }], ['api_b', { id: 'api_b' }]]);
  });
});

describe('installModules with an API range', () => {
  it('installs a module whose range this client serves, as one that declares none', () => {
    const { installed, mod } = recorder();
    installModules([mod('range_none'), mod('range_served', { api: '^1.0' })]);
    expect(installed).toEqual(['range_none', 'range_served']);
  });

  it('skips a module whose range it cannot serve, and every module that requires it, and reports them', () => {
    const { installed, mod } = recorder();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const on = installModules([
      mod('range_next', { api: '^2.0', core: true }),
      mod('range_needs_next', { requires: ['range_next'] }),
      mod('range_unread', { api: 'latest' }),
      mod('range_other'),
    ]);
    expect(installed).toEqual(['range_other']);
    expect(on).toEqual(['range_other']);
    expect(moduleOn('range_next')).toBe(false);
    expect(refusedModules().filter(r => r.id.startsWith('range_'))).toEqual([
      { id: 'range_next', why: 'needs module API ^2.0; this client serves 1.0.0' },
      { id: 'range_needs_next', why: 'requires range_next, which was refused' },
      { id: 'range_unread', why: 'needs module API latest; this client serves 1.0.0' },
    ]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
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
