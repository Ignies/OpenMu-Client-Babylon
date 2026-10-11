import { registerImprovements, type Improvement } from '@/controllers/fidelity';

/**
 * Every improvement file here, found by glob in the client build and in tests, and read from disk
 * under Bun (no Vite there). Adding an improvement is adding a file.
 */
function files(): Improvement[] {
  try {
    return Object.values(
      import.meta.glob<Improvement>(['./*.ts', '!./all.ts', '!./*.test.ts'], { eager: true, import: 'default' })
    );
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    return readdirSync(import.meta.dir)
      .filter(f => f.endsWith('.ts') && f !== 'all.ts' && !f.endsWith('.test.ts'))
      .map(f => require(`${import.meta.dir}/${f}`).default as Improvement);
  }
}

registerImprovements(files());
