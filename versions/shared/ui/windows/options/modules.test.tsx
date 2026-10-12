import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { ModulesList } = await import('./modules');
const { ALL_PAGES } = await import('./catalogue');
const { StreamedModules, forgetModuleConsent, moduleConsent } = await import('@/modules/_api/streamPorts');

function stubStorage(book: object) {
  const data = new Map([['mu_module_consent', JSON.stringify(book)]]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
}

const show = (world: string | null, list: typeof StreamedModules.list) =>
  runInAction(() => {
    StreamedModules.world = world;
    StreamedModules.list = list;
  });

afterEach(() => {
  vi.unstubAllGlobals();
  show(null, []);
});

describe('the Modules page', () => {
  it('is a page of the options window', () => {
    expect(ALL_PAGES.find(p => p.id === 'modules')?.sections[0].rows[0].kind).toBe('modules');
  });

  it('says when the world streams none', () => {
    expect(renderToStaticMarkup(<ModulesList />)).toContain('This world streams no modules.');
  });

  it('lists each module: version, how it runs, the consent, and Forget where there is one', () => {
    stubStorage({ 'list:7': { 'third@1.0.0': true, 'refused@2.1.0': false } });
    show('list:7', [
      { id: 'first', version: '1.2.0', firstParty: true, loaded: true },
      { id: 'third', version: '1.0.0', firstParty: false, loaded: true },
      { id: 'refused', version: '2.1.0', firstParty: false, loaded: false },
    ]);
    const html = renderToStaticMarkup(<ModulesList />);
    for (const text of ['first 1.2.0', 'third 1.0.0', 'refused 2.1.0', 'First party', 'Sandboxed', 'Allowed', 'Refused', 'Not needed']) {
      expect(html).toContain(text);
    }
    expect(html.match(/>Forget</g)).toHaveLength(2);
  });

  it('forgets a consent, so the next entry asks again', () => {
    stubStorage({ 'list:7': { 'third@1.0.0': true } });
    const third = { id: 'third', version: '1.0.0', firstParty: false, loaded: true };
    show('list:7', [third]);
    expect(moduleConsent(third)).toBe(true);
    forgetModuleConsent(third);
    expect(moduleConsent(third)).toBeUndefined();
    expect(renderToStaticMarkup(<ModulesList />)).not.toContain('>Forget<');
  });
});
