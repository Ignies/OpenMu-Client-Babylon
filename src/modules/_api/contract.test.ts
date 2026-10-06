import { describe, expect, it } from 'vitest';
import { MODULE_API_VERSION, canServe } from './contract';

describe('MODULE_API_VERSION', () => {
  it('is a plain semver version that serves itself', () => {
    expect(MODULE_API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(canServe(MODULE_API_VERSION)).toBe(true);
    expect(canServe(`^${MODULE_API_VERSION}`)).toBe(true);
  });

  it('is 1.1 (packets): a module asking for 1.0 or 1.1 is served, one asking for 1.0.x or 1.2 is not', () => {
    expect(MODULE_API_VERSION).toBe('1.1.0');
    expect(canServe('^1.0')).toBe(true);
    expect(canServe('^1.1')).toBe(true);
    expect(canServe('>=1.0 <2')).toBe(true);
    expect(canServe('~1.0')).toBe(false);
    expect(canServe('1.0.0')).toBe(false);
    expect(canServe('^1.2')).toBe(false);
  });
});

describe('canServe', () => {
  it.each([
    // caret: the same major (the same minor below 1.0), at least the version named
    ['^1.2', '1.2.0', true],
    ['^1.2', '1.9.4', true],
    ['^1.2', '1.1.9', false],
    ['^1.2', '2.0.0', false],
    ['^1.2.3', '1.2.3', true],
    ['^1.2.3', '1.2.2', false],
    ['^1', '1.0.0', true],
    ['^1', '2.0.0', false],
    ['^0.2', '0.2.5', true],
    ['^0.2', '0.3.0', false],
    ['^0.0.3', '0.0.3', true],
    ['^0.0.3', '0.0.4', false],
    // tilde: the same minor
    ['~1.2.3', '1.2.3', true],
    ['~1.2.3', '1.2.9', true],
    ['~1.2.3', '1.2.2', false],
    ['~1.2.3', '1.3.0', false],
    ['~1.2', '1.2.0', true],
    ['~1.2', '1.3.0', false],
    // x-range
    ['1.x', '1.0.0', true],
    ['1.x', '1.7.2', true],
    ['1.x', '0.9.0', false],
    ['1.x', '2.0.0', false],
    ['1.2.x', '1.2.7', true],
    ['1.2.x', '1.3.0', false],
    // exact
    ['1.0.0', '1.0.0', true],
    ['1.0.0', '1.0.1', false],
    // comparators: every one must hold
    ['>=1.1 <2', '1.1.0', true],
    ['>=1.1 <2', '1.9.9', true],
    ['>=1.1 <2', '1.0.9', false],
    ['>=1.1 <2', '2.0.0', false],
    ['>1.1 <=1.4', '1.2.0', true],
    ['>1.1 <=1.4', '1.1.9', false],
    ['>1.1 <=1.4', '1.4.9', true],
    ['>1.1 <=1.4', '1.5.0', false],
  ])('%s with %s: %s', (range, version, ok) => {
    expect(canServe(range, version)).toBe(ok);
  });

  it.each([
    '',
    ' ',
    '*',
    'x',
    'latest',
    '1',
    '1.2',
    'v1.0.0',
    '01.0.0',
    '1.2.3.4',
    '1.x.3',
    '^1.x',
    '~1.x',
    '>=1.x',
    '^^1',
    '=1.0.0',
    '>= 1.1',
    '>=1.1  <2',
    ' 1.0.0',
    '1.0.0-beta',
    '1.0.0+build',
    '1.0.0 || 2.0.0',
    '1.0.0 - 2.0.0',
  ])('refuses %j', range => {
    expect(canServe(range, '1.0.0')).toBe(false);
  });

  it('refuses anything when the version itself is not plain semver', () => {
    expect(canServe('1.x', '1.0')).toBe(false);
  });
});
