import { autorun } from 'mobx';
import { afterEach, describe, expect, it } from 'vitest';
import { EN_TEXT, i18n, registerText, t, type TextKey } from './index';

// A streamed module's keys are not built in (`TextOwners`), so they are cast here.
const LATE = 'zzLate.greeting' as TextKey;
const was = i18n.language;

afterEach(() => i18n.setLanguage(was));

describe('text registry', () => {
  it('shows an unknown key as itself', () => {
    expect(t('zzNever.registered' as TextKey)).toBe('zzNever.registered');
  });

  it('types the built-in keys from the owners en.ts files', () => {
    i18n.setLanguage('en');
    expect(t('party.joined')).toBe(EN_TEXT['party.joined']);
    // @ts-expect-error: a misspelled key does not compile (`bun run tsc`)
    expect(t('party.joinedd')).toBe('party.joinedd');
  });

  it('takes English after boot and falls back to it line by line', () => {
    registerText('en', { [LATE]: 'Hello {name}' });
    i18n.setLanguage('en');
    expect(t(LATE, { name: 'Ann' })).toBe('Hello Ann');

    i18n.setLanguage('fr');
    expect(t(LATE, { name: 'Ann' })).toBe('Hello Ann');
    expect(i18n.translated(LATE)).toBe(false);
    // A built-in key keeps its own French line.
    expect(t('common.cancel')).not.toBe('Cancel');

    registerText('fr', { [LATE]: 'Bonjour {name}' });
    expect(t(LATE, { name: 'Ann' })).toBe('Bonjour Ann');
    expect(i18n.translated(LATE)).toBe(true);
  });

  it('lets a later registration replace a line (a version overriding a window)', () => {
    registerText('en', { 'zzOverride.title': 'Shared' });
    registerText('en', { 'zzOverride.title': 'Version' });
    i18n.setLanguage('en');
    expect(t('zzOverride.title' as TextKey)).toBe('Version');
  });

  it('redraws what read a key once its text arrives', () => {
    i18n.setLanguage('en');
    const key = 'zzRedraw.label' as TextKey;
    const seen: string[] = [];
    const stop = autorun(() => seen.push(t(key)));
    registerText('en', { [key]: 'Ready' });
    stop();
    expect(seen).toEqual(['zzRedraw.label', 'Ready']);
  });
});
