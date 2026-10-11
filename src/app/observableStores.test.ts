import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `makeAutoObservable(this, overrides)` decides each key with
 * `key in overrides`, which walks the prototype chain: a store member named
 * after an `Object.prototype` one (`valueOf`, `toString`, ...) is handed that
 * built-in function as its annotation and mobx throws inside the constructor.
 * The store is built at import time, so that takes the whole client down.
 */

const SRC = fileURLToPath(new URL('.', import.meta.url));

const RESERVED = new Set(
  Object.getOwnPropertyNames(Object.prototype).filter(n => n !== 'constructor')
);

/** A class member at the usual two-space indent: `foo(`, `get foo(`, `foo =`, `foo:`. */
const MEMBER =
  /^ {2}(?:(?:private|protected|public|readonly|static|declare|abstract|get|set|async|override)\s+)*([A-Za-z_$][\w$]*)\s*[(:=?]/;

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('observable stores', () => {
  it('never name a member after one on Object.prototype', () => {
    const offenders: string[] = [];

    for (const file of tsFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('makeAutoObservable(')) continue;

      source.split('\n').forEach((line, index) => {
        const name = MEMBER.exec(line)?.[1];
        if (name && RESERVED.has(name)) {
          offenders.push(`${file.slice(SRC.length)}:${index + 1} ${name}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
