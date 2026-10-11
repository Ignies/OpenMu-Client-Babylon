// The production build carries no debug logging: `bun tools/checks/distLogs.ts [dist]` after
// `bun run build` lists every console.log / console.debug / console.trace call left in the
// bundle and fails if there is one. vite.config.ts strips them (`esbuild.pure`); warnings and
// errors stay. tools/checks/productionLogs.test.ts checks the config without a build.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const STRAY = /console\.(log|debug|trace)\(/g;

/** The debug log calls left in one bundle's code. */
export function strayDebugLogs(code: string): string[] {
  return code.match(STRAY) ?? [];
}

function scripts(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return scripts(path);
    return /\.m?js$/.test(name) ? [path] : [];
  });
}

if (import.meta.main) {
  const dir = process.argv[2] ?? 'dist';
  const found = scripts(dir).flatMap(file => strayDebugLogs(readFileSync(file, 'utf8')).map(call => `${file}: ${call}`));
  if (found.length) {
    console.error(`${found.length} debug log calls left in ${dir}:\n  ${found.slice(0, 40).join('\n  ')}`);
    process.exit(1);
  }
  console.info(`no debug log calls in ${dir}`);
}
