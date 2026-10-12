// Builds the example module to one file: bun tools/modules/example/build.ts <out.js>
// (then sign it with tools/modules/sign.ts, or not, and put it in a server's modules folder).
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

/** The example bundled with what it imports (`streamed.ts`, `guest.ts`): one ES module, no imports left. */
export async function buildExample(): Promise<Uint8Array> {
  const out = await build({
    entryPoints: [`${import.meta.dirname}/index.ts`],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    write: false,
    legalComments: 'none',
  });
  return out.outputFiles[0].contents;
}

if (import.meta.main) {
  const target = process.argv[2];
  if (!target?.endsWith('.js')) {
    console.error('usage: bun tools/modules/example/build.ts <out.js>');
    process.exitCode = 1;
  } else {
    writeFileSync(target, await buildExample());
    console.info(`Wrote ${target}`);
  }
}
