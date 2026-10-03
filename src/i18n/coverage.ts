/**
 * The coverage rules for built-in text, as data so the test and the translator
 * tool share them. See readme.md.
 */

import type { TextSource } from './sources';

/** `{name}` holes, sorted: their order may change in a translation. */
const holes = (text: string) => (text.match(/\{\w+\}/g) ?? []).slice().sort().join(',');

/**
 * `%d` / `%s` / `%%`: the original client's own format strings, spliced by
 * their call sites in order, so a dropped or swapped one is a crash.
 */
const specs = (text: string) => (text.match(/%(?:%|\d*\.?\d*[a-zA-Z]|I64d)/g) ?? []).join(',');

/** Does a translated line keep the English line's placeholders? */
export function keepsPlaceholders(english: string, line: string): boolean {
  return holes(line) === holes(english) && specs(line) === specs(english);
}

const folderOf = (path: string) => path.slice(0, path.lastIndexOf('/'));

/** Every rule broken by these files, one line each; empty when all is well. */
export function textProblems(files: readonly TextSource[], codes: readonly string[]): string[] {
  const out: string[] = [];

  const ownerOfKey = new Map<string, string>();
  for (const f of files) {
    if (f.code !== 'en') continue;
    for (const key of Object.keys(f.strings)) {
      const was = ownerOfKey.get(key);
      if (was && was !== f.owner) out.push(`${key} is owned by both ${was} and ${f.owner}`);
      else ownerOfKey.set(key, f.owner);
    }
  }

  const owners = new Map<string, TextSource[]>();
  for (const f of files) owners.set(f.owner, [...(owners.get(f.owner) ?? []), f]);

  for (const list of owners.values()) {
    const folder = folderOf(list[0].path);
    const en = list.find(f => f.code === 'en');
    if (!en) {
      out.push(`${folder} has no en.ts`);
      continue;
    }
    const keys = Object.keys(en.strings);
    for (const code of codes) {
      if (code === 'en') continue;
      const file = list.find(f => f.code === code);
      if (!file) {
        out.push(`${folder}/${code}.ts is missing`);
        continue;
      }
      for (const key of keys) if (file.strings[key] === undefined) out.push(`${file.path} misses ${key}`);
      for (const key of Object.keys(file.strings)) {
        if (en.strings[key] === undefined) out.push(`${file.path} has ${key}, which ${en.path} does not`);
      }
      for (const key of keys) {
        const line = file.strings[key];
        if (line !== undefined && !keepsPlaceholders(en.strings[key], line)) {
          out.push(`${file.path} ${key} does not keep the placeholders of English`);
        }
      }
    }
  }

  for (const f of files) if (!codes.includes(f.code)) out.push(`${f.path} is not a language in layers.ts`);
  return out;
}
