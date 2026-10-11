import { describe, expect, it } from 'vitest';
import { applyLines, exportRows, fromCsv, literal, newTextFile, parseCsv, toCsv } from './i18n';
import { builtInText, type TextSource } from '../src/i18n/sources';

const file = (owner: string, code: string, strings: Record<string, string>): TextSource => ({
  path: `${owner}/i18n/${code}.ts`,
  owner,
  code,
  strings,
});

describe('translator sheet', () => {
  it('exports every key of every owner with the language line', () => {
    const rows = exportRows(
      [file('a', 'en', { 'a.one': 'One', 'a.two': 'Two' }), file('a', 'fr', { 'a.one': 'Un' }), file('b', 'en', { 'b.x': 'X' })],
      'fr'
    );
    expect(rows).toEqual([
      { owner: 'a', key: 'a.one', english: 'One', translation: 'Un' },
      { owner: 'a', key: 'a.two', english: 'Two', translation: '' },
      { owner: 'b', key: 'b.x', english: 'X', translation: '' },
    ]);
  });

  it('round-trips commas, quotes and line breaks through CSV', () => {
    const rows = [{ owner: 'a', key: 'a.k', english: 'Say "hi", then\nleave', translation: 'Dis « salut », puis\r\npars' }];
    expect(fromCsv(toCsv(rows))).toEqual(rows);
    expect(parseCsv('a,b\r\n"x,y",z\n')).toEqual([['a', 'b'], ['x,y', 'z']]);
  });

  it('exports the real text: every English key once, translations filled', () => {
    const rows = exportRows(builtInText(), 'es');
    expect(rows.length).toBe(new Set(rows.map(r => r.key)).size);
    expect(rows.every(r => r.translation !== '')).toBe(true);
  });

  it('replaces a changed line in place and keeps comments', () => {
    const source = `/** Spanish. */\n\nimport type en from './en';\n\nexport default {\n  /** note */\n  'a.one': 'Uno',\n  'a.two':\n    'Dos',\n} satisfies Partial<Record<keyof typeof en, string>>;\n`;
    const out = applyLines(source, new Map([['a.two', "D'os"], ['a.one', 'Uno']]));
    expect(out.changed).toBe(1);
    expect(out.text).toBe(source.replace("'Dos'", "'D\\'os'"));
  });

  it('adds a missing key at the end, and fills a new file', () => {
    const out = applyLines(`export default {\n  'a.one': 'Uno'\n};\n`, new Map([['a.two', 'Dos']]));
    expect(out).toEqual({ text: `export default {\n  'a.one': 'Uno',\n  'a.two': 'Dos',\n};\n`, changed: 0, added: 1 });

    const fresh = applyLines(newTextFile('xx', 'a'), new Map([['a.one', 'Uno']]));
    expect(fresh.text).toContain(`export default {\n  'a.one': 'Uno',\n} satisfies`);
  });

  it('edits an en.ts shaped file (named const, default export)', () => {
    const out = applyLines(`const en = {\n  'a.one': 'One',\n};\n\nexport default en;\n`, new Map([['a.one', 'Uno']]));
    expect(out.text).toBe(`const en = {\n  'a.one': 'Uno',\n};\n\nexport default en;\n`);
  });

  it('writes string literals TypeScript reads back unchanged', () => {
    const s = `it's a \\ "test"\nline\ttab`;
    expect(new Function(`return ${literal(s)}`)()).toBe(s);
  });
});
