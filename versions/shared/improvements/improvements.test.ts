import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
// Loads and registers every skill (the entry the goldens use: it keeps the import cycle in order).
import '../skills/skillVisuals';
import type { Scene } from '@/controllers/render/babylon/exports';
import { cancelledEffects } from '@/controllers/skills';
import {
  FIDELITY_CLASSIC,
  FIDELITY_DEFAULT,
  improvements,
  isOn,
  setFidelityChoice,
} from '@/controllers/fidelity';
import { EN_TEXT, i18n, t } from '@/i18n';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const ROOT = join(__dirname, '../../..');
const HERE = __dirname;

const camel = (file: string) => file.replace(/\.ts$/, '').replace(/_(\w)/g, (_, c: string) => c.toUpperCase());

/** Every `isOn('<id>')` in the client's code, by id. */
function readSites(): Map<string, string[]> {
  const sites = new Map<string, string[]>();
  const walk = (dir: string) => {
    for (const d of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${d.name}`;
      if (d.isDirectory()) {
        if (d.name !== 'node_modules') walk(rel);
      } else if (/\.tsx?$/.test(d.name) && !d.name.endsWith('.test.ts')) {
        for (const m of readFileSync(join(ROOT, rel), 'utf8').matchAll(/\bisOn\('([^']+)'\)/g)) {
          sites.set(m[1], [...(sites.get(m[1]) ?? []), rel]);
        }
      }
    }
  };
  walk('src');
  walk('versions');
  return sites;
}

afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

describe('the improvement files', () => {
  const files = readdirSync(HERE).filter(f => f.endsWith('.ts') && f !== 'all.ts' && !f.endsWith('.test.ts'));
  const ids = improvements().map(def => def.id);

  it('each file registers one improvement named after it', () => {
    expect(ids.sort()).toEqual(files.map(camel).sort());
  });

  it('each has its label and hint in English', () => {
    for (const def of improvements()) {
      expect(EN_TEXT[def.labelKey], def.id).toBeTruthy();
      expect(EN_TEXT[def.hintKey], def.id).toBeTruthy();
    }
  });

  it('each is read at a site, and every site names a registered improvement', () => {
    const sites = readSites();
    expect(ids.filter(id => !sites.has(id))).toEqual([]);
    expect([...sites.keys()].filter(id => !ids.includes(id))).toEqual([]);
  });

  it('Enhanced, the default, keeps the Enhanced ones on and the Ultra ones off; Classic turns them all off', () => {
    for (const def of improvements()) expect(isOn(def.id), def.id).toBe(def.preset === 'enhanced');
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const id of ids) expect(isOn(id), id).toBe(false);
  });
});

describe('master buff cancel', () => {
  const scene = null as unknown as Scene;

  it('a master or Rage Fighter cancel drops its buff on Enhanced', () => {
    expect(cancelledEffects(266, scene, null)).toEqual([129]);
    expect(cancelledEffects(384, scene, null)).toEqual([55]);
  });

  it('Classic: ids 256 and up cancel nothing, the base skills still do', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(cancelledEffects(266, scene, null)).toEqual([]);
    expect(cancelledEffects(384, scene, null)).toEqual([]);
    expect(cancelledEffects(1, scene, null)).toEqual([55]);
  });
});

describe('the fortress lights hint', () => {
  // Each language's word for the braziers (79, 80), which fortressLights switches with the torches and chandeliers.
  const BRAZIERS: Record<string, string> = {
    en: 'braziers',
    bg: 'мангали',
    de: 'Feuerschalen',
    es: 'braseros',
    fr: 'braseros',
    it: 'bracieri',
    ja: 'かがり火',
    ko: '화로',
    pl: 'paleniska',
    pt: 'braseiros',
    ro: 'mangalele',
    ru: 'жаровни',
    th: 'กระถางไฟ',
    vi: 'chậu lửa',
    zh: '火盆',
    ar: 'المجامر',
    bn: 'অগ্নিপাত্র',
    ca: 'braserons',
    cs: 'ohniště',
    el: 'μαγκάλια',
    eu: 'su-ontziek',
    fa: 'منقل',
    fil: 'siga',
    hi: 'अंगीठियां',
    hu: 'parázstartói',
    id: 'anglo',
    'sr-Latn': 'mangali',
    tr: 'mangallar',
    uk: 'жаровні',
    ur: 'انگیٹھیاں',
    'zh-Hant': '火盆',
  };

  it('names the braziers in every language', () => {
    const was = i18n.language;
    const hints = Object.fromEntries(
      i18n.languages.map(l => {
        i18n.setLanguage(l.code);
        return [l.code, t('fidelity.fortressLights.hint').includes(BRAZIERS[l.code] ?? '?')];
      })
    );
    i18n.setLanguage(was);
    expect(hints).toEqual(Object.fromEntries(Object.keys(BRAZIERS).map(code => [code, true])));
  });
});
