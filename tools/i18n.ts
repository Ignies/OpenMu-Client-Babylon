// The translator's sheet: one language's every key in one CSV, and back into the owner files.
//   bun tools/i18n.ts export <code> [file.csv]   (stdout without a file)
//   bun tools/i18n.ts import <code> <file.csv>
// Columns: owner, key, english, translation. See docs/how_to/translate_text.md.
import ts from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { builtInText, type TextSource } from '../src/i18n/sources';
import { keepsPlaceholders } from '../src/i18n/coverage';

export type Row = { owner: string; key: string; english: string; translation: string };

const HEADER = ['owner', 'key', 'english', 'translation'];

/** Every key of every built-in owner, in file order, with this language's line (or empty). */
export function exportRows(files: readonly TextSource[], code: string): Row[] {
  const rows: Row[] = [];
  for (const en of files.filter(f => f.code === 'en')) {
    const own = files.find(f => f.owner === en.owner && f.code === code);
    for (const [key, english] of Object.entries(en.strings)) {
      rows.push({ owner: en.owner, key, english, translation: own?.strings[key] ?? '' });
    }
  }
  return rows;
}

const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Excel reads a UTF-8 CSV as UTF-8 only with a byte order mark. */
const BOM = String.fromCharCode(0xfeff);

export function toCsv(rows: readonly Row[]): string {
  const lines = [HEADER, ...rows.map(r => [r.owner, r.key, r.english, r.translation])];
  return BOM + lines.map(l => l.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') endField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows.filter(r => r.some(f => f !== ''));
}

export function fromCsv(text: string): Row[] {
  const [head, ...rest] = parseCsv(text);
  const at = HEADER.map(h => head.indexOf(h));
  if (at.some(i => i < 0)) throw new Error(`the sheet needs the columns ${HEADER.join(', ')}`);
  return rest.map(r => ({ owner: r[at[0]] ?? '', key: r[at[1]] ?? '', english: r[at[2]] ?? '', translation: r[at[3]] ?? '' }));
}

/** A single-quoted TypeScript string, as the text files write them. */
export function literal(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}'`;
}

const property = (key: string, value: string) => {
  const one = `  ${literal(key)}: ${literal(value)},`;
  return one.length <= 100 ? one : `  ${literal(key)}:\n    ${literal(value)},`;
};

/** The object literal a text file exports by default. */
function exported(sf: ts.SourceFile): ts.ObjectLiteralExpression {
  const unwrap = (e: ts.Expression): ts.Expression =>
    ts.isSatisfiesExpression(e) || ts.isAsExpression(e) || ts.isParenthesizedExpression(e) ? unwrap(e.expression) : e;
  for (const s of sf.statements) {
    if (!ts.isExportAssignment(s)) continue;
    let e = unwrap(s.expression);
    if (ts.isIdentifier(e)) {
      const name = e.text;
      for (const v of sf.statements) {
        if (!ts.isVariableStatement(v)) continue;
        const d = v.declarationList.declarations.find(d => d.name.getText(sf) === name);
        if (d?.initializer) e = unwrap(d.initializer);
      }
    }
    if (ts.isObjectLiteralExpression(e)) return e;
  }
  throw new Error(`${sf.fileName}: no exported object literal`);
}

/**
 * Writes `lines` into one text file's source: a changed line replaces its value
 * in place (comments and order stay), a new key is added at the end.
 */
export function applyLines(source: string, lines: ReadonlyMap<string, string>): { text: string; changed: number; added: number } {
  const sf = ts.createSourceFile('text.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const obj = exported(sf);
  const edits: { at: number; end: number; text: string }[] = [];
  const seen = new Set<string>();
  let changed = 0;

  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p) || !(ts.isStringLiteral(p.name) || ts.isIdentifier(p.name))) continue;
    const key = p.name.text;
    seen.add(key);
    const want = lines.get(key);
    if (want === undefined) continue;
    if (ts.isStringLiteralLike(p.initializer) && p.initializer.text === want) continue;
    edits.push({ at: p.initializer.getStart(sf), end: p.initializer.getEnd(), text: literal(want) });
    changed++;
  }

  const fresh = [...lines].filter(([key]) => !seen.has(key));
  if (fresh.length) {
    const close = obj.getEnd() - 1;
    const lineStart = source.lastIndexOf('\n', close - 1) + 1;
    const ownLine = source.slice(lineStart, close).trim() === '';
    const comma = obj.properties.length && !obj.properties.hasTrailingComma ? ',' : '';
    const block = fresh.map(([k, v]) => property(k, v)).join('\n') + '\n';
    const last = obj.properties[obj.properties.length - 1]?.getEnd() ?? 0;
    if (comma) edits.push({ at: last, end: last, text: comma });
    edits.push(ownLine ? { at: lineStart, end: lineStart, text: block } : { at: close, end: close, text: `\n${block}` });
  }

  let text = source;
  for (const e of edits.sort((a, b) => b.at - a.at)) text = text.slice(0, e.at) + e.text + text.slice(e.end);
  return { text, changed, added: fresh.length };
}

/** A new language's file for one owner. */
export function newTextFile(code: string, owner: string): string {
  return `/** ${code} text of \`${owner}\`. */\n\nimport type en from './en';\n\nexport default {\n} satisfies Partial<Record<keyof typeof en, string>>;\n`;
}

const ROOT = `${import.meta.dir}/..`.replace(/\\/g, '/');

function importSheet(code: string, csv: string): void {
  if (code === 'en') throw new Error('English is edited in the en.ts files, not imported');
  const files = builtInText();
  const english = new Map(files.filter(f => f.code === 'en').map(f => [f.owner, f]));
  const byOwner = new Map<string, Map<string, string>>();
  const problems: string[] = [];

  for (const row of fromCsv(csv)) {
    if (!row.translation) continue;
    const en = english.get(row.owner);
    if (!en) {
      problems.push(`unknown owner ${row.owner}`);
      continue;
    }
    if (en.strings[row.key] === undefined) {
      problems.push(`${row.owner} has no key ${row.key}`);
      continue;
    }
    if (!keepsPlaceholders(en.strings[row.key], row.translation)) problems.push(`${row.key}: placeholders differ from English (written anyway)`);
    const lines = byOwner.get(row.owner) ?? new Map<string, string>();
    byOwner.set(row.owner, lines.set(row.key, row.translation));
  }

  let changed = 0;
  let added = 0;
  let written = 0;
  for (const [owner, lines] of byOwner) {
    const folder = (english.get(owner)?.path ?? '').replace(/\/en\.ts$/, '');
    const path = `${ROOT}/${folder}/${code}.ts`;
    const before = existsSync(path) ? readFileSync(path, 'utf8') : newTextFile(code, owner);
    const out = applyLines(before, lines);
    if (out.text === before && existsSync(path)) continue;
    writeFileSync(path, out.text);
    changed += out.changed;
    added += out.added;
    written++;
  }
  for (const p of problems) console.warn(p);
  console.log(`${code}: ${changed} lines changed, ${added} added, in ${written} files`);
}

if (import.meta.main) {
  const [verb, code, file] = process.argv.slice(2);
  if (verb === 'export' && code) {
    const csv = toCsv(exportRows(builtInText(), code));
    if (file) writeFileSync(file, csv);
    else process.stdout.write(csv);
  } else if (verb === 'import' && code && file) {
    importSheet(code, readFileSync(file, 'utf8'));
  } else {
    console.error('usage: bun tools/i18n.ts export <code> [file.csv] | import <code> <file.csv>');
    process.exit(1);
  }
}
