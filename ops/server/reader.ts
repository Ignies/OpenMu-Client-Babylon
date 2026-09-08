import { readdirSync, statSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { parseChunk } from './ingest';
import { offsetOf, recordCheatWarnings, rememberOffset } from './db';

/**
 * Follows OpenMU's JSON log and files what it finds.
 *
 * Serilog rolls its files daily and on size, so there is never one file to
 * watch: every file in the folder is followed, each with its own remembered
 * offset. A file that shrank was replaced by a new one under the same name
 * (Serilog's `retainedFileCountLimit` reusing it), so its offset restarts.
 *
 * Polling, not `fs.watch`: the log is written by another process, often in a
 * container with a bind mount, where watches are unreliable and a missed event
 * is a silently empty console. A read every few seconds costs nothing.
 */

const LOG_DIR = process.env.OPENMU_LOG_DIR || '/srv/openmu/logs';

/** Serilog's JSON sink writes these; the plain text `log.txt` is left alone. */
const LOG_PATTERN = /^events.*\.jsonl?$/i;

const POLL_MS = Number(process.env.OPS_INGEST_POLL_MS ?? 5000);

/** One read of one file, from where we left off. Returns rows filed. */
async function readFile(path: string): Promise<number> {
  const size = statSync(path).size;
  const from = offsetOf(path);

  // Truncated or replaced: start over rather than reading from the middle of
  // a record and filing nonsense.
  const start = size < from ? 0 : from;
  if (size === start) return 0;

  const handle = await open(path, 'r');
  try {
    const length = size - start;
    const buffer = new Uint8Array(length);
    await handle.read(buffer, 0, length, start);

    const { events, consumed } = parseChunk(new TextDecoder().decode(buffer));
    const filed = recordCheatWarnings(events);
    // Only past whole lines: a partial tail is read again next time.
    rememberOffset(path, start + consumed);
    return filed;
  } finally {
    await handle.close();
  }
}

/** One pass over every log file. Returns how many warnings were filed. */
export async function ingestOnce(dir: string = LOG_DIR): Promise<number> {
  let files: string[];
  try {
    files = readdirSync(dir).filter(name => LOG_PATTERN.test(name));
  } catch (error) {
    console.error(`ops: cannot read ${dir}:`, error);
    return 0;
  }

  let filed = 0;
  for (const name of files.sort()) {
    try {
      filed += await readFile(join(dir, name));
    } catch (error) {
      // One unreadable file must not stop the others: a log mid-roll is
      // briefly missing, and the next pass will pick it up.
      console.error(`ops: cannot follow ${name}:`, error);
    }
  }

  return filed;
}

/** Follow forever. Errors are logged and the loop continues. */
export function follow(dir: string = LOG_DIR): void {
  console.info(`ops: following ${dir} every ${POLL_MS}ms`);

  const tick = async () => {
    const filed = await ingestOnce(dir);
    if (filed > 0) console.info(`ops: filed ${filed} cheat warning(s)`);
  };

  void tick();
  setInterval(() => void tick(), POLL_MS);
}
