import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Points the store at a throwaway database before any test loads it. Bun
 * runs every test file in one process, so the store is one module shared by
 * all of them: whoever imports this first picks the file, and nobody closes
 * it. Windows will not unlink a file SQLite still has open, and a temp
 * directory left behind is not worth failing a test run over.
 */
process.env.MARKETPLACE_DB ??= join(mkdtempSync(join(tmpdir(), 'mp-test-')), 'market.sqlite');
