import { afterEach, describe, expect, it } from 'vitest';
import type { TextKey } from '../../i18n';
import {
  FIDELITY_CLASSIC,
  FIDELITY_DEFAULT,
  FIDELITY_ENHANCED,
  FIDELITY_ULTRA,
  cleanOverrides,
  defineImprovement,
  improvementOn,
  improvements,
  isCustom,
  isOn,
  registerImprovements,
  setFidelityChoice,
  withImprovement,
} from './index';

const key = 'common.off' as TextKey;
const enhanced = defineImprovement({ id: 'test.enhanced', preset: 'enhanced', labelKey: key, hintKey: key });
const ultra = defineImprovement({ id: 'test.ultra', preset: 'ultra', labelKey: key, hintKey: key });
registerImprovements([enhanced, ultra]);

afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

describe('fidelity presets', () => {
  it('Classic turns everything off, Enhanced the enhanced ones, Ultra all', () => {
    for (const def of improvements()) expect(improvementOn(def.id, FIDELITY_CLASSIC, {})).toBe(false);
    expect(improvementOn('test.enhanced', FIDELITY_ENHANCED, {})).toBe(true);
    expect(improvementOn('test.ultra', FIDELITY_ENHANCED, {})).toBe(false);
    expect(improvementOn('test.enhanced', FIDELITY_ULTRA, {})).toBe(true);
    expect(improvementOn('test.ultra', FIDELITY_ULTRA, {})).toBe(true);
  });

  it('isOn follows the choice the options push', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(isOn('test.enhanced')).toBe(false);
    setFidelityChoice(FIDELITY_ULTRA, {});
    expect(isOn('test.enhanced')).toBe(true);
    expect(isOn('test.ultra')).toBe(true);
  });

  it('starts on Enhanced, so what exists today stays on', () => {
    expect(FIDELITY_DEFAULT).toBe(FIDELITY_ENHANCED);
    expect(isOn('test.enhanced')).toBe(true);
    expect(isOn('test.ultra')).toBe(false);
  });
});

describe('fidelity overrides', () => {
  it('an override wins over the preset and makes it Custom', () => {
    const choices = withImprovement('test.ultra', true, FIDELITY_ENHANCED, {});
    expect(choices).toEqual({ 'test.ultra': true });
    expect(improvementOn('test.ultra', FIDELITY_ENHANCED, choices)).toBe(true);
    expect(isCustom(FIDELITY_ENHANCED, choices)).toBe(true);
    setFidelityChoice(FIDELITY_ENHANCED, choices);
    expect(isOn('test.ultra')).toBe(true);
  });

  it('setting it back to the preset value drops the override and the Custom', () => {
    const on = withImprovement('test.enhanced', false, FIDELITY_ENHANCED, {});
    const back = withImprovement('test.enhanced', true, FIDELITY_ENHANCED, on);
    expect(back).toEqual({});
    expect(isCustom(FIDELITY_ENHANCED, back)).toBe(false);
  });

  it('an override equal to its preset is not Custom', () => {
    expect(isCustom(FIDELITY_CLASSIC, { 'test.enhanced': false })).toBe(false);
    expect(isCustom(FIDELITY_CLASSIC, { 'test.enhanced': true })).toBe(true);
  });
});

describe('old saves', () => {
  it('ignores ids nothing registers: off, not Custom, dropped on the next change', () => {
    const stored = { 'gone.improvement': true };
    expect(improvementOn('gone.improvement', FIDELITY_ULTRA, stored)).toBe(false);
    expect(isCustom(FIDELITY_ENHANCED, stored)).toBe(false);
    setFidelityChoice(FIDELITY_ENHANCED, stored);
    expect(isOn('gone.improvement')).toBe(false);
    expect(withImprovement('test.ultra', true, FIDELITY_ENHANCED, stored)).toEqual({ 'test.ultra': true });
  });

  it('keeps only boolean entries of a stored blob', () => {
    expect(cleanOverrides({ a: true, b: false, c: 1, d: 'yes', e: null })).toEqual({ a: true, b: false });
    expect(cleanOverrides(undefined)).toEqual({});
    expect(cleanOverrides('x')).toEqual({});
    expect(cleanOverrides([true])).toEqual({});
  });
});

describe('registry', () => {
  it('throws on an id twice in one call', () => {
    expect(() => registerImprovements([enhanced, enhanced])).toThrow(/twice/);
  });
});
