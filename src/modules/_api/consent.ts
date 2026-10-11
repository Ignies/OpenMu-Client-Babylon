// The player's consent for a third-party module (readme.md, "Streaming"): asked once per world per
// module version, remembered in this browser (per-viewer state; Cache Storage holds the code).
import { LocalStorage } from '@/core/localStorage';

const KEY = 'mu_module_consent';

type Book = Record<string, Record<string, boolean>>;

function read(): Book {
  try {
    const raw: unknown = JSON.parse(LocalStorage.load(KEY) ?? '{}');
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Book) : {};
  } catch {
    return {};
  }
}

/**
 * The stored answer for this module version on this world, else `prompt`'s: true (yes) and false (no)
 * are remembered; undefined (the box went without an answer) counts as no and is asked again next time.
 */
export async function askConsent(
  world: string,
  { id, version }: { id: string; version: string },
  prompt: () => Promise<boolean | undefined>
): Promise<boolean> {
  const key = `${id}@${version}`;
  const stored = read()[world]?.[key];
  if (typeof stored === 'boolean') return stored;
  const answer = await prompt();
  if (answer === undefined) return false;
  const book = read();
  book[world] = { ...book[world], [key]: answer };
  LocalStorage.save(KEY, JSON.stringify(book));
  return answer;
}
