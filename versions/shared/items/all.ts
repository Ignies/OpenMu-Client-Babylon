import { ItemRegistry, type ItemRecord } from '@/controllers/items';

/**
 * Every item file under this folder (`<group>/<item>.ts`), found by glob in the client build and in
 * tests, and read from disk by the Bun servers (no Vite there). Adding an item is adding a file.
 */
function itemFiles(): ItemRecord[] {
  try {
    return Object.values(import.meta.glob<ItemRecord>('./*/*.ts', { eager: true, import: 'default' }));
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const here = import.meta.dir;
    return readdirSync(here, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .flatMap(d => readdirSync(`${here}/${d.name}`).filter(f => f.endsWith('.ts')).map(f => require(`${here}/${d.name}/${f}`).default as ItemRecord));
  }
}

export const items = new ItemRegistry(itemFiles());
