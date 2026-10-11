/**
 * Finds every built-in owner's text: `<owner>/i18n/<code>.ts` under `src/` and
 * `versions/shared/`, plus the engine's own `text/` folder. Vite glob in the
 * client and in tests; a disk walk under Bun (tools/i18n.ts), like
 * `versions/shared/items/all.ts`.
 */

import type { TextStrings } from './registry';

export type TextSource = {
  /** Repo-relative file, e.g. `src/modules/party/i18n/fr.ts`. */
  readonly path: string;
  /** The folder that owns the text, e.g. `src/modules/party`. */
  readonly owner: string;
  /** Language code: the file name. */
  readonly code: string;
  readonly strings: TextStrings;
};

const FILE = /^(.*)\/i18n\/([^/]+)\.ts$/;

function source(path: string, strings: TextStrings): TextSource {
  const rel = path.replace(/^\//, '');
  const engine = rel.match(/^src\/i18n\/text\/([^/]+)\.ts$/);
  if (engine) return { path: rel, owner: 'src/i18n/text', code: engine[1], strings };
  const m = rel.match(FILE);
  if (!m) throw new Error(`not a text file: ${rel}`);
  return { path: rel, owner: m[1], code: m[2], strings };
}

function globbed(): Record<string, TextStrings> {
  return import.meta.glob<TextStrings>(
    ['/src/**/i18n/*.ts', '/src/i18n/text/*.ts', '/versions/shared/**/i18n/*.ts', '!/src/i18n/*.ts', '!**/*.test.ts'],
    { eager: true, import: 'default' }
  );
}

function walked(): Record<string, TextStrings> {
  // Bun only: `import.meta.require` loads TypeScript synchronously; node:fs never reaches the browser bundle.
  const require = import.meta.require;
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const root = `${import.meta.dir}/../..`.replace(/\\/g, '/');
  const out: Record<string, TextStrings> = {};
  const read = (dir: string) => {
    for (const f of readdirSync(`${root}/${dir}`).sort()) {
      if (f.endsWith('.ts') && !f.endsWith('.test.ts')) out[`${dir}/${f}`] = require(`${root}/${dir}/${f}`).default;
    }
  };
  const walk = (dir: string) => {
    for (const d of readdirSync(`${root}/${dir}`, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === 'node_modules') continue;
      const sub = `${dir}/${d.name}`;
      if (d.name === 'i18n' && sub !== 'src/i18n') read(sub);
      else walk(sub);
    }
  };
  walk('src');
  walk('versions/shared');
  read('src/i18n/text');
  return out;
}

/** Every built-in text file, sorted by path. */
export function builtInText(): TextSource[] {
  let files: Record<string, TextStrings>;
  try {
    files = globbed();
  } catch {
    files = walked();
  }
  return Object.entries(files)
    .map(([path, strings]) => source(path, strings))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
